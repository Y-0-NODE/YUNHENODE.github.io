# Admin pages

Active CMS route files remain at the repository root for URL compatibility. The current
admin surface includes:

- Dashboard: `admin.html`
- Creation: `publish.html`, `case-write.html`, `wechat-import.html`, `article-draft.html`
- Content management: `content-control.html`, `article-manage.html`, `thought-manage.html`
- Media: `media-center.html`, `media-manage.html`, `photography-manage.html`, media editors
- Knowledge: `knowledge-system.html`, `search-center.html`
- Data and system: `backup.html`, `system-center.html`, `design-settings.html`
- Private diary: `diary-login.html`, `diary-app.html`

The public filenames are compatibility entry points. Logic is maintained under
`scripts/pages/`, `scripts/core/`, `shared/` and `lib/`.
