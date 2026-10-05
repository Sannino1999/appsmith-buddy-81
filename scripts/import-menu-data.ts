import { readFile } from "fs/promises";
import { existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

import { getMysqlPool, isMySqlConfigured } from "../src/lib/mysql.server.ts";
import { LANGUAGES, MENU_LABELS } from "../src/lib/i18n.ts";

type RawItem = {
  id?: string;
  name: string;
  price_eur?: number | null;
  description?: string | null;
  tags?: string[];
};

type RawMenu = {
  restaurant: { name: string; subtitle: string; locality: string };
  macros: { id: string; label: string }[];
  categories: {
    id: string;
    macro: string;
    name: string;
    eyebrow?: string | null;
    groups: { name: string; items: RawItem[] }[];
  }[];
};

const here = dirname(fileURLToPath(import.meta.url));
const menuPath = join(here, "../src/data/menu-data.json");
const translationSeedPath = join(here, "../seed/menu-translations.json");

if (!isMySqlConfigured()) {
  throw new Error(
    "MySQL non configurato. Impostare MYSQL_HOST, MYSQL_DATABASE, MYSQL_USER e MYSQL_PASSWORD.",
  );
}

const data = JSON.parse(await readFile(menuPath, "utf8")) as RawMenu;
const items = data.categories.flatMap((category) =>
  category.groups.flatMap((group, groupIndex) =>
    group.items.map((item, itemIndex) => ({
      item_key: item.id ? `${category.id}:${item.id}` : `${category.id}:${groupIndex}:${itemIndex}`,
      category_id: category.id,
      group_name: group.name || null,
      name: item.name,
      description: item.description ?? null,
      price_eur: item.price_eur ?? null,
      tags: item.tags ?? [],
      sort_order: groupIndex * 1000 + itemIndex,
    })),
  ),
);

const categoryCount = data.categories.length;
const languageCount = LANGUAGES.length;
const translatedCategoryCount = LANGUAGES.reduce((min, language) => {
  const count = Object.keys(MENU_LABELS[language.code].categories).length;
  return Math.min(min, count);
}, Number.POSITIVE_INFINITY);

if (items.length !== 135 || categoryCount !== 13 || languageCount !== 7 || translatedCategoryCount < 13) {
  throw new Error(
    `Catalogo inatteso: ${items.length} voci, ${categoryCount} categorie, ${languageCount} lingue, ${translatedCategoryCount} categorie tradotte.`,
  );
}

const pool = getMysqlPool();
const connection = await pool.getConnection();

try {
  await connection.beginTransaction();
  await connection.query("DELETE FROM menu_catalog_items");

  for (const item of items) {
    await connection.execute(
      `INSERT INTO menu_catalog_items
        (item_key, category_id, group_name, name, description, price_eur, tags, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, CAST(? AS JSON), ?)
       ON DUPLICATE KEY UPDATE
         category_id = ?,
         group_name = ?,
         name = ?,
         description = ?,
         price_eur = ?,
         tags = CAST(? AS JSON),
         sort_order = ?,
         updated_at = CURRENT_TIMESTAMP(3)`,
      [
        item.item_key,
        item.category_id,
        item.group_name,
        item.name,
        item.description,
        item.price_eur,
        JSON.stringify(item.tags),
        item.sort_order,
        item.category_id,
        item.group_name,
        item.name,
        item.description,
        item.price_eur,
        JSON.stringify(item.tags),
        item.sort_order,
      ],
    );
  }

  if (existsSync(translationSeedPath)) {
    const translationPayload = JSON.parse(await readFile(translationSeedPath, "utf8")) as {
      items?: {
        item_key: string;
        lang: string;
        name: string;
        description: string | null;
        source_hash?: string;
      }[];
    };

    for (const translation of translationPayload.items ?? []) {
      await connection.execute(
        `INSERT INTO menu_translations
          (item_key, lang, name, description, source_hash)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           name = ?,
           description = ?,
           source_hash = ?,
           created_at = CURRENT_TIMESTAMP(3)`,
        [
          translation.item_key,
          translation.lang,
          translation.name,
          translation.description ?? null,
          translation.source_hash ?? "external-seed",
          translation.name,
          translation.description ?? null,
          translation.source_hash ?? "external-seed",
        ],
      );
    }
  }

  await connection.commit();
} catch (error) {
  await connection.rollback();
  throw error;
} finally {
  connection.release();
  await pool.end();
}

console.log(
  `Import completato: ${items.length} voci, ${categoryCount} categorie e ${languageCount} lingue UI verificate.`,
);
if (!existsSync(translationSeedPath)) {
  console.log(
    "Nessun export statico delle traduzioni delle 135 voci disponibile nel repository: menu_translations non viene riempita automaticamente.",
  );
}
