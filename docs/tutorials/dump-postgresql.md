---
sidebar_position: 2
---

# Back up PostgreSQL

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

Create a consistent dump of a PostgreSQL database, verify it, and prepare it for upload to BackupData.io.

## Prerequisites

- PostgreSQL client tools (`pg_dump`, `pg_restore`) — installed with the server, or:
  - macOS: `brew install libpq` (then add it to your `PATH`) or `brew install postgresql`
  - Debian/Ubuntu: `sudo apt-get install postgresql-client`
- Network access and credentials for the database (a **read-capable** user is enough).

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

Use the **custom format** (`--format=custom`). It is compressed, supports selective/parallel restore, and is the recommended format for `pg_restore`.

```bash
export PGPASSWORD='your_password'

pg_dump \
  --host=127.0.0.1 \
  --port=5432 \
  --username=postgres \
  --format=custom \
  --file=./db-dumps/app.dump \
  app_db
```

| Flag | Why |
|------|-----|
| `--format=custom` | Compressed, restore-friendly archive (use with `pg_restore`). |
| `--file` | **Stable path** — overwrite the same file each run for dedup-friendly uploads. |
| `--host` / `--port` / `--username` | Connection details. |
| `app_db` | The database to dump (last positional arg). |

:::tip Avoid passwords on the command line
Prefer a [`~/.pgpass`](https://www.postgresql.org/docs/current/libpq-pgpass.html) file or the `PGPASSWORD` environment variable over `--password` so credentials don't leak into shell history or process lists.
:::

### Dump everything (all databases)

```bash
pg_dumpall --host=127.0.0.1 --username=postgres --file=./db-dumps/all.sql
```

`pg_dumpall` produces a plain SQL file and also captures roles/tablespaces. Restore it with `psql`, not `pg_restore`.

## 3. Verify the dump

```bash
ls -lh ./db-dumps/app.dump
pg_restore --list ./db-dumps/app.dump | head   # should print the archive's table of contents
```

A non-empty file and a readable TOC mean the dump is valid.

## 4. Restore (recovery test)

Restore into a throwaway database to prove the dump works — never test over production.

```bash
createdb app_db_restore
pg_restore \
  --host=127.0.0.1 \
  --username=postgres \
  --dbname=app_db_restore \
  --clean --if-exists \
  ./db-dumps/app.dump
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
		Description: "postgresql dump",
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
  description: "postgresql dump",
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
baas backup ./db-dumps --description "PostgreSQL backup" --tag database=postgresql
```

</TabItem>
</Tabs>

To run this on a schedule, use **[Automated backup with scheduling](/tutorials/automated-backup)**.

The dump command for this database, ready to drop into the scheduled job's `make_dump()`:

```bash
export PGPASSWORD="$PGPASSWORD"
pg_dump --host=127.0.0.1 --port=5432 --username=postgres \
  --format=custom --file=./db-dumps/app.dump app_db
```
