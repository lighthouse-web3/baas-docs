---
sidebar_position: 9
---

# Troubleshooting

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

Common errors when setting up automated backups, and how to resolve them. These are drawn from real deployments (e.g. backing up a Strapi SQLite database to a scheduled job).

## Authentication

### `not authenticated …`

No credential was set. Pass an API key (Go: `APIKey`, JS: `apiKey`) — or a `Token` / `token` — when constructing the client, or call `SetAPIKey` / `setAPIKey`.

### `401` — token rejected

The key was revoked or expired. Create a new one in the portal (keys are immutable; you cannot edit an existing one).

### `403` — insufficient scope

The API key lacks a required scope. Mint a **new** key with the missing scope — see the [scope cheat-sheet](/how-to/api-keys-for-backup-jobs#scope-cheat-sheet). Keys cannot be re-scoped after creation.

## Storage & quota

### `413` — `Storage limit exceeded`

The workspace has reached its storage limit. Check current usage against the limit on the **Workspaces** page in the portal.

**Fixes:**

1. **Prune** old snapshots to free space and retry — see [prune](/how-to/upload-and-snapshot-management#prune-snapshots-retention) (or set `BACKUPDATA_KEEP_LATEST` in the [automated job](/tutorials/automated-backup)).
2. **Upgrade** the workspace for more capacity — see [pricing](https://backupdata.io/#pricing).

If you receive this error while the portal shows the workspace well under its limit, that is not expected — contact [mail@backupdata.io](mailto:mail@backupdata.io) with your workspace ID rather than working around it, so we can correct the accounting.

## Build & environment

### `command 'go' not found` (in cron / systemd / CI)

You installed Go from the tarball into `/usr/local/go`, but non-interactive shells (cron jobs, systemd services, CI runners) **do not** load `~/.bashrc`, so your `PATH` export is missing.

**Fixes:**

- Call the Go toolchain by its **absolute path** when building: `/usr/local/go/bin/go build -o /root/bin/bd-backup .`
- Better: **build the uploader once** into a static binary and have the scheduler run that binary by absolute path (`/root/bin/bd-backup`) — no Go needed at runtime.
- If a unit really must find `go`, set `Environment=PATH=/usr/local/go/bin:/usr/bin:/bin` in the systemd service.

### `keyResp.KeyPrefix undefined (type types.APIKeyCreateResponse has no field or method KeyPrefix)`

`CreateAPIKey` / `createAPIKey` returns an `APIKeyCreateResponse`. The prefix lives on the **nested** `APIKey` / `apiKey`, not the top-level response.

<Tabs groupId="baas-sdk">
<TabItem value="go" label="Go SDK" default>

```go
keyResp, _ := client.CreateAPIKey(req)

plain  := keyResp.Plaintext()        // the raw lh_… key — store now, shown once
prefix := keyResp.APIKey.KeyPrefix   // the prefix (safe to log)
id     := keyResp.APIKey.APIKeyID
```

</TabItem>
<TabItem value="js" label="JS SDK">

```javascript
const keyResp = await client.createAPIKey(req);

const plain = apiKeyPlaintext(keyResp);  // the raw lh_… key — store now, shown once
const prefix = keyResp.apiKey.keyPrefix; // the prefix (safe to log)
const id = keyResp.apiKey.apiKeyId;
```

</TabItem>
<TabItem value="cli" label="CLI">

:::info Not available in CLI (v0.1.5)
API-key management is **SDK + Portal only** — the `baas` CLI (v0.1.5) authenticates with an existing `lh_…` key, it does not mint/list/revoke keys.

- **Recommended:** [Portal → API Keys](/how-to/web-portal-quickstart#3-generate-a-scoped-api-key)
- **Programmatic:** `client.createAPIKey()` / `client.listAPIKeys()` / `client.deleteAPIKey()` — see JS / Go tabs.
:::

</TabItem>
</Tabs>

## Backup behavior

### Backup re-uploads everything each run

The target's `.lighthouse/source_id` file was deleted or changed, so the dedup/source history was lost. Preserve that file (and the `.lighthouse` directory) between runs so incremental backups line up under one Backup Source.

### Connection / DNS errors

Check that `APIURL` is the **API host** `https://api.backupdata.io` — not the portal host `backupdata.io`.

## SQLite-specific

### Backup file is corrupt or locked

Don't copy `data.db` with `cp` while the app is running. Use SQLite's online backup, which is safe against concurrent writers:

```bash
sqlite3 /path/to/app.db ".backup './db-dumps/app.sqlite'"
```

See [Back up SQLite](/tutorials/dump-sqlite).
