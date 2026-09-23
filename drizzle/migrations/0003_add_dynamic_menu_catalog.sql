CREATE TABLE public.menu_category_overrides (
  category_id TEXT PRIMARY KEY,
  name TEXT,
  available BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.menu_category_overrides TO anon, authenticated;
GRANT ALL ON public.menu_category_overrides TO service_role;
ALTER TABLE public.menu_category_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read category overrides"
ON public.menu_category_overrides FOR SELECT TO anon, authenticated USING (TRUE);

CREATE TABLE public.menu_custom_categories (
  id TEXT PRIMARY KEY,
  macro TEXT NOT NULL CHECK (macro IN ('food', 'drinks')),
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 100,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.menu_custom_categories TO anon, authenticated;
GRANT ALL ON public.menu_custom_categories TO service_role;
ALTER TABLE public.menu_custom_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read active custom categories"
ON public.menu_custom_categories FOR SELECT TO anon, authenticated USING (active = TRUE);

CREATE TABLE public.menu_custom_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_key TEXT UNIQUE NOT NULL,
  category_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price_eur NUMERIC,
  available BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.menu_custom_items TO anon, authenticated;
GRANT ALL ON public.menu_custom_items TO service_role;
ALTER TABLE public.menu_custom_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read custom menu items"
ON public.menu_custom_items FOR SELECT TO anon, authenticated USING (TRUE);
CREATE INDEX menu_custom_items_category_idx ON public.menu_custom_items(category_id);