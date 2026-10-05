import { getMysqlPool, isMySqlConfigured } from "../src/lib/mysql.server.ts";

if (!isMySqlConfigured()) {
  throw new Error(
    "MySQL non configurato. Impostare MYSQL_HOST, MYSQL_DATABASE, MYSQL_USER e MYSQL_PASSWORD.",
  );
}

const pool = getMysqlPool();

try {
  const [catalogRows] = await pool.execute(
    "SELECT COUNT(*) AS count, COUNT(DISTINCT category_id) AS categories FROM menu_catalog_items",
  );
  const [languageRows] = await pool.execute(
    "SELECT COUNT(DISTINCT lang) AS languages FROM ui_translations",
  );
  const [schemaRows] = await pool.execute(
    "SELECT COUNT(*) AS count FROM schema_migrations",
  );

  const catalog = (catalogRows as { count: number; categories: number }[])[0];
  const language = (languageRows as { languages: number }[])[0];
  const schema = (schemaRows as { count: number }[])[0];

  const products = Number(catalog?.count ?? 0);
  const categories = Number(catalog?.categories ?? 0);
  const languages = Number(language?.languages ?? 0);
  const migrations = Number(schema?.count ?? 0);

  console.log(
    JSON.stringify(
      { products, categories, languages, migrations },
      null,
      2,
    ),
  );

  if (products !== 135 || categories !== 13 || languages !== 7 || migrations < 1) {
    throw new Error(
      `Verifica DB fallita: attesi 135 prodotti, 13 categorie, 7 lingue e almeno 1 migrazione; ottenuti ${products}, ${categories}, ${languages}, ${migrations}.`,
    );
  }

  console.log("MySQL/MariaDB verification: OK");
} finally {
  await pool.end();
}
