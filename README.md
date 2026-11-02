# Dev_Proyect_to_TXT

**v0.2.20** — Combine project files into one organized TXT document for AI context, documentation or sharing.

This browser application expands the original [JavaSourceToTxt](https://github.com/LucatorL/JavaSourceToTxt) by LucatorL.

[Open the app](https://unificador.lucassanchez.net) · [Changelog](CHANGELOG.md) · [Report an issue](https://github.com/LucatorL/Dev_Proyect_to_TXT/issues)

The live app runs in Cloudflare. Successful pushes to `main` are built and deployed automatically from this repository.

## Features

- Import files, folders, ZIP archives and RAR archives.
- Java, Web and Total presets with editable file selection.
- Search filenames, paths, folders/packages and project names.
- Select a folder/package and its nested contents at once.
- Combine multiple projects or process them separately.
- Add text or files manually to an existing project or a new project.
- Unified preview with clear file separators, approximate token count and text search.
- Automatic column sizing, a draggable divider and scrolling labels when text does not fit.
- [DotScroll](https://github.com/LucatorL/dotscroll) navigation: folders/packages in the file list and individual files in the preview.
- Recent history with local file-handle reopening where the browser supports it.
- Shared leaderboard of unified files, with editable aliases.
- Spanish and English, light/dark themes and persistent preferences.

The app preserves source comments. Comment removal is no longer available.

## Using the app

1. Choose **Java**, **Web** or **Total**, then import your projects.
2. Select files individually or by folder/package. Use the search button to find a filename or path.
3. Review the output. The divider between the file list and preview can be dragged.
4. Choose **Copy All** or **Accept and Save** to export the selected content.

Files outside the selected preset can be added explicitly. The import report identifies files skipped because their extension is unsupported, they exceed a limit, or they could not be read.

## Local development

Requirements: Node.js 22 or newer and npm.

```bash
git clone https://github.com/LucatorL/Dev_Proyect_to_TXT.git
cd Dev_Proyect_to_TXT
npm ci
npm run dev
```

Open `http://localhost:3000`. The unifier works locally without API keys. The shared leaderboard needs the separate Worker and database described below; `next dev` alone does not serve its API.

```bash
npm run typecheck
npm run build
```

The build creates a static Next.js export in `out/` and a Worker with embedded assets in `dist/server/index.js`. The project uses `output: 'export'`; `next start` is not the production entrypoint.

## Project structure

| Path | Purpose |
| --- | --- |
| `src/app/` | Main application and styles |
| `src/components/java-unifier/` | Import, selection, preview, history and leaderboard UI |
| `src/lib/` | File processing, browser storage, translations and DotScroll adaptation |
| `src/workers/` | Preview search and RAR extraction workers |
| `public/unrar.wasm` | Browser RAR extraction binary |
| `worker/index.js` | Shared leaderboard API and production asset serving |
| `db/`, `drizzle/` | Leaderboard schema and migration history |
| `scripts/` | Development and build helpers |
| `hosting/` | Existing separate hosting project; not required for the main app |

The leaderboard backend expects a Cloudflare D1-compatible binding named `DB`. A static host can serve the unifier, but the leaderboard requires `/api/leaderboard`, `/api/profile` and `/api/unification` on the same origin. To host the complete app in your own Cloudflare account with automatic GitHub deployments, follow [Cloudflare deployment](docs/cloudflare.md).

Migration `0001_reset_leaderboard.sql` records a deliberate historical reset and deletes leaderboard rows. Review the migration history before applying it to an existing database.

## Current limits and compatibility

- Imports accept up to **250 supported files per import** and **5 MiB per file**. These limits are defined in `src/lib/file-processor.ts` and `src/lib/file-types.ts`.
- RAR archives with passwords or multiple volumes are reported as unsupported. A corrupt archive is reported as an import error.
- Reopening history uses file handles stored on the same browser/device. It requires browser support and permission; a saved pathname does not grant access to your computer.
- DotScroll retains the previous implementation after a rollback. Navigation with very large lists still needs further refinement.
- Leaderboard aliases are shared public names, not authenticated accounts. Identical names combine their scores; the leaderboard is intended for casual use.
- A fresh local/static installation does not have a configured shared leaderboard database.

## Data handling

Imported code, extraction and TXT generation run in the browser. The leaderboard receives the selected file count and a profile alias, which can initially be suggested from the project's `package.json` author. It does not receive the imported source text.

Preferences and recent-history metadata stay in browser storage. File handles stay in IndexedDB on the same device.

## Credits and license

- Original desktop application and this project: [LucatorL](https://github.com/LucatorL).
- DotScroll: [LucatorL/dotscroll](https://github.com/LucatorL/dotscroll), adapted here for scrollable panels.
- ZIP extraction: [JSZip](https://github.com/Stuk/jszip).
- RAR extraction: [node-unrar-js](https://github.com/YuJianrong/node-unrar.js) and the upstream UnRAR engine.
- Next.js, React, TypeScript, Tailwind CSS, Radix/shadcn UI and Lucide.

Project code is under the [MIT license](LICENSE). Third-party components retain their own licenses; see [Third-party notices](THIRD_PARTY_NOTICES.md).

## Contributing

Open an [issue](https://github.com/LucatorL/Dev_Proyect_to_TXT/issues) or a pull request. Include the browser, project type and steps to reproduce any problem. Check `npm run typecheck` and `npm run build` before submitting a change.
