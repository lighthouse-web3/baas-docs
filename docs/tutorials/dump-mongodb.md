---
sidebar_position: 5
---

# Back up MongoDB

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

Create a consistent dump of a MongoDB database with `mongodump`, verify it, and prepare it for upload to BackupData.io.

## Prerequisites

- **MongoDB Database Tools** (`mongodump`, `mongorestore`) — these are a separate download from the server:
  - macOS: `brew install mongodb-database-tools`
  - Debian/Ubuntu: install the [MongoDB Database Tools](https://www.mongodb.com/docs/database-tools/installation/installation/) package
- A connection string / URI with read access.

## 1. Sign in & create an API key

You need a BackupData.io account, a workspace, and an **API key** before you can upload a backup.

1. Sign in to the portal and claim your free 5 GB workspace — see [Web Portal & Free Workspace](/how-to/web-portal-quickstart).
2. Create an API key scoped `backup:write`, `backup:read`, `snapshots:read` — see [API Keys](/how-to/api-keys-for-backup-jobs).
3. Export the credentials so the upload step can read them:

   ```bash
   export BD_API_KEY="lh_xxxxxxxxxxxxxxxxxxxxxxxx"
   export BD_WORKSPACE_ID="your-workspace-uuid"
   ```

> Already have a key? Continue to the dump step below.

## 2. Create the dump

Create the local dump directory once:

```bash
mkdir -p ./db-dumps
```

The cleanest output for backup is a **single gzipped archive file** (`--archive` + `--gzip`), which fits the "one stable file" pattern perfectly:

```bash
mongodump \
  --uri="mongodb://user:pass@127.0.0.1:27017/app_db" \
  --archive=./db-dumps/app.archive \
  --gzip
```

| Flag | Why |
|------|-----|
| `--uri` | Full connection string (host, port, credentials, database). |
| `--archive=<file>` | Write a single archive file instead of a directory tree — ideal for upload. |
| `--gzip` | Compress the archive. |

### Dump the whole server

Omit the database from the URI to dump every database:

```bash
mongodump --uri="mongodb://user:pass@127.0.0.1:27017" \
  --archive=./db-dumps/all.archive --gzip
```

### Directory output (alternative)

If you prefer the classic BSON directory layout:

```bash
mongodump --uri="mongodb://user:pass@127.0.0.1:27017/app_db" \
  --out=./db-dumps/mongo --gzip
```

:::tip Point-in-time consistency
For replica sets, add `--oplog` to capture an oplog slice so the restore is consistent to a single point in time.
:::

## 3. Verify the dump

```bash
ls -lh ./db-dumps/app.archive
# Inspect archive contents without restoring:
mongorestore --archive=./db-dumps/app.archive --gzip --dryRun --verbose 2>&1 | head
```

## 4. Restore (recovery test)

Restore into a different database name to avoid touching the original:

```bash
mongorestore \
  --uri="mongodb://user:pass@127.0.0.1:27017" \
  --archive=./db-dumps/app.archive \
  --gzip \
  --nsFrom='app_db.*' --nsTo='app_db_restore.*'
```

## 5. Upload to BackupData.io

Your dump is now in `./db-dumps`. Construct the SDK client with the API key from step 1 and upload the directory as a snapshot. This reads `BD_API_KEY` and `BD_WORKSPACE_ID` from the environment (exported in step 1):

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
		Description: "mongodb dump",
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
  description: "mongodb dump",
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
baas backup ./db-dumps --description "MongoDB backup" --tag database=mongodb
```

</TabItem>
</Tabs>

To run this on a schedule, use **[Automated backup with scheduling](/tutorials/automated-backup)**.

The dump command for this database, ready to drop into the scheduled job's `make_dump()`:

```bash
mongodump --uri="$MONGO_URI" --archive=./db-dumps/app.archive --gzip
```
