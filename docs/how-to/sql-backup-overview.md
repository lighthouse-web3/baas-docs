---
sidebar_position: 1
---

# Database Backup Guides

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

This guide set covers an end-to-end flow for backing up databases with BackupData.io, available through the **Go SDK**, **JavaScript/TypeScript SDK**, and **CLI**. The reference snippets focus on SQL (PostgreSQL/MySQL), and the [Tutorials](/tutorials/overview) section adds full, copy-paste recipes for MongoDB, SQLite, Amazon DynamoDB, and Amazon S3.

## Requirements

- **Go 1.24+** (Go SDK) or **Node.js 18+** (JS SDK or CLI)
- A BackupData.io account and a workspace (you get one free with **5 GB** — see [Web Portal & Free Workspace](/how-to/web-portal-quickstart))
- An **API key** scoped for backup/restore

## Install the SDK

<Tabs groupId="baas-sdk">
<TabItem value="go" label="Go SDK" default>

```bash
go get github.com/Backup-Data-io/go-sdk@latest
```

</TabItem>
<TabItem value="js" label="JS SDK">

```bash
npm install @lighthouse-web3/baas-js-sdk
```

</TabItem>
<TabItem value="cli" label="CLI">

```bash
npm install -g @lighthouse-web3/baas-js-sdk
baas --help
```

</TabItem>
</Tabs>

Imports used throughout these guides:

<Tabs groupId="baas-sdk">
<TabItem value="go" label="Go SDK" default>

```go
import (
    sdkclient "github.com/Backup-Data-io/go-sdk/client"
    sdktypes  "github.com/Backup-Data-io/go-sdk/types"
)
```

</TabItem>
<TabItem value="js" label="JS SDK">

```javascript
import { BackupClient } from "@lighthouse-web3/baas-js-sdk";
```

</TabItem>
<TabItem value="cli" label="CLI">

No import is required. Authenticate once and select a workspace before running backup commands:

```bash
baas auth login --api-key
baas workspace list
baas workspace use <workspaceId>
```

</TabItem>
</Tabs>

## End-to-end flow

For a solo setup, follow this spine:

1. [Sign in to the portal](/how-to/web-portal-quickstart) and use the default free workspace
2. [Create an API key](/how-to/api-keys-for-backup-jobs) for the Go SDK
3. [Create a database dump](/how-to/sql-dump-commands) (or use the [full tutorial](/tutorials/overview) for your database)
4. [Upload the dump and manage snapshots](/how-to/upload-and-snapshot-management)

For team setups, add these when needed:

- [Workspaces and members](/how-to/workspaces-and-members)
- [Roles, scopes, and permissions](/how-to/workspace-roles-scopes-and-permissions)
- [Authentication options](/how-to/authentication)

## The backup pipeline

`Backup()` runs the full pipeline in one call:

```
scan → chunk (FastCDC) → deduplicate → compress → encrypt if configured → upload packs → create snapshot
```

It is **incremental** — unchanged files reuse existing chunks, so only new data is uploaded (and only new data counts against your storage limit). Restores decrypt encrypted snapshots when you provide the keyfile/passphrase, then reverse the rest of the pipeline and **verify integrity** against expected chunk hashes before reassembling your files.

## Want the fast path?

If you just want a working scheduled backup for your database, jump to **[Tutorials → Automated backup with scheduling](/tutorials/automated-backup)** — it combines a dump script, the SDK uploader, and a cron schedule into one automated job.
