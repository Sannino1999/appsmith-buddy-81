import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { baseMenu } from "./menu";
import { LANGUAGES, type LangCode } from "./i18n";
import { isMySqlConfigured } from "./mysql.server";
import {
  getLiveMenuDataFromMysql,
  getMenuFromMysql,
  getTranslationCache,
  getSetting,
  listMenuOverrides,
} from "./mysql.repository";

export type Override = {
  item_key: string;
  name: string | null;
  description: string | null;
  price_eur: number | null;
  available: boolean;
};

export type MenuSpecial = {
  id: string;
  title: string;
  description: string | null;
  price_eur: number | null;
  image_url: string | null;
  item_key: string | null;
};

export type DynamicCategory = {
  id: string;
  macro: string;
  name: string;
  available: boolean;
  custom: boolean;
  sort_order: number;
};

export type CustomItem = {
  item_key: string;
  category_id: string;
  name: string;
  description: string | null;
  price_eur: number | null;
  available: boolean;
};

export type LiveMenuData = {
  overrides: Override[];
  categories: DynamicCategory[];
  customItems: CustomItem[];
  special: MenuSpecial | null;
};

export const getPublicMenu = createServerFn({ method: "GET" }).handler(async () => {
  if (!isMySqlConfigured()) return baseMenu;

  try {
    return (await getMenuFromMysql()) ?? baseMenu;
  } catch (error) {
    console.error("MySQL catalog unavailable; serving the original menu catalog.", error);
    return baseMenu;
  }
});


export const getPublicWifiPassword = createServerFn({ method: "GET" }).handler(async () => {
  if (!isMySqlConfigured()) return null;
  try {
    const value = await getSetting("wifi_password");
    return value?.trim() || null;
  } catch (error) {
    console.error("MySQL Wi-Fi setting unavailable:", error);
    return null;
  }
});

export const getOverrides = createServerFn({ method: "GET" }).handler(
  async (): Promise<Override[]> => {
    if (isMySqlConfigured()) {
      return listMenuOverrides();
    }

    // Until MySQL is configured, the original catalog remains the authoritative fallback.
    return [];
  },
);

export const getLiveMenuData = createServerFn({ method: "GET" }).handler(
  async (): Promise<LiveMenuData> => {
    const fallback: LiveMenuData = {
      overrides: [],
      categories: baseMenu.categories.map((category, index) => ({
        id: category.id,
        macro: category.macro,
        name: category.name,
        available: true,
        custom: false,
        sort_order: index,
      })),
      customItems: [],
      special: null,
    };

    if (isMySqlConfigured()) {
      try {
        const data = await getLiveMenuDataFromMysql();
        return {
          overrides: data.overrides,
          categories: data.categories,
          customItems: data.customItems,
          special: data.special,
        };
      } catch (error) {
        console.error("MySQL live menu unavailable; serving the original catalog.", error);
        return fallback;
      }
    }

    return fallback;
  },
);

function hash(text: string) {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return String(h >>> 0);
}

export type TranslationMap = Record<string, { name: string; description: string | null }>;

const LANG_CODES = LANGUAGES.map((l) => l.code) as [LangCode, ...LangCode[]];

function hasTranslatedDescription(
  source: { description: string | null },
  translated: { description: string | null },
) {
  if (!source.description?.trim()) return true;
  return (
    translated.description?.trim().toLocaleLowerCase("it") !==
    source.description.trim().toLocaleLowerCase("it")
  );
}

export const translateCategory = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ categoryId: z.string(), lang: z.enum(LANG_CODES) }).parse(data),
  )
  .handler(async ({ data }): Promise<TranslationMap> => {
    const lang: LangCode = data.lang;
    if (lang === "it") return {};
    const menu = isMySqlConfigured() ? ((await getMenuFromMysql()) ?? baseMenu) : baseMenu;
    const category = menu.categories.find((c) => c.id === data.categoryId);
    if (!category) return {};

    const overrides = isMySqlConfigured() ? await listMenuOverrides() : [];
    const overrideMap = new Map(overrides.map((o) => [o.item_key, o]));

    const entries = category.groups.flatMap((g) =>
      g.items.map((item) => {
        const o = overrideMap.get(item.key);
        return {
          key: item.key,
          name: o?.name ?? item.name,
          description: o?.description ?? item.description,
        };
      }),
    );
    const hashes = new Map(entries.map((e) => [e.key, hash(`${e.name}|${e.description ?? ""}`)]));

    const cached = isMySqlConfigured()
      ? await getTranslationCache(
          entries.map((e) => e.key),
          lang,
        )
      : [];

    const result: TranslationMap = {};
    const cachedMap = new Map((cached ?? []).map((c) => [c.item_key, c]));
    for (const entry of entries) {
      const hit = cachedMap.get(entry.key);
      if (
        hit &&
        hit.source_hash === hashes.get(entry.key) &&
        hasTranslatedDescription(entry, hit)
      ) {
        result[entry.key] = {
          name: hit.name ?? entry.name,
          description: hit.description,
        };
      } else {
        result[entry.key] = {
          name: entry.name,
          description: entry.description,
        };
      }
    }

    return result;
  });
