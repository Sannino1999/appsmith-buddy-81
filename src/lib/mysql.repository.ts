import { randomUUID } from "crypto";

import { baseMenu, type Menu } from "./menu";
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

type BoolLike = boolean | number;
type OverrideRow = MysqlOverride & { available: BoolLike };
type CategoryOverrideRow = { category_id: string; name: string | null; available: BoolLike };
type CustomCategoryRow = {
  id: string;
  macro: string;
  name: string;
  sort_order: number;
  active: BoolLike;
};
type CustomItemRow = MysqlCustomItem & { available: BoolLike };
type SpecialRow = MysqlMenuSpecial;
type CatalogRow = {
  item_key: string;
  category_id: string;
  group_name: string | null;
  name: string;
  description: string | null;
  price_eur: number | null;
  tags: string;
  sort_order: number;
};

function toBool(value: BoolLike) {
  return value === true || value === 1;
}

function mapOverride(row: OverrideRow): MysqlOverride {
  return {
    item_key: row.item_key,
    name: row.name,
    description: row.description,
    price_eur: row.price_eur === null ? null : Number(row.price_eur),
    available: toBool(row.available),
  };
}

export async function getMenuFromMysql(): Promise<Menu | null> {
  const rows = await mysqlQuery<CatalogRow>(
    `SELECT item_key, category_id, group_name, name, description, price_eur, tags, sort_order
     FROM menu_catalog_items
     ORDER BY category_id, sort_order, item_key`,
  );

  if (rows.length === 0) return null;

  const rowsByCategory = new Map<string, CatalogRow[]>();
  for (const row of rows) {
    const list = rowsByCategory.get(row.category_id) ?? [];
    list.push(row);
    rowsByCategory.set(row.category_id, list);
  }

  const categories = baseMenu.categories.map((category) => {
    const categoryRows = rowsByCategory.get(category.id) ?? [];
    const groupsByName = new Map<string, CatalogRow[]>();
    for (const row of categoryRows) {
      const groupName = row.group_name ?? "";
      const list = groupsByName.get(groupName) ?? [];
      list.push(row);
      groupsByName.set(groupName, list);
    }

    const orderedGroupNames = [
      ...category.groups.map((group) => group.name),
      ...[...groupsByName.keys()].filter(
        (groupName) => groupName && !category.groups.some((group) => group.name === groupName),
      ),
    ];

    return {
      ...category,
      groups: orderedGroupNames
        .map((groupName) => ({
          name: groupName,
          items: (groupsByName.get(groupName) ?? [])
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((row) => {
              let tags: string[] = [];
              try {
                const parsed = JSON.parse(row.tags);
                if (Array.isArray(parsed))
                  tags = parsed.filter((tag): tag is string => typeof tag === "string");
              } catch {
                tags = [];
              }

              return {
                key: row.item_key,
                name: row.name,
                description: row.description,
                price_eur: row.price_eur === null ? null : Number(row.price_eur),
                tags,
                available: true,
              };
            }),
        }))
        .filter((group) => group.items.length > 0),
    };
  });

  return {
    restaurant: baseMenu.restaurant,
    macros: baseMenu.macros,
    categories,
  };
}

