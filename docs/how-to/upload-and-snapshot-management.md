---
sidebar_position: 8
---

# Upload Backup Data and Manage Snapshots

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

Once you have a dump on disk, `Backup()` (Go), `backup()` (JS), or `baas backup` (CLI) uploads it as a new **snapshot**. The same client manages the full snapshot lifecycle: list, inspect, prune, delete, and restore.

<Tabs groupId="baas-sdk">
<TabItem value="go" label="Go SDK" default>

```go
import (
    sdkclient "github.com/lighthouse-web3/baas-go-sdk/client"
    sdktypes  "github.com/lighthouse-web3/baas-go-sdk/types"
)
```

</TabItem>
<TabItem value="js" label="JS SDK">

```javascript
import { BackupClient, pruneCount, generateKeyfile } from "@lighthouse-web3/baas-js-sdk";
```

</TabItem>
<TabItem value="cli" label="CLI">

```bash
npm install -g @lighthouse-web3/baas-js-sdk
baas auth login --api-key
baas workspace use <workspaceId>
```

</TabItem>
</Tabs>

All snippets assume an authenticated `client` (see [Authentication](/how-to/authentication)).

## Upload a backup

Call `Backup()` on the dump file or the whole `db-dumps` directory. For daily jobs, keep one stable dump path (for example `./db-dumps/app.dump` or `./db-dumps/app.sql`) and overwrite that file each run before calling `Backup()`.

<Tabs groupId="baas-sdk">
<TabItem value="go" label="Go SDK" default>

```go
snapshot, err := client.Backup([]string{"./db-dumps"}, &sdktypes.BackupOptions{
	Description: "nightly database backup",
	Tags: map[string]string{
		"type": "db-backup",
		"env":  "prod",
		"db":   "app_db",
	},
	Hostname: "backup-runner-01",
})
if err != nil {
	log.Fatal(err)
}

log.Printf("snapshotId=%s totalSize=%d chunks=%d", snapshot.SnapshotID, snapshot.TotalSize, snapshot.TotalChunks)
```

</TabItem>
<TabItem value="js" label="JS SDK">

```javascript
const snapshot = await client.backup(["./db-dumps"], {
  description: "nightly database backup",
  tags: {
    type: "db-backup",
    env: "prod",
    db: "app_db",
  },
  hostname: "backup-runner-01",
});

console.log(
  `snapshotId=${snapshot.snapshotId} totalSize=${snapshot.totalSize} chunks=${snapshot.totalChunks}`,
);
```

</TabItem>
<TabItem value="cli" label="CLI">

```bash
baas backup ./db-dumps \
  --description "nightly database backup" \
  --tag type=db-backup \
  --tag env=prod \
  --tag db=app_db \
  --hostname backup-runner-01
```

</TabItem>
</Tabs>

> **Tip:** using a fixed filename in the dump directory enables dedup-friendly, incremental uploads while still creating a fresh snapshot each run.

### Watch live progress (optional)

<Tabs groupId="baas-sdk">
<TabItem value="go" label="Go SDK" default>

```go
opts := &sdktypes.BackupOptions{
	Description: "nightly",
	OnProgress: func(e sdktypes.ProgressEvent) {
		log.Printf("[%s] %d/%d stored=%dB ratio=%.2f",
			e.Phase, e.Current, e.Total, e.StoredBytes, e.CompressionRatio)
	},
}
snapshot, err := client.Backup([]string{"./db-dumps"}, opts)
```

</TabItem>
<TabItem value="js" label="JS SDK">

```javascript
const snapshot = await client.backup(["./db-dumps"], {
  description: "nightly",
  onProgress: (e) => {
    console.log(
      `[${e.phase}] ${e.current}/${e.total} stored=${e.storedBytes}B ratio=${e.compressionRatio}`,
    );
  },
});
```

</TabItem>
<TabItem value="cli" label="CLI">

The CLI shows upload progress by default:

```bash
baas backup ./db-dumps --description nightly
```

Use `--quiet` to suppress progress or `--json` for machine-readable final output.

