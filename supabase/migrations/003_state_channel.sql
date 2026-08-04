-- Migration: 003_state_channel.sql
-- Add status and user_address to usage events for off-chain to on-chain batching
ALTER TABLE public.usage_events_pactum
ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending_settlement';

ALTER TABLE public.usage_events_pactum
ADD COLUMN IF NOT EXISTS user_address text;

-- Add merchant_address to projects to know where to settle funds
ALTER TABLE public.projects_pactum
ADD COLUMN IF NOT EXISTS merchant_address text;
