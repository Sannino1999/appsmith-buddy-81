CREATE TABLE public.menu_overrides (
  item_key text PRIMARY KEY,
  name text,
  description text,
  price_eur numeric(8,2),
  available boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.menu_translations (
  item_key text NOT NULL,
  lang text NOT NULL,
  name text,
  description text,
  source_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (item_key, lang)
);

CREATE TABLE public.menu_edit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor text NOT NULL,
  action text NOT NULL,
  item_key text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.telegram_admins (
  chat_id bigint PRIMARY KEY,
  username text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.menu_overrides TO anon, authenticated;
GRANT ALL ON public.menu_overrides TO service_role;
GRANT SELECT ON public.menu_translations TO anon, authenticated;
GRANT ALL ON public.menu_translations TO service_role;
GRANT ALL ON public.menu_edit_log TO service_role;
GRANT ALL ON public.telegram_admins TO service_role;

ALTER TABLE public.menu_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_edit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read overrides" ON public.menu_overrides FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public read translations" ON public.menu_translations FOR SELECT TO anon, authenticated USING (true);