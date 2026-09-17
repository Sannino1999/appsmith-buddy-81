import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Search, X, Globe } from "lucide-react";

import bgImage from "@/assets/menu-bg.jpg";
import logoAsset from "@/assets/lubrano-logo-stacked.png.asset.json";
import { baseMenu, formatPrice, type MenuCategory } from "@/lib/menu";
import { getOverrides, translateCategory } from "@/lib/menu.functions";
import { LANGUAGES, MENU_LABELS, UI, type LangCode } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lubrano Pub & Braceria — Menù digitale" },
      {
        name: "description",
        content:
          "Menù digitale di Lubrano Pub & Braceria a Napoli: birre artigianali, burger, focacce e cucina di brace.",
      },
      { property: "og:title", content: "Lubrano Pub & Braceria — Menù digitale" },
      {
        property: "og:description",
        content: "Birre, burger e brace. Sfoglia il menù di Lubrano Pub & Braceria in 7 lingue.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MenuPage,
});

function MenuPage() {
  const [macro, setMacro] = useState<string>("beer");
  const [categoryId, setCategoryId] = useState<string>("ale");
  const [lang, setLang] = useState<LangCode>("it");
  const [langOpen, setLangOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");

  const overridesQuery = useQuery({ queryKey: ["overrides"], queryFn: () => getOverrides() });
  const translateFn = useServerFn(translateCategory);
  const translationQuery = useQuery({
    queryKey: ["translations", categoryId, lang],
    queryFn: () => translateFn({ data: { categoryId, lang } }),
    enabled: lang !== "it",
  });

  const overrides = useMemo(
    () => new Map((overridesQuery.data ?? []).map((o) => [o.item_key, o])),
    [overridesQuery.data],
  );
  const translations = translationQuery.data ?? {};
  const t = UI[lang];
  const menuLabels = MENU_LABELS[lang];

  const categories = baseMenu.categories.filter((c) => c.macro === macro);
  const active: MenuCategory | undefined =
    categories.find((c) => c.id === categoryId) ?? categories[0];

  const groups = useMemo(() => {
    if (!active) return [];
    const q = query.trim().toLowerCase();
    return active.groups
      .map((g) => ({
        name: menuLabels.groups[g.name] ?? g.name,
        items: g.items
          .map((item) => {
            const o = overrides.get(item.key);
            const tr = translations[item.key];
            return {
              ...item,
              name: tr?.name ?? o?.name ?? item.name,
              description: tr?.description ?? o?.description ?? item.description,
              price_eur: o?.price_eur ?? item.price_eur,
              available: o?.available ?? true,
              tags: item.tags.map((tag) => menuLabels.tags[tag] ?? tag),
            };
          })
          .filter((item) =>
            q.length === 0
              ? true
              : item.name.toLowerCase().includes(q) ||
                (item.description ?? "").toLowerCase().includes(q),
          ),
      }))
      .filter((g) => g.items.length > 0);
  }, [active, overrides, translations, query, menuLabels]);

  function pickMacro(id: string) {
    setMacro(id);
    const first = baseMenu.categories.find((c) => c.macro === id);
    if (first) setCategoryId(first.id);
    setQuery("");
  }

  return (
    <div className="relative min-h-screen">
      <div
        className="fixed inset-0 -z-10 bg-cover bg-center"
        style={{ backgroundImage: `url(${bgImage})` }}
        aria-hidden
      />
      <div className="fixed inset-0 -z-10 bg-background/90" aria-hidden />

      <div className="mx-auto w-full max-w-2xl px-5 pb-24 pt-6">
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <img
              src={logoAsset.url}
              alt={baseMenu.restaurant.name}
              className="h-auto w-56 max-w-[64vw] rounded-md bg-logo-panel p-2"
            />
            <p className="mt-2 text-xs font-semibold tracking-wide text-brand">
              {baseMenu.restaurant.subtitle} · {baseMenu.restaurant.locality}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label={t.search}
              onClick={() => {
                setSearchOpen((v) => !v);
                setQuery("");
              }}
              className="grid size-10 place-items-center rounded-lg border border-border bg-background/60 text-foreground"
            >
              {searchOpen ? <X className="size-4" /> : <Search className="size-4" />}
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={() => setLangOpen((v) => !v)}
                className="flex h-10 items-center gap-1 rounded-lg border border-border bg-background/60 px-3 text-sm"
              >
                <Globe className="size-4" />
                {lang.toUpperCase()}
              </button>
              {langOpen && (
                <ul className="absolute right-0 z-20 mt-2 w-44 overflow-hidden rounded-xl border border-border bg-popover shadow-xl">
                  {LANGUAGES.map((l) => (
                    <li key={l.code}>
                      <button
                        type="button"
                        onClick={() => {
                          setLang(l.code);
                          setLangOpen(false);
                        }}
                        className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-secondary ${
                          l.code === lang ? "text-primary" : ""
                        }`}
                      >
                        <span>{l.flag}</span>
                        {l.label}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </header>

        {searchOpen && (
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.search}
            className="mt-4 w-full rounded-xl border border-border bg-background/70 px-4 py-3 text-base outline-none focus:border-primary"
          />
        )}

        <nav className="mt-7 flex items-center justify-center gap-10">
          {baseMenu.macros.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => pickMacro(m.id)}
                className={`display-caps pb-1 text-2xl transition-colors ${
                macro === m.id
                  ? "border-b-4 border-primary text-brand"
                  : "text-muted-foreground"
              }`}
            >
              {menuLabels.macros[m.id] ?? m.label}
            </button>
          ))}
        </nav>

        <div className="mt-6 flex flex-wrap justify-center gap-2.5">
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategoryId(c.id)}
              className={`pill ${c.id === active?.id ? "pill-active" : ""}`}
            >
              {menuLabels.categories[c.id]?.name ?? c.name}
            </button>
          ))}
        </div>

        {active?.eyebrow && (
          <p className="mt-5 text-center text-sm italic text-muted-foreground">
            {menuLabels.categories[active.id]?.eyebrow ?? active.eyebrow}
          </p>
        )}

        {lang !== "it" && translationQuery.isFetching && (
          <p className="mt-5 text-center text-sm text-primary">…</p>
        )}

        <div className="mt-8 space-y-10">
          {groups.length === 0 && (
            <p className="text-center text-muted-foreground">{t.noResults}</p>
          )}
          {groups.map((g) => (
            <section key={g.name}>
              {g.name && (
                <h2 className="display-caps mb-5 inline-block border-b-4 border-accent text-xl text-brand">
                  {g.name}
                </h2>
              )}
              <ul className="space-y-6">
                {g.items.map((item) => (
                  <li key={item.key} className={item.available ? "" : "opacity-50"}>
                    <div className="flex items-end">
                      <h3 className="display-caps text-lg leading-tight text-brand">{item.name}</h3>
                      <span className="leader" />
                      <span className="display-caps shrink-0 text-lg text-brand">
                        {formatPrice(item.price_eur)}
                      </span>
                    </div>
                    {item.description && (
                      <p className="mt-1 text-[0.95rem] leading-snug text-muted-foreground">
                        {item.description}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-2">
                      {!item.available && (
                        <span className="rounded-full border border-destructive px-2.5 py-0.5 text-xs text-destructive">
                          {t.unavailable}
                        </span>
                      )}
                      {item.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <footer className="mt-16 text-center text-xs text-muted-foreground">
          <p className="display-caps text-sm text-brand">
            {baseMenu.restaurant.name} · {baseMenu.restaurant.subtitle}
          </p>
          <p className="mt-2">Prezzi in euro · Coperto € 2,00 · Lista allergeni disponibile al banco</p>
        </footer>
      </div>
    </div>
  );
}
