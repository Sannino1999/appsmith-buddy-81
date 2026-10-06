import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

import { baseMenu } from "./menu";
import { INFO, LANGUAGES, MENU_LABELS, SERVICES, UI } from "./i18n";
import {
  closeMysqlPool,
  getMysqlPool,
  isMySqlConfigured,
  mysqlExecute,
  mysqlQuery,
} from "./mysql.server";

type Migration = { version: string; sql: string };

const migrations: Migration[] = [
  {
    version: "0001_initial",
    sql: `
CREATE TABLE IF NOT EXISTS menu_catalog_items (
  item_key VARCHAR(191) NOT NULL PRIMARY KEY,
  category_id VARCHAR(191) NOT NULL,
  group_name VARCHAR(191) NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  price_eur DECIMAL(8,2) NULL,
  tags LONGTEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS menu_overrides (
  item_key VARCHAR(191) NOT NULL PRIMARY KEY,
  name VARCHAR(255) NULL,
  description TEXT NULL,
  price_eur DECIMAL(8,2) NULL,
  available TINYINT(1) NOT NULL DEFAULT 1,
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS menu_translations (
  item_key VARCHAR(191) NOT NULL,
  lang VARCHAR(10) NOT NULL,
  name VARCHAR(255) NULL,
  description TEXT NULL,
  source_hash VARCHAR(64) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (item_key, lang)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS menu_edit_log (
  id CHAR(36) NOT NULL PRIMARY KEY,
  actor VARCHAR(190) NOT NULL,
  action VARCHAR(64) NOT NULL,
  item_key VARCHAR(191) NULL,
  details LONGTEXT NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX menu_edit_log_created_idx (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_users (
  id CHAR(36) NOT NULL PRIMARY KEY,
  username VARCHAR(190) NULL UNIQUE,
  password_hash VARCHAR(255) NULL,
  telegram_chat_id BIGINT NULL UNIQUE,
  first_name VARCHAR(100) NULL,
  last_name VARCHAR(100) NULL,
  role VARCHAR(32) NOT NULL DEFAULT 'admin',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS menu_specials (
  id CHAR(36) NOT NULL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  price_eur DECIMAL(8,2) NULL,
  image_url TEXT NULL,
  item_key VARCHAR(191) NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX menu_specials_active_updated_idx (active, updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS menu_category_overrides (
  category_id VARCHAR(191) NOT NULL PRIMARY KEY,
  name VARCHAR(255) NULL,
  available TINYINT(1) NOT NULL DEFAULT 1,
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS menu_custom_categories (
  id VARCHAR(191) NOT NULL PRIMARY KEY,
  macro VARCHAR(32) NOT NULL,
  name VARCHAR(255) NOT NULL,
  sort_order INT NOT NULL DEFAULT 100,
  active TINYINT(1) NOT NULL DEFAULT 1,
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX menu_custom_categories_macro_sort_idx (macro, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS menu_custom_items (
  id CHAR(36) NOT NULL PRIMARY KEY,
  item_key VARCHAR(191) NOT NULL UNIQUE,
  category_id VARCHAR(191) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  price_eur DECIMAL(8,2) NULL,
  available TINYINT(1) NOT NULL DEFAULT 1,
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX menu_custom_items_category_idx (category_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_sessions (
  id CHAR(64) NOT NULL PRIMARY KEY,
  admin_user_id CHAR(36) NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  last_seen_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  ip_address VARCHAR(64) NULL,
  user_agent VARCHAR(512) NULL,
  INDEX admin_sessions_admin_idx (admin_user_id),
  INDEX admin_sessions_expires_idx (expires_at),
  CONSTRAINT admin_sessions_admin_fk FOREIGN KEY (admin_user_id)
    REFERENCES admin_users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS chat_messages (
  id CHAR(36) NOT NULL PRIMARY KEY,
  admin_user_id CHAR(36) NULL,
  role VARCHAR(32) NOT NULL,
  message TEXT NOT NULL,
  metadata LONGTEXT NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX chat_messages_admin_created_idx (admin_user_id, created_at),
  CONSTRAINT chat_messages_admin_fk FOREIGN KEY (admin_user_id)
    REFERENCES admin_users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS audit_log (
  id CHAR(36) NOT NULL PRIMARY KEY,
  admin_user_id CHAR(36) NULL,
  actor VARCHAR(190) NOT NULL,
  action VARCHAR(64) NOT NULL,
  item_key VARCHAR(191) NULL,
  details LONGTEXT NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX audit_log_created_idx (created_at),
  INDEX audit_log_item_idx (item_key),
  CONSTRAINT audit_log_admin_fk FOREIGN KEY (admin_user_id)
    REFERENCES admin_users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ui_translations (
  lang VARCHAR(10) NOT NULL,
  namespace VARCHAR(64) NOT NULL,
  translation_key VARCHAR(191) NOT NULL,
  translation_value TEXT NOT NULL,
  PRIMARY KEY (lang, namespace, translation_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS app_settings (
  setting_key VARCHAR(191) NOT NULL PRIMARY KEY,
  setting_value TEXT NULL,
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`,
  },
];

const schemaMigrationsSql = `CREATE TABLE IF NOT EXISTS schema_migrations (
  version VARCHAR(100) NOT NULL PRIMARY KEY,
  applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`;