export async function getLiveMenuDataFromMysql(): Promise<MysqlLiveMenuData> {
  const [overrideRows, categoryOverrideRows, customCategoryRows, customItemRows, specialRows] =
    await Promise.all([
      mysqlQuery<OverrideRow>(
        "SELECT item_key, name, description, price_eur, available FROM menu_overrides",
      ),
      mysqlQuery<CategoryOverrideRow>(
        "SELECT category_id, name, available FROM menu_category_overrides",
      ),
      mysqlQuery<CustomCategoryRow>(
        "SELECT id, macro, name, sort_order, active FROM menu_custom_categories WHERE active = 1 ORDER BY sort_order, id",
      ),
      mysqlQuery<CustomItemRow>(
        "SELECT item_key, category_id, name, description, price_eur, available FROM menu_custom_items WHERE available = 1",
      ),
      mysqlQuery<SpecialRow>(
        `SELECT id, title, description, price_eur, image_url, item_key
       FROM menu_specials
       WHERE active = 1
       ORDER BY updated_at DESC
       LIMIT 1`,
      ),
    ]);

  const categoryOverrides = new Map(categoryOverrideRows.map((row) => [row.category_id, row]));

  const baseCategories: MysqlDynamicCategory[] = baseMenu.categories.map((category, index) => {
    const override = categoryOverrides.get(category.id);
    return {
      id: category.id,
      macro: category.macro,
      name: override?.name ?? category.name,
      available: override ? toBool(override.available) : true,
      custom: false,
      sort_order: index,
    };
  });

  const customCategories: MysqlDynamicCategory[] = customCategoryRows.map((row) => ({
    id: row.id,
    macro: row.macro,
    name: row.name,
    available: toBool(row.active),
    custom: true,
    sort_order: row.sort_order,
  }));

  return {
    overrides: overrideRows.map(mapOverride),
    categories: [...baseCategories, ...customCategories].sort(
      (a, b) => a.sort_order - b.sort_order,
    ),
    customItems: customItemRows
      .filter((row) => toBool(row.available))
      .map((row) => ({
        item_key: row.item_key,
        category_id: row.category_id,
        name: row.name,
        description: row.description,
        price_eur: row.price_eur === null ? null : Number(row.price_eur),
        available: true,
      })),
    special: specialRows[0]
      ? {
          ...specialRows[0],
          price_eur: specialRows[0].price_eur === null ? null : Number(specialRows[0].price_eur),
        }
      : null,
  };
}

export async function listMenuOverrides() {
  const rows = await mysqlQuery<OverrideRow>(
    "SELECT item_key, name, description, price_eur, available FROM menu_overrides ORDER BY item_key",
  );
  return rows.map(mapOverride);
}

export async function getMenuOverride(itemKey: string) {
  const rows = await mysqlQuery<OverrideRow>(
    "SELECT item_key, name, description, price_eur, available FROM menu_overrides WHERE item_key = ? LIMIT 1",
    [itemKey],
  );
  return rows[0] ? mapOverride(rows[0]) : null;
}

export async function upsertMenuOverride(row: MysqlOverride) {
  await mysqlExecute(
    `INSERT INTO menu_overrides (item_key, name, description, price_eur, available, updated_at)
     VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP(3))
     ON DUPLICATE KEY UPDATE
       name = VALUES(name),
       description = VALUES(description),
       price_eur = VALUES(price_eur),
       available = VALUES(available),
       updated_at = CURRENT_TIMESTAMP(3)`,
    [row.item_key, row.name, row.description, row.price_eur, row.available ? 1 : 0],
  );
}

export async function upsertMenuOverrides(rows: MysqlOverride[]) {
  for (const row of rows) await upsertMenuOverride(row);
}

export async function deleteMenuOverride(itemKey: string) {
  await mysqlExecute("DELETE FROM menu_overrides WHERE item_key = ?", [itemKey]);
}

export async function deleteMenuOverridesByKeys(keys: string[]) {
  if (keys.length === 0) return;
  const placeholders = keys.map(() => "?").join(", ");
  await mysqlExecute(`DELETE FROM menu_overrides WHERE item_key IN (${placeholders})`, keys);
}

export async function deleteAllMenuOverrides() {
  await mysqlExecute("DELETE FROM menu_overrides");
}

export async function countMenuOverrides() {
  const rows = await mysqlQuery<{ count: number }>("SELECT COUNT(*) AS count FROM menu_overrides");
  return Number(rows[0]?.count ?? 0);
}

export async function listCategoryOverrides() {
  return mysqlQuery<CategoryOverrideRow>(
    "SELECT category_id, name, available FROM menu_category_overrides",
  );
}

