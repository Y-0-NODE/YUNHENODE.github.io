# YUNHENODE architecture

## Runtime layers

1. **Content** — articles, cases, videos, thoughts and their lifecycle.
2. **Media** — photos, video files, audio, documents and reusable assets.
3. **Knowledge** — templates, topics, levels, categories, tags and relations.

Content references Media and Knowledge. Media and Knowledge do not depend on a
specific article or case.

## Directory map

```text
api/                 12 Vercel entry functions (stable public endpoints)
admin/               CMS route inventory and maintenance boundary
assets/styles/       shared visual system
database/migrations/ repeatable Supabase migrations
data/                generated static data
docs/                architecture and maintenance documentation
legacy/              retired code retained for reference
lib/                 server-only repositories, services and request helpers
pages/               public route inventory; root filenames remain compatibility entries
scripts/core/        browser configuration, utilities and API client
scripts/integrations external service adapters with stable root compatibility entries
scripts/pages/       one controller per migrated page
shared/              isomorphic content model and metadata codec
```

## Compatibility rules

- Root HTML filenames remain stable so existing public links keep working.
- `style.css` is a compatibility entry that imports `assets/styles/main.css`.
- Metadata is written to independent `content_metadata` and `media_metadata` tables after migration.
- The legacy body metadata tail remains temporarily as a read fallback and is hidden
  from readers. It can be removed only after all existing rows have been migrated.
- API endpoint count remains 12. Shared behavior belongs in `lib/`, not new endpoints.

## API responsibility map

The public endpoint names remain stable. Each endpoint delegates reusable business logic
to one service or repository instead of duplicating it inside the handler.

| Endpoint            | Responsibility                                                                                      |
| ------------------- | --------------------------------------------------------------------------------------------------- |
| `publish`           | Create content                                                                                      |
| `update`            | Edit content and lifecycle                                                                          |
| `delete`            | Delete content with backup                                                                          |
| `admin-list`        | Compatibility query router; delegates content, search and knowledge operations to separate services |
| `media-list`        | Public published media query                                                                        |
| `media-record`      | Create a media record                                                                               |
| `media-sign-upload` | Create a signed upload channel                                                                      |
| `media-update`      | Media editing and lifecycle actions                                                                 |
| `backup`            | Export, version query and restore                                                                   |
| `diary-list`        | Read diary entries                                                                                  |
| `diary-save`        | Create or update a diary entry                                                                      |
| `diary-delete`      | Delete a diary entry                                                                                |

## Naming

- Files and directories: lowercase kebab-case.
- Browser globals: `Yunhe*` namespace only.
- Database columns: snake_case.
- JavaScript variables and functions: camelCase.
- Content types: `article`, `case`, `video`, `thought`.
- Lifecycle: `published`, `private`, `archived`.
