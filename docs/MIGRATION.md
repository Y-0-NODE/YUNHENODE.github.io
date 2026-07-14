# Migration checklist

1. Deploy the reorganized files without changing root HTML URLs.
2. Run `database/migrations/001-independent-metadata.sql` once in Supabase SQL Editor.
3. Run `database/migrations/002-backfill-legacy-metadata.sql` to copy existing metadata.
4. New content and media will dual-write independent metadata and the legacy tail.
5. Confirm publishing, editing, lifecycle, media upload and backups.
6. Remove the legacy tail only in a later release after verification.

The migration is intentionally backward compatible: if the new metadata tables have not
yet been created, publishing and editing continue to work with the existing format.
