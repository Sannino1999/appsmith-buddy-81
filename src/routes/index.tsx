import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Copy,
  ExternalLink,
  Globe,
  Instagram,
  MapPin,
  MessageCircle,
  Phone,
  Search,
  Star,
  Utensils,
  Wifi,
  X,
} from "lucide-react";

import bgImage from "@/assets/menu-bg.webp";
import { baseMenu, formatPrice, type MenuCategory } from "@/lib/menu";
import {
  getLiveMenuData,
  getOverrides,
  getPublicMenu,
  getPublicWifiPassword,
  translateCategory,
} from "@/lib/menu.functions";
import { INFO, LANGUAGES, MENU_LABELS, SERVICES, UI, VENUE, type LangCode } from "@/lib/i18n";
import { QrDialog, QrButton } from "@/components/qr-dialog";

const localLogo = "/lubrano-logo.png";
const categoryVisuals: Record<string, string> = {
  stuzzicheria: "/assets/category-stuzzicheria.webp",
  patate: "/assets/category-stuzzicheria.webp",
  hamburger: "/assets/category-burger.webp",
  panini: "/assets/category-burger.webp",
  braceria: "/assets/category-brace.webp",
  carne: "/assets/category-brace.webp",
  dolci: "/assets/category-dolci.webp",
};

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
  const [macro, setMacro] = useState<string>("food");
  const [categoryId, setCategoryId] = useState<string>("stuzzicheria");
  const [lang, setLang] = useState<LangCode>("it");
  const [langOpen, setLangOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [specialClosed, setSpecialClosed] = useState(false);
  const [wifiOpen, setWifiOpen] = useState(false);
  const [wifiCopied, setWifiCopied] = useState(false);
  const categoryRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const menuQuery = useQuery({
    queryKey: ["menu-catalog"],
    queryFn: () => getPublicMenu(),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
  const menu = menuQuery.data ?? baseMenu;

  const liveMenuQuery = useQuery({
    queryKey: ["live-menu"],
    queryFn: () => getLiveMenuData(),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  const wifiQuery = useQuery({
    queryKey: ["wifi-public"],
    queryFn: () => getPublicWifiPassword(),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const overridesQuery = useQuery({
    queryKey: ["overrides"],
    queryFn: () => getOverrides(),
    staleTime: 0,
    refetchInterval: 20_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    refetchOnMount: "always",
  });
  const translateFn = useServerFn(translateCategory);
  const overridesVersion = (overridesQuery.data ?? [])
    .map((o) => `${o.item_key}:${o.name ?? ""}:${o.description ?? ""}`)
    .join("|");
  const translationQuery = useQuery({
    queryKey: ["translations", categoryId, lang, overridesVersion],
    queryFn: () => translateFn({ data: { categoryId, lang } }),
    enabled: lang !== "it",
  });

  const overrides = useMemo(
    () => new Map((overridesQuery.data ?? []).map((o) => [o.item_key, o])),
    [overridesQuery.data],
  );
  const translations = translationQuery.data ?? {};
  const t = UI[lang];
  const info = INFO[lang];
  const menuLabels = MENU_LABELS[lang];
  const services = SERVICES[lang];
  const special = liveMenuQuery.data?.special ?? null;
  const wifiPassword = wifiQuery.data ?? null;

  const publicCategories = useMemo(() => {
    const liveCategories = liveMenuQuery.data?.categories ?? [];
    const liveById = new Map(liveCategories.map((category) => [category.id, category]));
    const baseCategories = menu.categories
      .map((category) => {
        const live = liveById.get(category.id);
        if (live && !live.available) return null;
        return {
          ...category,
          name: live?.name ?? category.name,
          macro: live?.macro ?? category.macro,
        };
      })
      .filter((category): category is MenuCategory => category !== null);

    const baseIds = new Set(baseCategories.map((category) => category.id));
    const customCategories = liveCategories
      .filter((category) => category.custom && !baseIds.has(category.id))
      .map((category) => ({
        id: category.id,
        macro: category.macro,
        name: category.name,
        eyebrow: null,
        groups: [
          {
            name: "",
            items: (liveMenuQuery.data?.customItems ?? [])
              .filter((item) => item.category_id === category.id)
              .map((item) => ({
                key: item.item_key,
                name: item.name,
                description: item.description,
                price_eur: item.price_eur,
                tags: [],
                available: item.available,
              })),
          },
        ],
      }));

    return [...baseCategories, ...customCategories];
  }, [liveMenuQuery.data, menu.categories]);

  const categories = publicCategories.filter((c) => c.macro === macro);
  const active: MenuCategory | undefined =
    categories.find((c) => c.id === categoryId) ?? categories[0];

  useEffect(() => {
    if (publicCategories.some((category) => category.id === categoryId)) return;
    const first = publicCategories.find((category) => category.macro === macro);
    if (first) setCategoryId(first.id);
  }, [categoryId, macro, publicCategories]);

  useEffect(() => {
    if (!searchOpen) return;
    requestAnimationFrame(() => searchInputRef.current?.focus());
  }, [searchOpen]);

  useEffect(() => {
    categoryRefs.current[categoryId]?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [categoryId]);

  const allItems = useMemo(
    () =>
      publicCategories.flatMap((category) =>
        category.groups.flatMap((group) =>
          group.items.map((item) => {
            const override = overrides.get(item.key);
            return {
              ...item,
              categoryId: category.id,
              categoryName: category.name,
              groupName: group.name,
              name: override?.name ?? item.name,
              description: override?.description ?? item.description,
              price_eur: override?.price_eur ?? item.price_eur,
              available: override?.available ?? item.available,
            };
          }),
        ),
      ),
    [publicCategories, overrides],
  );

  const normalizedQuery = query.trim().toLocaleLowerCase("it");
  const searchResults = useMemo(
    () =>
      normalizedQuery
        ? allItems.filter(
            (item) =>
              item.name.toLocaleLowerCase("it").includes(normalizedQuery) ||
              (item.description ?? "").toLocaleLowerCase("it").includes(normalizedQuery) ||
              item.categoryName.toLocaleLowerCase("it").includes(normalizedQuery),
          )
        : [],
    [allItems, normalizedQuery],
  );

  const groups = useMemo(() => {
    if (!active) return [];
    const q = "";
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
  }, [active, overrides, translations, menuLabels]);

  function pickMacro(id: string) {
    setMacro(id);
    const first = publicCategories.find((c) => c.macro === id);
    if (first) setCategoryId(first.id);
    setQuery("");
  }

  return (
    <div className="lubrano-shell relative min-h-screen overflow-x-clip">
      <div className="menu-backdrop fixed inset-0 -z-20 bg-cover bg-center" style={{ backgroundImage: `url(${bgImage})` }} aria-hidden />
      <div className="lubrano-backdrop fixed inset-0 -z-10" aria-hidden />
      <div className="mx-auto w-full max-w-6xl px-4 pb-20 pt-3 sm:px-6 lg:px-8">
        <header className="lubrano-header anim-fade-up">
          <div className="lubrano-topbar">
            <div className="lubrano-brandline">
              <span className="lubrano-kicker">PUB · BRACERIA · NAPOLI</span>
              <span className="lubrano-status"><span className="lubrano-status-dot" /> MENÙ DIGITALE</span>
            </div>
            <div className="flex items-center gap-2">
              <QrButton onClick={() => setQrOpen(true)} />
              <button type="button" aria-label={t.search} onClick={() => { setSearchOpen((v) => !v); setQuery(""); }} className="lubrano-icon-button">
                {searchOpen ? <X className="size-4" /> : <Search className="size-4" />}
              </button>
              <div className="relative">
                <button type="button" onClick={() => setLangOpen((v) => !v)} className="lubrano-lang-button" aria-expanded={langOpen}>
                  <Globe className="size-4" /> {lang.toUpperCase()}
                </button>
                {langOpen && (
                  <ul className="anim-scale absolute right-0 z-40 mt-2 w-44 overflow-hidden rounded-2xl border border-white/10 bg-[#160d10]/95 p-1 shadow-2xl backdrop-blur-xl">
                    {LANGUAGES.map((l) => (
                      <li key={l.code}>
                        <button type="button" onClick={() => { setLang(l.code); setLangOpen(false); }} className={`flex w-full items-center gap-2 rounded-xl px-4 py-3 text-left text-sm transition-colors hover:bg-white/5 ${l.code === lang ? "text-[#ff315b]" : "text-white/75"}`}>
                          <span>{l.flag}</span>{l.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          <div className="lubrano-hero">
            <div className="lubrano-hero-copy">
              <span className="lubrano-eyebrow">BENVENUTI DA</span>
              <h1 className="lubrano-hero-title">Lubrano</h1>
              <p className="lubrano-hero-subtitle">Pub & Braceria</p>
              <div className="lubrano-rule"><span /></div>
              <p className="lubrano-hero-note">Sapori decisi, brace, burger e birre. Scopri il menù e scegli il tuo prossimo preferito.</p>
            </div>
            <div className="lubrano-logo-frame">
              <img src={localLogo} alt={`${menu.restaurant.name} ${menu.restaurant.subtitle}`} className="lubrano-logo" width={512} height={512} />
            </div>
          </div>
        </header>

        <section className={`lubrano-search-panel anim-fade-up ${searchOpen ? "is-open" : ""}`} aria-label="Ricerca nel menù">
          <div className="lubrano-search-inner">
            <Search className="size-5 shrink-0 text-[#ff315b]" aria-hidden />
            <label className="sr-only" htmlFor="menu-search">{t.search}</label>
            <input id="menu-search" ref={searchInputRef} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cerca piatti, ingredienti o categorie" className="min-h-12 w-full bg-transparent py-2 text-base text-white outline-none placeholder:text-white/35" />
            {query && <button type="button" onClick={() => setQuery("")} className="grid size-9 place-items-center rounded-full text-white/50 hover:bg-white/5 hover:text-white" aria-label="Cancella ricerca"><X className="size-4" /></button>}
          </div>
          <p className="mt-2 px-1 text-xs text-white/40" aria-live="polite">{query ? `${searchResults.length} risultat${searchResults.length === 1 ? "o" : "i"}` : "Cerca nel menù"}</p>
        </section>

        <section className="lubrano-menu-switcher anim-fade-up stagger-1" aria-label="Sezione menù">
          {menu.macros.map((m) => (
            <button key={m.id} type="button" onClick={() => pickMacro(m.id)} className={`lubrano-macro-button ${macro === m.id ? "is-active" : ""}`}>
              <span>{menuLabels.macros[m.id] ?? m.label}</span>
              <small>{m.id === "food" ? "Burger · Brace · Cucina" : "Birre · Drink · Soft"}</small>
            </button>
          ))}
        </section>

        <div className="lubrano-category-wrap anim-fade-up stagger-2">
          <div className="lubrano-category-label">ESPLORA</div>
          <nav className="lubrano-category-strip" aria-label="Categorie">
            {categories.map((c) => (
              <button key={c.id} ref={(element) => { categoryRefs.current[c.id] = element; }} type="button" onClick={() => setCategoryId(c.id)} aria-current={c.id === active?.id ? "page" : undefined} className={`lubrano-category-pill ${c.id === active?.id ? "is-active" : ""}`}>
                {menuLabels.categories[c.id]?.name ?? c.name}
              </button>
            ))}
          </nav>
        </div>

        {active?.eyebrow && <p className="anim-fade mt-4 text-center text-sm italic text-white/55">{menuLabels.categories[active.id]?.eyebrow ?? active.eyebrow}</p>}
        {lang !== "it" && translationQuery.isFetching && <p className="mt-4 text-center text-xs font-bold uppercase tracking-[0.25em] text-[#ff315b]">Traduzione…</p>}

        {query.trim() ? (
          <section className="anim-fade mt-8" aria-label="Risultati ricerca globale">
            {searchResults.length === 0 ? (
              <div className="lubrano-empty"><Search className="mx-auto size-8 text-[#ff315b]" /><p className="mt-3 font-semibold text-white">{t.noResults}</p></div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {searchResults.map((item) => (
                  <button key={item.key} type="button" onClick={() => { const target = menu.categories.find((category) => category.id === item.categoryId); if (!target) return; setMacro(target.macro); setCategoryId(target.id); setQuery(""); }} className="lubrano-dish-card text-left">
                    <div className="flex items-start gap-4">
                      <div className="lubrano-dish-icon"><Utensils className="size-4" /></div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3"><h3 className="lubrano-dish-name">{item.name}</h3><span className="lubrano-price">{formatPrice(item.price_eur)}</span></div>
                        <p className="mt-1 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#ff315b]/75">{menuLabels.categories[item.categoryId]?.name ?? item.categoryName}</p>
                        {item.description && <p className="mt-2 text-sm leading-relaxed text-white/60">{item.description}</p>}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>
        ) : (
          <div key={active?.id ?? "empty"} className="mt-8 anim-menu-change">
            {active && (
              <section className="lubrano-category-hero">
                <img src={categoryVisuals[active.id] ?? "/assets/menu-bg.webp"} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" onError={(event) => { event.currentTarget.src = "/assets/menu-bg.webp"; }} />
                <div className="lubrano-category-hero-overlay" />
                <div className="relative z-10 flex min-h-44 flex-col justify-end p-5 sm:min-h-52 sm:p-7">
                  <span className="lubrano-eyebrow">{macro === "food" ? "DALLA CUCINA" : "DAL BANCO"}</span>
                  <h2 className="lubrano-category-title">{menuLabels.categories[active.id]?.name ?? active.name}</h2>
                  <div className="mt-3 h-px w-16 bg-[#ff315b]" />
                </div>
              </section>
            )}
            <div className="mt-9">
              {groups.length === 0 && <p className="text-center text-white/45">{t.noResults}</p>}
              {groups.map((g, gi) => (
                <section key={g.name || `group-${gi}`} className={`lubrano-menu-section menu-section-reveal stagger-${Math.min(gi + 1, 6)}`}>
                  {g.name && <div className="lubrano-section-heading"><span>{String(gi + 1).padStart(2, "0")}</span><h2>{g.name}</h2></div>}
                  <ul className="grid gap-3 md:grid-cols-2">
                    {g.items.map((item) => (
                      <li key={item.key} className={`lubrano-dish-card ${item.available ? "" : "is-unavailable"}`}>
                        <div className="flex items-start gap-3">
                          <div className="lubrano-dish-icon"><Utensils className="size-4" /></div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3"><h3 className="lubrano-dish-name">{item.name}</h3><span className="lubrano-price">{formatPrice(item.price_eur)}</span></div>
                            {item.description && <p className={`mt-2 text-sm leading-relaxed ${active?.id === "patate" ? "font-semibold text-[#8ff5cf]" : "text-white/58"}`}>{item.description}</p>}
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {!item.available && <span className="rounded-full border border-[#ff315b]/50 bg-[#ff315b]/10 px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wider text-[#ff315b]">{t.unavailable}</span>}
                              {item.tags.map((tag) => <span key={tag} className="rounded-full bg-white/[0.05] px-2.5 py-1 text-[0.64rem] text-white/45">{tag}</span>)}
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </div>
        )}

        {special && !specialClosed && (
          <section className="lubrano-special anim-fade-up">
            <button type="button" onClick={() => setSpecialClosed(true)} className="absolute right-3 top-3 z-20 grid size-9 place-items-center rounded-full border border-white/15 bg-black/55 text-white/80 hover:bg-black/75" aria-label="Chiudi speciale del mese"><X className="size-4" /></button>
            <div className="relative min-h-64 overflow-hidden md:min-h-80">
              <img src={special.image_url || "/assets/category-burger.webp"} alt={special.title} className="absolute inset-0 h-full w-full object-cover" onError={(event) => { event.currentTarget.src = "/assets/category-burger.webp"; }} />
              <div className="lubrano-special-overlay" />
              <div className="relative z-10 flex min-h-64 flex-col justify-end p-6 md:min-h-80 md:p-8">
                <span className="lubrano-special-badge"><Star className="size-3.5 fill-current" /> {services.special}</span>
                <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
                  <div><p className="lubrano-eyebrow">LIMITED · LUBRANO</p><h2 className="lubrano-special-title">{special.title}</h2></div>
                  {special.price_eur !== null && <span className="lubrano-special-price">{formatPrice(special.price_eur)}</span>}
                </div>
                {special.description && <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/75">{special.description}</p>}
              </div>
            </div>
          </section>
        )}

        <section className="lubrano-services anim-fade-up">
          <div className="lubrano-section-heading"><span>★</span><h2>{services.title}</h2></div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <a href={VENUE.reviewUrl} target="_blank" rel="noreferrer" className="lubrano-service-card"><Star className="size-5 text-[#ff315b]" /><span>{services.review}</span><ExternalLink className="ml-auto size-4 text-white/25" /></a>
            <a href={VENUE.instagramUrl} target="_blank" rel="noreferrer" className="lubrano-service-card"><Instagram className="size-5 text-[#ff315b]" /><span>{services.instagram}</span><ExternalLink className="ml-auto size-4 text-white/25" /></a>
            <a href={VENUE.whatsappUrl} target="_blank" rel="noreferrer" className="lubrano-service-card"><MessageCircle className="size-5 text-[#ff315b]" /><span>{services.whatsapp}</span><ExternalLink className="ml-auto size-4 text-white/25" /></a>
            <button type="button" onClick={() => setWifiOpen(true)} className="lubrano-service-card text-left" aria-haspopup="dialog"><Wifi className="size-5 text-[#ff315b]" /><span className="min-w-0 flex-1">{services.wifi}<small className="mt-1 block truncate text-xs font-normal text-white/35">{wifiPassword ? "Lubrano-Guest · tocca per mostrare" : services.wifiAsk}</small></span></button>
          </div>
          <div className="lubrano-allergen"><strong>{services.allergenTitle}</strong><span>{services.allergenBody}</span></div>
        </section>

        <section className="lubrano-venue anim-fade-up">
          <div className="lubrano-venue-copy"><span className="lubrano-eyebrow">{info.eyebrow}</span><h2>{info.title}</h2><p>{VENUE.address}</p><a href={VENUE.phoneHref}>{VENUE.phone}</a></div>
          <div className="lubrano-hours"><span>{info.hours}</span><div><b>{info.monday}</b><strong>{info.closed}</strong></div><div><b>{info.openDays}</b><strong>{info.openHours}</strong></div></div>
          <div className="grid gap-3 sm:grid-cols-2"><a href={VENUE.phoneHref} className="lubrano-cta lubrano-cta-primary"><Phone className="size-5" />{info.call}</a><a href={VENUE.mapsUrl} target="_blank" rel="noreferrer" className="lubrano-cta"><MapPin className="size-5" />{info.directions}</a></div>
        </section>

        <footer className="lubrano-footer">
          <img src={localLogo} alt="" className="mx-auto mb-4 size-16 rounded-full object-cover opacity-80" width={512} height={512} />
          <p className="font-bold uppercase tracking-[0.2em] text-white/75">{menu.restaurant.name} · {menu.restaurant.subtitle}</p>
          <p className="mt-2">Prezzi in euro · Coperto € 2,00 · Lista allergeni disponibile al banco</p>
          <p className="mt-3 text-[0.7rem]">Realizzato da <span className="font-semibold text-[#ff315b]">DigitGS</span></p>
        </footer>
      </div>

      <QrDialog open={qrOpen} onOpenChange={setQrOpen} url={typeof window !== "undefined" ? window.location.href : ""} restaurantName={baseMenu.restaurant.name} />

      {wifiOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md" role="presentation" onClick={() => setWifiOpen(false)}>
          <section role="dialog" aria-modal="true" aria-labelledby="wifi-dialog-title" className="anim-scale w-full max-w-sm rounded-3xl border border-[#ff315b]/25 bg-[#160d10] p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-full bg-[#ff315b]/10 text-[#ff315b]"><Wifi className="size-5" /></div><div><p className="text-[0.62rem] font-bold uppercase tracking-[0.24em] text-[#ff315b]">Lubrano Guest</p><h2 id="wifi-dialog-title" className="display-caps text-xl text-white">{services.wifi}</h2></div></div>
              <button type="button" onClick={() => setWifiOpen(false)} className="grid size-10 place-items-center rounded-full text-white/50 hover:bg-white/5 hover:text-white" aria-label="Chiudi Wi-Fi"><X className="size-4" /></button>
            </div>
            <div className="mt-6 rounded-2xl border border-white/10 bg-black/25 p-4">{wifiPassword ? <><p className="text-xs font-bold uppercase tracking-[0.16em] text-white/40">Lubrano-Guest</p><p className="mt-2 break-all rounded-xl bg-black/40 px-3 py-2 font-mono text-base text-white">{wifiPassword}</p></> : <p className="text-sm leading-relaxed text-white/55">{services.wifiAsk}</p>}</div>
            <button type="button" onClick={async () => { if (!wifiPassword || !navigator.clipboard) return; await navigator.clipboard.writeText(wifiPassword); setWifiCopied(true); window.setTimeout(() => setWifiCopied(false), 1600); }} disabled={!wifiPassword} className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#ff315b] px-5 text-sm font-bold uppercase tracking-[0.14em] text-white disabled:opacity-50">
              {wifiCopied ? <Check className="size-4" /> : <Copy className="size-4" />}{wifiCopied ? "Copiata" : "Copia password"}
            </button>
          </section>
        </div>
      )}
    </div>
  );

}
