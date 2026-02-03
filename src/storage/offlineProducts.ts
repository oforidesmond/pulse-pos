import initSqlJs, { Database, SqlJsStatic } from 'sql.js';
import type { Product } from '../types/products';

const DB_STORAGE_KEY = 'sika_offline_products_db';
const SQL_WASM_PATH = 'sql-wasm.wasm';
const PRODUCTS_LAST_SYNC_KEY = 'products_last_sync';

let dbPromise: Promise<Database> | null = null;

const uint8ToBase64 = (buffer: Uint8Array) => {
  let binary = '';
  const len = buffer.byteLength;
  for (let i = 0; i < len; i += 1) {
    binary += String.fromCharCode(buffer[i]);
  }
  return btoa(binary);
};

const base64ToUint8 = (base64: string) => {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

const persistDatabase = (db: Database) => {
  const data = db.export();
  const base64 = uint8ToBase64(data);
  localStorage.setItem(DB_STORAGE_KEY, base64);
};

const ensureTables = (db: Database) => {
  db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      sku TEXT,
      name TEXT,
      sellingPrice REAL,
      stockQuantity REAL,
      nameLower TEXT,
      skuLower TEXT
    );
  `);

  db.run('CREATE INDEX IF NOT EXISTS idx_products_nameLower ON products(nameLower);');
  db.run('CREATE INDEX IF NOT EXISTS idx_products_skuLower ON products(skuLower);');
};

const getDatabase = async (): Promise<Database> => {
  if (!dbPromise) {
    dbPromise = initSqlJs({ locateFile: () => SQL_WASM_PATH }).then((SQLModule: SqlJsStatic) => {
      const stored = localStorage.getItem(DB_STORAGE_KEY);
      const db = stored ? new SQLModule.Database(base64ToUint8(stored)) : new SQLModule.Database();
      ensureTables(db);
      if (!stored) {
        persistDatabase(db);
      }
      return db;
    });
  }
  return dbPromise;
};

const normalizeProduct = (item: any): Product | null => {
  const id = String(item?.id ?? item?._id ?? '');
  const name = item?.name ?? 'Unnamed Product';
  const sellingPrice = Number(item?.sellingPrice ?? item?.price ?? 0);
  const stockQuantity = Number(item?.stockQuantity ?? item?.stock?.quantity ?? 0);
  const sku = item?.sku ? String(item.sku) : undefined;

  if (!id || !name || Number.isNaN(sellingPrice)) {
    return null;
  }

  return {
    id,
    sku,
    name,
    sellingPrice,
    stockQuantity,
  };
};

const extractProductList = (payload: any): any[] => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.products)) return payload.products;
  return [];
};

export const saveProductsOffline = async (products: Product[]) => {
  const db = await getDatabase();

  db.run('BEGIN;');
  try {
    const insertStmt = db.prepare(`
      INSERT OR REPLACE INTO products (
        id, sku, name, sellingPrice, stockQuantity, nameLower, skuLower
      ) VALUES (?, ?, ?, ?, ?, ?, ?);
    `);

    for (const product of products) {
      const nameLower = String(product.name ?? '').toLowerCase();
      const skuLower = product.sku ? String(product.sku).toLowerCase() : null;
      insertStmt.run([
        product.id,
        product.sku ?? null,
        product.name,
        product.sellingPrice,
        product.stockQuantity,
        nameLower,
        skuLower,
      ]);
    }

    insertStmt.free();
    db.run('COMMIT;');
  } catch (error) {
    db.run('ROLLBACK;');
    throw error;
  }

  persistDatabase(db);
};

export const replaceAllProductsOffline = async (products: Product[]) => {
  const db = await getDatabase();

  db.run('BEGIN;');
  try {
    db.run('DELETE FROM products;');

    const insertStmt = db.prepare(`
      INSERT OR REPLACE INTO products (
        id, sku, name, sellingPrice, stockQuantity, nameLower, skuLower
      ) VALUES (?, ?, ?, ?, ?, ?, ?);
    `);

    for (const product of products) {
      const nameLower = String(product.name ?? '').toLowerCase();
      const skuLower = product.sku ? String(product.sku).toLowerCase() : null;
      insertStmt.run([
        product.id,
        product.sku ?? null,
        product.name,
        product.sellingPrice,
        product.stockQuantity,
        nameLower,
        skuLower,
      ]);
    }

    insertStmt.free();
    db.run('COMMIT;');
  } catch (error) {
    db.run('ROLLBACK;');
    throw error;
  }

  persistDatabase(db);
};

export const getProductsCountOffline = async (): Promise<number> => {
  const db = await getDatabase();
  const stmt = db.prepare('SELECT COUNT(*) as count FROM products;');
  stmt.step();
  const row = stmt.getAsObject();
  stmt.free();
  return Number(row.count ?? 0);
};

export interface ProductsQueryResult {
  products: Product[];
  total: number;
  totalPages: number;
  page: number;
}

export const searchProductsOffline = async (page: number, pageSize: number, search: string): Promise<ProductsQueryResult> => {
  const db = await getDatabase();
  const trimmed = search.trim();
  const normalizedPageSize = Math.max(1, Math.floor(pageSize));

  let total = 0;

  if (trimmed) {
    const q = `%${trimmed.toLowerCase()}%`;
    const countStmt = db.prepare(
      'SELECT COUNT(*) as count FROM products WHERE nameLower LIKE ? OR skuLower LIKE ? OR id LIKE ?;'
    );
    countStmt.bind([q, q, q]);
    countStmt.step();
    const row = countStmt.getAsObject();
    countStmt.free();
    total = Number(row.count ?? 0);
  } else {
    const countStmt = db.prepare('SELECT COUNT(*) as count FROM products;');
    countStmt.step();
    const row = countStmt.getAsObject();
    countStmt.free();
    total = Number(row.count ?? 0);
  }

  const totalPages = Math.max(Math.ceil(total / normalizedPageSize), 1);
  const normalizedPage = Math.min(Math.max(1, Math.floor(page)), totalPages);
  const offset = (normalizedPage - 1) * normalizedPageSize;

  const items: Product[] = [];

  if (trimmed) {
    const q = `%${trimmed.toLowerCase()}%`;
    const stmt = db.prepare(
      'SELECT id, sku, name, sellingPrice, stockQuantity FROM products WHERE nameLower LIKE ? OR skuLower LIKE ? OR id LIKE ? ORDER BY name ASC LIMIT ? OFFSET ?;'
    );
    stmt.bind([q, q, q, normalizedPageSize, offset]);
    while (stmt.step()) {
      const row = stmt.getAsObject();
      items.push({
        id: String(row.id),
        sku: row.sku == null ? undefined : String(row.sku),
        name: String(row.name ?? ''),
        sellingPrice: Number(row.sellingPrice ?? 0),
        stockQuantity: Number(row.stockQuantity ?? 0),
      });
    }
    stmt.free();
  } else {
    const stmt = db.prepare(
      'SELECT id, sku, name, sellingPrice, stockQuantity FROM products ORDER BY name ASC LIMIT ? OFFSET ?;'
    );
    stmt.bind([normalizedPageSize, offset]);
    while (stmt.step()) {
      const row = stmt.getAsObject();
      items.push({
        id: String(row.id),
        sku: row.sku == null ? undefined : String(row.sku),
        name: String(row.name ?? ''),
        sellingPrice: Number(row.sellingPrice ?? 0),
        stockQuantity: Number(row.stockQuantity ?? 0),
      });
    }
    stmt.free();
  }

  return {
    products: items,
    total,
    totalPages,
    page: normalizedPage,
  };
};

export const findProductByCodeOffline = async (code: string): Promise<Product | null> => {
  const db = await getDatabase();
  const normalized = code.trim();
  if (!normalized) return null;

  const lower = normalized.toLowerCase();
  const stmt = db.prepare(
    'SELECT id, sku, name, sellingPrice, stockQuantity FROM products WHERE skuLower = ? OR id = ? LIMIT 1;'
  );
  stmt.bind([lower, normalized]);

  let found: Product | null = null;
  if (stmt.step()) {
    const row = stmt.getAsObject();
    found = {
      id: String(row.id),
      sku: row.sku == null ? undefined : String(row.sku),
      name: String(row.name ?? ''),
      sellingPrice: Number(row.sellingPrice ?? 0),
      stockQuantity: Number(row.stockQuantity ?? 0),
    };
  }

  stmt.free();
  return found;
};

export const getProductsLastSyncedAt = (): string | null => {
  return localStorage.getItem(PRODUCTS_LAST_SYNC_KEY);
};

export const setProductsLastSyncedAt = (value: string) => {
  localStorage.setItem(PRODUCTS_LAST_SYNC_KEY, value);
};

const PRODUCTS_API_URL = import.meta.env.VITE_PRODUCTS_API_URL ?? '/api/products';

export interface ProductsSyncSummary {
  synced: boolean;
  totalFetched: number;
  lastSyncedAt: string | null;
}

export const syncProductsFromApi = async (options?: { force?: boolean; pageSize?: number }): Promise<ProductsSyncSummary> => {
  const force = Boolean(options?.force);
  const pageSize = Math.max(1, Math.floor(options?.pageSize ?? 500));

  if (typeof window !== 'undefined' && !window.navigator.onLine) {
    return { synced: false, totalFetched: 0, lastSyncedAt: getProductsLastSyncedAt() };
  }

  const lastSync = getProductsLastSyncedAt();
  if (!force && lastSync) {
    const last = Date.parse(lastSync);
    if (Number.isFinite(last)) {
      const ageMs = Date.now() - last;
      if (ageMs < 5 * 60 * 1000) {
        return { synced: false, totalFetched: 0, lastSyncedAt: lastSync };
      }
    }
  }

  const all: Product[] = [];
  let page = 1;
  let totalPages: number | null = null;

  while (true) {
    const url = new URL(PRODUCTS_API_URL, window.location.origin);
    url.searchParams.set('page', String(page));
    url.searchParams.set('pageSize', String(pageSize));

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Failed to sync products (status ${response.status})`);
    }

    const payload = await response.json();
    const list = extractProductList(payload);

    const normalized = list
      .map(normalizeProduct)
      .filter((p): p is Product => Boolean(p));

    all.push(...normalized);

    if (Array.isArray(payload)) {
      break;
    }

    const rawTotalPages = Number(payload?.totalPages);
    const rawTotal = Number(payload?.total ?? payload?.totalCount);

    if (Number.isFinite(rawTotalPages) && rawTotalPages > 0) {
      totalPages = Math.max(1, Math.floor(rawTotalPages));
    } else if (Number.isFinite(rawTotal) && rawTotal >= 0) {
      totalPages = Math.max(1, Math.ceil(rawTotal / pageSize));
    } else if (list.length < pageSize) {
      break;
    }

    if (totalPages != null && page >= totalPages) {
      break;
    }

    if (list.length === 0) {
      break;
    }

    page += 1;
  }

  await replaceAllProductsOffline(all);
  const now = new Date().toISOString();
  setProductsLastSyncedAt(now);

  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(
      new CustomEvent('products-updated', {
        detail: {
          lastSyncedAt: now,
          totalFetched: all.length,
        },
      })
    );
  }

  return {
    synced: true,
    totalFetched: all.length,
    lastSyncedAt: now,
  };
};