export async function upsertCategoryOverride(
  categoryId: string,
  available: boolean,
  name: string | null = null,
) {
  await mysqlExecute(
    `INSERT INTO menu_category_overrides (category_id, name, available, updated_at)
     VALUES (?, ?, ?, CURRENT_TIMESTAMP(3))
     ON DUPLICATE KEY UPDATE
       name = VALUES(name),
       available = VALUES(available),
       updated_at = CURRENT_TIMESTAMP(3)`,
    [categoryId, name, available ? 1 : 0],
  );
}

export async function getAdminByUsername(username: string): Promise<MysqlAdminUser | null> {
  const rows = await mysqlQuery<MysqlAdminUser & { is_active: BoolLike }>(
    `SELECT id, username, password_hash, telegram_chat_id, first_name, last_name, role, is_active
     FROM admin_users
     WHERE username = ?
     LIMIT 1`,
    [username],
  );
  const row = rows[0];
  return row ? { ...row, is_active: toBool(row.is_active) } : null;
}

export async function getAdminById(id: string): Promise<MysqlAdminUser | null> {
  const rows = await mysqlQuery<MysqlAdminUser & { is_active: BoolLike }>(
    `SELECT id, username, password_hash, telegram_chat_id, first_name, last_name, role, is_active
     FROM admin_users
     WHERE id = ?
     LIMIT 1`,
    [id],
  );
  const row = rows[0];
  return row ? { ...row, is_active: toBool(row.is_active) } : null;
}

export async function upsertAdminUser(input: {
  id: string;
  username: string;
  passwordHash: string;
  role?: string;
}) {
  await mysqlExecute(
    `INSERT INTO admin_users
      (id, username, password_hash, role, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, 1, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3))
     ON DUPLICATE KEY UPDATE
       username = VALUES(username),
       password_hash = VALUES(password_hash),
       role = VALUES(role),
       is_active = 1,
       updated_at = CURRENT_TIMESTAMP(3)`,
    [input.id, input.username, input.passwordHash, input.role ?? "admin"],
  );
}

