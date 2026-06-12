-- Step 4: 받은 카세트 (복사 보관)
-- Supabase 대시보드 → SQL Editor 에서 1회 실행
alter table public.tapes add column if not exists is_received boolean default false;
alter table public.tapes add column if not exists source_tape_id uuid;
alter table public.tapes add column if not exists received_at timestamptz;

-- 기존 행은 받은 것이 아님
update public.tapes set is_received = false where is_received is null;
