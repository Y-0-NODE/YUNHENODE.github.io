-- 访客登记后台管理字段
-- 在 Supabase SQL Editor 里运行一次；不会删除或覆盖已有访客数据。

alter table visitor_logs
  add column if not exists is_important boolean not null default false,
  add column if not exists highlight_color text not null default 'none',
  add column if not exists admin_note text,
  add column if not exists updated_at timestamptz;

alter table visitor_logs
  drop constraint if exists visitor_logs_highlight_color_check;

alter table visitor_logs
  add constraint visitor_logs_highlight_color_check
  check (highlight_color in ('none', 'red', 'amber', 'green', 'blue'));

create index if not exists visitor_logs_important_created_idx
  on visitor_logs (is_important desc, created_at desc);
