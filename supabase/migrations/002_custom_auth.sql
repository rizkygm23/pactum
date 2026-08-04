-- ============================================================
-- Migration 002: Migrate to Custom Auth (No Supabase Auth)
-- ============================================================

-- 1. Drop RLS policies on all pactum tables
drop policy if exists "Users can view own profile" on public.users_pactum;
drop policy if exists "Users can update own profile" on public.users_pactum;
drop policy if exists "Users can insert own profile" on public.users_pactum;

drop policy if exists "Users can view own projects" on public.projects_pactum;
drop policy if exists "Users can create projects" on public.projects_pactum;
drop policy if exists "Users can update own projects" on public.projects_pactum;
drop policy if exists "Users can delete own projects" on public.projects_pactum;

drop policy if exists "Users can view own API keys" on public.api_keys_pactum;
drop policy if exists "Users can create API keys" on public.api_keys_pactum;
drop policy if exists "Users can update own API keys" on public.api_keys_pactum;

drop policy if exists "Users can view own policies" on public.policies_pactum;
drop policy if exists "Users can upsert own policies" on public.policies_pactum;
drop policy if exists "Users can update own policies" on public.policies_pactum;

drop policy if exists "Users can view own usage events" on public.usage_events_pactum;

drop policy if exists "Users can view own invoices" on public.invoices_pactum;
drop policy if exists "Users can view own transactions" on public.transactions_pactum;

-- Disable RLS on all tables
alter table public.users_pactum disable row level security;
alter table public.projects_pactum disable row level security;
alter table public.api_keys_pactum disable row level security;
alter table public.policies_pactum disable row level security;
alter table public.usage_events_pactum disable row level security;
alter table public.invoices_pactum disable row level security;
alter table public.transactions_pactum disable row level security;
alter table public.webhooks_pactum disable row level security;

-- 2. Modify users_pactum to decouple from auth.users
-- Find the foreign key constraint name dynamically or just drop the known one
-- In Supabase/Postgres, the default name is users_pactum_id_fkey
alter table public.users_pactum drop constraint if exists users_pactum_id_fkey;

-- Change the default value of ID to auto-generate UUIDs
alter table public.users_pactum alter column id set default gen_random_uuid();

-- Make email unique so we can use it for login
alter table public.users_pactum add constraint users_pactum_email_key unique (email);

-- Add password_hash column (nullable initially to allow migration of existing rows, then we could set not null if we wanted, but we'll leave it nullable in case of old rows)
alter table public.users_pactum add column password_hash text;
