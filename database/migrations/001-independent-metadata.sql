-- YUNHENODE metadata separation migration
-- Safe to run more than once in Supabase SQL Editor.

create table if not exists content_metadata (
  content_id bigint primary key references contents(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists content_metadata_data_gin
  on content_metadata using gin (data);

alter table content_metadata enable row level security;

comment on table content_metadata is
  'Independent metadata for contents. The body tail remains temporarily for legacy compatibility.';

create table if not exists media_metadata (
  media_id bigint primary key references media_items(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists media_metadata_data_gin
  on media_metadata using gin (data);

alter table media_metadata enable row level security;

comment on table media_metadata is
  'Independent metadata for media items. The description tail remains temporarily for legacy compatibility.';
