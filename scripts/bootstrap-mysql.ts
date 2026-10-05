import { readdir, readFile } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

import { getMysqlPool, isMySqlConfigured } from "../src/lib/mysql.server.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

async function bootstrap() {
  if (!isMySqlConfigured()) {
    console.log("[db] MySQL non configurato; il menu statico resta il fallback.");
    return;
  }

  const pool = getMysqlPool();

  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      version VARCHAR(100) NOT NULL PRIMARY KEY,
      applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

    const migrationDir = join(root, "database/mysql/migrations");
    const migrationFiles = (await readdir(migrationDir))
      .filter((name) => /^\d+_.+\.sql$/.test(name))
      .sort((a, b) => a.localeCompare(b));

    for (const file of migrationFiles) {
      const version = file.replace(/\.sql$/, "");
      const [existing] = await pool.execute(
        "SELECT version FROM schema_migrations WHERE version = ? LIMIT 1",
        [version],
      );

      if (Array.isArray(existing) && existing.length > 0) {
        continue;
      }

      const sql = await readFile(join(migrationDir, file), "utf8");
      const statements = sql
        .split(/;\s*(?:\r?\n|$)/)
        .map((statement) => statement.trim())
        .filter(Boolean);

      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();

        for (const statement of statements) {
          await connection.query(statement);
        }

        await connection.execute("INSERT INTO schema_migrations (version) VALUES (?)", [version]);

        await connection.commit();
        console.log(`[db] migration applied: ${version}`);
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    }

    const [countRows] = await pool.execute("SELECT COUNT(*) AS count FROM menu_catalog_items");
    const count = Number((countRows as { count: number }[])[0]?.count ?? 0);

    if (count === 0) {
      const { execFile } = await import("child_process");
      const { promisify } = await import("util");
      const execFileAsync = promisify(execFile);

      await execFileAsync(process.execPath, [
        "--experimental-strip-types",
        join(root, "scripts/import-menu-data.ts"),
      ]);

      console.log("[db] catalog seeded because menu_catalog_items was empty.");
    } else {
      console.log(`[db] catalog already initialized (${count} items); seed skipped.`);
    }

    console.log("[db] bootstrap complete.");
  } catch (error) {
    console.error("[db] bootstrap failed; application will continue with static fallback.", error);
  } finally {
    await pool.end().catch(() => undefined);
  }
}

await bootstrap();
