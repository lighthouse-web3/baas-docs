---
sidebar_position: 1
---

# Backup Data Introduction

**Backup Data** is a backup-as-a-service platform that helps you set up backup and restore workflows without having to build and maintain your own backup system.

Use the Go SDK, JavaScript/TypeScript SDK, or CLI to implement authentication, optional workspace-level access control, automated backup jobs, snapshot-based recovery, and backup lifecycle operations. Backup data is stored on BackupData.io for long-term retention.

:::info Free tier
Every new account starts with a **free workspace that includes 5 GB of storage**. No setup or payment is required to begin backing up. Past 5 GB, upgrade to paid storage before retaining additional backup data; see [pricing](https://backupdata.io/#pricing).
:::

## What you can do with Backup Data

- Authenticate using an API key or email/password
- Organize backups by workspace for teams and projects
- Manage members, roles, and scope-based permissions
- Create and rotate API keys for cron/CI backup jobs
- **Incremental, content-addressed backups** — only changed data is uploaded (FastCDC chunking + deduplication)
- Optionally encrypt backup data client-side before upload
- Compress backup data to reduce storage size and speed up transfer
- Verify backup integrity with checksums before recovery and restore operations
- Upload backup data and manage snapshots (list, inspect, prune, delete, restore)

## Portal, SDK, and CLI

Backup Data has three surfaces that work together:

| Surface | Host | Who uses it | What for |
|---------|------|-------------|----------|
| **Web portal** | `backupdata.io` | Humans | Log in, manage workspaces & members, mint API keys, browse snapshots |
| **SDK (Go / JS)** | `api.backupdata.io` | Your servers / CI | Integrate backups, restores, and snapshot lifecycle into code |
| **CLI (`baas`)** | `api.backupdata.io` | Operators, scripts, CI | Run backups, restores, and snapshot lifecycle from the terminal |

With the **Go SDK**, point `APIURL` at the **API host** (`https://api.backupdata.io`) when you create the client. The **JS SDK** and **CLI** target the API host internally, so there is no API URL to set.

## How this documentation is organized

The default path is a solo quickstart: sign in, create one API key, create a dump, then upload it as a snapshot. Team administration is an optional layer you can add when you need shared workspaces, members, roles, or scoped permissions.

**In a hurry?** The **[Quick Start](/quick-start)** walks that whole path end to end in about five minutes. The pages below go deeper on each step.

**Solo quickstart:**

1. [Web Portal & Free Workspace](/how-to/web-portal-quickstart) — sign in and use your default workspace
2. [API Keys](/how-to/api-keys-for-backup-jobs) — create the key used by the SDK or CLI
3. [Backup database (quick reference)](/how-to/sql-dump-commands) — create a local dump
4. [Upload Backup Data and Manage Snapshots](/how-to/upload-and-snapshot-management) — upload the dump and verify the snapshot

**Optional team layer:**

- [Workspaces and members](/how-to/workspaces-and-members)
- [Roles, scopes, and permissions](/how-to/workspace-roles-scopes-and-permissions)
- [Authentication](/how-to/authentication) — API key client setup
- [Troubleshooting](/how-to/troubleshooting)

**Tutorials — full backup recipes:**

- [Tutorials overview](/tutorials/overview)
- Per-database dumps: [PostgreSQL](/tutorials/dump-postgresql), [MySQL](/tutorials/dump-mysql), [SQLite](/tutorials/dump-sqlite), [MongoDB](/tutorials/dump-mongodb), [Amazon DynamoDB](/tutorials/dump-dynamodb), [Amazon S3](/tutorials/dump-s3)
- [Automated backup with scheduling](/tutorials/automated-backup) — dump + upload + cron

## Developer workflow

A typical implementation pattern is:

- Run a scheduled database dump job that updates one rolling dump file
- Call the SDK `Backup()` / `backup()` flow or `baas backup` from automation to upload it as a new snapshot
- Enable client-side encryption when your backup policy requires customer-managed encryption keys
- Use snapshots as immutable restore points; apply a retention/prune policy
- Periodically validate restore paths in a recovery drill
