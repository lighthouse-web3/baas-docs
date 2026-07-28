---
sidebar_position: 4
---

# Roles, scopes, and permissions

This document describes how users are tied to workspaces, what each role can do, and how permissions are enforced in the Backup API.

For SDK examples (listing workspaces, inviting members, patching roles), see [Workspaces and members](/how-to/workspaces-and-members).

## Concepts

### Accounts vs workspace membership

- A **user** is a global account (email, identities, API keys).
- A **workspace** is an isolated container for backups, restores, snapshots, and quotas.
- **Workspace membership** links a user to a workspace with exactly one **role** per pair (`workspace_members`). The same user can belong to many workspaces with different roles in each.


### Effective permissions (scopes)

Authorization on workspace routes is **not** simple “role checks” in handlers; it is **scope checks**. Each request that targets a workspace runs membership resolution, which loads the caller's membership row and computes **`effectiveScopes`**:

1. Start from the **default scopes for the member's role** (see below).
2. Add every scope listed in **`extra_scopes`** (grant more capability).
3. Remove every scope listed in **`revoked_scopes`** (take capability away).

Only scopes defined in the API's scope list are valid for `extra_scopes` / `revoked_scopes`.


## Roles

There are four roles available for workspace members. `owner` and `admin` share the same default scopes and differ only in ownership rules; `member` and `viewer` are progressively more restricted.

| Role        | Purpose                                                                                                                                 |
|-------------|-----------------------------------------------------------------------------------------------------------------------------------------|
| **owner**   | Created for the user who created the workspace. Intended as the ultimate admin; protected from removal when it would leave no owners.   |
| **admin**   | Same default powers as owner for day-to-day API operations (see scope table).                                                           |
| **member**  | Can read/write backups and related data; cannot manage workspace settings, members, or API keys by default.                             |
| **viewer**  | Read-only access to backups, restores, and snapshots (no backup writes).                                                             |

### Default scopes by role

| Scope               | owner | admin | member | viewer |
|---------------------|:-----:|:-----:|:------:|:------:|
| `backup:write`      | ✓     | ✓     | ✓      |        |
| `backup:read`       | ✓     | ✓     | ✓      | ✓      |
| `restore:write`     | ✓     | ✓     |        |        |
| `restore:read`      | ✓     | ✓     | ✓      | ✓      |
| `snapshots:read`    | ✓     | ✓     | ✓      | ✓      |
| `user:read`         | ✓     | ✓     |        |        |
| `api_keys:manage`   | ✓     | ✓     |        |        |
| `workspace:manage`  | ✓     | ✓     |        |        |

**Notes**

- **owner** and **admin** have the same default scope set in code. The important behavioral difference is **ownership rules** that is owner cannot be removed.

### Fine-grained overrides

Admin can **patch** a member with:

- **`role`** — one of `owner`, `admin`, `member`, `viewer`.
- **`extraScopes`** — array of scopes to add on top of the role defaults.
- **`revokedScopes`** — array of scopes to strip from the effective set (even if the role would normally grant them).

Invalid scope names are rejected with `400`.

## API keys and workspaces

API keys belong to a **user**, not to a workspace. When a request uses an API key against a workspace route:

1. The user must still be a **member** of that workspace (membership is resolved like for sessions).
2. Effective scopes are computed from **role + extras − revocations**, as for sessions.
3. Additionally, each required scope must appear on the **API key itself** (`keyScopes`). So permission is the **intersection** of workspace-derived scopes and key scopes.

Session JWTs do not impose that second filter; workspace membership alone defines the envelope (unless you add key-like constraints elsewhere).

For creating and scoping keys for automation jobs, see [API keys for backup jobs](/how-to/api-keys-for-backup-jobs).

>**Note** — There is no “pending invite” record, adding a member requires the email to match an **existing** user.

## Related documentation

- [Authentication](/how-to/authentication)
- [Workspaces and members](/how-to/workspaces-and-members)
- [API keys for backup jobs](/how-to/api-keys-for-backup-jobs)
