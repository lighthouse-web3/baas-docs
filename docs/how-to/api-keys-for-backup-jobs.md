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
    sdkclient "github.com/lighthouse-web3/baas-go-sdk/client"
    sdktypes  "github.com/lighthouse-web3/baas-go-sdk/types"
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
} from "@lighthouse-web3/baas-js-sdk";
```

</TabItem>
<TabItem value="cli" label="CLI">

Install the CLI, then authenticate with a portal-created key or another supported login method:

```bash
npm install -g @lighthouse-web3/baas-js-sdk
baas auth login --api-key
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

```bash
baas apikey create \
  --name nightly-postgres-backup \
  --scope backup:write \
  --scope backup:read \
  --scope snapshots:read \
  --expires 2026-10-21T00:00:00Z
```

</TabItem>
</Tabs>

:::note Response shape
`CreateAPIKey` / `createAPIKey` returns an `APIKeyCreateResponse`. The plaintext key is `keyResp.Plaintext()` (Go) / `apiKeyPlaintext(keyResp)` (JS); the **prefix, id, scopes, and expiry live on the nested `keyResp.APIKey` / `keyResp.apiKey`** — e.g. `keyResp.apiKey.keyPrefix`, not `keyResp.keyPrefix`.
:::

> Store the plaintext key in a secrets manager or environment variable (e.g. `BD_API_KEY`). After this call you can only ever see its prefix again.

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

```bash
baas apikey list
```

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

```bash
baas apikey revoke add-your-api-key-id --yes
```

</TabItem>
</Tabs>

## Rotation tips

- Give automation keys a hard **`ExpiresAt`** and rotate before expiry.
- One key per job/environment makes revocation blast-radius small.
- Because keys are immutable, "changing scopes" means creating a new key and revoking the old one.

For how scopes combine with workspace roles (the intersection rule), see [Roles, scopes, and permissions](/how-to/workspace-roles-scopes-and-permissions#api-keys-and-workspaces).
