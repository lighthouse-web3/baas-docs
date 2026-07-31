---
sidebar_position: 4
---

# Back up SQLite

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

SQLite is a single file, but you should **not** just copy that file while the app is running — a copy taken mid-write can be corrupt. Use SQLite's online backup, which produces a consistent copy safely.

## Prerequisites

- The `sqlite3` CLI:
  - macOS: ships with the OS, or `brew install sqlite`
  - Debian/Ubuntu: `sudo apt-get install sqlite3`
- Read access to the database file.

## 1. Sign in & create an API key

You need a BackupData.io account, a workspace, and an **API key** before you can upload a backup.

1. Sign in to the portal and claim your free 5 GB workspace — see [Web Portal & Free Workspace](/how-to/web-portal-quickstart).
2. Create an API key scoped `backup:write`, `backup:read`, `snapshots:read` — see [API Keys](/how-to/api-keys-for-backup-jobs).
3. Export the credentials so the upload step can read them:

   ```bash
   export BD_API_KEY="lh_xxxxxxxxxxxxxxxxxxxxxxxx"
   export BD_WORKSPACE_ID="your-workspace-uuid"
   ```

> Already have a key? Continue to the backup step below.

## 2. Create the backup

Create the local dump directory once:

```bash
mkdir -p ./db-dumps
```

### Option A — `.backup` (recommended)

Produces a consistent binary copy even while the database is in use:

```bash
sqlite3 /path/to/app.db ".backup './db-dumps/app.sqlite'"
```

This uses the online backup API, so it is safe against concurrent readers/writers.

### Option B — `.dump` (portable SQL text)

Emits a plain-SQL reconstruction — useful if you want a human-readable, diffable, cross-version backup:

```bash
sqlite3 /path/to/app.db ".dump" > ./db-dumps/app.sql
```

:::tip WAL mode
If your database uses Write-Ahead Logging (`journal_mode=WAL`), `.backup` already produces a consistent result. Avoid copying `app.db` together with stray `-wal`/`-shm` files manually.
:::

## 3. Verify the backup

```bash
ls -lh ./db-dumps/app.sqlite
sqlite3 ./db-dumps/app.sqlite "PRAGMA integrity_check;"   # should print: ok
```

## 4. Restore (recovery test)

The `.backup` output **is** a database file — just open it:

```bash
sqlite3 ./db-dumps/app.sqlite "SELECT count(*) FROM sqlite_master;"
```

For the `.dump` SQL form, recreate the database:

```bash
sqlite3 ./restore/app.db < ./db-dumps/app.sql
```

## 5. Upload to BackupData.io

Your backup is now in `./db-dumps`. Construct the SDK client with the API key from step 1 and upload the directory as a snapshot. This reads `BD_API_KEY` and `BD_WORKSPACE_ID` from the environment (exported in step 1):

<Tabs groupId="baas-sdk">
<TabItem value="go" label="Go SDK" default>

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
		Description: "sqlite backup",
	})
	if err != nil {
		log.Fatal(err)
	}
	log.Printf("snapshotId=%s", snapshot.SnapshotID)
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
  description: "sqlite backup",
});
console.log(`snapshotId=${snapshot.snapshotId}`);
```

Save as `upload.mjs` and run it from the directory containing `db-dumps`:

```bash
node upload.mjs
```

</TabItem>
<TabItem value="cli" label="CLI">

```bash
baas backup ./db-dumps --description "SQLite backup" --tag database=sqlite
```

</TabItem>
</Tabs>

To run this on a schedule, use **[Automated backup with scheduling](/tutorials/automated-backup)**.

The backup command for this database, ready to drop into the scheduled job's `make_dump()`:

```bash
sqlite3 /path/to/app.db ".backup './db-dumps/app.sqlite'"
```
