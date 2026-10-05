import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import {
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

import bgImage from "@/assets/menu-bg.jpg";
import logoVertical from "@/assets/lubrano-logo-vertical.png.asset.json";
import burgerBackground from "@/assets/lubrano-burger-background.jpeg.asset.json";
import { baseMenu, formatPrice, type MenuCategory } from "@/lib/menu";
import {
  getLiveMenuData,
  getOverrides,
  getPublicMenu,
  translateCategory,
} from "@/lib/menu.functions";
import { INFO, LANGUAGES, MENU_LABELS, SERVICES, UI, VENUE, type LangCode } from "@/lib/i18n";
import { QrDialog, QrButton } from "@/components/qr-dialog";

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

  const categories = menu.categories.filter((c) => c.macro === macro);
  const active: MenuCategory | undefined =
    categories.find((c) => c.id === categoryId) ?? categories[0];

  useEffect(() => {
    if (menu.categories.some((category) => category.id === categoryId)) return;
    const first = menu.categories.find((category) => category.macro === macro);
    if (first) setCategoryId(first.id);
  }, [categoryId, macro, menu.categories]);

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
      menu.categories.flatMap((category) =>
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
    [menu.categories, overrides],
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
    const first = menu.categories.find((c) => c.macro === id);
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
      <div
        className="fixed inset-0 -z-10 bg-[linear-gradient(180deg,rgba(20,14,12,0.92)_0%,rgba(20,14,12,0.84)_38%,rgba(20,14,12,0.96)_100%)]"
        aria-hidden
      />

      <div className="mx-auto w-full max-w-4xl px-4 pb-24 pt-4 sm:px-6">
        <header className="anim-fade-up flex flex-col items-center gap-4">
          <div className="flex w-full items-center justify-end gap-2">
            <QrButton onClick={() => setQrOpen(true)} />
            <button
              type="button"
              aria-label={t.search}
              onClick={() => {
                setSearchOpen((v) => !v);
                setQuery("");
              }}
              className="grid size-10 place-items-center rounded-lg border border-border bg-background/60 text-foreground transition-all duration-200 hover:bg-secondary hover:scale-105 active:scale-95"
            >
              {searchOpen ? <X className="size-4" /> : <Search className="size-4" />}
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={() => setLangOpen((v) => !v)}
                className="flex h-10 items-center gap-1 rounded-lg border border-border bg-background/60 px-3 text-sm transition-all duration-200 hover:bg-secondary hover:scale-105 active:scale-95"
              >
                <Globe className="size-4" />
                {lang.toUpperCase()}
              </button>
              {langOpen && (
                <ul className="anim-scale absolute right-0 z-20 mt-2 w-44 overflow-hidden rounded-xl border border-border bg-popover shadow-xl">
                  {LANGUAGES.map((l) => (
                    <li key={l.code}>
                      <button
                        type="button"
                        onClick={() => {
                          setLang(l.code);
                          setLangOpen(false);
                        }}
                        className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition-colors duration-150 hover:bg-secondary ${
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

          <img
            src={logoVertical.url}
            alt={`${menu.restaurant.name} ${menu.restaurant.subtitle}`}
            className="h-auto w-56 max-w-[78vw] drop-shadow-[0_16px_40px_rgba(0,0,0,0.7)] transition-transform duration-300 hover:scale-[1.02] sm:w-72"
          />
        </header>

        <section
          className={`anim-fade-up mt-5 rounded-2xl border border-white/10 bg-black/30 p-3 backdrop-blur-md ${searchOpen ? "" : "hidden"}`}
          aria-label="Ricerca nel menù"
        >
          <label className="sr-only" htmlFor="menu-search">
            {t.search}
          </label>
          <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4">
            <Search className="size-5 shrink-0 text-accent" aria-hidden />
            <input
              id="menu-search"
              ref={searchInputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.search}
              className="min-h-12 w-full bg-transparent py-2 text-base text-white outline-none placeholder:text-white/40 focus-visible:ring-2 focus-visible:ring-accent/70"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="menu-control grid size-9 place-items-center rounded-full text-white/60 hover:text-white"
                aria-label="Cancella ricerca"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
          <p className="mt-2 px-1 text-xs text-white/50" aria-live="polite">
            {query
              ? `${searchResults.length} risultat${searchResults.length === 1 ? "o" : "i"}`
              : "Cerca piatti, categorie o ingredienti"}
          </p>
        </section>

        <nav className="anim-fade-up stagger-1 mt-6 grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-black/25 p-1.5 backdrop-blur-md">
          {menu.macros.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => pickMacro(m.id)}
              className={`menu-control min-h-12 rounded-xl px-4 text-base font-extrabold uppercase tracking-[0.16em] transition-all duration-200 ${
                macro === m.id
                  ? "bg-primary text-primary-foreground shadow-lg"
                  : "text-white/55 hover:bg-white/5 hover:text-white"
              }`}
            >
              {menuLabels.macros[m.id] ?? m.label}
            </button>
          ))}
        </nav>

        <div className="anim-fade-up stagger-2 sticky top-2 z-20 mt-3 overflow-x-auto rounded-2xl border border-white/10 bg-black/45 px-2 py-2 shadow-lg backdrop-blur-xl">
          <div className="flex min-w-max gap-2">
            {categories.map((c) => (
              <button
                key={c.id}
                ref={(element) => {
                  categoryRefs.current[c.id] = element;
                }}
                type="button"
                onClick={() => setCategoryId(c.id)}
                aria-current={c.id === active?.id ? "page" : undefined}
                className={`pill shrink-0 ${c.id === active?.id ? "pill-active" : ""}`}
              >
                {menuLabels.categories[c.id]?.name ?? c.name}
              </button>
            ))}
          </div>
        </div>

        {active?.eyebrow && (
          <p className="anim-fade mt-5 text-center text-sm italic text-muted-foreground">
            {menuLabels.categories[active.id]?.eyebrow ?? active.eyebrow}
          </p>
        )}

        {lang !== "it" && translationQuery.isFetching && (
          <p className="anim-fade mt-5 text-center text-sm text-primary">…</p>
        )}

        {query.trim() ? (
          <section className="anim-fade mt-7" aria-label="Risultati ricerca globale">
            {searchResults.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-black/30 px-6 py-12 text-center">
                <Search className="mx-auto size-8 text-accent" />
                <p className="mt-3 font-semibold text-white">{t.noResults}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {searchResults.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => {
                      const target = menu.categories.find(
                        (category) => category.id === item.categoryId,
                      );
                      if (!target) return;
                      setMacro(target.macro);
                      setCategoryId(target.id);
                      setQuery("");
                    }}
                    className="group w-full rounded-2xl border border-white/10 bg-black/35 p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:bg-black/45"
                  >
                    <div className="flex items-start gap-4">
                      <div className="mt-1 grid size-10 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
                        <Utensils className="size-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="display-caps text-base text-white group-hover:text-accent">
                            {item.name}
                          </h3>
                          <span className="display-caps shrink-0 text-base text-accent">
                            {formatPrice(item.price_eur)}
                          </span>
                        </div>
                        <p className="mt-1 text-xs uppercase tracking-[0.12em] text-white/40">
                          {menuLabels.categories[item.categoryId]?.name ?? item.categoryName}
                        </p>
                        {item.description && (
                          <p className="mt-2 text-sm leading-relaxed text-white/65">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>
        ) : (
          <div key={active?.id ?? "empty"} className="mt-8 space-y-10">
            {groups.length === 0 && (
              <p className="text-center text-muted-foreground">{t.noResults}</p>
            )}
            {groups.map((g, gi) => (
              <section key={g.name} className={`anim-fade-up stagger-${Math.min(gi + 1, 6)}`}>
                {g.name && (
                  <h2 className="display-caps mb-5 inline-block border-b-4 border-accent text-xl text-brand">
                    {g.name}
                  </h2>
                )}
                <ul className="space-y-6">
                  {g.items.map((item) => (
                    <li
                      key={item.key}
                      className={`group rounded-2xl border border-white/10 bg-black/25 p-4 backdrop-blur-[2px] transition-all duration-200 hover:-translate-y-0.5 hover:border-white/20 hover:bg-black/35 ${item.available ? "" : "opacity-55"}`}
                    >
                      <div className="flex items-end gap-2">
                        <h3 className="display-caps min-w-0 text-[1.03rem] leading-tight text-white sm:text-lg">
                          {item.name}
                        </h3>
                        <span className="leader" />
                        <span className="display-caps shrink-0 text-base text-accent sm:text-lg">
                          {formatPrice(item.price_eur)}
                        </span>
                      </div>
                      {item.description && (
                        <p
                          className={`mt-2 text-sm leading-relaxed sm:text-[0.95rem] ${active?.id === "patate" ? "font-semibold text-accent" : "text-white/65"}`}
                        >
                          {item.description}
                        </p>
                      )}
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {!item.available && (
                          <span className="rounded-full border border-destructive px-2.5 py-0.5 text-xs text-destructive">
                            {t.unavailable}
                          </span>
                        )}
                        {item.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-white/8 px-2.5 py-1 text-[0.66rem] text-white/50"
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
        )}

        {special && !specialClosed && (
          <section className="anim-fade-up relative mt-12 overflow-hidden rounded-[1.75rem] border border-accent/30 bg-black/55 shadow-2xl backdrop-blur-md">
            <button
              type="button"
              onClick={() => setSpecialClosed(true)}
              className="menu-control absolute right-3 top-3 z-10 grid size-10 place-items-center rounded-full border border-white/15 bg-black/45 text-white"
              aria-label="Chiudi speciale del mese"
            >
              <X className="size-4" />
            </button>
            <div className="grid md:grid-cols-[0.9fr_1.1fr]">
              <div className="relative min-h-60 overflow-hidden">
                <img
                  src={special.image_url || burgerBackground.url}
                  alt={special.title}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                <span className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1.5 text-xs font-black uppercase tracking-[0.12em] text-accent-foreground">
                  <Star className="size-3.5 fill-current" />
                  {services.special}
                </span>
              </div>
              <div className="p-6 sm:p-7">
                <p className="text-[0.68rem] font-bold uppercase tracking-[0.3em] text-accent">
                  Speciale del Mese
                </p>
                <div className="mt-2 flex items-start justify-between gap-4">
                  <h2 className="display-caps text-2xl text-white sm:text-3xl">{special.title}</h2>
                  {special.price_eur !== null && (
                    <span className="display-caps shrink-0 text-xl text-accent">
                      {formatPrice(special.price_eur)}
                    </span>
                  )}
                </div>
                {special.description && (
                  <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-[0.66rem] font-bold uppercase tracking-[0.22em] text-white/45">
                      Ingredienti
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-white/70">
                      {special.description}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        <section className="anim-fade-up mt-12 rounded-[1.75rem] border border-white/10 bg-black/45 p-5 shadow-2xl backdrop-blur-md sm:p-7">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-full bg-accent/10 text-accent">
              <Star className="size-5" />
            </div>
            <div>
              <p className="text-[0.62rem] font-bold uppercase tracking-[0.28em] text-accent">
                Lubrano con te
              </p>
              <h2 className="display-caps mt-1 text-xl text-white">{services.title}</h2>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <a
              href={VENUE.reviewUrl}
              target="_blank"
              rel="noreferrer"
              className="menu-control flex min-h-14 items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-semibold text-white"
            >
              <Star className="size-4 text-accent" />
              <span className="flex-1">{services.review}</span>
              <ExternalLink className="size-4 text-white/35" />
            </a>
            <a
              href={VENUE.instagramUrl}
              target="_blank"
              rel="noreferrer"
              className="menu-control flex min-h-14 items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-semibold text-white"
            >
              <Instagram className="size-4 text-accent" />
              <span className="flex-1">{services.instagram}</span>
              <ExternalLink className="size-4 text-white/35" />
            </a>
            <a
              href={VENUE.whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="menu-control flex min-h-14 items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-semibold text-white"
            >
              <MessageCircle className="size-4 text-accent" />
              <span className="flex-1">{services.whatsapp}</span>
              <ExternalLink className="size-4 text-white/35" />
            </a>
            <button
              type="button"
              onClick={() => setWifiOpen(true)}
              className="menu-control flex min-h-14 items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-semibold text-white"
              aria-haspopup="dialog"
            >
              <Wifi className="size-4 text-accent" />
              <span className="flex-1 text-left">
                {services.wifi}
                <span className="mt-0.5 block text-xs font-normal text-white/45">
                  {services.wifiAsk}
                </span>
              </span>
            </button>
          </div>

          <div className="mt-6 rounded-xl border border-accent/20 bg-accent/5 p-4">
            <p className="text-sm font-bold text-accent">{services.allergenTitle}</p>
            <p className="mt-1 text-sm leading-relaxed text-white/65">{services.allergenBody}</p>
          </div>
        </section>

        <section className="anim-fade-up relative mt-16 border border-border/60 bg-background/70 p-8 shadow-2xl sm:p-10">
          <div
            aria-hidden
            className="pointer-events-none absolute left-0 top-0 size-7 border-l-2 border-t-2 border-brand"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute right-0 top-0 size-7 border-r-2 border-t-2 border-brand"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute bottom-0 left-0 size-7 border-b-2 border-l-2 border-brand"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute bottom-0 right-0 size-7 border-b-2 border-r-2 border-brand"
          />

          <div className="text-center">
            <span className="block text-[0.65rem] font-bold uppercase tracking-[0.3em] text-accent">
              {info.eyebrow}
            </span>
            <h2 className="display-caps mt-2 text-3xl text-brand">{info.title}</h2>
            <div className="mx-auto mt-4 h-px w-16 bg-brand" />
          </div>

          <div className="mt-7 text-center">
            <p className="text-lg font-medium tracking-wide text-foreground">{VENUE.address}</p>
            <a
              href={VENUE.phoneHref}
              className="mt-3 inline-block text-lg font-semibold text-accent underline decoration-border underline-offset-8 transition-colors duration-200 hover:text-foreground"
            >
              {VENUE.phone}
            </a>
          </div>

          <div className="my-8 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-5">
            <h3 className="mb-4 text-center text-[0.6rem] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              {info.hours}
            </h3>
            <div className="grid gap-2 sm:grid-cols-2 sm:gap-y-2">
              <span className="text-right text-sm uppercase text-muted-foreground">
                {info.monday}
              </span>
              <span className="display-caps text-left text-sm font-bold uppercase tracking-widest text-brand">
                {info.closed}
              </span>
              <span className="text-right text-sm uppercase text-foreground/80">
                {info.openDays}
              </span>
              <span className="text-left text-sm font-semibold text-foreground">
                {info.openHours}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <a
              href={VENUE.phoneHref}
              className="flex items-center justify-center gap-3 bg-primary px-6 py-4 text-primary-foreground transition-all duration-300 hover:bg-primary/90 active:scale-95"
            >
              <Phone className="size-5" />
              <span className="display-caps text-xs font-black uppercase tracking-[0.2em]">
                {info.call}
              </span>
            </a>
            <a
              href={VENUE.mapsUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-3 bg-foreground px-6 py-4 text-background transition-all duration-300 hover:opacity-90 active:scale-95"
            >
              <MapPin className="size-5" />
              <span className="display-caps text-xs font-black uppercase tracking-[0.2em]">
                {info.directions}
              </span>
            </a>
          </div>

          <p className="mt-8 text-center text-[0.6rem] uppercase tracking-widest text-muted-foreground/70">
            {menu.restaurant.name} · Napoli
          </p>
        </section>

        <footer className="anim-fade-up mt-10 text-center text-xs text-muted-foreground">
          <p className="display-caps text-sm text-brand">
            {menu.restaurant.name} · {menu.restaurant.subtitle}
          </p>
          <p className="mt-2">
            Prezzi in euro · Coperto € 2,00 · Lista allergeni disponibile al banco
          </p>
          <p className="mt-3 text-[0.7rem] text-muted-foreground/70">
            Realizzato da <span className="font-semibold text-brand/80">DigitGS</span>
          </p>
        </footer>
      </div>

      <QrDialog
        open={qrOpen}
        onOpenChange={setQrOpen}
        url={typeof window !== "undefined" ? window.location.href : ""}
        restaurantName={baseMenu.restaurant.name}
      />

      {wifiOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          role="presentation"
          onClick={() => setWifiOpen(false)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="wifi-dialog-title"
            className="anim-scale w-full max-w-sm rounded-3xl border border-accent/20 bg-card p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-full bg-accent/10 text-accent">
                  <Wifi className="size-5" />
                </div>
                <div>
                  <p className="text-[0.62rem] font-bold uppercase tracking-[0.24em] text-accent">
                    Lubrano Guest
                  </p>
                  <h2 id="wifi-dialog-title" className="display-caps text-xl text-foreground">
                    {services.wifi}
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setWifiOpen(false)}
                className="menu-control grid size-10 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
                aria-label="Chiudi Wi-Fi"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="mt-6 rounded-2xl border border-border bg-background/60 p-4">
              <p className="text-sm leading-relaxed text-muted-foreground">{services.wifiAsk}</p>
            </div>
            <button
              type="button"
              disabled
              className="mt-4 flex min-h-12 w-full items-center justify-center rounded-xl bg-primary px-5 text-sm font-bold uppercase tracking-[0.14em] text-primary-foreground opacity-60"
            >
              Copia password
            </button>
            <p className="mt-3 text-center text-xs text-muted-foreground/60">
              La password verrà resa disponibile dall’area admin.
            </p>
          </section>
        </div>
      )}
    </div>
  );
}