export async function createAdminSession(input: {
  id: string;
  adminUserId: string;
  expiresAt: Date;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  await mysqlExecute(
    `INSERT INTO admin_sessions
      (id, admin_user_id, expires_at, ip_address, user_agent, created_at, last_seen_at)
     VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3))`,
    [input.id, input.adminUserId, input.expiresAt, input.ipAddress ?? null, input.userAgent ?? null],
  );
}

export async function getAdminSessionById(id: string) {
  const rows = await mysqlQuery<{
    id: string;
    admin_user_id: string;
    expires_at: Date;
    created_at: Date;
    last_seen_at: Date;
  }>(
    `SELECT id, admin_user_id, expires_at, created_at, last_seen_at
     FROM admin_sessions
     WHERE id = ?
     LIMIT 1`,
    [id],
  );
  return rows[0] ?? null;
}

export async function touchAdminSession(id: string) {
  await mysqlExecute(
    "UPDATE admin_sessions SET last_seen_at = CURRENT_TIMESTAMP(3) WHERE id = ?",
    [id],
  );
}

export async function deleteAdminSession(id: string) {
  await mysqlExecute("DELETE FROM admin_sessions WHERE id = ?", [id]);
}

export async function listChatMessages(adminUserId: string, limit = 100) {
  const safeLimit = Math.max(1, Math.min(200, Math.trunc(limit)));
  return mysqlQuery<{
    id: string;
    admin_user_id: string | null;
    role: string;
    message: string;
    metadata: string;
    created_at: Date;
  }>(
    "SELECT id, admin_user_id, role, message, metadata, created_at FROM chat_messages WHERE admin_user_id = ? ORDER BY created_at DESC LIMIT " +
      safeLimit,
    [adminUserId],
  );
}

export async function insertChatMessage(input: {
  adminUserId: string;
  role: "user" | "assistant" | "system";
  message: string;
  metadata?: Record<string, unknown>;
}) {
  const id = randomUUID();
  await mysqlExecute(
    `INSERT INTO chat_messages
      (id, admin_user_id, role, message, metadata, created_at)
     VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP(3))`,
    [id, input.adminUserId, input.role, input.message, JSON.stringify(input.metadata ?? {})],
  );
  return id;
}

export async function listAuditLog(limit = 100) {
  const safeLimit = Math.max(1, Math.min(200, Math.trunc(limit)));
  return mysqlQuery<{
    id: string;
    admin_user_id: string | null;
    actor: string;
    action: string;
    item_key: string | null;
    details: string;
    created_at: Date;
  }>(
    "SELECT id, admin_user_id, actor, action, item_key, details, created_at FROM audit_log ORDER BY created_at DESC LIMIT " +
      safeLimit,
  );
}

export async function getLatestAuditLogForAdmin(adminUserId: string) {
  const rows = await mysqlQuery<{
    id: string;
    admin_user_id: string | null;
    actor: string;
    action: string;
    item_key: string | null;
    details: string;
    created_at: Date;
  }>(
    `SELECT id, admin_user_id, actor, action, item_key, details, created_at
     FROM audit_log
     WHERE admin_user_id = ?
     ORDER BY created_at DESC
     LIMIT 1`,
    [adminUserId],
  );
  return rows[0] ?? null;
}

export async function deleteAuditLog(id: string) {
  await mysqlExecute("DELETE FROM audit_log WHERE id = ?", [id]);
}

export async function upsertSpecial(input: {
  id: string;
  title: string;
  description: string | null;
  priceEur: number | null;
  imageUrl: string | null;
  itemKey: string | null;
}) {
  await mysqlExecute(
    `INSERT INTO menu_specials
      (id, title, description, price_eur, image_url, item_key, active, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP(3))
     ON DUPLICATE KEY UPDATE
       title = VALUES(title),
       description = VALUES(description),
       price_eur = VALUES(price_eur),
       image_url = VALUES(image_url),
       item_key = VALUES(item_key),
       active = 1,
       updated_at = CURRENT_TIMESTAMP(3)`,
    [input.id, input.title, input.description, input.priceEur, input.imageUrl, input.itemKey],
  );
}

export async function deactivateAllSpecials() {
  await mysqlExecute("UPDATE menu_specials SET active = 0 WHERE active = 1");
}

export async function getActiveSpecial() {
  const rows = await mysqlQuery<MysqlMenuSpecial>(
    `SELECT id, title, description, price_eur, image_url, item_key
     FROM menu_specials
     WHERE active = 1
     ORDER BY updated_at DESC
     LIMIT 1`,
  );
  return rows[0] ?? null;
}

export async function createCustomCategory(input: {
  id: string;
  macro: string;
  name: string;
  sortOrder?: number;
}) {
  await mysqlExecute(
    `INSERT INTO menu_custom_categories
      (id, macro, name, sort_order, active, updated_at)
     VALUES (?, ?, ?, ?, 1, CURRENT_TIMESTAMP(3))`,
    [input.id, input.macro, input.name, input.sortOrder ?? 100],
  );
}

export async function createCustomItem(input: {
  id: string;
  itemKey: string;
  categoryId: string;
  name: string;
  description: string | null;
  priceEur: number | null;
}) {
  await mysqlExecute(
    `INSERT INTO menu_custom_items
      (id, item_key, category_id, name, description, price_eur, available, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP(3))`,
    [input.id, input.itemKey, input.categoryId, input.name, input.description, input.priceEur],
  );
}

export async function getSetting(key: string) {
  const rows = await mysqlQuery<{ setting_value: string | null }>(
    "SELECT setting_value FROM app_settings WHERE setting_key = ? LIMIT 1",
    [key],
  );
  return rows[0]?.setting_value ?? null;
}

export async function setSetting(key: string, value: string | null) {
  await mysqlExecute(
    `INSERT INTO app_settings (setting_key, setting_value, updated_at)
     VALUES (?, ?, CURRENT_TIMESTAMP(3))
     ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value),
       updated_at = CURRENT_TIMESTAMP(3)`,
    [key, value],
  );
}
export async function getCategoryOverride(categoryId: string) {
  const rows = await mysqlQuery<CategoryOverrideRow>(
    "SELECT category_id, name, available FROM menu_category_overrides WHERE category_id = ? LIMIT 1",
    [categoryId],
  );
  return rows[0] ?? null;
}

export async function deleteCategoryOverride(categoryId: string) {
  await mysqlExecute("DELETE FROM menu_category_overrides WHERE category_id = ?", [categoryId]);
}

export async function deleteCustomCategory(id: string) {
  await mysqlExecute("DELETE FROM menu_custom_categories WHERE id = ?", [id]);
}

export async function deleteCustomItem(id: string) {
  await mysqlExecute("DELETE FROM menu_custom_items WHERE id = ?", [id]);
}

export async function getCustomItemByKey(itemKey: string) {
  const rows = await mysqlQuery<CustomItemRow>(
    "SELECT item_key, category_id, name, description, price_eur, available FROM menu_custom_items WHERE item_key = ? LIMIT 1",
    [itemKey],
  );
  return rows[0] ?? null;
}

export async function listAdminUsers(): Promise<MysqlAdminUser[]> {
  const rows = await mysqlQuery<MysqlAdminUser & { is_active: BoolLike }>(
    `SELECT id, username, password_hash, telegram_chat_id, first_name, last_name, role, is_active
     FROM admin_users
     WHERE is_active = 1
     ORDER BY created_at ASC`,
  );
  return rows.map((row) => ({ ...row, is_active: toBool(row.is_active) }));
}

export async function getAdminUserByTelegramChatId(chatId: number) {
  const rows = await mysqlQuery<MysqlAdminUser & { is_active: BoolLike }>(
    `SELECT id, username, password_hash, telegram_chat_id, first_name, last_name, role, is_active
     FROM admin_users
     WHERE telegram_chat_id = ? AND is_active = 1
     LIMIT 1`,
    [chatId],
  );
  const row = rows[0];
  return row ? { ...row, is_active: toBool(row.is_active) } : null;
}

export async function upsertTelegramAdmin(input: {
  chatId: number;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
}) {
  const existing = await getAdminUserByTelegramChatId(input.chatId);
  if (existing) {
    await mysqlExecute(
      `UPDATE admin_users
       SET username = ?, first_name = ?, last_name = ?, is_active = 1, updated_at = CURRENT_TIMESTAMP(3)
       WHERE telegram_chat_id = ?`,
      [input.username, input.firstName, input.lastName, input.chatId],
    );
    return existing.id;
  }

  const id = randomUUID();
  await mysqlExecute(
    `INSERT INTO admin_users
      (id, username, password_hash, telegram_chat_id, first_name, last_name, role, is_active, created_at, updated_at)
     VALUES (?, ?, NULL, ?, ?, ?, 'admin', 1, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3))`,
    [id, input.username, input.chatId, input.firstName, input.lastName],
  );
  return id;
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
     VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP(3))`,
    [id, input.adminUserId ?? null, input.actor, input.action, input.itemKey ?? null, details],
  );
  await mysqlExecute(
    `INSERT INTO menu_edit_log
      (id, actor, action, item_key, details, created_at)
     VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP(3))`,
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
       name = VALUES(name),
       description = VALUES(description),
       source_hash = VALUES(source_hash),
       created_at = CURRENT_TIMESTAMP(3)`,
    [input.itemKey, input.lang, input.name, input.description, input.sourceHash],
  );
}
