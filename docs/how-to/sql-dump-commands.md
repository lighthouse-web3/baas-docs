---
sidebar_position: 7
---

# Backup database (quick reference)

This page is a **cheat-sheet** of the most common dump commands. For full, copy-paste recipes — including restore steps and an automated, scheduled job — use the per-database **[Tutorials](/tutorials/overview)**.

Create a local dump folder first:

```bash
mkdir -p ./db-dumps
```

Use a **single rolling dump file** and overwrite it each run. Do not create a new timestamped filename every day — a stable path keeps uploads dedup-friendly while still producing a fresh snapshot each time.

## PostgreSQL (custom-format dump)

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

→ Full guide: [Tutorials → PostgreSQL](/tutorials/dump-postgresql)

## MySQL / MariaDB (single transaction dump)

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

→ Full guide: [Tutorials → MySQL](/tutorials/dump-mysql)

## SQLite (consistent online backup)

```bash
sqlite3 /path/to/app.db ".backup './db-dumps/app.sqlite'"
```

→ Full guide: [Tutorials → SQLite](/tutorials/dump-sqlite)

## MongoDB (archive dump)

```bash
mongodump --uri="mongodb://user:pass@127.0.0.1:27017/app_db" \
  --archive=./db-dumps/app.archive --gzip
```

→ Full guide: [Tutorials → MongoDB](/tutorials/dump-mongodb)

## Amazon DynamoDB (table export to JSON)

```bash
aws dynamodb scan --table-name app_table \
  --output json > ./db-dumps/app_table.json
```

→ Full guide: [Tutorials → Amazon DynamoDB](/tutorials/dump-dynamodb)

## Amazon S3 (sync a bucket locally)

```bash
aws s3 sync s3://your-bucket ./db-dumps/your-bucket
```

→ Full guide: [Tutorials → Amazon S3](/tutorials/dump-s3)

---

Once a dump exists in `./db-dumps`, upload it with the SDK — see [Upload Backup Data and Manage Snapshots](/how-to/upload-and-snapshot-management), or wire the whole thing into a cron job with [Automated backup with scheduling](/tutorials/automated-backup).
