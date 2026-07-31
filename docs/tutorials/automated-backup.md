---
sidebar_position: 8
---

# Automated backup with scheduling

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

This guide turns the one-off dump and upload flow from the per-database tutorials into a scheduled backup. It combines three pieces:

1. A **dump script** that writes your database to `./db-dumps` (you drop in the command from your [database tutorial](/tutorials/overview)).
2. A small **uploader** built with the Backup Data SDK (in **Go** or **JavaScript/TypeScript**) or the **CLI** that uploads `./db-dumps` as a snapshot and applies a retention policy.
3. A **schedule** (cron or systemd timer) that runs it nightly.

```
 cron / timer
      │
      ▼
 backup.sh ──▶ make_dump()  ──▶  ./db-dumps/app.dump   (Stage 1: your DB)
      │
      └──────▶ bd-backup (Go) ──▶  snapshot on BackupData.io   (Stage 2: SDK)
                                   └─▶ prune old snapshots
```

## Prerequisites

- The SDK installed for your language:
  <Tabs groupId="baas-sdk">
  <TabItem value="go" label="Go SDK" default>

  Go **1.24+**:
  ```bash
  go get github.com/Backup-Data-io/go-sdk@latest
  ```

  </TabItem>
  <TabItem value="js" label="JS SDK">

  Node.js **18+**:
  ```bash
  npm install @backupdata/js-sdk
  ```

  </TabItem>
  <TabItem value="cli" label="CLI">

  Node.js **18+**:
  ```bash
  npm install -g @backupdata/js-sdk
  baas --help
  ```

  </TabItem>
  </Tabs>
- An **API key** scoped `backup:write`, `backup:read`, `snapshots:read` — see [API Keys](/how-to/api-keys-for-backup-jobs).
- The dump tool for your database (e.g. `pg_dump`, `mysqldump`, `mongodump`, `aws`).

Export your credentials (the job reads these from the environment):

```bash
export BD_API_KEY="lh_xxxxxxxxxxxxxxxxxxxxxxxx"
export BD_WORKSPACE_ID="550e8400-e29b-41d4-a716-446655440000"
```

## 1. The reusable uploader

This program uploads the `./db-dumps` directory and prunes old snapshots. It is **database-agnostic** — you never edit it; it just uploads whatever the dump script produced.

