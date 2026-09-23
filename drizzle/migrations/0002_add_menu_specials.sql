CREATE TABLE public.menu_specials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  price_eur NUMERIC,
  image_url TEXT,
  item_key TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.menu_specials TO anon, authenticated;
GRANT ALL ON public.menu_specials TO service_role;
ALTER TABLE public.menu_specials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read active menu specials"
ON public.menu_specials
FOR SELECT
TO anon, authenticated
USING (active = TRUE);