# Refactor report

## Completed

- Extracted page styles to `assets/styles/pages/`.
- Extracted page controllers to `scripts/pages/`.
- Added browser configuration, utilities, API client and knowledge client under `scripts/core/`.
- Added a shared content model and shared metadata codec under `shared/`.
- Added server request helpers, metadata repository and domain services under `lib/`.
- Added independent `content_metadata` and `media_metadata` tables with a safe backfill.
- Preserved 12 public Serverless endpoints and documented their responsibilities.
- Formatted the active repository with Prettier.
- Added automatic architecture, syntax, link, asset and function-count checks.
- Added `legacy/` policy, manifest, orphaned files, old data and template snapshots.
- Preserved all current public route names and CMS entry points.

## Compatibility

Metadata is temporarily dual-written to the independent table and the old hidden tail.
This prevents existing pages or an un-migrated Supabase project from breaking. The old
tail should only be removed after the two migrations have been run and verified.
