-- Track the on-chain settlement transaction for each usage event, so every
-- settled row carries its own auditable receipt (notarial ledger).
ALTER TABLE usage_events_pactum
  ADD COLUMN IF NOT EXISTS settled_tx_hash text;
