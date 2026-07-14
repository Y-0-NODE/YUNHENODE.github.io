# Operations guide

## Deployment

- Public HTML routes remain in the repository root for URL compatibility.
- GitHub commits continue to trigger the existing Vercel deployment.
- Vercel still exposes exactly 12 files from `api/` as Serverless Functions.
- Supabase remains the source for content, media, metadata, diary and backup data.

## Routine changes

| Change                                 | Primary location                        |
| -------------------------------------- | --------------------------------------- |
| Global color, typography or navigation | `assets/styles/main.css`                |
| One page layout                        | `assets/styles/pages/<page>.css`        |
| One page behavior                      | `scripts/pages/<page>.js`               |
| Shared browser helpers                 | `scripts/core/`                         |
| Content lifecycle and shape            | `shared/content-model.js`               |
| Metadata encoding                      | `shared/metadata.js`                    |
| Server metadata construction           | `lib/content-metadata.js`               |
| API business logic                     | `lib/services/` and `lib/` repositories |
| Supabase structure                     | `database/migrations/`                  |

## Required checks

Run before deployment:

```bash
npm run check
npm run format:check
```

The project check verifies the 12-function limit, JavaScript syntax, local links,
referenced assets, required architecture directories and absence of inline style/script
blocks in active pages.

## Legacy policy

- Do not add features under `legacy/`.
- Do not delete root compatibility pages until external links have redirects.
- Move an obsolete file into `legacy/` only after the active site no longer references it.
