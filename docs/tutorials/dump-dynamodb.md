---
sidebar_position: 6
---

# Back up Amazon DynamoDB

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

DynamoDB is a managed NoSQL service, so a "dump" means **exporting table items** to a local file you can upload. This guide covers the two common approaches: a quick `scan` for small/medium tables, and the AWS-native point-in-time export to S3 for large tables.

## Prerequisites

- The [AWS CLI v2](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html):
  - macOS: `brew install awscli`
  - Linux: AWS-provided installer
- AWS credentials configured (`aws configure`) with at least `dynamodb:Scan` (and `dynamodb:DescribeTable`) on the table.

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

### Option A — `scan` to JSON (simple, small/medium tables)

```bash
aws dynamodb scan \
  --table-name app_table \
  --output json \
  > ./db-dumps/app_table.json
```

This writes every item (in DynamoDB JSON format) to one file. The AWS CLI **paginates automatically** — DynamoDB returns at most 1 MB per underlying request, but the CLI follows `LastEvaluatedKey` for you and emits a single merged `Items` array, so the command above is complete as written.

For a large table, write **newline-delimited JSON** instead — it streams, diffs better between runs, and avoids holding one huge array in memory:

```bash
aws dynamodb scan --table-name app_table --output json \
  | jq -c '.Items[]' > ./db-dumps/app_table.ndjson
```

:::note Don't hand-roll pagination
`--starting-token` takes the CLI's own opaque pagination token, **not** the `LastEvaluatedKey` attribute map from the response — feeding one into the other fails. Let the CLI paginate, or use `--no-paginate` with `--starting-token` only if you are deliberately checkpointing across runs.
:::

:::warning Cost & throughput
A full `scan` reads the entire table and consumes read capacity. For large or production tables, prefer Option B (managed export), which does **not** consume table capacity.
:::

### Option B — Point-in-time export to S3 (large tables, no capacity cost)

Requires point-in-time recovery (PITR) enabled on the table.

```bash
aws dynamodb export-table-to-point-in-time \
  --table-arn arn:aws:dynamodb:us-east-1:123456789012:table/app_table \
  --s3-bucket your-export-bucket \
  --export-format DYNAMODB_JSON
```

Then pull the export down so the Backup Data job can upload it (see [Amazon S3](/tutorials/dump-s3)):

```bash
aws s3 sync s3://your-export-bucket/AWSDynamoDB ./db-dumps/dynamodb-export
```

## 3. Verify the dump

```bash
ls -lh ./db-dumps/app_table.json
jq '.Items | length' ./db-dumps/app_table.json   # item count; also proves it parses
```

If you used the newline-delimited form:

```bash
jq -s 'length' ./db-dumps/app_table.ndjson   # item count
```

## 4. Restore (recovery test)

For the `scan` output, re-import items with `batch-write-item`. The API accepts a **maximum of 25 items per call**, so the items must be chunked — `_nwise` does that:

```bash
jq -c '[.Items[] | { PutRequest: { Item: . } }] | _nwise(25)
       | { "app_table_restore": . }' ./db-dumps/app_table.json \
  | while read -r batch; do
      aws dynamodb batch-write-item --request-items "$batch"
    done
```

For the newline-delimited form, slurp it first:

```bash
jq -s -c '[.[] | { PutRequest: { Item: . } }] | _nwise(25)
          | { "app_table_restore": . }' ./db-dumps/app_table.ndjson \
  | while read -r batch; do
      aws dynamodb batch-write-item --request-items "$batch"
    done
```

:::warning Check for unprocessed items
`batch-write-item` can partially succeed under throttling and return the remainder in `UnprocessedItems`. For anything beyond a small recovery test, capture the response and retry those items with backoff.
:::

For Option B exports, use AWS's [import-table](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/S3DataImport.HowItWorks.html) from S3.

## 5. Upload to BackupData.io

Your export is now in `./db-dumps`. Construct the SDK client with the API key from step 1 and upload the directory as a snapshot. This reads `BACKUPDATA_API_KEY` and `BACKUPDATA_WORKSPACE_ID` from the environment (exported in step 1):

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
		Description: "dynamodb export",
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
  description: "dynamodb export",
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
baas backup ./db-dumps --description "DynamoDB backup" --tag database=dynamodb
```

</TabItem>
</Tabs>

To run this on a schedule, use **[Automated backup with scheduling](/tutorials/automated-backup)**.

The dump command for this table, ready to drop into the scheduled job's `make_dump()`:

```bash
aws dynamodb scan --table-name app_table --output json > ./db-dumps/app_table.json
```
