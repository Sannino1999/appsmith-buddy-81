import mysql, { type PoolOptions } from "mysql2/promise";
import type { ExecuteValues } from "mysql2";

type MysqlConfig = {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: { rejectUnauthorized: boolean };
};

let pool: ReturnType<typeof mysql.createPool> | undefined;

function readConfig(): MysqlConfig | null {
  const host = process.env["MYSQL_HOST"]?.trim();
  const database = process.env["MYSQL_DATABASE"]?.trim();
  const user = process.env["MYSQL_USER"]?.trim();
  const password = process.env["MYSQL_PASSWORD"];

  if (!host || !database || !user || !password) return null;

  const portRaw = process.env["MYSQL_PORT"]?.trim() || "3306";
  const port = Number(portRaw);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("MYSQL_PORT must be a valid TCP port");
  }

  const sslEnabled = /^(1|true|yes)$/i.test(process.env["MYSQL_SSL"] ?? "");
  const ssl = sslEnabled
    ? {
        rejectUnauthorized: !/^(0|false|no)$/i.test(
          process.env["MYSQL_SSL_REJECT_UNAUTHORIZED"] ?? "",
        ),
      }
    : undefined;

  return {
    host,
    port,
    database,
    user,
    password,
    ...(ssl ? { ssl } : {}),
  };
}

export function isMySqlConfigured() {
  return readConfig() !== null;
}

export function getMysqlPool() {
  if (pool) return pool;

  const config = readConfig();
  if (!config) {
    throw new Error(
      "MySQL is not configured. Set MYSQL_HOST, MYSQL_DATABASE, MYSQL_USER and MYSQL_PASSWORD.",
    );
  }

  const options: PoolOptions = {
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
    password: config.password,
    charset: "utf8mb4",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 10_000,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    decimalNumbers: true,
  };

  if (config.ssl) options.ssl = config.ssl;

  pool = mysql.createPool(options);

  return pool;
}

export async function mysqlQuery<T = unknown>(
  sql: string,
  params: ExecuteValues = [],
): Promise<T[]> {
  const [rows] = await getMysqlPool().execute(sql, params);
  return rows as T[];
}

export async function mysqlExecute(sql: string, params: any[] = []) {
  const [result] = await getMysqlPool().execute(sql, params);
  return result as { affectedRows?: number; insertId?: number };
}
