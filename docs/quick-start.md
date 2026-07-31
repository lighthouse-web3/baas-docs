---
sidebar_position: 2
---

# 🚀 Quick Start

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

Back up your first database to BackupData.io in about five minutes. You will:

1. [Sign in and get your free workspace](#1-sign-in-and-get-your-free-workspace)
2. [Create an API key](#2-create-an-api-key)
3. [Install and authenticate](#3-install-and-authenticate)
4. [Create a database dump](#4-create-a-database-dump)
5. [Upload it as a snapshot](#5-upload-it-as-a-snapshot)
6. [Verify the snapshot](#6-verify-the-snapshot)
7. [What's next?](#7-whats-next)

This quick start uses PostgreSQL as the example. Every other database follows the same shape — only step 4 changes.

---

### 1. Sign in and get your free workspace

Open **[backupdata.io](https://backupdata.io)** and sign in with email + password, Google, or a wallet (SIWE). All three produce the same account.

Your **free workspace is provisioned automatically** — no setup, no payment. Open **Workspaces** in the sidebar and copy the **Workspace ID**, a UUID like `550e8400-e29b-41d4-a716-446655440000`. You will need it in step 3.

:::info Free tier
Every new account includes a **free workspace with 5 GB of storage**. Past 5 GB, upgrade before retaining more backup data — see [pricing](https://backupdata.io/#pricing).
:::

---

### 2. Create an API key

This is the credential your backups authenticate with.

1. Sidebar → **API Keys** → **Create New API Key**.
2. **Key Name** — e.g. `quickstart`.
3. **Workspace** — the workspace from step 1.
4. **Scopes** — tick `backup:write`, `backup:read`, and `snapshots:read`. That is everything this quick start needs.
5. Click **Create API Key**.

:::caution The key is shown once
Copy the raw `lh_…` key (or click **Download .txt**) before closing the dialog. Afterwards only its prefix is visible, and a lost key must be revoked and replaced — keys are immutable and cannot be re-scoped.
:::

---

### 3. Install and authenticate

<Tabs groupId="baas-sdk">
<TabItem value="cli" label="CLI" default>

```bash
npm install -g @lighthouse-web3/baas-js-sdk
```

Log in with the key from step 2 and select your workspace:

```bash
baas auth login --api-key      # paste the lh_… key when prompted
baas workspace use <workspaceId>
baas auth whoami               # confirms identity and active workspace
```

For cron or CI, skip the interactive login and set the environment directly:

```bash
export BAAS_API_KEY="lh_xxxxxxxxxxxxxxxxxxxxxxxx"
export BAAS_WORKSPACE_ID="550e8400-e29b-41d4-a716-446655440000"
```

</TabItem>
<TabItem value="go" label="Go SDK">

Requires **Go 1.24+**:

```bash
go get github.com/Backup-Data-io/go-sdk@latest
```

```bash
export BD_API_KEY="lh_xxxxxxxxxxxxxxxxxxxxxxxx"
export BD_WORKSPACE_ID="550e8400-e29b-41d4-a716-446655440000"
```

</TabItem>
<TabItem value="js" label="JS SDK">

Requires **Node.js 18+**:

```bash
npm install @lighthouse-web3/baas-js-sdk
```

```bash
export BD_API_KEY="lh_xxxxxxxxxxxxxxxxxxxxxxxx"
export BD_WORKSPACE_ID="550e8400-e29b-41d4-a716-446655440000"
```

</TabItem>
</Tabs>

:::note Two different hosts
The portal you clicked around in is `backupdata.io`. The API is `api.backupdata.io` — that is the value the Go SDK needs for `APIURL`. The CLI and JS SDK target it internally.
:::

---

### 4. Create a database dump

Write the dump into a dedicated directory. BackupData.io uploads the **directory**, so this is what becomes your snapshot:

```bash
mkdir -p ./db-dumps

export PGPASSWORD='your_password'
pg_dump \
  --host=127.0.0.1 \
  --port=5432 \
  --username=postgres \
  --format=custom \
  --file=./db-dumps/app.dump \
  app_db
```

:::tip Use one stable filename
Overwrite the **same** file on every run rather than adding a timestamp. Backups are content-addressed and incremental, so a stable path means each run uploads only what actually changed — while still producing a fresh, complete restore point.
:::

Backing up something else? The command is the only difference: [MySQL](/tutorials/dump-mysql), [SQLite](/tutorials/dump-sqlite), [MongoDB](/tutorials/dump-mongodb), [DynamoDB](/tutorials/dump-dynamodb), [Amazon S3](/tutorials/dump-s3), or the [quick reference](/how-to/sql-dump-commands).

---

### 5. Upload it as a snapshot

<Tabs groupId="baas-sdk">
<TabItem value="cli" label="CLI" default>

```bash
baas backup ./db-dumps --description "first backup" --tag env=dev
```

</TabItem>
<TabItem value="go" label="Go SDK">

```go
package main

import (
	"log"
	"os"

	sdkclient "github.com/Backup-Data-io/go-sdk/client"
	sdktypes "github.com/Backup-Data-io/go-sdk/types"
)

func main() {
	client, err := sdkclient.NewBackupClient(sdkclient.BackupClientOptions{
		APIURL:      "https://api.backupdata.io", // API host, not the portal
		APIKey:      os.Getenv("BD_API_KEY"),
		WorkspaceID: os.Getenv("BD_WORKSPACE_ID"),
	})
	if err != nil {
		log.Fatalf("client init: %v", err)
	}

	snapshot, err := client.Backup([]string{"./db-dumps"}, &sdktypes.BackupOptions{
		Description: "first backup",
		Tags:        map[string]string{"env": "dev"},
	})
	if err != nil {
		log.Fatal(err)
	}
	log.Printf("snapshotId=%s size=%d chunks=%d",
		snapshot.SnapshotID, snapshot.TotalSize, snapshot.TotalChunks)
}
```

Run it from the directory containing `db-dumps`:

```bash
go run .
```

</TabItem>
<TabItem value="js" label="JS SDK">

```javascript
import { BackupClient } from "@lighthouse-web3/baas-js-sdk";

const client = new BackupClient({
  apiKey: process.env.BD_API_KEY,
  workspaceId: process.env.BD_WORKSPACE_ID,
});

const snapshot = await client.backup(["./db-dumps"], {
  description: "first backup",
  tags: { env: "dev" },
});

console.log(
  `snapshotId=${snapshot.snapshotId} size=${snapshot.totalSize} chunks=${snapshot.totalChunks}`,
);
```

Save as `upload.mjs` and run it from the directory containing `db-dumps`:

```bash
node upload.mjs
```

</TabItem>
</Tabs>

The upload runs the full pipeline in one call — scan, chunk, deduplicate, compress, upload, then create the snapshot. It prints a **snapshot ID**; that is your restore point.

---

### 6. Verify the snapshot

<Tabs groupId="baas-sdk">
<TabItem value="cli" label="CLI" default>

```bash
baas snapshot list --limit 5
```

</TabItem>
<TabItem value="go" label="Go SDK">

```go
resp, err := client.ListSnapshots("", 5) // cursor, limit
if err != nil {
	log.Fatal(err)
}
for _, s := range resp.Snapshots {
	log.Printf("id=%s desc=%s size=%d", s.SnapshotID, s.Description, s.TotalSize)
}
```

</TabItem>
<TabItem value="js" label="JS SDK">

```javascript
const resp = await client.listSnapshots("", 5); // cursor, limit
for (const s of resp.snapshots) {
  console.log(`id=${s.snapshotId} desc=${s.description} size=${s.totalSize}`);
}
```

</TabItem>
</Tabs>

You can also see it in the portal: **Backup Sources** → your source → the new snapshot is at the top, with its size, chunk count, and paths.

:::tip A backup you have never restored is not a backup
Prove it round-trips before you rely on it. Restore into a **scratch** directory — never over live data — and check the contents:

```bash
baas restore <snapshotId> ./restore-check
find ./restore-check -type f -print
```

Then load `./restore-check/db-dumps/app.dump` into a throwaway database with `pg_restore`. Full walkthrough: [recovery drill](/how-to/upload-and-snapshot-management#restore-a-snapshot-recovery-drill).
:::

---

### 7. What's next?

- 🤖 [Automated backup with scheduling](/tutorials/automated-backup) — turn this into a nightly cron or systemd job with a retention policy
- 📸 [Upload & manage snapshots](/how-to/upload-and-snapshot-management) — list, inspect, prune, delete, restore, and client-side encryption
- 🗝️ [API Keys](/how-to/api-keys-for-backup-jobs) — scoping and rotation for automation
- 🏢 [Workspaces and members](/how-to/workspaces-and-members) — share a workspace with your team
- 🩺 [Troubleshooting](/how-to/troubleshooting) — common errors and fixes
