-- Hot-path indexes for metering, settlement, and dashboards.
-- Every index here matches a query that runs per-request or per-settlement.

-- Settlement engine + payouts: fetch events by status, newest first
create index if not exists usage_events_status_created_idx
  on public.usage_events_pactum (status, created_at desc);

-- Balance pre-check / wallet balance: pending usage per user address
create index if not exists usage_events_address_status_idx
  on public.usage_events_pactum (lower(user_address), status);

-- Usage log page + policy spend sums: events per API key in a time range
create index if not exists usage_events_key_created_idx
  on public.usage_events_pactum (api_key_id, created_at desc);

-- Invoices & receipts join on invoice_id
create index if not exists transactions_invoice_idx
  on public.transactions_pactum (invoice_id);

-- API key lookup happens on EVERY metered call — make it unique + indexed.
-- (SHA-256 hex of the key; duplicates would be a real collision and must fail loudly.)
create unique index if not exists api_keys_key_hash_uidx
  on public.api_keys_pactum (key_hash);
