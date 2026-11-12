-- Database setup for Rep's accounts (see js/sync.js).
-- Run once in Supabase: SQL Editor → New query → paste all of this → Run.
-- Safe to keep in the public repo: it has no keys or passwords.

-- One row per person: their whole app data (the same shape as a backup file).
create table public.user_data (
  -- Who the row belongs to. auth.users is Supabase's own list of signed-up people;
  -- "on delete cascade" removes the row if the account is deleted.
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  data jsonb not null,                        -- the app data, as JSON
  updated_at timestamptz not null default now()
);

-- Row Level Security: with it on, nobody can see any row unless a policy below allows it.
alter table public.user_data enable row level security;

-- The policies: a signed-in person can only read, add and change THEIR OWN row.
-- auth.uid() is the id of whoever sent the request (from their access token).
create policy "Read own data" on public.user_data
  for select to authenticated using (auth.uid() = user_id);
create policy "Add own data" on public.user_data
  for insert to authenticated with check (auth.uid() = user_id);
create policy "Change own data" on public.user_data
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- "Automatically expose new tables" was turned off, so let signed-in people reach
-- this one table through the Data API. (Signed-out visitors get nothing.)
grant select, insert, update on public.user_data to authenticated;