function splitSql(sql: string) {
  return sql
    .split(/;\s*(?:\r?\n|$)/)
    .map((statement) => statement.trim())
    .filter(Boolean);
}

function menuItemRows() {
  return baseMenu.categories.flatMap((category) =>
    category.groups.flatMap((group, groupIndex) =>
      group.items.map((item, itemIndex) => ({
        item_key: item.key,
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
}

export async function bootstrapMysql(options: { closePool?: boolean } = {}) {
  if (!isMySqlConfigured()) {
    console.log("[db] MySQL non configurato; il menu statico resta il fallback.");
    return false;
  }

  const pool = getMysqlPool();

  try {
    await pool.query(schemaMigrationsSql);

    for (const migration of migrations) {
      const [existing] = await pool.execute(
        "SELECT version FROM schema_migrations WHERE version = ? LIMIT 1",
        [migration.version],
      );

      if (Array.isArray(existing) && existing.length > 0) continue;

      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        for (const statement of splitSql(migration.sql)) {
          await connection.query(statement);
        }
        await connection.execute("INSERT INTO schema_migrations (version) VALUES (?)", [
          migration.version,
        ]);
        await connection.commit();
        console.log(`[db] migration applied: ${migration.version}`);
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    }

    const rows = menuItemRows();
    if (rows.length !== 135 || baseMenu.categories.length !== 13 || LANGUAGES.length !== 7) {
      throw new Error(
        `Catalogo inatteso: ${rows.length} voci, ${baseMenu.categories.length} categorie, ${LANGUAGES.length} lingue.`,
      );
    }

    const [countRows] = await pool.execute("SELECT COUNT(*) AS count FROM menu_catalog_items");
    const count = Number((countRows as { count: number }[])[0]?.count ?? 0);

    if (count === 0) {
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();

        for (const item of rows) {
          await connection.execute(
            `INSERT INTO menu_catalog_items
              (item_key, category_id, group_name, name, description, price_eur, tags, sort_order)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
               category_id = VALUES(category_id),
               group_name = VALUES(group_name),
               name = VALUES(name),
               description = VALUES(description),
               price_eur = VALUES(price_eur),
               tags = VALUES(tags),
               sort_order = VALUES(sort_order),
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
            ],
          );
        }

        const uiRows: [string, string, string, string][] = [];
        for (const language of LANGUAGES) {
          const lang = language.code;
          for (const [key, value] of Object.entries(UI[lang])) {
            uiRows.push([lang, "ui", key, String(value)]);
          }

          const labels = MENU_LABELS[lang];
          for (const [key, value] of Object.entries(labels.macros)) {
            uiRows.push([lang, "macro", key, String(value)]);
          }

          for (const [key, value] of Object.entries(labels.categories)) {
            uiRows.push([lang, "category", key, value.name]);
            if (value.eyebrow) {
              uiRows.push([lang, "category-eyebrow", key, value.eyebrow]);
            }
          }

          for (const [key, value] of Object.entries(labels.groups)) {
            uiRows.push([lang, "group", key, String(value)]);
          }

          for (const [key, value] of Object.entries(labels.tags)) {
            uiRows.push([lang, "tag", key, String(value)]);
          }

          for (const [key, value] of Object.entries(SERVICES[lang])) {
            uiRows.push([lang, "service", key, String(value)]);
          }

          for (const [key, value] of Object.entries(INFO[lang])) {
            uiRows.push([lang, "info", key, String(value)]);
          }
        }

        for (const row of uiRows) {
          await connection.execute(
            `INSERT INTO ui_translations
              (lang, namespace, translation_key, translation_value)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE translation_value = VALUES(translation_value)`,
            row,
          );
        }

        await connection.commit();
        console.log(
          `[db] catalog seeded: ${rows.length} items, ${baseMenu.categories.length} categories, ${LANGUAGES.length} languages.`,
        );
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    } else {
      console.log(`[db] catalog already initialized (${count} items); seed skipped.`);
    }

    await ensureBootstrapAdmin();
    console.log("[db] bootstrap complete.");
    return true;
  } catch (error) {
    console.error("[db] bootstrap failed; application will continue with static fallback.", error);
    return false;
  } finally {
    if (options.closePool) await closeMysqlPool();
  }
}

async function ensureBootstrapAdmin() {
  const username = process.env["ADMIN_BOOTSTRAP_USERNAME"]?.trim();
  const password = process.env["ADMIN_BOOTSTRAP_PASSWORD"];
  if (!username || !password) {
    console.log("[db] admin bootstrap skipped: ADMIN_BOOTSTRAP_USERNAME/PASSWORD not configured.");
    return;
  }
  if (password.length < 12) {
    throw new Error("ADMIN_BOOTSTRAP_PASSWORD must be at least 12 characters.");
  }
  if (bcrypt.truncates(password)) {
    throw new Error("ADMIN_BOOTSTRAP_PASSWORD exceeds bcrypt's 72-byte limit.");
  }

  const existing = await mysqlQuery<{ id: string }>(
    "SELECT id FROM admin_users WHERE username = ? LIMIT 1",
    [username],
  );
  if (existing.length > 0) {
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await mysqlExecute(
    `INSERT INTO admin_users
      (id, username, password_hash, role, is_active, created_at, updated_at)
     VALUES (?, ?, ?, 'admin', 1, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3))`,
    [randomUUID(), username, passwordHash],
  );
  console.log(`[db] bootstrap admin created: ${username}`);
}
