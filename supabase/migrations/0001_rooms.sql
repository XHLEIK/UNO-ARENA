-- UNO ARENA durable room store.
-- A room is a single JSONB snapshot guarded by optimistic concurrency (store_version).
-- Only the server (service role) touches this table; browser clients never query it directly.
create extension if not exists pgcrypto;

create table if not exists public.rooms (
  id uuid primary key,
  room_code text not null unique,
  status text not null check (status in ('LOBBY', 'IN_GAME', 'FINISHED')),
  store_version bigint not null default 1,
  record jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists rooms_expires_at_idx on public.rooms (expires_at);
create index if not exists rooms_status_idx on public.rooms (status);

alter table public.rooms enable row level security;

-- No policies: anon/authenticated get zero access. Service role bypasses RLS.
revoke all on public.rooms from anon, authenticated;
grant all on public.rooms to service_role;

-- Lazy cleanup: delete expired rooms when housekeeping runs.
create or replace function public.uno_cleanup_expired_rooms()
returns integer
language sql
security definer
set search_path = public
as $$
  with deleted as (
    delete from public.rooms where expires_at < now() returning 1
  )
  select count(*)::integer from deleted;
$$;

revoke all on function public.uno_cleanup_expired_rooms() from anon, authenticated;
grant execute on function public.uno_cleanup_expired_rooms() to service_role;
