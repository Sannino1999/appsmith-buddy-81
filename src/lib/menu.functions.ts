import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { baseMenu } from "./menu";
import { LANGUAGES, LANG_NAMES, type LangCode } from "./i18n";

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
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("menu_overrides")
    .select("item_key, name, description, price_eur, available");
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    item_key: row.item_key,
    name: row.name,
    description: row.description,
    price_eur: row.price_eur === null ? null : Number(row.price_eur),
    available: row.available,
  }));
});

export const getLiveMenuData = createServerFn({ method: "GET" }).handler(async (): Promise<LiveMenuData> => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [overrideResult, categoryOverrideResult, customCategoryResult, customItemResult, specialResult] =
    await Promise.all([
      supabaseAdmin.from("menu_overrides").select("item_key, name, description, price_eur, available"),
      supabaseAdmin.from("menu_category_overrides").select("category_id, name, available"),
      supabaseAdmin.from("menu_custom_categories").select("id, macro, name, sort_order, active").eq("active", true),
      supabaseAdmin.from("menu_custom_items").select("item_key, category_id, name, description, price_eur, available"),
      supabaseAdmin.from("menu_specials").select("id, title, description, price_eur, image_url, item_key").eq("active", true).order("updated_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
  const error = overrideResult.error ?? categoryOverrideResult.error ?? customCategoryResult.error ?? customItemResult.error ?? specialResult.error;
  if (error) throw new Error(error.message);
  const categoryOverrideMap = new Map((categoryOverrideResult.data ?? []).map((row) => [row.category_id, row]));
  const baseCategories = baseMenu.categories.map((category, index) => {
    const override = categoryOverrideMap.get(category.id);
    return { id: category.id, macro: category.macro, name: override?.name ?? category.name, available: override?.available ?? true, custom: false, sort_order: index };
  });
  const customCategories = (customCategoryResult.data ?? []).map((category) => ({ id: category.id, macro: category.macro, name: category.name, available: category.active, custom: true, sort_order: category.sort_order }));
  return {
    overrides: (overrideResult.data ?? []).map((row) => ({ ...row, price_eur: row.price_eur === null ? null : Number(row.price_eur) })),
    categories: [...baseCategories, ...customCategories].filter((category) => category.available).sort((a, b) => a.sort_order - b.sort_order),
    customItems: (customItemResult.data ?? []).map((row) => ({ ...row, price_eur: row.price_eur === null ? null : Number(row.price_eur) })),
    special: specialResult.data ? { ...specialResult.data, price_eur: specialResult.data.price_eur === null ? null : Number(specialResult.data.price_eur) } : null,
  };
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

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { translateEntries } = await import("./translate.server");

    const { data: overrides } = await supabaseAdmin
      .from("menu_overrides")
      .select("item_key, name, description");
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

    const { data: cached } = await supabaseAdmin
      .from("menu_translations")
      .select("item_key, name, description, source_hash")
      .eq("lang", lang)
      .in(
        "item_key",
        entries.map((e) => e.key),
      );

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
        if (rows.length > 0) {
          await supabaseAdmin.from("menu_translations").upsert(rows, { onConflict: "item_key,lang" });
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
