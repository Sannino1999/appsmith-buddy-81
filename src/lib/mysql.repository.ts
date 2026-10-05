import { randomUUID } from "crypto";

import { mysqlExecute, mysqlQuery } from "./mysql.server";

export type MysqlOverride = {
  item_key: string;
  name: string | null;
  description: string | null;
  price_eur: number | null;
  available: boolean;
};

export type MysqlMenuSpecial = {
  id: string;
  title: string;
  description: string | null;
  price_eur: number | null;
  image_url: string | null;
  item_key: string | null;
};

export type MysqlDynamicCategory = {
  id: string;
  macro: string;
  name: string;
  available: boolean;
  custom: boolean;
  sort_order: number;
};

export type MysqlCustomItem = {
  item_key: string;
  category_id: string;
  name: string;
  description: string | null;
  price_eur: number | null;
  available: boolean;
};

export type MysqlLiveMenuData = {
  overrides: MysqlOverride[];
  categories: MysqlDynamicCategory[];
  customItems: MysqlCustomItem[];
  special: MysqlMenuSpecial | null;
};

type OverrideRow = {
  item_key: string;
  name: string | null;
  description: string | null;
  price_eur: number | null;
  available: number | boolean;
};

type CategoryOverrideRow = {
  category_id: string;
  name: string | null;
  available: number | boolean;
};

type CustomCategoryRow = {
  id: string;
  macro: string;
  name: string;
  sort_order: number;
  active: number | boolean;
};

type CustomItemRow = {
  item_key: string;
  category_id: string;
  name: string;
  description: string | null;
  price_eur: number | null;
  available: number | boolean;
};

type SpecialRow = {
  id: string;
  title: string;
  description: string | null;
  price_eur: number | null;
  image_url: string | null;
  item_key: string | null;
};

export type MysqlAdminUser = {
  id: string;
  username: string | null;
  password_hash: string | null;
  telegram_chat_id: number | string | null;
  first_name: string | null;
  last_name: string | null;
  role: string;
  is_active: boolean;
};

function booleanValue(value: number | boolean) {
  return value === true || value === 1;
}

function mapOverride(row: OverrideRow): MysqlOverride {
  return {
    item_key: row.item_key,
    name: row.name,
    description: row.description,
    price_eur: row.price_eur === null ? null : Number(row.price_eur),
    available: booleanValue(row.available),
  };
}

export async function getLiveMenuDataFromMysql(): Promise<MysqlLiveMenuData> {
  const [overrideRows, categoryRows, customCategoryRows, customItemRows, specialRows] = await Promise.all([
    mysqlQuery<OverrideRow>(
      "SELECT item_key, name, description, price_eur, available FROM menu_overrides",
    ),
    mysqlQuery<CategoryOverrideRow>(
      "SELECT category_id, name, available FROM menu_category_overrides",
    ),
    mysqlQuery<CustomCategoryRow>(
      "SELECT id, macro, name, sort_order, active FROM menu_custom_categories WHERE active = 1",
    ),
    mysqlQuery<CustomItemRow>(
      "SELECT item_key, category_id, name, description, price_eur, available FROM menu_custom_items",
    ),
    mysqlQuery<SpecialRow>(
      "SELECT id, title, description, price_eur, image_url, item_key
       FROM menu_specials
       WHERE active = 1
       ORDER BY updated_at DESC
       LIMIT 1",
    ),
  ]);

  return {
    overrides: overrideRows.map(mapOverride),
    categories: categoryRows.map((row) => ({
      id: row.category_id,
      macro: "",
      name: row.name ?? row.category_id,
      available: booleanValue(row.available),
      custom: false,
      sort_order: 0,
    })),
    customItems: customItemRows.map((row) => ({
      item_key: row.item_key,
      category_id: row.category_id,
      name: row.name,
      description: row.description,
      price_eur: row.price_eur === null ? null : Number(row.price_eur),
      available: booleanValue(row.available),
    })),
    special: specialRows[0]
      ? {
          id: specialRows[0].id,
          title: specialRows[0].title,
          description: specialRows[0].description,
          price_eur: specialRows[0].price_eur === null ? null : Number(specialRows[0].price_eur),
          image_url: specialRows[0].image_url,
          item_key: specialRows[0].item_key,
        }
      : null,
  };
}

