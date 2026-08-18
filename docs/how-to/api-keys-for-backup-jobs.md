---
sidebar_position: 6
---

# API Keys

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

API keys are the credential your automation (cron, CI, servers) uses to talk to Backup Data. Each key belongs to **one workspace**, carries a fixed set of **scopes**, and is **shown in full only once**.

:::tip The portal is the most reliable way to mint a key
Generating a key in the [portal](/how-to/web-portal-quickstart#3-generate-a-scoped-api-key) (point, click, copy) is the recommended path. The examples below assume you are **already authenticated** with a portal key or another supported login method; see [Authentication](/how-to/authentication).
:::

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
import {
  BackupClient,
  apiKeyPlaintext,
  ScopeBackupWrite,
  ScopeBackupRead,
  ScopeSnapshotsRead,
} from "@backupdata/js-sdk";
```

</TabItem>
<TabItem value="cli" label="CLI">

Install the CLI — it is stateless and takes the portal key per command (no stored profile):

```bash
npm install -g @backupdata/js-sdk
export BACKUPDATA_API_KEY="lh_..."          # from Portal → API Keys
export BACKUPDATA_WORKSPACE_ID="<id>"       # from Portal → Workspaces
baas snapshots --limit 5                    # authenticates from env
# or per-command: baas snapshots --api-key lh_... --workspace <id> --limit 5
```

</TabItem>
</Tabs>

## Scope cheat-sheet

Grant only what the integration needs:

| Task | Required scope(s) |
|------|-------------------|
| Backup | `backup:write` (and `backup:read` for dedup) |
| List / inspect snapshots | `snapshots:read` |
| Prune snapshots | `snapshots:read` + `backup:write` |
| Delete a snapshot | `backup:write` |
| Restore | `restore:read`, `restore:write` |
| Read profile / usage | `user:read` |
| Create / list / revoke API keys | `api_keys:manage` |
| Create or modify workspaces and members | `workspace:manage` |

A backup runner needs none of the last two — grant `api_keys:manage` or `workspace:manage` only to keys that genuinely administer the workspace, since a key holding `api_keys:manage` can mint further keys.

If a call returns **403 / insufficient scope**, mint a new key with the missing scope — **keys are immutable once created**.

## Create a key

Create a dedicated key for your backup runner.

<Tabs groupId="baas-sdk">
<TabItem value="go" label="Go SDK" default>

```go
import "time"

expires := time.Now().AddDate(0, 3, 0).UTC().Format(time.RFC3339) // 3 months

keyResp, err := client.CreateAPIKey(sdktypes.APIKeyCreateRequest{
	Name:        "nightly-postgres-backup",
	WorkspaceID: workspaceID,
	Scopes: []string{
		sdktypes.ScopeBackupWrite,
		sdktypes.ScopeBackupRead,
		sdktypes.ScopeSnapshotsRead,
	},
	ExpiresAt: expires,
})
if err != nil {
	log.Fatal(err)
}

plain := keyResp.Plaintext()       // the raw lh_… key; store securely, returned once
prefix := keyResp.APIKey.KeyPrefix // safe-to-log prefix
id := keyResp.APIKey.APIKeyID      // id for later revoke
log.Printf("NEW API KEY (store now): %s (prefix=%s id=%s)", plain, prefix, id)
```

</TabItem>
<TabItem value="js" label="JS SDK">

```javascript
// 3 months from now
const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

const keyResp = await client.createAPIKey({
  name: "nightly-postgres-backup",
  workspaceId,
  scopes: [ScopeBackupWrite, ScopeBackupRead, ScopeSnapshotsRead],
  expiresAt,
});

const plain = apiKeyPlaintext(keyResp);  // the raw lh_… key; store securely, returned once
const prefix = keyResp.apiKey.keyPrefix; // safe-to-log prefix
const id = keyResp.apiKey.apiKeyId;      // id for later revoke
console.log(`NEW API KEY (store now): ${plain} (prefix=${prefix} id=${id})`);
```

</TabItem>
<TabItem value="cli" label="CLI">

:::info Not available in CLI (v0.1.5)
API-key creation is **SDK + Portal only**. The `baas` CLI authenticates with an existing `lh_…` key (`--api-key` or `BACKUPDATA_API_KEY`) — it does not mint keys.

- **Recommended:** [Portal → API Keys → Create New API Key](/how-to/web-portal-quickstart#3-generate-a-scoped-api-key) — copy the `lh_…` value once.
- **Programmatic:** `client.createAPIKey()` (JS) / `client.CreateAPIKey()` (Go) — see the JS / Go tabs.
:::

</TabItem>
</Tabs>

:::note Response shape
`CreateAPIKey` / `createAPIKey` returns an `APIKeyCreateResponse`. The plaintext key is `keyResp.Plaintext()` (Go) / `apiKeyPlaintext(keyResp)` (JS); the **prefix, id, scopes, and expiry live on the nested `keyResp.APIKey` / `keyResp.apiKey`** — e.g. `keyResp.apiKey.keyPrefix`, not `keyResp.keyPrefix`.
:::

> Store the plaintext key in a secrets manager or environment variable (e.g. `BACKUPDATA_API_KEY`). After this call you can only ever see its prefix again.

## List API keys

<Tabs groupId="baas-sdk">
<TabItem value="go" label="Go SDK" default>

```go
keys, err := client.ListAPIKeys()
if err != nil {
	log.Fatal(err)
}
for _, k := range keys {
	log.Printf("apiKeyId=%s name=%s status=%s prefix=%s", k.APIKeyID, k.Name, k.Status, k.KeyPrefix)
}
```

</TabItem>
<TabItem value="js" label="JS SDK">

```javascript
const keys = await client.listAPIKeys();
for (const k of keys) {
  console.log(
    `apiKeyId=${k.apiKeyId} name=${k.name} status=${k.status} prefix=${k.keyPrefix}`,
  );
}
```

</TabItem>
<TabItem value="cli" label="CLI">

:::info Not available in CLI (v0.1.5)
Listing API keys is **SDK + Portal only**.

- **Portal:** **API Keys** → table (prefix, name, status).
- **Programmatic:** `client.listAPIKeys()` (JS) / `client.ListAPIKeys()` (Go) — see JS / Go tabs.
:::

</TabItem>
</Tabs>

## Revoke an API key

<Tabs groupId="baas-sdk">
<TabItem value="go" label="Go SDK" default>

```go
err := client.DeleteAPIKey("add-your-api-key-id")
if err != nil {
	log.Fatal(err)
}
```

</TabItem>
<TabItem value="js" label="JS SDK">

```javascript
await client.deleteAPIKey("add-your-api-key-id");
```

</TabItem>
<TabItem value="cli" label="CLI">

:::info Not available in CLI (v0.1.5)
Revoking API keys is **SDK + Portal only**.

- **Portal:** **API Keys** → ⋯ → **Revoke**.
- **Programmatic:** `client.deleteAPIKey(id)` (JS) / `client.DeleteAPIKey(id)` (Go) — see JS / Go tabs.
:::

</TabItem>
</Tabs>

## Rotation tips

- Give automation keys a hard **`ExpiresAt`** and rotate before expiry.
- One key per job/environment makes revocation blast-radius small.
- Because keys are immutable, "changing scopes" means creating a new key and revoking the old one.

For how scopes combine with workspace roles (the intersection rule), see [Roles, scopes, and permissions](/how-to/workspace-roles-scopes-and-permissions#api-keys-and-workspaces).