:::warning Retention deletes snapshots on every run
Unlike the [interactive prune workflow](/how-to/upload-and-snapshot-management#prune-snapshots-retention), which recommends a dry run first, this uploader prunes for real (`DryRun: false`) each time it runs — a scheduled job has nobody to review a preview. It keeps the newest `BD_KEEP_LATEST` snapshots (**default 14**) and permanently deletes the rest.

Set `BD_KEEP_LATEST` deliberately for your retention policy, or set it to `0` to disable pruning. Before the first scheduled run, confirm the effect with a dry run against your workspace.
:::

<Tabs groupId="baas-sdk">
<TabItem value="go" label="Go SDK" default>

Create `bd-backup/main.go`:

```go
package main

import (
	"log"
	"os"
	"strconv"
	"strings"
	"time"

	sdkclient "github.com/Backup-Data-io/go-sdk/client"
	sdktypes "github.com/Backup-Data-io/go-sdk/types"
)

func main() {
	apiKey := mustEnv("BD_API_KEY")
	workspaceID := mustEnv("BD_WORKSPACE_ID")

	dumpDir := envOr("BD_DUMP_DIR", "./db-dumps")
	description := envOr("BD_DESCRIPTION", "scheduled db backup "+time.Now().UTC().Format(time.RFC3339))

	client, err := sdkclient.NewBackupClient(sdkclient.BackupClientOptions{
		APIURL:      "https://api.backupdata.io",
		APIKey:      apiKey,
		WorkspaceID: workspaceID,
	})
	if err != nil {
		log.Fatalf("client init: %v", err)
	}

	// Upload the dump directory as a new snapshot.
	snap, err := client.Backup([]string{dumpDir}, &sdktypes.BackupOptions{
		Description: description,
		Tags:        parseTags(os.Getenv("BD_TAGS")), // e.g. "env=prod,db=app_db"
		OnProgress: func(e sdktypes.ProgressEvent) {
			log.Printf("[%s] %d/%d stored=%dB", e.Phase, e.Current, e.Total, e.StoredBytes)
		},
	})
	if err != nil {
		log.Fatalf("backup failed: %v", err)
	}
	log.Printf("✅ snapshot %s — %d chunks, %d bytes", snap.SnapshotID, snap.TotalChunks, snap.TotalSize)

	// Retention: keep the latest N snapshots and DELETE the rest.
	// Defaults to 14. Set BD_KEEP_LATEST=0 to disable pruning entirely.
	if keep := envInt("BD_KEEP_LATEST", 14); keep > 0 {
		res, err := client.PruneSnapshots(sdktypes.PruneRequest{
			KeepLatest: &keep,
			DryRun:     false,
		})
		if err != nil {
			log.Printf("prune warning: %v", err) // don't fail the backup over a prune error
		} else {
			log.Printf("🧹 pruned %d old snapshot(s), keeping latest %d", res.Count(), keep)
		}
	}
}

func mustEnv(k string) string {
	v := os.Getenv(k)
	if v == "" {
		log.Fatalf("missing required env var %s", k)
	}
	return v
}

func envOr(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}

func envInt(k string, def int) int {
	if v := os.Getenv(k); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			return n
		}
	}
	return def
}

func parseTags(s string) map[string]string {
	tags := map[string]string{}
	for _, pair := range strings.Split(s, ",") {
		pair = strings.TrimSpace(pair)
		if pair == "" {
			continue
		}
		if k, v, ok := strings.Cut(pair, "="); ok {
			tags[strings.TrimSpace(k)] = strings.TrimSpace(v)
		}
	}
	return tags
}
```

Build it once into a static binary:

```bash
cd bd-backup
go mod init bd-backup && go mod tidy
go build -o ../bin/bd-backup .
cd ..
```

You now have `./bin/bd-backup`. It needs only `BD_API_KEY` and `BD_WORKSPACE_ID` (plus optional `BD_DUMP_DIR`, `BD_TAGS`, `BD_DESCRIPTION`, `BD_KEEP_LATEST`).

:::tip `command 'go' not found`?
If you installed Go from the official tarball into `/usr/local/go`, non-interactive shells (and CI) won't have it on `PATH`. Call the toolchain by absolute path: `/usr/local/go/bin/go build -o ../bin/bd-backup .`. **Building once into a static binary is the point** — the scheduler then runs `bin/bd-backup` directly and never needs Go installed at runtime. See [Troubleshooting](/how-to/troubleshooting#command-go-not-found-in-cron--systemd--ci).
:::

</TabItem>
<TabItem value="js" label="JS SDK">

Create `bd-backup/index.mjs`:

```javascript
import { BackupClient, pruneCount } from "@backupdata/js-sdk";

function mustEnv(k) {
  const v = process.env[k];
  if (!v) {
    console.error(`missing required env var ${k}`);
    process.exit(1);
  }
  return v;
}

function envOr(k, def) {
  return process.env[k] || def;
}

function envInt(k, def) {
  const v = process.env[k];
  if (v) {
    const n = Number.parseInt(v, 10);
    if (Number.isFinite(n)) return n;
  }
  return def;
}

function parseTags(s) {
  const tags = {};
  for (const raw of (s ?? "").split(",")) {
    const pair = raw.trim();
    if (!pair) continue;
    const idx = pair.indexOf("=");
    if (idx > 0) {
      tags[pair.slice(0, idx).trim()] = pair.slice(idx + 1).trim();
    }
  }
  return tags;
}

const apiKey = mustEnv("BD_API_KEY");
const workspaceId = mustEnv("BD_WORKSPACE_ID");

const dumpDir = envOr("BD_DUMP_DIR", "./db-dumps");
const description = envOr(
  "BD_DESCRIPTION",
  `scheduled db backup ${new Date().toISOString()}`,
);

const client = new BackupClient({ apiKey, workspaceId });

// Upload the dump directory as a new snapshot.
const snap = await client.backup([dumpDir], {
  description,
  tags: parseTags(process.env.BD_TAGS), // e.g. "env=prod,db=app_db"
  onProgress: (e) => {
    console.log(`[${e.phase}] ${e.current}/${e.total} stored=${e.storedBytes}B`);
  },
});
console.log(
  `✅ snapshot ${snap.snapshotId} — ${snap.totalChunks} chunks, ${snap.totalSize} bytes`,
);

// Retention: keep the latest N snapshots and DELETE the rest.
// Defaults to 14. Set BD_KEEP_LATEST=0 to disable pruning entirely.
const keep = envInt("BD_KEEP_LATEST", 14);
if (keep > 0) {
  try {
    const res = await client.pruneSnapshots({ keepLatest: keep, dryRun: false });
    console.log(`🧹 pruned ${pruneCount(res)} old snapshot(s), keeping latest ${keep}`);
  } catch (err) {
    // don't fail the backup over a prune error
    console.warn(`prune warning: ${err}`);
  }
}
```

There is **no build step** — run it directly with Node. Install the SDK once in the `bd-backup` directory:

```bash
cd bd-backup
npm init -y && npm install @backupdata/js-sdk
cd ..
```

You now run the uploader with `node bd-backup/index.mjs`. It needs only `BD_API_KEY` and `BD_WORKSPACE_ID` (plus optional `BD_DUMP_DIR`, `BD_TAGS`, `BD_DESCRIPTION`, `BD_KEEP_LATEST`).

:::tip `command 'node' not found` in cron/systemd?
Non-interactive shells (and CI) may not have `node` on `PATH`. Invoke it by absolute path — find yours with `which node` (e.g. `/usr/bin/node bd-backup/index.mjs`), and reference that absolute path in `backup.sh` below.
:::

</TabItem>
<TabItem value="cli" label="CLI">

The CLI is the uploader—no program needs to be created or built. Configure its credentials for the scheduled job, then back up the dump directory and apply retention:

```bash
export BAAS_API_KEY="$BD_API_KEY"
export BAAS_WORKSPACE_ID="$BD_WORKSPACE_ID"

baas backup "${BD_DUMP_DIR:-./db-dumps}" \
  --description "${BD_DESCRIPTION:-scheduled db backup}" \
  --tag env=prod \
  --tag db=app_db

baas snapshot prune --keep-latest "${BD_KEEP_LATEST:-14}" --yes
```

For cron, set `BAAS_API_KEY` and `BAAS_WORKSPACE_ID` in the job environment (or use a CLI profile), then call the same two commands after `make_dump()`. Repeat `--tag key=value` for each tag your job needs. Add `--quiet --json` when the scheduler needs machine-readable output.

</TabItem>
</Tabs>

## 2. The dump-and-upload script

This wrapper is the **only file you customize per database**. Edit `make_dump()` with the command from your [database tutorial](/tutorials/overview); everything else stays the same.

Create `backup.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

# ── Paths ─────────────────────────────────────────────
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export BD_DUMP_DIR="${ROOT}/db-dumps"
UPLOADER="${ROOT}/bin/bd-backup"
mkdir -p "$BD_DUMP_DIR"

# ── Credentials & policy (or set these in the environment) ─
: "${BD_API_KEY:?set BD_API_KEY}"
: "${BD_WORKSPACE_ID:?set BD_WORKSPACE_ID}"
export BD_TAGS="${BD_TAGS:-env=prod,db=app_db}"
export BD_KEEP_LATEST="${BD_KEEP_LATEST:-14}"

# ── Stage 1: create the dump ──────────────────────────
# Replace the body with the command from your database tutorial.
make_dump() {
  export PGPASSWORD="${DB_PASSWORD:?set DB_PASSWORD}"
  pg_dump --host=127.0.0.1 --port=5432 --username=postgres \
    --format=custom --file="${BD_DUMP_DIR}/app.dump" app_db
}

echo "[$(date -u +%FT%TZ)] creating dump…"
make_dump

# ── Stage 2: upload + prune via the SDK ───────────────
echo "[$(date -u +%FT%TZ)] uploading to BackupData.io…"
"$UPLOADER"

echo "[$(date -u +%FT%TZ)] backup complete."
```

:::note Using the JS uploader?
The script above runs the compiled Go binary. If you built the [JS uploader](#1-the-reusable-uploader), point `UPLOADER` at Node instead — replace the `UPLOADER=` line and the Stage 2 call with:

```bash
UPLOADER=(node "${ROOT}/bd-backup/index.mjs")   # near the top, with the other paths
# ── Stage 2: upload + prune via the SDK ───────────────
"${UPLOADER[@]}"
```
:::

Make it executable and test it by hand first:

```bash
chmod +x backup.sh
./backup.sh
```

You should see the dump run, an upload with a `snapshot …` line, and a prune summary. Confirm the snapshot in the portal under **Backup Sources** ([how to view](/how-to/web-portal-quickstart#4-view-backups--snapshots-in-the-portal)).

### Per-database `make_dump()` bodies

Pick the tab for your database and use **only** that definition — `backup.sh` must contain exactly one `make_dump()`. (Full context in each tutorial.)

<Tabs groupId="baas-db">
<TabItem value="postgresql" label="PostgreSQL" default>

```bash
make_dump() {
  export PGPASSWORD="$DB_PASSWORD"
  pg_dump --host=127.0.0.1 --port=5432 --username=postgres \
    --format=custom --file="${BD_DUMP_DIR}/app.dump" app_db
}
```

</TabItem>
<TabItem value="mysql" label="MySQL / MariaDB">

```bash
make_dump() {
  mysqldump --host=127.0.0.1 --port=3306 --user=root --password="$DB_PASSWORD" \
    --single-transaction --quick --routines --triggers \
    app_db > "${BD_DUMP_DIR}/app.sql"
}
```

</TabItem>
<TabItem value="sqlite" label="SQLite">

```bash
make_dump() {
  sqlite3 /path/to/app.db ".backup '${BD_DUMP_DIR}/app.sqlite'"
}
```

</TabItem>
<TabItem value="mongodb" label="MongoDB">

```bash
make_dump() {
  mongodump --uri="$MONGO_URI" --archive="${BD_DUMP_DIR}/app.archive" --gzip
}
```

</TabItem>
<TabItem value="dynamodb" label="Amazon DynamoDB">

```bash
make_dump() {
  aws dynamodb scan --table-name app_table --output json > "${BD_DUMP_DIR}/app_table.json"
}
```

</TabItem>
<TabItem value="s3" label="Amazon S3">

```bash
make_dump() {
  aws s3 sync s3://your-bucket "${BD_DUMP_DIR}/your-bucket" --delete
}
```

</TabItem>
</Tabs>

## 3. Schedule it

### Option A — cron (simplest)

Store secrets in a file the scheduler sources, so they aren't committed or visible in `ps`. Create `/etc/backupdata-backup.env` (mode `600`):

```bash
BD_API_KEY=lh_xxxxxxxxxxxxxxxxxxxxxxxx
BD_WORKSPACE_ID=550e8400-e29b-41d4-a716-446655440000
DB_PASSWORD=your_db_password
BD_TAGS=env=prod,db=app_db
BD_KEEP_LATEST=14
```

Add a crontab entry to run nightly at 02:30 and log output:

```bash
# crontab -e
30 2 * * *  set -a; . /etc/backupdata-backup.env; set +a; /opt/app/backup.sh >> /var/log/bd-backup.log 2>&1
```

`set -a; . file; set +a` exports every variable from the env file for the duration of the job.

### Option B — systemd timer (better logging & reliability)

`/etc/systemd/system/bd-backup.service`:

```ini
[Unit]
Description=BackupData.io database backup
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
EnvironmentFile=/etc/backupdata-backup.env
WorkingDirectory=/opt/app
ExecStart=/opt/app/backup.sh
```

`/etc/systemd/system/bd-backup.timer`:

```ini
[Unit]
Description=Run BackupData.io database backup nightly

[Timer]
OnCalendar=*-*-* 02:30:00
Persistent=true

[Install]
WantedBy=timers.target
```

Adjust `OnCalendar` to taste — for example, **every hour on the hour**:

```ini
OnCalendar=*-*-* *:00:00
```

:::tip systemd has a minimal environment
A systemd service does **not** inherit your login shell's `PATH`. Reference the uploader and dump tools by absolute path inside `backup.sh` (the template already resolves `bin/bd-backup` from the script's own directory), and keep secrets in `EnvironmentFile=` as shown.
:::

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now bd-backup.timer
systemctl list-timers bd-backup.timer   # confirm next run
journalctl -u bd-backup.service -n 50    # view logs after it runs
```

`Persistent=true` means a missed run (machine was off) fires on next boot.

## How incremental backups keep this cheap

Each run overwrites the **same** dump file, and the SDK:

- **chunks** the dump (FastCDC) and uploads only chunks it hasn't seen before (dedup),
- **compresses** packs before upload,
- creates a **fresh snapshot** that references both reused and new chunks.

So a daily job on a slowly-changing database uploads only the delta, while every snapshot remains a complete, independent restore point.

## Verify & recover

- **List snapshots / inspect / restore:** see [Upload Backup Data and Manage Snapshots](/how-to/upload-and-snapshot-management).
- **Run a recovery drill** on a schedule (e.g. monthly): restore the latest snapshot into a scratch directory and load it into a throwaway database, following the restore steps in your [database tutorial](/tutorials/overview).

## Hitting errors?

A few you may run into the first time you wire this up:

- **`413 Storage limit exceeded`** — the workspace is at its storage limit. Lower `BD_KEEP_LATEST` so retention prunes more aggressively, or upgrade the workspace.
- **`command 'go' not found`** in the timer/cron run — build the static binary and call it by absolute path.

Full list with fixes: **[Troubleshooting](/how-to/troubleshooting)**.

## Operational checklist

1. ✅ Test `./backup.sh` by hand before scheduling it.
2. ✅ Keep secrets in a `600`-mode env file, never in the script or repo.
3. ✅ Use a dedicated API key per job with only `backup:write`, `backup:read`, `snapshots:read`.
4. ✅ Give the key a hard expiry and rotate it (see [API Keys](/how-to/api-keys-for-backup-jobs#rotation-tips)).
5. ✅ Set `BD_KEEP_LATEST` to bound storage against your workspace limit.
6. ✅ Alert on a non-zero exit code from `backup.sh` (the script uses `set -e`).
7. ✅ Run a periodic recovery drill — an untested backup is not a backup.
