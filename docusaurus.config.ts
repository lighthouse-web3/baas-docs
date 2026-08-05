import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'BackupData.io Documentation',
  tagline: 'Backup as a Service — incremental, deduplicated, snapshot-based backups for databases and object storage',
  favicon: 'img/favicon.svg',

  future: {
    v4: true,
  },

  url: 'https://docs.backupdata.io',
  baseUrl: '/',

  organizationName: 'backupdata',
  projectName: 'backupdata-docs',

  onBrokenLinks: 'throw',

  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          routeBasePath: '/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
        // Google Analytics. The plugin injects gtag.js and also fires a
        // pageview on client-side route changes, which the raw snippet does
        // not — this is a SPA, so most navigations never reload the page.
        // Only active in production builds; `docusaurus start` skips it.
        gtag: {
          trackingID: 'G-QRZM268K0D',
          anonymizeIP: true,
        },
      } satisfies Preset.Options,
    ],
  ],

  themes: [
    [
      require.resolve('@easyops-cn/docusaurus-search-local'),
      {
        hashed: true,
        indexBlog: false,
        docsRouteBasePath: '/',
        docsDir: 'docs',
        highlightSearchTermsOnTargetPage: true,
        searchBarPosition: 'right',
      },
    ],
  ],

  themeConfig: {
    image: 'img/favicon.svg',
    colorMode: {
      defaultMode: 'dark',
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'BackupData.io',
      logo: {
        alt: 'BackupData.io',
        src: 'img/favicon.svg',
        href: '/',
        target: '_self',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: 'Docs',
        },
        {
          href: 'https://backupdata.io',
          label: 'backupdata.io',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Documentation',
          items: [
            { label: 'Introduction', to: '/intro' },
            { label: 'Quick Start', to: '/quick-start' },
            { label: 'How to Setup', to: '/how-to/sql-backup-overview' },
            { label: 'Tutorials', to: '/tutorials/overview' },
          ],
        },
        {
          title: 'Product',
          items: [
            { label: 'Pricing', href: 'https://backupdata.io/#pricing' },
            { label: 'Resources', href: 'https://www.backupdata.io/resources' },
          ],
        },
        {
          title: 'Support',
          items: [
            { label: 'Troubleshooting', to: '/how-to/troubleshooting' },
            { label: 'Contact us', href: 'mailto:mail@backupdata.io' },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} BackupData.io. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'json', 'typescript', 'javascript', 'python', 'go', 'sql'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
