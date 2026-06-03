-- Run this once in Supabase SQL editor.

create table if not exists tapes (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'tape 01',
  decoration jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 기존 테이블이 있을 경우 컬럼 추가
alter table tapes add column if not exists decoration jsonb not null default '[]'::jsonb;

create table if not exists segments (
  id uuid primary key default gen_random_uuid(),
  tape_id uuid not null references tapes(id) on delete cascade,
  position int not null,
  message text not null default '',
  duration_seconds int not null default 0,
  audio_path text,
  created_at timestamptz not null default now()
);

create index if not exists segments_tape_id_position_idx on segments(tape_id, position);

alter table tapes enable row level security;
alter table segments enable row level security;

drop policy if exists "public all tapes" on tapes;
create policy "public all tapes" on tapes for all using (true) with check (true);

drop policy if exists "public all segments" on segments;
create policy "public all segments" on segments for all using (true) with check (true);

insert into storage.buckets (id, name, public)
values ('tape-audio', 'tape-audio', true)
on conflict (id) do nothing;

drop policy if exists "public read audio" on storage.objects;
create policy "public read audio" on storage.objects for select using (bucket_id = 'tape-audio');

drop policy if exists "public upload audio" on storage.objects;
create policy "public upload audio" on storage.objects for insert with check (bucket_id = 'tape-audio');

drop policy if exists "public delete audio" on storage.objects;
create policy "public delete audio" on storage.objects for delete using (bucket_id = 'tape-audio');

insert into storage.buckets (id, name, public)
values ('tape-stickers', 'tape-stickers', true)
on conflict (id) do nothing;

drop policy if exists "public read stickers" on storage.objects;
create policy "public read stickers" on storage.objects for select using (bucket_id = 'tape-stickers');

drop policy if exists "public upload stickers" on storage.objects;
create policy "public upload stickers" on storage.objects for insert with check (bucket_id = 'tape-stickers');

drop policy if exists "public delete stickers" on storage.objects;
create policy "public delete stickers" on storage.objects for delete using (bucket_id = 'tape-stickers');
