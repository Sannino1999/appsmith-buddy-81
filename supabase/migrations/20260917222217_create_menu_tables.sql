/*
# Create menu tables for Lubrano Pub & Braceria

This migration creates the four tables required by the digital menu:

1. New Tables
   - `menu_overrides`: stores operator edits to menu items (price, description, availability).
     Primary key: `item_key` (text). Allows null name/description/price; `available` defaults true.
   - `menu_translations`: caches AI-translated menu item names and descriptions per language.
     Composite primary key: `(item_key, lang)`. Stores `source_hash` to detect stale translations.
   - `menu_edit_log`: audit log of all menu changes made via Telegram bot.
     Primary key: `id` (uuid). Records actor, action type, item key, and raw command details.
   - `telegram_admins`: authorized Telegram operators who can edit the menu via bot.
     Primary key: `chat_id` (bigint). Stores username, first_name, last_name.

2. Security
   - RLS enabled on all tables.
   - `menu_overrides` and `menu_translations`: public read for anon + authenticated (the menu
     is a public-facing page with no sign-in, so the anon key must be able to read).
   - `menu_edit_log` and `telegram_admins`: service_role only (admin/audit data, not exposed
     to the public).
   - All write operations go through the service_role key (server-side only).

3. Important Notes
   - This is a single-tenant app with no sign-in screen, so SELECT policies use
     `TO anon, authenticated` with `USING (true)` because the menu data is intentionally public.
   - The Telegram bot and server functions use the service_role key, which bypasses RLS.
*/

CREATE TABLE IF NOT EXISTS public.menu_overrides (
  item_key text PRIMARY KEY,
  name text,
  description text,
  price_eur numeric(8,2),
  available boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.menu_translations (
  item_key text NOT NULL,
  lang text NOT NULL,
  name text,
  description text,
  source_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (item_key, lang)
);

CREATE TABLE IF NOT EXISTS public.menu_edit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor text NOT NULL,
  action text NOT NULL,
  item_key text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.telegram_admins (
  chat_id bigint PRIMARY KEY,
  username text,
  first_name text,
  last_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.menu_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_edit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_admins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public read overrides" ON public.menu_overrides;
CREATE POLICY "public read overrides" ON public.menu_overrides
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public read translations" ON public.menu_translations;
CREATE POLICY "public read translations" ON public.menu_translations
  FOR SELECT TO anon, authenticated USING (true);
