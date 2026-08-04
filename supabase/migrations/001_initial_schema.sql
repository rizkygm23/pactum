-- ============================================================
-- Pactum MVP — Initial Schema
-- Run this in Supabase SQL Editor or via CLI migration
-- ============================================================

-- ── 1. users_pactum ──────────────────────────────────────────
create table if not exists public.users_pactum (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  company_name text,
  created_at timestamptz default now() not null
);

alter table public.users_pactum enable row level security;

create policy "Users can view own profile"
  on public.users_pactum for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.users_pactum for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.users_pactum for insert
  with check (auth.uid() = id);


-- ── 2. projects_pactum ───────────────────────────────────────
create table if not exists public.projects_pactum (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users_pactum(id) on delete cascade,
  name text not null,
  merchant_wallet_address text,
  created_at timestamptz default now() not null
);

alter table public.projects_pactum enable row level security;

create policy "Users can view own projects"
  on public.projects_pactum for select
  using (auth.uid() = user_id);

create policy "Users can create projects"
  on public.projects_pactum for insert
  with check (auth.uid() = user_id);

create policy "Users can update own projects"
  on public.projects_pactum for update
  using (auth.uid() = user_id);

create policy "Users can delete own projects"
  on public.projects_pactum for delete
  using (auth.uid() = user_id);


-- ── 3. api_keys_pactum ───────────────────────────────────────
create type public.api_key_status as enum ('active', 'revoked');

create table if not exists public.api_keys_pactum (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects_pactum(id) on delete cascade,
  key_hash text not null,
  key_prefix text not null,        -- e.g. "pactum_a1b2c3d4" for display
  name text default 'Default',
  status public.api_key_status default 'active' not null,
  created_at timestamptz default now() not null
);

alter table public.api_keys_pactum enable row level security;

create policy "Users can view own API keys"
  on public.api_keys_pactum for select
  using (
    exists (
      select 1 from public.projects_pactum p
      where p.id = api_keys_pactum.project_id
      and p.user_id = auth.uid()
    )
  );

create policy "Users can create API keys"
  on public.api_keys_pactum for insert
  with check (
    exists (
      select 1 from public.projects_pactum p
      where p.id = api_keys_pactum.project_id
      and p.user_id = auth.uid()
    )
  );

create policy "Users can update own API keys"
  on public.api_keys_pactum for update
  using (
    exists (
      select 1 from public.projects_pactum p
      where p.id = api_keys_pactum.project_id
      and p.user_id = auth.uid()
    )
  );


-- ── 4. policies_pactum ───────────────────────────────────────
create type public.policy_status as enum ('active', 'inactive');

create table if not exists public.policies_pactum (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects_pactum(id) on delete cascade,
  spend_limit_daily numeric(18, 6) default 100.000000,
  spend_limit_monthly numeric(18, 6) default 3000.000000,
  allowlist jsonb default '[]'::jsonb,
  status public.policy_status default 'active' not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.policies_pactum enable row level security;

create policy "Users can view own policies"
  on public.policies_pactum for select
  using (
    exists (
      select 1 from public.projects_pactum p
      where p.id = policies_pactum.project_id
      and p.user_id = auth.uid()
    )
  );

create policy "Users can upsert own policies"
  on public.policies_pactum for insert
  with check (
    exists (
      select 1 from public.projects_pactum p
      where p.id = policies_pactum.project_id
      and p.user_id = auth.uid()
    )
  );

create policy "Users can update own policies"
  on public.policies_pactum for update
  using (
    exists (
      select 1 from public.projects_pactum p
      where p.id = policies_pactum.project_id
      and p.user_id = auth.uid()
    )
  );


-- ── 5. usage_events_pactum ───────────────────────────────────
create table if not exists public.usage_events_pactum (
  id uuid primary key default gen_random_uuid(),
  api_key_id uuid not null references public.api_keys_pactum(id) on delete cascade,
  endpoint text not null,
  quantity numeric(18, 6) default 1.000000,
  unit_price numeric(18, 6) not null,
  cost numeric(18, 6) not null,          -- quantity × unit_price
  metadata jsonb default '{}'::jsonb,
  idempotency_key text not null,
  created_at timestamptz default now() not null,

  constraint uq_usage_idempotency unique (idempotency_key)
);

create index idx_usage_api_key on public.usage_events_pactum(api_key_id);
create index idx_usage_created on public.usage_events_pactum(created_at);

alter table public.usage_events_pactum enable row level security;

create policy "Users can view own usage events"
  on public.usage_events_pactum for select
  using (
    exists (
      select 1 from public.api_keys_pactum k
      join public.projects_pactum p on p.id = k.project_id
      where k.id = usage_events_pactum.api_key_id
      and p.user_id = auth.uid()
    )
  );

-- Insert is done via service_role key from API routes, not via RLS user
-- No insert policy for anon — the API route uses SUPABASE_SERVICE_ROLE_KEY


-- ── 6. invoices_pactum ───────────────────────────────────────
create type public.invoice_status as enum ('draft', 'finalized', 'settling', 'settled', 'failed');

create table if not exists public.invoices_pactum (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects_pactum(id) on delete cascade,
  period_start timestamptz not null,
  period_end timestamptz not null,
  total_amount numeric(18, 6) default 0.000000,
  status public.invoice_status default 'draft' not null,
  created_at timestamptz default now() not null
);

alter table public.invoices_pactum enable row level security;

create policy "Users can view own invoices"
  on public.invoices_pactum for select
  using (
    exists (
      select 1 from public.projects_pactum p
      where p.id = invoices_pactum.project_id
      and p.user_id = auth.uid()
    )
  );


-- ── 7. transactions_pactum ───────────────────────────────────
create type public.tx_status as enum ('pending', 'submitted', 'confirmed', 'failed');

create table if not exists public.transactions_pactum (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices_pactum(id) on delete cascade,
  tx_hash text,
  chain text default 'arc-testnet',
  amount numeric(18, 6) not null,
  currency text default 'USDC',
  status public.tx_status default 'pending' not null,
  settled_at timestamptz,
  created_at timestamptz default now() not null
);

alter table public.transactions_pactum enable row level security;

create policy "Users can view own transactions"
  on public.transactions_pactum for select
  using (
    exists (
      select 1 from public.invoices_pactum i
      join public.projects_pactum p on p.id = i.project_id
      where i.id = transactions_pactum.invoice_id
      and p.user_id = auth.uid()
    )
  );


-- ── 8. webhooks_pactum ───────────────────────────────────────
create type public.webhook_status as enum ('active', 'inactive');

create table if not exists public.webhooks_pactum (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects_pactum(id) on delete cascade,
  url text not null,
  secret_hash text not null,
  events jsonb default '["usage.recorded", "payment.settled", "policy.limit_exceeded"]'::jsonb,
  status public.webhook_status default 'active' not null,
  created_at timestamptz default now() not null
);

alter table public.webhooks_pactum enable row level security;

create policy "Users can manage own webhooks"
  on public.webhooks_pactum for all
  using (
    exists (
      select 1 from public.projects_pactum p
      where p.id = webhooks_pactum.project_id
      and p.user_id = auth.uid()
    )
  );


-- ── Realtime ─────────────────────────────────────────────────
-- Enable realtime for dashboard live updates
alter publication supabase_realtime add table public.usage_events_pactum;
alter publication supabase_realtime add table public.transactions_pactum;
