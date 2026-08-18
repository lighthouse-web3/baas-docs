---
sidebar_position: 3
---

# Workspaces and members

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

A **workspace** is the top-level tenancy unit for backups, packs, and snapshots. People access a workspace through **memberships**: each member has a **role** (and optionally extra scope tweaks). This guide describes how that model surfaces in the BackupData.io Go SDK, JavaScript/TypeScript SDK, and CLI.

For how roles map to scopes, API-key intersection, and HTTP semantics, see [Roles, scopes, and permissions](/how-to/workspace-roles-scopes-and-permissions). To create your first workspace from the UI, see [Web Portal & Free Workspace](/how-to/web-portal-quickstart#2-workspaces-your-free-5-gb-workspace).

All snippets assume the imports and an authenticated `client`:

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
  RoleMember,
  RoleAdmin,
  ScopeSnapshotsRead,
} from "@backupdata/js-sdk";
```

</TabItem>
<TabItem value="cli" label="CLI">

```bash
npm install -g @backupdata/js-sdk
export BACKUPDATA_API_KEY="lh_..."          # Portal → API Keys
export BACKUPDATA_WORKSPACE_ID="<id>"       # Portal → Workspaces
baas workspaces                             # the only workspace command in v0.1.5 (lists)
```

Member operations are **SDK + Portal only** — the CLI has no `workspace member` subcommands.

</TabItem>
</Tabs>

## Concepts

### Members

A **workspace member** ties a BackupData.io user to one workspace. The API returns metadata such as email, display name, role, optional `extraScopes` / `revokedScopes`, and when the membership was created.

### Roles

Roles are string labels that map to a default set of permissions on the server. The SDK defines these constants:

- `RoleOwner` (`owner`)
- `RoleAdmin` (`admin`)
- `RoleMember` (`member`)
- `RoleViewer` (`viewer`)

When inviting (`WorkspaceMemberInvite`) or updating a member’s role (`WorkspaceMemberUpdate`), use `admin`, `member`, or `viewer`. Do not send `owner` in invite requests.

### Scopes

Beyond role defaults, the API can grant `extraScopes` or withhold `revokedScopes`. The SDK exposes constants including:

- `ScopeBackupWrite`, `ScopeBackupRead`
- `ScopeRestoreWrite`, `ScopeRestoreRead`
- `ScopeSnapshotsRead`
- `ScopeUserRead`
- `ScopeAPIKeysManage`
- `ScopeWorkspaceManage`


## Workspaces: create, select, and inspect

<Tabs groupId="baas-sdk">
<TabItem value="go" label="Go SDK" default>

```go
wsList, err := client.ListWorkspaces()
if err != nil {
	log.Fatal(err)
}

var workspaceID string
if len(wsList.Workspaces) == 0 {
	created, err := client.CreateWorkspace(sdktypes.WorkspaceCreateRequest{
		Name: "prod-db-backups",
	})
	if err != nil {
		log.Fatal(err)
	}
	workspaceID = created.WorkspaceID
} else {
	workspaceID = wsList.Workspaces[0].WorkspaceID
}

client.SetWorkspaceID(workspaceID)
log.Printf("Using workspace: %s", workspaceID)
```

</TabItem>
<TabItem value="js" label="JS SDK">

```javascript
const wsList = await client.listWorkspaces();

let workspaceId;
if (wsList.workspaces.length === 0) {
  const created = await client.createWorkspace({ name: "prod-db-backups" });
  workspaceId = created.workspaceId;
} else {
  workspaceId = wsList.workspaces[0].workspaceId;
}

client.setWorkspaceId(workspaceId);
console.log(`Using workspace: ${workspaceId}`);
```

</TabItem>
<TabItem value="cli" label="CLI">

:::info Not available in CLI (v0.1.5)
Workspaces are created in the [Portal](/how-to/web-portal-quickstart#2-workspaces-your-free-5-gb-workspace). The CLI only lists:

```bash
baas workspaces                                   # list
baas workspaces --api-key lh_... --workspace <id> # auth is per-command
```

Create / get / update / `use` and member management are SDK + Portal only (see JS / Go tabs).
:::

</TabItem>
</Tabs>

## Member operations with BackupClient

> **Note:** You must have sufficient permissions (typically admin or owner role, with appropriate scopes) to perform any of the following member operations.

### List members

<Tabs groupId="baas-sdk">
<TabItem value="go" label="Go SDK" default>

```go
members, err := client.ListWorkspaceMembers(workspaceID)
if err != nil {
	return err
}
for _, m := range members {
	_ = m
}
```

</TabItem>
<TabItem value="js" label="JS SDK">

```javascript
const members = await client.listWorkspaceMembers(workspaceId);
for (const m of members) {
  console.log(m.userId, m.email, m.role);
}
```

</TabItem>
<TabItem value="cli" label="CLI">

:::info Not available in CLI (v0.1.5)
Member listing is **SDK + Portal only** — `client.listWorkspaceMembers()` (JS) / `client.ListWorkspaceMembers()` (Go) or Portal → Workspace → Members.
:::

</TabItem>
</Tabs>

### Invite a member

<Tabs groupId="baas-sdk">
<TabItem value="go" label="Go SDK" default>

```go
member, err := client.AddWorkspaceMember(workspaceID, sdktypes.WorkspaceMemberInvite{
	Email: "dba@example.com",
	Role:  sdktypes.RoleMember,
})
if err != nil {
	return err
}
_ = member
```

</TabItem>
<TabItem value="js" label="JS SDK">

```javascript
const member = await client.addWorkspaceMember(workspaceId, {
  email: "dba@example.com",
  role: RoleMember,
});
```

</TabItem>
<TabItem value="cli" label="CLI">

:::info Not available in CLI (v0.1.5)
Invites are **SDK + Portal only** — `client.addWorkspaceMember()` / `client.AddWorkspaceMember()` or Portal → Workspace → Members → Invite.
:::

</TabItem>
</Tabs>

### Update role and scopes

<Tabs groupId="baas-sdk">
<TabItem value="go" label="Go SDK" default>

```go
updated, err := client.UpdateWorkspaceMember(workspaceID, userID, sdktypes.WorkspaceMemberUpdate{
	Role:          sdktypes.RoleAdmin,
	ExtraScopes:   []string{sdktypes.ScopeSnapshotsRead},
	RevokedScopes: nil,
})
if err != nil {
	return err
}
_ = updated
```

</TabItem>
<TabItem value="js" label="JS SDK">

```javascript
const updated = await client.updateWorkspaceMember(workspaceId, userId, {
  role: RoleAdmin,
  extraScopes: [ScopeSnapshotsRead],
});
```

</TabItem>
<TabItem value="cli" label="CLI">

:::info Not available in CLI (v0.1.5)
Role/scope updates are **SDK + Portal only** — `client.updateWorkspaceMember()` / `client.UpdateWorkspaceMember()`.
:::

</TabItem>
</Tabs>

### Remove a member

<Tabs groupId="baas-sdk">
<TabItem value="go" label="Go SDK" default>

```go
err := client.RemoveWorkspaceMember(workspaceID, userID)
if err != nil {
	return err
}
```

</TabItem>
<TabItem value="js" label="JS SDK">

```javascript
await client.removeWorkspaceMember(workspaceId, userId);
```

</TabItem>
<TabItem value="cli" label="CLI">

:::info Not available in CLI (v0.1.5)
Removal is **SDK + Portal only** — `client.removeWorkspaceMember()` / `client.RemoveWorkspaceMember()` or Portal → Members → Remove.
:::

</TabItem>
</Tabs>
