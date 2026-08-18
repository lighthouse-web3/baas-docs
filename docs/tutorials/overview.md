---
sidebar_position: 1
---

# Tutorials overview

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

These tutorials are **end-to-end backup recipes**. Each one walks through producing a consistent dump of a specific database, verifying it, optionally restoring it, and uploading it to BackupData.io. Use the scheduling guide after the one-off flow works.

## How the tutorials fit together

Every database backup follows the same two-stage shape:

```
┌─────────────────────────┐     ┌──────────────────────────────┐
│  Stage 1 — Create a dump │ ──▶ │  Stage 2 — Upload snapshot   │
│  (per-database guide)    │     │  (per-database guide)        │
└─────────────────────────┘     └──────────────────────────────┘
        app.dump / app.sql              ./db-dumps  ──▶  snapshot
```

- **Stage 1** is database-specific. Pick your database below.
- **Stage 2** uses the same minimal backup operation in every database tutorial (`Backup()` in Go, `backup()` in JS, or `baas backup` in the CLI).
- Scheduling is optional. When you are ready, use **[Automated backup with scheduling](/tutorials/automated-backup)** to wrap the dump and upload in cron or a systemd timer.

All dumps land in a single `./db-dumps` directory using a **stable filename** that you overwrite each run. The SDK then uploads that directory as an incremental snapshot.

## Pick your database

| Database | Dump tool | Guide |
|----------|-----------|-------|
| 🐘 PostgreSQL | `pg_dump` | [PostgreSQL](/tutorials/dump-postgresql) |
| 🐬 MySQL / MariaDB | `mysqldump` | [MySQL](/tutorials/dump-mysql) |
| 🪶 SQLite | `sqlite3 .backup` | [SQLite](/tutorials/dump-sqlite) |
| 🍃 MongoDB | `mongodump` | [MongoDB](/tutorials/dump-mongodb) |
| ⚡ Amazon DynamoDB | `aws dynamodb` | [Amazon DynamoDB](/tutorials/dump-dynamodb) |
| 🪣 Amazon S3 | `aws s3 sync` | [Amazon S3](/tutorials/dump-s3) |

## Then automate it

Once you can produce a dump by hand, wire it into the scheduled job:

➡️ **[Automated backup with scheduling](/tutorials/automated-backup)** — a dump script + SDK uploader + cron/systemd timer for a nightly backup.

## Before you start

You'll need (once):

1. A BackupData.io account and workspace — [Web Portal & Free Workspace](/how-to/web-portal-quickstart).
2. An **API key** scoped `backup:write`, `backup:read`, `snapshots:read` — [API Keys](/how-to/api-keys-for-backup-jobs).
3. A Backup Data client installed (for the upload step):

   <Tabs groupId="baas-sdk">
   <TabItem value="go" label="Go SDK" default>

   ```bash
   go get github.com/Backup-Data-io/go-sdk@latest
   ```

   </TabItem>
   <TabItem value="js" label="JS SDK">

   ```bash
   npm install @backupdata/js-sdk
   ```

   </TabItem>
   <TabItem value="cli" label="CLI">

   ```bash
   npm install -g @backupdata/js-sdk
   baas --help
   ```

   </TabItem>
   </Tabs>

Export your credentials so every tutorial can reuse them:

```bash
export BACKUPDATA_API_KEY="lh_xxxxxxxxxxxxxxxxxxxxxxxx"
export BACKUPDATA_WORKSPACE_ID="550e8400-e29b-41d4-a716-446655440000"
```

For the CLI, use the same values with its environment variable names:

```bash
export BACKUPDATA_API_KEY="$BACKUPDATA_API_KEY"
export BACKUPDATA_WORKSPACE_ID="$BACKUPDATA_WORKSPACE_ID"
```
