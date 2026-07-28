import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docsSidebar: [
    { type: 'doc', id: 'intro', label: '🧭 Introduction' },
    { type: 'doc', id: 'quick-start', label: '🚀 Quick Start' },
    {
      type: 'category',
      label: '🛠️ How to Setup',
      collapsed: false,
      items: [
        { type: 'doc', id: 'how-to/sql-backup-overview', label: '🗂️ Database Backup Guides' },
        { type: 'doc', id: 'how-to/web-portal-quickstart', label: '🌐 Web Portal & Free Workspace' },
        { type: 'doc', id: 'how-to/authentication', label: '🔐 Authentication' },
        { type: 'doc', id: 'how-to/workspaces-and-members', label: '🏢 Workspaces and members' },
        { type: 'doc', id: 'how-to/workspace-roles-scopes-and-permissions', label: '🛡️ Roles, scopes, and permissions' },
        { type: 'doc', id: 'how-to/api-keys-for-backup-jobs', label: '🗝️ API Keys' },
        { type: 'doc', id: 'how-to/sql-dump-commands', label: '🧾 Backup database (quick reference)' },
        { type: 'doc', id: 'how-to/upload-and-snapshot-management', label: '📸 Upload Backup Data and Manage Snapshots' },
        { type: 'doc', id: 'how-to/troubleshooting', label: '🩺 Troubleshooting' },
      ],
    },
    {
      type: 'category',
      label: '📚 Tutorials',
      collapsed: false,
      items: [
        { type: 'doc', id: 'tutorials/overview', label: '🧭 Overview' },
        { type: 'doc', id: 'tutorials/dump-postgresql', label: '🐘 Back up PostgreSQL' },
        { type: 'doc', id: 'tutorials/dump-mysql', label: '🐬 Back up MySQL / MariaDB' },
        { type: 'doc', id: 'tutorials/dump-sqlite', label: '🪶 Back up SQLite' },
        { type: 'doc', id: 'tutorials/dump-mongodb', label: '🍃 Back up MongoDB' },
        { type: 'doc', id: 'tutorials/dump-dynamodb', label: '⚡ Back up Amazon DynamoDB' },
        { type: 'doc', id: 'tutorials/dump-s3', label: '🪣 Back up Amazon S3' },
        { type: 'doc', id: 'tutorials/automated-backup', label: '🤖 Automated backup with scheduling' },
      ],
    },
  ],
};

export default sidebars;
