export const LANGUAGES = [
  { code: "it", label: "Italiano", flag: "🇮🇹" },
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "pt", label: "Português", flag: "🇵🇹" },
  { code: "zh", label: "中文", flag: "🇨🇳" },
] as const;

export type LangCode = (typeof LANGUAGES)[number]["code"];

export const LANG_NAMES: Record<LangCode, string> = {
  it: "Italian",
  en: "English",
  es: "Spanish",
  fr: "French",
  de: "German",
  pt: "Portuguese",
  zh: "Simplified Chinese",
};

type UIStrings = { search: string; noResults: string; unavailable: string; allergens: string };

export const UI: Record<LangCode, UIStrings> = {
  it: {
    search: "Cerca nel menù",
    noResults: "Nessun risultato",
    unavailable: "Non disponibile",
    allergens: "Allergeni",
  },
  en: { search: "Search the menu", noResults: "No results", unavailable: "Unavailable", allergens: "Allergens" },
  es: { search: "Buscar en el menú", noResults: "Sin resultados", unavailable: "No disponible", allergens: "Alérgenos" },
  fr: { search: "Rechercher au menu", noResults: "Aucun résultat", unavailable: "Indisponible", allergens: "Allergènes" },
  de: { search: "Menü durchsuchen", noResults: "Keine Treffer", unavailable: "Nicht verfügbar", allergens: "Allergene" },
  pt: { search: "Pesquisar no menu", noResults: "Sem resultados", unavailable: "Indisponível", allergens: "Alérgenos" },
  zh: { search: "搜索菜单", noResults: "没有结果", unavailable: "暂不供应", allergens: "过敏原" },
};
