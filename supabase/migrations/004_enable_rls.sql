-- ============================================================
-- Migration 004: Re-enable RLS on all tables
-- Note: Since the Pactum backend uses SUPABASE_SERVICE_ROLE_KEY (createAdminClient), 
-- it automatically bypasses RLS. Enabling RLS here secures the database against 
-- unauthorized anon/authenticated client access, while allowing the backend to 
-- function normally without needing specific policies.
-- ============================================================

ALTER TABLE public.users_pactum ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects_pactum ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys_pactum ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policies_pactum ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_events_pactum ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices_pactum ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions_pactum ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhooks_pactum ENABLE ROW LEVEL SECURITY;
