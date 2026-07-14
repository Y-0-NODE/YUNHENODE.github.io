-- Backfill metadata already embedded in content bodies and media descriptions.
-- Safe to run more than once. Malformed legacy rows are skipped instead of aborting.

do $$
declare
  item record;
  raw_metadata text;
begin
  for item in select id, body from contents where body like '%<!--yunhe-meta:%' loop
    raw_metadata := substring(item.body from '<!--yunhe-meta:(\{.*\})-->\s*$');
    if raw_metadata is null then continue; end if;
    begin
      insert into content_metadata (content_id, data, updated_at)
      values (item.id, raw_metadata::jsonb, now())
      on conflict (content_id) do update set data = excluded.data, updated_at = now();
    exception when others then
      raise notice 'Skipped malformed content metadata for content %', item.id;
    end;
  end loop;

  for item in select id, description from media_items where description like '%<!--yunhe-media-meta:%' loop
    raw_metadata := substring(item.description from '<!--yunhe-media-meta:(\{.*\})-->\s*$');
    if raw_metadata is null then continue; end if;
    begin
      insert into media_metadata (media_id, data, updated_at)
      values (item.id, raw_metadata::jsonb, now())
      on conflict (media_id) do update set data = excluded.data, updated_at = now();
    exception when others then
      raise notice 'Skipped malformed media metadata for media %', item.id;
    end;
  end loop;
end $$;