</TabItem>
</Tabs>

### Useful `BackupOptions`

| Field | Meaning |
|-------|---------|
| `Description` | Human label for the snapshot. |
| `Tags` | Arbitrary `map[string]string` metadata. |
| `Hostname` | Override the recorded hostname (defaults to the machine's). |
| `SourceID` | Logical source identity. **Leave empty** and the SDK manages it (see below). |
| `ParentSnapshotID` | Hint the previous snapshot for faster incremental diffing. |
| `DisablePackCompression` | Turn off zstd compression for already-compressed data. |
| `Encryption` | Enable client-side encryption — see [Encryption](#client-side-encryption-optional). |
| `WorkspaceID` | Back up into a different workspace for this call only. |

### Sources & SourceID

If you don't set `SourceID`, the SDK creates/reads a stable id from a `.lighthouse/source_id` file inside the backup target path. This is what lets the portal **group every snapshot of the same machine+path under one Backup Source**. Keep that `.lighthouse` directory and successive backups line up as a coherent history; set an explicit `SourceID` only if you want to control grouping yourself.

**Verify in the portal:** open **Backup Sources** → your source → the new snapshot is at the top of the list. See [View backups & snapshots in the portal](/how-to/web-portal-quickstart#4-view-backups--snapshots-in-the-portal).

## List recent snapshots

<Tabs groupId="baas-sdk">
<TabItem value="go" label="Go SDK" default>

```go
resp, err := client.ListSnapshots("", 20) // cursor, limit
if err != nil {
	log.Fatal(err)
}
for _, s := range resp.Snapshots {
	log.Printf("id=%s createdAt=%d desc=%s size=%d", s.SnapshotID, s.CreatedAt, s.Description, s.TotalSize)
}
// resp.Cursor (if non-nil) → pass back as the cursor arg to get the next page.
```

</TabItem>
<TabItem value="js" label="JS SDK">

```javascript
const resp = await client.listSnapshots("", 20); // cursor, limit
for (const s of resp.snapshots) {
  console.log(
    `id=${s.snapshotId} createdAt=${s.createdAt} desc=${s.description} size=${s.totalSize}`,
  );
}
// resp.cursor (if set) → pass back as the cursor arg to get the next page.
```

</TabItem>
<TabItem value="cli" label="CLI">

```bash
baas snapshot list --limit 20
baas snapshot list --all --tag env=prod
```

</TabItem>
</Tabs>

## Inspect one snapshot

<Tabs groupId="baas-sdk">
<TabItem value="go" label="Go SDK" default>

```go
s, err := client.GetSnapshot("snapshot-id")
if err != nil {
	log.Fatal(err)
}
log.Printf("rootTreeHash=%s paths=%v tags=%v encrypted=%v",
	s.RootTreeHash, s.Paths, s.Tags, s.Encryption != nil)
```

</TabItem>
<TabItem value="js" label="JS SDK">

```javascript
const s = await client.getSnapshot("snapshot-id");
console.log(
  `rootTreeHash=${s.rootTreeHash} paths=${s.paths} tags=${JSON.stringify(s.tags)} encrypted=${Boolean(s.encryption)}`,
);
```

</TabItem>
<TabItem value="cli" label="CLI">

```bash
baas snapshot get snapshot-id
```

</TabItem>
</Tabs>

## Prune snapshots (retention)

Pruning applies a **retention policy** in one call — keep the latest *N* and/or drop everything older than a cutoff. **Always dry-run first.**

<Tabs groupId="baas-sdk">
<TabItem value="go" label="Go SDK" default>

```go
import "time"

keep := 14
before := time.Now().AddDate(0, 0, -30).UTC().Format(time.RFC3339) // older than 30 days

// Step 1: DRY RUN — see what would be deleted, delete nothing.
preview, err := client.PruneSnapshots(sdktypes.PruneRequest{
	KeepLatest: &keep,
	Before:     before,
	DryRun:     true,
})
if err != nil {
	log.Fatal(err)
}
log.Printf("would delete %d snapshot(s): %v", preview.Count(), preview.SnapshotIDs)

// Step 2: execute for real.
result, err := client.PruneSnapshots(sdktypes.PruneRequest{
	KeepLatest: &keep,
	Before:     before,
	DryRun:     false,
})
if err != nil {
	log.Fatal(err)
}
log.Printf("pruned %d snapshot(s)", result.Count())
```

</TabItem>
<TabItem value="js" label="JS SDK">

```javascript
const keepLatest = 14;
// older than 30 days
const before = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

// Step 1: DRY RUN — see what would be deleted, delete nothing.
const preview = await client.pruneSnapshots({
  keepLatest,
  before,
  dryRun: true,
});
console.log(`would delete ${pruneCount(preview)} snapshot(s):`, preview.snapshotIds);

// Step 2: execute for real.
const result = await client.pruneSnapshots({
  keepLatest,
  before,
  dryRun: false,
});
console.log(`pruned ${pruneCount(result)} snapshot(s)`);
```

</TabItem>
<TabItem value="cli" label="CLI">

```bash
# Step 1: preview candidates without deleting them.
baas snapshot prune --keep-latest 14 --before 2026-06-23 --dry-run

# Step 2: delete after verifying the preview.
baas snapshot prune --keep-latest 14 --before 2026-06-23 --yes
```

</TabItem>
</Tabs>

> **How retention combines:** when both are set, a snapshot is deleted only if it is **both** outside the `keepLatest` newest set **and** older than `before`. Set just one for a simpler policy. `PruneResponse.Count()` (Go) / `pruneCount(response)` (JS) returns candidates on a dry run and deletions on a real run.

## Delete one snapshot

<Tabs groupId="baas-sdk">
<TabItem value="go" label="Go SDK" default>

```go
err = client.DeleteSnapshot("snapshot-id")
if err != nil {
	log.Fatal(err)
}
```

</TabItem>
<TabItem value="js" label="JS SDK">

```javascript
await client.deleteSnapshot("snapshot-id");
```

</TabItem>
<TabItem value="cli" label="CLI">

```bash
baas snapshot delete snapshot-id
```

</TabItem>
</Tabs>

This deletes the snapshot record; content-addressed chunks still referenced by other snapshots are retained automatically. It is irreversible — confirm the id with `getSnapshot` first if you are scripting deletions.

## Restore a snapshot (recovery drill)

Restoring downloads the snapshot's chunks, **(decrypts →) decompresses → verifies integrity** against expected hashes, then **reassembles the original files** into a target directory. A recovery drill = restore into a scratch directory and confirm the contents, **without touching production data**.

<Tabs groupId="baas-sdk">
<TabItem value="go" label="Go SDK" default>

```go
import (
	"os"
	"path/filepath"
)

target, _ := os.MkdirTemp("", "lh-restore-drill-*")
log.Printf("restoring into %s", target)

err = client.Restore("snapshot-id", target, &sdktypes.RestoreOptions{
	OnProgress: func(e sdktypes.ProgressEvent) {
		log.Printf("[%s] %d/%d", e.Phase, e.Current, e.Total)
	},
})
if err != nil {
	log.Fatal(err)
}

// Sanity-check the restored tree.
_ = filepath.Walk(target, func(p string, info os.FileInfo, err error) error {
	if err == nil && !info.IsDir() {
		log.Printf("restored: %s (%d bytes)", p, info.Size())
	}
	return nil
})
```

</TabItem>
<TabItem value="js" label="JS SDK">

```javascript
import { mkdtempSync, readdirSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const target = mkdtempSync(join(tmpdir(), "lh-restore-drill-"));
console.log(`restoring into ${target}`);

await client.restore("snapshot-id", target, {
  onProgress: (e) => {
    console.log(`[${e.phase}] ${e.current}/${e.total}`);
  },
});

// Sanity-check the restored tree.
function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(p);
    } else {
      console.log(`restored: ${p} (${statSync(p).size} bytes)`);
    }
  }
}
walk(target);
```

</TabItem>
<TabItem value="cli" label="CLI">

```bash
mkdir -p ./restore-check
baas restore snapshot-id ./restore-check
find ./restore-check -type f -print
```

</TabItem>
</Tabs>

Then restore the database from the dump inside the scratch directory you restored into — `$target` in the Go/JS examples above, or `./restore-check` in the CLI example:

- **PostgreSQL:** `pg_restore ... "$RESTORE_DIR/db-dumps/app.dump"`
- **MySQL:** `mysql ... < "$RESTORE_DIR/db-dumps/app.sql"`
- Other databases: see the matching [tutorial](/tutorials/overview).

**Recovery-drill checklist:**

1. ✅ Restore into a **fresh, empty** directory (never over live data).
2. ✅ Leave checksum verification **on** (don't set `SkipChecksumVerification`).
3. ✅ Confirm file count, sizes, and spot-check contents.
4. ✅ Note the wall-clock time — that's your real **RTO** (recovery time).
5. ✅ Delete the scratch directory when done.

Run this drill on a schedule (e.g. monthly) so you find restore problems *before* a real outage.

## Client-side encryption (optional)

With encryption enabled, data is encrypted **on your machine** (AES-GCM) before upload; the server only ever stores ciphertext and a wrapped key. You hold a passphrase-protected **keyfile** (the Tenant Master Key, TMK). **Lose the keyfile/passphrase → the data is unrecoverable** — there is no server-side reset.

<Tabs groupId="baas-sdk">
<TabItem value="go" label="Go SDK" default>

```go
import "github.com/lighthouse-web3/baas-go-sdk/encrypt"

// Create a keyfile once.
_, err := encrypt.GenerateKeyfile("/secure/bd.keyfile", os.Getenv("BD_KEYFILE_PASSPHRASE"), nil)
if err != nil {
	log.Fatal(err)
}

enc := &sdktypes.EncryptionOptions{
	KeyfilePath: "/secure/bd.keyfile",
	Passphrase:  os.Getenv("BD_KEYFILE_PASSPHRASE"),
}

// Backup with encryption.
snapshot, err := client.Backup([]string{"./db-dumps"}, &sdktypes.BackupOptions{
	Description: "nightly-encrypted",
	Encryption:  enc,
})

// Restore an encrypted snapshot — supply the same keyfile/passphrase.
err = client.Restore("snapshot-id", target, &sdktypes.RestoreOptions{
	Encryption: enc,
})
```

</TabItem>
<TabItem value="js" label="JS SDK">

```javascript
import { generateKeyfile } from "@lighthouse-web3/baas-js-sdk";

// Create a keyfile once.
generateKeyfile("/secure/bd.keyfile", process.env.BD_KEYFILE_PASSPHRASE);

const enc = {
  keyfilePath: "/secure/bd.keyfile",
  passphrase: process.env.BD_KEYFILE_PASSPHRASE,
};

// Backup with encryption.
const snapshot = await client.backup(["./db-dumps"], {
  description: "nightly-encrypted",
  encryption: enc,
});

// Restore an encrypted snapshot — supply the same keyfile/passphrase.
await client.restore("snapshot-id", target, {
  encryption: enc,
});
```

</TabItem>
<TabItem value="cli" label="CLI">

Passphrases are never supplied as a command-line value. Generate a keyfile, then use an interactive prompt, `--passphrase-env`, or `--passphrase-file`:

```bash
baas key generate /secure/bd.keyfile
baas backup ./db-dumps --description nightly-encrypted --keyfile /secure/bd.keyfile
baas restore snapshot-id ./restore-check --keyfile /secure/bd.keyfile
```

</TabItem>
</Tabs>

A snapshot's `Encryption` / `encryption` field (set) tells you whether it was encrypted. The SDK also supports **TMK rotation** (`client.RotateTMK(...)` in Go, `client.rotateTMK(...)` in JS) to re-wrap a snapshot's data key under a new master key **without re-encrypting any data blobs**.
