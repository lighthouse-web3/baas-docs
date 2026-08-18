---
sidebar_position: 3
---

# Back up MySQL / MariaDB

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

Create a consistent dump of a MySQL or MariaDB database, verify it, and prepare it for upload to BackupData.io.

## Prerequisites

- The `mysqldump` client (ships with the MySQL/MariaDB client packages):
  - macOS: `brew install mysql-client` (or `mariadb`)
  - Debian/Ubuntu: `sudo apt-get install mysql-client` (or `mariadb-client`)
- Credentials for a user with `SELECT`, `LOCK TABLES`, `SHOW VIEW`, `TRIGGER`, and (for `--routines`) `EVENT` privileges.

## 1. Sign in & create an API key

You need a BackupData.io account, a workspace, and an **API key** before you can upload a backup.

1. Sign in to the portal and claim your free 5 GB workspace — see [Web Portal & Free Workspace](/how-to/web-portal-quickstart).
2. Create an API key scoped `backup:write`, `backup:read`, `snapshots:read` — see [API Keys](/how-to/api-keys-for-backup-jobs).
3. Export the credentials so the upload step can read them:

   ```bash
   export BACKUPDATA_API_KEY="lh_xxxxxxxxxxxxxxxxxxxxxxxx"
   export BACKUPDATA_WORKSPACE_ID="your-workspace-uuid"
   ```

> Already have a key? Continue to the dump step below.

## 2. Create the dump

Create the local dump directory once:

```bash
mkdir -p ./db-dumps
```

```bash
mysqldump \
  --host=127.0.0.1 \
  --port=3306 \
  --user=root \
  --password='your_password' \
  --single-transaction \
  --quick \
  --routines \
  --triggers \
  app_db > ./db-dumps/app.sql
```

| Flag | Why |
|------|-----|
| `--single-transaction` | Consistent snapshot of InnoDB tables **without locking** writers. |
| `--quick` | Streams rows instead of buffering large tables in memory. |
| `--routines` | Include stored procedures and functions. |
| `--triggers` | Include triggers (included by default, shown for clarity). |
| `app_db` | The database to dump. |

:::tip Keep the password out of history
Put credentials in a [`~/.my.cnf`](https://dev.mysql.com/doc/refman/8.0/en/option-files.html) file (`[client]` section) and drop `--password` so it isn't visible in `ps` or shell history.
:::

### Dump all databases

```bash
mysqldump --host=127.0.0.1 --user=root --password='your_password' \
  --single-transaction --quick --routines --triggers \
  --all-databases > ./db-dumps/all.sql
```

## 3. Verify the dump

```bash
ls -lh ./db-dumps/app.sql
tail -n 1 ./db-dumps/app.sql   # a complete dump ends with: -- Dump completed on ...
```

## 4. Restore (recovery test)

Restore into a throwaway database:

```bash
mysql --host=127.0.0.1 --user=root --password='your_password' \
  -e "CREATE DATABASE app_db_restore"

mysql --host=127.0.0.1 --user=root --password='your_password' \
  app_db_restore < ./db-dumps/app.sql
```

## 5. Upload to BackupData.io

Your dump is now in `./db-dumps`. Construct the SDK client with the API key from step 1 and upload the directory as a snapshot. This reads `BACKUPDATA_API_KEY` and `BACKUPDATA_WORKSPACE_ID` from the environment (exported in step 1):

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
		APIKey:      os.Getenv("BACKUPDATA_API_KEY"),
		WorkspaceID: os.Getenv("BACKUPDATA_WORKSPACE_ID"),
	})
	if err != nil {
		log.Fatalf("client init: %v", err)
	}

	snapshot, err := client.Backup([]string{"./db-dumps"}, &sdktypes.BackupOptions{
		Description: "mysql dump",
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
import { BackupClient } from "@backupdata/js-sdk";

const client = new BackupClient({
  apiKey: process.env.BACKUPDATA_API_KEY,
  workspaceId: process.env.BACKUPDATA_WORKSPACE_ID,
});

const snapshot = await client.backup(["./db-dumps"], {
  description: "mysql dump",
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
baas backup ./db-dumps --description "MySQL backup" --tag database=mysql
```

</TabItem>
</Tabs>

To run this on a schedule, use **[Automated backup with scheduling](/tutorials/automated-backup)**.

The dump command for this database, ready to drop into the scheduled job's `make_dump()`:

```bash
mysqldump --host=127.0.0.1 --port=3306 --user=root --password="$DB_PASSWORD" \
  --single-transaction --quick --routines --triggers \
  app_db > ./db-dumps/app.sql
```
