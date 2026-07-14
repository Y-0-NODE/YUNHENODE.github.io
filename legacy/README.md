# Legacy compatibility area

This directory contains old files that are not part of the current site architecture.
They are retained so historical work is not lost.

## Policy

- Active public and CMS routes remain at the repository root for URL compatibility.
- New shared code belongs in `assets/`, `scripts/`, `shared/`, `lib/`, or `database/`.
- Files move here only after the active site contains no reference to them.
- Do not add new features to files under `legacy/`.

## Moved orphaned files

| Old file | Current status | Replacement |
| --- | --- | --- |
| `app-icon-svg` | Invalid extension, no references | `app-icon.svg` |
| `manifest-webmanifes` | Invalid extension, no references | `manifest.webmanifest` |
| `service-worker-js` | Invalid extension | `service-worker.js` |
| `api/Add file/Create new file/admin.html` | Accidental GitHub editor path | `admin.html` |
| `gallery-manage` | Extensionless obsolete manager | `photography-manage.html` |
| `content-list.json` | Old generated static content index | Supabase `contents` table |
| `local-gallery.json` | Old root-level gallery copy | `data/local-gallery.json` |

The `templates/` folder contains snapshots of the old article, case, video and theme
templates. Their root copies remain temporarily available because historical pages still
link to those URLs.

Generated historical content pages remain at the root until redirects are introduced,
because external links may still point to them.
