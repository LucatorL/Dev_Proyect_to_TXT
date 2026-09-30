# Changelog

## 0.2.20 — 2026-09-30

Source release of the current browser application.

### Added and improved

- File/folder search and recursive folder/package selection.
- RAR extraction in a browser worker, alongside ZIP imports.
- Reopening recent local sources using browser file handles and explicit permission.
- Unified-preview search in a worker and clearer separators between files.
- Automatic file-list width, a draggable divider and animated overflow labels.
- Shared unification leaderboard with editable aliases and 30 default names.
- Import reports for unreadable, unsupported or oversized files and import limits.
- DotScroll integration throughout the app, with folders/packages in the file list and files in the preview.

### Removed

- Comment-removal controls and functionality.

### Rollback

- Restored the previous DotScroll implementation after the latest navigation changes caused regressions.
- The application and package use `0.2.20`. Publication counters from the preview service are independent of this version.

### Known limitations

- DotScroll needs further refinement for very large lists.
- Local history reopening depends on browser support and permission.
- Password-protected and multi-volume RAR archives are unsupported.
- The shared leaderboard needs its Worker API and database; aliases are not authenticated accounts.
