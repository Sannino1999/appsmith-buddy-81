import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { baseMenu } from "./menu";
import { LANGUAGES, LANG_NAMES, type LangCode } from "./i18n";
import { isMySqlConfigured } from "./mysql.server";
import {
  getLiveMenuDataFromMysql,
  getTranslationCache,
  listMenuOverrides,
  upsertTranslation,
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

export const getOverrides = createServerFn({ method: "GET" }).handler(async (): Promise<Override[]> => {
  if (isMySqlConfigured()) {
    return listMenuOverrides();
  }

  // Until MySQL is configured, the original catalog remains the authoritative fallback.
  return [];
});

export const getLiveMenuData = createServerFn({ method: "GET" }).handler(async (): Promise<LiveMenuData> => {
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



});

function hash(text: string) {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return String(h >>> 0);
}

export type TranslationMap = Record<string, { name: string; description: string | null }>;

const TRANSLATION_BATCH_SIZE = 14;

const LANG_CODES = LANGUAGES.map((l) => l.code) as [LangCode, ...LangCode[]];

function hasTranslatedDescription(
  source: { description: string | null },
  translated: { description: string | null },
) {
  if (!source.description?.trim()) return true;
  return translated.description?.trim().toLocaleLowerCase("it") !== source.description.trim().toLocaleLowerCase("it");
}

export const translateCategory = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ categoryId: z.string(), lang: z.enum(LANG_CODES) }).parse(data),
  )
  .handler(async ({ data }): Promise<TranslationMap> => {
    const lang: LangCode = data.lang;
    if (lang === "it") return {};
    const category = baseMenu.categories.find((c) => c.id === data.categoryId);
    if (!category) return {};

    const overrides = isMySqlConfigured()
      ? await listMenuOverrides()
      : (await (async () => {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data } = await supabaseAdmin
            .from("menu_overrides")
            .select("item_key, name, description");
          return data ?? [];
        })());
    const { translateEntries } = await import("./translate.server");
    const overrideMap = new Map((overrides ?? []).map((o) => [o.item_key, o]));

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
      ? await getTranslationCache(entries.map((e) => e.key), lang)
      : (await (async () => {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data } = await supabaseAdmin
            .from("menu_translations")
            .select("item_key, name, description, source_hash")
            .eq("lang", lang)
            .in("item_key", entries.map((e) => e.key));
          return data ?? [];
        })());

    const result: TranslationMap = {};
    const cachedMap = new Map((cached ?? []).map((c) => [c.item_key, c]));
    const missing = entries.filter((e) => {
      const hit = cachedMap.get(e.key);
      if (hit && hit.source_hash === hashes.get(e.key) && hasTranslatedDescription(e, hit)) {
        result[e.key] = { name: hit.name ?? e.name, description: hit.description };
        return false;
      }
      return true;
    });

    if (missing.length > 0) {
      const translated: { key: string; name: string; description: string | null }[] = [];
      try {
        for (let i = 0; i < missing.length; i += TRANSLATION_BATCH_SIZE) {
          translated.push(
            ...(await translateEntries(missing.slice(i, i + TRANSLATION_BATCH_SIZE), LANG_NAMES[lang] ?? lang)),
          );
        }
        const validTranslations = translated.filter((t) => {
          const source = missing.find((entry) => entry.key === t.key);
          return source ? hasTranslatedDescription(source, t) : false;
        });
        translated.length = 0;
        translated.push(...validTranslations);
        const translatedKeys = new Set(translated.map((t) => t.key));
        const stillMissing = missing.filter((entry) => !translatedKeys.has(entry.key));
        for (const entry of stillMissing) {
          const retry = await translateEntries([entry], LANG_NAMES[lang] ?? lang);
          translated.push(...retry.filter((t) => hasTranslatedDescription(entry, t)));
        }
        const rows = translated.map((t) => ({
          item_key: t.key,
          lang,
          name: t.name,
          description: t.description ?? null,
          source_hash: hashes.get(t.key) ?? "",
        }));
        for (const row of rows) {
          if (isMySqlConfigured()) {
            await upsertTranslation({
              itemKey: row.item_key,
              lang: row.lang,
              name: row.name,
              description: row.description,
              sourceHash: row.source_hash,
            });
          } else {
            const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
            await supabaseAdmin.from("menu_translations").upsert(row, { onConflict: "item_key,lang" });
          }
        }
      } catch (err) {
        console.error(`Translation AI call failed for lang=${lang}:`, err);
      }
      for (const t of translated) {
        result[t.key] = { name: t.name, description: t.description ?? null };
      }
      for (const entry of missing) {
        if (!result[entry.key]) {
          result[entry.key] = { name: entry.name, description: entry.description };
        }
      }
    }

    return result;
  });
