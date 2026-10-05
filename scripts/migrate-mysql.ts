import { readFile } from "fs/promises";
import { readdir } from "fs/promises";
import { join } from "path";
import { fileURLToPath } from "url";

import { getMysqlPool, isMySqlConfigured } from "../src/lib/mysql.server.ts";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "../database/mysql/migrations");

function splitSql(sql: string) {
  return sql
    .split(/;\s*(?:\r?\n|$)/)
    .map((statement) => statement.trim())
    .filter(Boolean);
}

if (!isMySqlConfigured()) {
  throw new Error(
    "MySQL non configurato. Impostare MYSQL_HOST, MYSQL_DATABASE, MYSQL_USER e MYSQL_PASSWORD prima della migrazione.",
  );
}

const pool = getMysqlPool();
await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
  version VARCHAR(100) NOT NULL PRIMARY KEY,
  applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

const files = (await readdir(root))
  .filter((name) => /^\d+_.+\.sql$/.test(name))
  .sort((a, b) => a.localeCompare(b));

for (const file of files) {
  const version = file.replace(/\.sql$/, "");
  const [existing] = await pool.execute(
    "SELECT version FROM schema_migrations WHERE version = ? LIMIT 1",
    [version],
  );

  if (Array.isArray(existing) && existing.length > 0) {
    console.log(`skip ${version}`);
    continue;
  }

  const sql = await readFile(join(root, file), "utf8");
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    for (const statement of splitSql(sql)) {
      await connection.query(statement);
    }
    await connection.execute(
      "INSERT INTO schema_migrations (version) VALUES (?)",
      [version],
    );
    await connection.commit();
    console.log(`applied ${version}`);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

await pool.end();
