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

The CLI supports three login methods and stores the selected credential in its active profile:

```bash
# Browser (default): opens the device-code approval flow in your browser.
baas auth login

# Email and password: prompts for the password, or read it from an environment variable.
baas auth login --email you@example.com
baas auth login --email you@example.com --password-env BAAS_PASSWORD

# API key: create an `lh_…` key in the BackupData.io portal, then paste it when prompted.
baas auth login --api-key

# Confirm the active identity and workspace.
baas auth whoami
```

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
        APIKey:      os.Getenv("BD_API_KEY"),               // lh_… from the portal
        WorkspaceID: os.Getenv("BD_WORKSPACE_ID"),          // workspace UUID
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
    apiKey: process.env.BD_API_KEY,          // lh_… from the portal
    workspaceId: process.env.BD_WORKSPACE_ID, // workspace UUID
  });
}
```

</TabItem>
<TabItem value="cli" label="CLI">

Use a portal-created key interactively once, or set the environment variables directly for cron and CI:

```bash
# Interactive: stores the key in the active CLI profile.
baas auth login --api-key
baas workspace use <workspaceId>

# Non-interactive: credentials apply only to this process and its children.
export BAAS_API_KEY="lh_xxxxxxxxxxxxxxxxxxxxxxxx"
export BAAS_WORKSPACE_ID="550e8400-e29b-41d4-a716-446655440000"
baas auth whoami
```

</TabItem>
</Tabs>

> **Switching workspaces:** call `client.setWorkspaceId(id)` (Go: `c.SetWorkspaceID(id)`) to change the default, or pass `workspaceId` inside the backup / restore options to override for a single call.

See [API Keys](/how-to/api-keys-for-backup-jobs) for how to create, scope, and rotate keys.
