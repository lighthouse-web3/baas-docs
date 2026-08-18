---
sidebar_position: 3
---

# Authentication

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

Authenticate with an **API key** — the simplest and most reliable flow for servers, CI, and cron jobs. Mint an `lh_…` key in the [portal](/how-to/web-portal-quickstart#3-generate-a-scoped-api-key) and pass it when you construct the client.

All snippets use these imports:

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
import { BackupClient } from "@backupdata/js-sdk";
```

</TabItem>
<TabItem value="cli" label="CLI">

```bash
npm install -g @backupdata/js-sdk
baas --help
```

The `baas` CLI is **stateless** (v0.1.5) — it does not store a profile and has no `auth login` / `auth whoami`. Pass the portal key per invocation:

```bash
export BACKUPDATA_API_KEY="lh_..."          # from Portal → API Keys
export BACKUPDATA_WORKSPACE_ID="<id>"       # from Portal → Workspaces
baas snapshots --limit 5
baas backup ./db-dumps --api-key lh_... --workspace <id>
```

`--private-key 0x...` / `BACKUPDATA_PRIVATE_KEY` is accepted as an alternative to `--api-key`.

</TabItem>
</Tabs>

:::info Use an API key for automation
For servers, CI, and cron jobs, **mint an API key in the [portal](/how-to/web-portal-quickstart#3-generate-a-scoped-api-key)** and use the API key flow below. It is the most reliable path.
:::

## API key (recommended for automation)

This is the simplest and most common flow for backup jobs. When you pass an API key, the client is **already authenticated** — you do **not** call `Authenticate()`.

<Tabs groupId="baas-sdk">
<TabItem value="go" label="Go SDK" default>

```go
import (
    "log"
    "os"

    sdkclient "github.com/Backup-Data-io/go-sdk/client"
)

func newClient() *sdkclient.BackupClient {
    c, err := sdkclient.NewBackupClient(sdkclient.BackupClientOptions{
        APIURL:      "https://api.backupdata.io", // API host
        APIKey:      os.Getenv("BACKUPDATA_API_KEY"),               // lh_… from the portal
        WorkspaceID: os.Getenv("BACKUPDATA_WORKSPACE_ID"),          // workspace UUID
    })
    if err != nil {
        log.Fatalf("client init: %v", err)
    }
    return c
}
```

</TabItem>
<TabItem value="js" label="JS SDK">

```javascript
import { BackupClient } from "@backupdata/js-sdk";

function newClient() {
  return new BackupClient({
    apiKey: process.env.BACKUPDATA_API_KEY,          // lh_… from the portal
    workspaceId: process.env.BACKUPDATA_WORKSPACE_ID, // workspace UUID
  });
}
```

</TabItem>
<TabItem value="cli" label="CLI">

```bash
# Every invocation authenticates explicitly (no stored profile).
export BACKUPDATA_API_KEY="lh_xxxxxxxxxxxxxxxxxxxxxxxx"
export BACKUPDATA_WORKSPACE_ID="550e8400-e29b-41d4-a716-446655440000"
baas snapshots --limit 5
baas backup ./db-dumps --workspace $BACKUPDATA_WORKSPACE_ID --api-key $BACKUPDATA_API_KEY
# or inline: baas snapshots --api-key lh_... --workspace <id> --limit 5
```

</TabItem>
</Tabs>

> **Switching workspaces:** call `client.setWorkspaceId(id)` (Go: `c.SetWorkspaceID(id)`) to change the default, or pass `workspaceId` inside the backup / restore options to override for a single call.

See [API Keys](/how-to/api-keys-for-backup-jobs) for how to create, scope, and rotate keys.