export async function listMenuOverrides(): Promise<MysqlOverride[]> {
  const rows = await mysqlQuery<OverrideRow>(
    "SELECT item_key, name, description, price_eur, available FROM menu_overrides ORDER BY item_key",
  );
  return rows.map(mapOverride);
}

export async function getMenuOverride(itemKey: string): Promise<MysqlOverride | null> {
  const rows = await mysqlQuery<OverrideRow>(
    "SELECT item_key, name, description, price_eur, available FROM menu_overrides WHERE item_key = ? LIMIT 1",
    [itemKey],
  );
  return rows[0] ? mapOverride(rows[0]) : null;
}

export async function upsertMenuOverride(row: MysqlOverride): Promise<void> {
  await mysqlExecute(
    `INSERT INTO menu_overrides (item_key, name, description, price_eur, available, updated_at)
     VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP(3))
     ON DUPLICATE KEY UPDATE
       name = ?,
       description = ?,
       price_eur = ?,
       available = ?,
       updated_at = CURRENT_TIMESTAMP(3)`,
    [
      row.item_key,
      row.name,
      row.description,
      row.price_eur,
      row.available ? 1 : 0,
      row.name,
      row.description,
      row.price_eur,
      row.available ? 1 : 0,
    ],
  );
}

export async function upsertMenuOverrides(rows: MysqlOverride[]): Promise<void> {
  for (const row of rows) await upsertMenuOverride(row);
}

export async function deleteMenuOverride(itemKey: string): Promise<void> {
  await mysqlExecute("DELETE FROM menu_overrides WHERE item_key = ?", [itemKey]);
}

export async function deleteMenuOverridesByKeys(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  const placeholders = keys.map(() => "?").join(", ");
  await mysqlExecute(`DELETE FROM menu_overrides WHERE item_key IN (${placeholders})`, keys);
}

export async function deleteAllMenuOverrides(): Promise<void> {
  await mysqlExecute("DELETE FROM menu_overrides");
}

export async function countMenuOverrides(): Promise<number> {
  const rows = await mysqlQuery<{ count: number }>(
    "SELECT COUNT(*) AS count FROM menu_overrides",
  );
  return Number(rows[0]?.count ?? 0);
}

export async function listCategoryOverrides() {
  return mysqlQuery<CategoryOverrideRow>(
    "SELECT category_id, name, available FROM menu_category_overrides",
  );
}

export async function upsertCategoryOverride(categoryId: string, available: boolean, name: string | null = null) {
  await mysqlExecute(
    `INSERT INTO menu_category_overrides (category_id, name, available, updated_at)
     VALUES (?, ?, ?, CURRENT_TIMESTAMP(3))
     ON DUPLICATE KEY UPDATE
       name = ?,
       available = ?,
       updated_at = CURRENT_TIMESTAMP(3)`,
    [categoryId, name, available ? 1 : 0, name, available ? 1 : 0],
  );
}

export async function listAdminUsers(): Promise<MysqlAdminUser[]> {
  const rows = await mysqlQuery<{
    id: string;
    username: string | null;
    password_hash: string | null;
    telegram_chat_id: number | string | null;
    first_name: string | null;
    last_name: string | null;
    role: string;
    is_active: number | boolean;
  }>(
    `SELECT id, username, password_hash, telegram_chat_id, first_name, last_name, role, is_active
     FROM admin_users
     WHERE is_active = 1
     ORDER BY created_at ASC`,
  );

  return rows.map((row) => ({
    ...row,
    is_active: booleanValue(row.is_active),
  }));
}

