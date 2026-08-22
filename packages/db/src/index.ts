import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

export * from "./schema";

let _db: ReturnType<typeof drizzle> | null = null;

function getClient() {
  const url =
    process.env.POSTGRES_URL ??
    process.env.DATABASE_URL ??
    process.env.POSTGRES_URL_NON_POOLING;

  if (!url) throw new Error("POSTGRES_URL or DATABASE_URL is not set");

  return postgres(url, {
    prepare: false,
    ssl: "require",
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
  });
}

export function createDb() {
  if (!_db) {
    _db = drizzle(getClient(), { schema });
  }
  return _db;
}

export type Db = ReturnType<typeof createDb>;
