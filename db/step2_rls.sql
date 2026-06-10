-- ============================================================
-- Step 2: 데이터 격리 (user_id + RLS)
-- Supabase 대시보드 → SQL Editor 에서 1회 실행
-- 핵심: 내 테이프는 본인만, 공유된 테이프(shared_at not null)는 공개 읽기
-- ============================================================

-- 1) tapes에 user_id 추가
alter table public.tapes
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

-- 2) 기존 데이터(테스트)를 현재 계정에 귀속 (지금 유일 사용자)
update public.tapes
  set user_id = (select id from auth.users order by created_at limit 1)
  where user_id is null;

-- 3) RLS 활성화
alter table public.tapes enable row level security;
alter table public.segments enable row level security;

-- 4) tapes 정책 (재실행 안전하게 drop 후 create)
drop policy if exists tapes_select on public.tapes;
drop policy if exists tapes_insert on public.tapes;
drop policy if exists tapes_update on public.tapes;
drop policy if exists tapes_delete on public.tapes;

-- 본인 것 전체 + 공유된 건 누구나(익명 포함) 읽기 (공유 링크/OG용)
create policy tapes_select on public.tapes for select
  using (auth.uid() = user_id or shared_at is not null);
create policy tapes_insert on public.tapes for insert
  with check (auth.uid() = user_id);
create policy tapes_update on public.tapes for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy tapes_delete on public.tapes for delete
  using (auth.uid() = user_id);

-- 5) segments 정책 — 부모 테이프 권한을 따름
drop policy if exists segments_select on public.segments;
drop policy if exists segments_insert on public.segments;
drop policy if exists segments_update on public.segments;
drop policy if exists segments_delete on public.segments;

create policy segments_select on public.segments for select
  using (exists (
    select 1 from public.tapes t
    where t.id = segments.tape_id and (t.user_id = auth.uid() or t.shared_at is not null)
  ));
create policy segments_insert on public.segments for insert
  with check (exists (
    select 1 from public.tapes t where t.id = segments.tape_id and t.user_id = auth.uid()
  ));
create policy segments_update on public.segments for update
  using (exists (
    select 1 from public.tapes t where t.id = segments.tape_id and t.user_id = auth.uid()
  ));
create policy segments_delete on public.segments for delete
  using (exists (
    select 1 from public.tapes t where t.id = segments.tape_id and t.user_id = auth.uid()
  ));