export async function getAdminUserByTelegramChatId(chatId: number): Promise<MysqlAdminUser | null> {
  const rows = await mysqlQuery<{
    id: string;
    username: string | null;
    password_hash: string | null;
    telegram_chat_id: number | string | null;
    first_name: string | null;
    last_name: string | null;
    role: string;
    is_active: number | boolean;
  }>(
    `SELECT id, username, password_hash, telegram_chat_id, first_name, last_name, role, is_active
     FROM admin_users
     WHERE telegram_chat_id = ? AND is_active = 1
     LIMIT 1`,
    [chatId],
  );

  const row = rows[0];
  return row
    ? { ...row, is_active: booleanValue(row.is_active) }
    : null;
}

export async function upsertTelegramAdmin(input: {
  chatId: number;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
}) {
  const existing = await mysqlQuery<{ id: string }>(
    "SELECT id FROM admin_users WHERE telegram_chat_id = ? LIMIT 1",
    [input.chatId],
  );

  if (existing[0]) {
    await mysqlExecute(
      `UPDATE admin_users
       SET username = ?, first_name = ?, last_name = ?, is_active = 1, updated_at = CURRENT_TIMESTAMP(3)
       WHERE telegram_chat_id = ?`,
      [input.username, input.firstName, input.lastName, input.chatId],
    );
    return;
  }

  await mysqlExecute(
    `INSERT INTO admin_users
      (id, username, password_hash, telegram_chat_id, first_name, last_name, role, is_active, created_at, updated_at)
     VALUES (?, ?, NULL, ?, ?, ?, 'admin', 1, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3))`,
    [randomUUID(), input.username, input.chatId, input.firstName, input.lastName],
  );
}

export async function insertAuditLog(input: {
  actor: string;
  action: string;
  itemKey?: string | null;
  details?: Record<string, unknown>;
  adminUserId?: string | null;
}) {
  const id = randomUUID();
  const details = JSON.stringify(input.details ?? {});
  await mysqlExecute(
    `INSERT INTO audit_log
      (id, admin_user_id, actor, action, item_key, details, created_at)
     VALUES (?, ?, ?, ?, ?, CAST(? AS JSON), CURRENT_TIMESTAMP(3))`,
    [id, input.adminUserId ?? null, input.actor, input.action, input.itemKey ?? null, details],
  );

  await mysqlExecute(
    `INSERT INTO menu_edit_log
      (id, actor, action, item_key, details, created_at)
     VALUES (?, ?, ?, ?, CAST(? AS JSON), CURRENT_TIMESTAMP(3))`,
    [id, input.actor, input.action, input.itemKey ?? null, details],
  );
}

export async function getTranslationCache(itemKeys: string[], lang: string) {
  if (itemKeys.length === 0) return [];
  const placeholders = itemKeys.map(() => "?").join(", ");
  return mysqlQuery<{
    item_key: string;
    name: string | null;
    description: string | null;
    source_hash: string;
  }>(
    `SELECT item_key, name, description, source_hash
     FROM menu_translations
     WHERE lang = ? AND item_key IN (${placeholders})`,
    [lang, ...itemKeys],
  );
}

export async function upsertTranslation(input: {
  itemKey: string;
  lang: string;
  name: string;
  description: string | null;
  sourceHash: string;
}) {
  await mysqlExecute(
    `INSERT INTO menu_translations
      (item_key, lang, name, description, source_hash, created_at)
     VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP(3))
     ON DUPLICATE KEY UPDATE
       name = ?,
       description = ?,
       source_hash = ?,
       created_at = CURRENT_TIMESTAMP(3)`,
    [
      input.itemKey,
      input.lang,
      input.name,
      input.description,
      input.sourceHash,
      input.name,
      input.description,
      input.sourceHash,
    ],
  );
}
