# BackupData.io Documentation

Docusaurus site for [docs.backupdata.io](https://docs.backupdata.io).

Content lives in `docs/` and is served at the site root — `docs/intro.md` renders at
`https://docs.backupdata.io/intro`, `docs/how-to/authentication.md` at
`https://docs.backupdata.io/how-to/authentication`, and so on.

## Local development

```bash
npm install
npm start
```

Opens `http://localhost:3000` with hot reload.

## Build

```bash
npm run build
npm run serve
```

`npm run build` emits a static site into `build/`. Deploy that directory to any static
host and point `docs.backupdata.io` at it.

## Structure

| Path | Purpose |
| --- | --- |
| `docs/` | Markdown content (Introduction, Quick Start, How-to guides, Tutorials) |
| `sidebars.ts` | Sidebar ordering and labels |
| `docusaurus.config.ts` | Site metadata, navbar, footer, search |
| `src/css/custom.css` | BackupData.io theme (palette mirrors the `baas-ui` frontend) |
| `static/img/baas/` | Web portal screenshots used by the guides |

## Notes

SDK package names (`@lighthouse-web3/baas-js-sdk`, `github.com/lighthouse-web3/baas-go-sdk`),
the `lh_` API key prefix, and the on-disk `.lighthouse/source_id` marker are left as-is
because they match what is currently published and implemented. Update them here once the
packages themselves are renamed.
