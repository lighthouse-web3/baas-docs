---
sidebar_position: 7
---

# Back up Amazon S3

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

Mirror the contents of an S3 bucket (or prefix) to a local directory so BackupData.io can keep an independent, versioned copy outside AWS — useful for off-cloud redundancy and protection against accidental bucket deletion.

## Prerequisites

- The [AWS CLI v2](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html).
- AWS credentials with `s3:ListBucket` and `s3:GetObject` on the source bucket.

## 1. Sign in & create an API key

You need a BackupData.io account, a workspace, and an **API key** before you can upload a backup.

1. Sign in to the portal and claim your free 5 GB workspace — see [Web Portal & Free Workspace](/how-to/web-portal-quickstart).
2. Create an API key scoped `backup:write`, `backup:read`, `snapshots:read` — see [API Keys](/how-to/api-keys-for-backup-jobs).
3. Export the credentials so the upload step can read them:

   ```bash
   export BD_API_KEY="lh_xxxxxxxxxxxxxxxxxxxxxxxx"
   export BD_WORKSPACE_ID="your-workspace-uuid"
   ```

> Already have a key? Continue to the sync step below.

## 2. Sync the bucket locally

Create the local dump directory once:

```bash
mkdir -p ./db-dumps
```

`aws s3 sync` downloads only objects that are new or changed since the last run — a natural fit for the "overwrite in place, upload incrementally" pattern.

```bash
aws s3 sync s3://your-bucket ./db-dumps/your-bucket
```

Common refinements:

```bash
# Only a prefix/folder:
aws s3 sync s3://your-bucket/path/ ./db-dumps/your-bucket

# Mirror deletions too (remove local files deleted in S3):
aws s3 sync s3://your-bucket ./db-dumps/your-bucket --delete

# Limit by pattern:
aws s3 sync s3://your-bucket ./db-dumps/your-bucket \
  --exclude "*" --include "*.json"
```

:::tip Server-side vs. off-cloud copy
If you only need redundancy **within** AWS, S3 cross-region replication may be simpler. Use this guide when you specifically want a copy **outside** AWS (on BackupData.io).
:::

## 3. Verify the sync

```bash
du -sh ./db-dumps/your-bucket
find ./db-dumps/your-bucket -type f | wc -l   # local object count

# Compare against the bucket's object count:
aws s3 ls s3://your-bucket --recursive --summarize | tail -n 2
```

## 4. Restore (recovery test)

Push the local copy back into a **different** bucket/prefix to confirm it round-trips, without overwriting the source:

```bash
aws s3 sync ./db-dumps/your-bucket s3://your-restore-bucket
```

## 5. Upload to BackupData.io

Your mirror is now in `./db-dumps`. Construct the SDK client with the API key from step 1 and upload the directory as a snapshot. This reads `BD_API_KEY` and `BD_WORKSPACE_ID` from the environment (exported in step 1):

<Tabs groupId="baas-sdk">
<TabItem value="go" label="Go SDK" default>

```go
package main

import (
	"log"
	"os"

	sdkclient "github.com/lighthouse-web3/baas-go-sdk/client"
	sdktypes "github.com/lighthouse-web3/baas-go-sdk/types"
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
		Description: "s3 bucket mirror",
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
  description: "s3 bucket mirror",
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
baas backup ./db-dumps --description "S3 mirror backup" --tag source=s3
```

</TabItem>
</Tabs>

To run this on a schedule, use **[Automated backup with scheduling](/tutorials/automated-backup)**. Because both `aws s3 sync` and the SDK upload are incremental, repeated runs only transfer what changed.

The sync command for this bucket, ready to drop into the scheduled job's `make_dump()`:

```bash
aws s3 sync s3://your-bucket ./db-dumps/your-bucket --delete
```
