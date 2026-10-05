CREATE TABLE IF NOT EXISTS schema_migrations (
  version VARCHAR(100) NOT NULL PRIMARY KEY,
  applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
  CONSTRAINT admin_sessions_admin_fk
    FOREIGN KEY (admin_user_id) REFERENCES admin_users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS chat_messages (
  id CHAR(36) NOT NULL PRIMARY KEY,
  admin_user_id CHAR(36) NULL,
  role VARCHAR(32) NOT NULL,
  message TEXT NOT NULL,
  metadata LONGTEXT NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX chat_messages_admin_created_idx (admin_user_id, created_at),
  CONSTRAINT chat_messages_admin_fk
    FOREIGN KEY (admin_user_id) REFERENCES admin_users(id)
    ON DELETE SET NULL
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
  CONSTRAINT audit_log_admin_fk
    FOREIGN KEY (admin_user_id) REFERENCES admin_users(id)
    ON DELETE SET NULL
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
