import fs from "node:fs";
import path from "node:path";
import { nanoid } from "nanoid";

const dataDir = path.join(process.cwd(), "data");
const dbPath = path.join(dataDir, "blitzpay.json");

interface DbSchema {
  merchants: Record<string, Record<string, unknown>>;
  bank_details: Record<string, Record<string, unknown>>;
  products: Record<string, Record<string, unknown>>;
  invoices: Record<string, Record<string, unknown>>;
  settlements: Record<string, Record<string, unknown>>;
}

function load(): DbSchema {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(dbPath)) {
    const empty: DbSchema = {
      merchants: {},
      bank_details: {},
      products: {},
      invoices: {},
      settlements: {},
    };
    fs.writeFileSync(dbPath, JSON.stringify(empty, null, 2));
    return empty;
  }
  return JSON.parse(fs.readFileSync(dbPath, "utf-8"));
}

function save(data: DbSchema) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

type Table = keyof DbSchema;

const db = {
  insert(table: Table, row: Record<string, unknown>) {
    const data = load();
    const id = (row.id as string) || nanoid();
    data[table][id] = { ...row, id };
    save(data);
    return id;
  },

  get(table: Table, id: string): Record<string, unknown> | undefined {
    return load()[table][id];
  },

  getAll(table: Table): Record<string, unknown>[] {
    return Object.values(load()[table]);
  },

  find(table: Table, predicate: (row: Record<string, unknown>) => boolean): Record<string, unknown> | undefined {
    return Object.values(load()[table]).find(predicate);
  },

  filter(table: Table, predicate: (row: Record<string, unknown>) => boolean): Record<string, unknown>[] {
    return Object.values(load()[table]).filter(predicate);
  },

  update(table: Table, id: string, updates: Record<string, unknown>) {
    const data = load();
    if (!data[table][id]) return;
    data[table][id] = { ...data[table][id], ...updates };
    save(data);
  },

  delete(table: Table, id: string) {
    const data = load();
    delete data[table][id];
    save(data);
  },

  updateWhere(table: Table, predicate: (row: Record<string, unknown>) => boolean, updates: Record<string, unknown>) {
    const data = load();
    for (const [id, row] of Object.entries(data[table])) {
      if (predicate(row)) {
        data[table][id] = { ...row, ...updates };
      }
    }
    save(data);
  },
};

export default db;
