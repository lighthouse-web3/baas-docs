---
sidebar_position: 2
---

# Web Portal & Free Workspace

The **portal** at [`app.backupdata.io`](https://app.backupdata.io) is where humans work: you log in, get your **free 5 GB workspace**, mint a scoped **API key**, and browse the snapshots your backups produce. The **SDK** then uses that API key to do the heavy lifting from your servers or CI.

:::tip Two hosts, two jobs
The **portal** lives at `app.backupdata.io` (the website you click around in). The **Go SDK** talks to `api.backupdata.io`. When you create the client, point `APIURL` at the **API host**.
:::

:::info Free tier
Every new user automatically gets a **free workspace with 5 GB of storage** on sign-up — no setup or payment required. You can start backing up immediately and create more workspaces or upgrade for additional capacity later.
:::

## 1. Log in

1. Open [`https://app.backupdata.io`](https://app.backupdata.io).
2. Click **Log in / Connect**. The auth modal offers two ways to sign in:
   - **Email + password** — switch the modal to **Sign up** the first time to create an account (display name, email, password). You then receive a verification email; click the link to verify, then log in normally.
   - **Google** — click **Login with Google** and complete the standard Google consent screen (OAuth + PKCE). You are redirected back signed in.
3. After login you land on the **Dashboard**, and your free workspace is already provisioned.

![BackupData.io login modal](/img/baas/portal-login.png)

> **Tip:** Both methods produce the same authenticated session. Email and Google are the simplest ways to get started.

## 2. Workspaces (your free 5 GB workspace)

A **workspace** is the tenant boundary. All snapshots, usage limits, members, and API keys are scoped to one workspace.

1. In the sidebar open **Workspaces**. Your free workspace is listed with its current data used vs. its 5 GB limit.
2. Open the workspace and copy its **Workspace ID** (a UUID like `550e8400-e29b-41d4-a716-446655440000`). You will pass this to the SDK.
3. *(Optional)* Click **Create New Workspace** to add more (for example, separate `demo-prod` and `demo-staging`). Additional workspaces are gated behind the upgrade flow.

![Workspaces page showing the free Default workspace with storage utilization](/img/baas/portal-workspaces.png)

From a workspace's detail page you can also invite teammates under **Members**, assigning each a role — `owner`, `admin`, `member`, or `viewer` — with optional extra/revoked scopes. See [Workspaces and members](/how-to/workspaces-and-members) and [Roles, scopes, and permissions](/how-to/workspace-roles-scopes-and-permissions).

## 3. Generate a scoped API key

This is the credential the SDK uses. **It is shown in full only once.**

1. Sidebar → **API Keys** → **Create New API Key**.
2. Fill in the dialog:
   - **Key Name** — e.g. `ci-nightly-backup`.
   - **Workspace** — pick the workspace this key operates against (each key belongs to exactly one workspace).
   - **Expires At** *(optional)* — give automation keys a hard expiry.
   - **Scopes** — tick only what the integration needs. For a key that runs the full backup/restore flow, select: `backup:write`, `backup:read`, `snapshots:read`, `restore:read`, `restore:write`, `user:read`.
3. Click **Create API Key**.

![Create New API Key dialog with name, workspace, expiry, and scope toggles](/img/baas/portal-create-api-key.png)

4. The dialog now shows the **raw key** (it starts with `lh_…`). **Copy it** or click **Download .txt** immediately — once you close the dialog you can never see it again, only its prefix.
5. The key appears in the **Issued Keys** table with its prefix, scopes, status, last-used time and expiry. You can **Revoke** it there at any time.

Store the raw key in a secrets manager / environment variable:

```bash
export BD_API_KEY="lh_xxxxxxxxxxxxxxxxxxxxxxxx"
export BD_WORKSPACE_ID="550e8400-e29b-41d4-a716-446655440000"
```

For more on scoping keys for automation, see [API Keys](/how-to/api-keys-for-backup-jobs).

## 4. View backups & snapshots in the portal

After you run a backup (via the SDK), come back to the portal to see it:

1. Sidebar → **Backup Sources**. Each **source** is a distinct origin (machine + path) that has pushed backups. Every source shows its latest activity, snapshot count, and total size.
2. Click a source to open its detail page, which lists every **snapshot** for that source — creation time, total size, chunk count, paths and description. Use **Load more** to page through history.
3. The **Workspaces** and **Job History** pages give you storage usage (against your 5 GB free limit) and the timeline of backup/restore activity across the workspace.

![Backup Sources page listing sources with paths, snapshot counts, and total size](/img/baas/portal-backup-sources.png)

> **Note:** The `sourceId` the portal groups by is the same one the SDK manages automatically from a `.lighthouse/source_id` file inside your backup target. See [Upload Backup Data and Manage Snapshots](/how-to/upload-and-snapshot-management#sources--sourceid).

## Next steps

- [Authentication](/how-to/authentication) — the three SDK auth flows in code.
- [API Keys](/how-to/api-keys-for-backup-jobs) — create and rotate keys from the SDK.
- [Tutorials → Automated backup with scheduling](/tutorials/automated-backup) — dump a database and upload it on a cron.
