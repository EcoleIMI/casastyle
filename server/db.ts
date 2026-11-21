import fs from 'node:fs';
import path from 'node:path';
import initSqlJs, { type Database, type SqlValue } from 'sql.js';
import { hashPassword } from './security.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'casastyle.db');

let dbInstance: Database | null = null;
let initPromise: Promise<Database> | null = null;

export async function getDb(): Promise<Database> {
  if (dbInstance) return dbInstance;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    const SQL = await initSqlJs({
      locateFile: (file: string) =>
        path.resolve(process.cwd(), 'node_modules/sql.js/dist', file),
      useOldExtensionFunctions: false,
    });

    let db: Database;
    if (fs.existsSync(DB_PATH)) {
      const buffer = fs.readFileSync(DB_PATH);
      db = new SQL.Database(buffer);
    } else {
      db = new SQL.Database();
    }

    db.run('PRAGMA foreign_keys = ON;');
    createSchema(db);
    seedInitialData(db);
    dbInstance = db;
    persistDb(db);
    return db;
  })();

  return initPromise;
}

export function persistDb(db?: Database) {
  const target = db || dbInstance;
  if (!target) return;
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const data = target.export();
  const tmpPath = `${DB_PATH}.tmp`;
  fs.writeFileSync(tmpPath, Buffer.from(data));
  fs.renameSync(tmpPath, DB_PATH);
}

export function queryAll<T = Record<string, unknown>>(
  db: Database,
  sql: string,
  params: SqlValue[] = []
): T[] {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows: T[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return rows;
}

export function queryOne<T = Record<string, unknown>>(
  db: Database,
  sql: string,
  params: SqlValue[] = []
): T | null {
  const rows = queryAll<T>(db, sql, params);
  return rows.length > 0 ? rows[0] : null;
}

export function runSql(
  db: Database,
  sql: string,
  params: SqlValue[] = []
): { lastInsertRowid: number; changes: number } {
  const stmt = db.prepare(sql);
  stmt.run(params);
  stmt.free();
  const lastRow = queryOne<{ id: number }>(db, 'SELECT last_insert_rowid() as id');
  const changesRow = queryOne<{ c: number }>(db, 'SELECT changes() as c');
  return {
    lastInsertRowid: lastRow?.id ?? 0,
    changes: changesRow?.c ?? 0,
  };
}

function createSchema(db: Database) {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      email TEXT,
      full_name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone TEXT NOT NULL DEFAULT '',
      password_hash TEXT NOT NULL,
      city TEXT NOT NULL DEFAULT 'Casablanca',
      neighborhood TEXT NOT NULL DEFAULT '',
      address TEXT NOT NULL DEFAULT '',
      postal_code TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token_hash TEXT NOT NULL UNIQUE,
      subject_type TEXT NOT NULL CHECK(subject_type IN ('admin', 'customer')),
      subject_id INTEGER NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      parent_section TEXT NOT NULL DEFAULT 'Mixte',
      description TEXT NOT NULL DEFAULT '',
      image_url TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL DEFAULT '',
      brand TEXT NOT NULL DEFAULT 'CASA STYLE',
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      gender TEXT NOT NULL DEFAULT 'Femme',
      price_mad REAL NOT NULL,
      promo_price_mad REAL,
      is_new INTEGER NOT NULL DEFAULT 0,
      is_bestseller INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      stock_total INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS product_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      image_url TEXT NOT NULL,
      is_primary INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS product_variants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      size TEXT NOT NULL,
      color_name TEXT NOT NULL,
      color_hex TEXT NOT NULL DEFAULT '#111111',
      stock INTEGER NOT NULL DEFAULT 0,
      sku TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT NOT NULL UNIQUE,
      customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      customer_email TEXT NOT NULL DEFAULT '',
      city TEXT NOT NULL,
      neighborhood TEXT NOT NULL DEFAULT '',
      address TEXT NOT NULL,
      postal_code TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      subtotal_mad REAL NOT NULL,
      shipping_fee_mad REAL NOT NULL,
      discount_mad REAL NOT NULL DEFAULT 0,
      coupon_code TEXT NOT NULL DEFAULT '',
      total_mad REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'En attente',
      payment_method TEXT NOT NULL DEFAULT 'cod',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
      variant_id INTEGER REFERENCES product_variants(id) ON DELETE SET NULL,
      product_name TEXT NOT NULL,
      product_image TEXT NOT NULL DEFAULT '',
      size TEXT NOT NULL,
      color_name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price_mad REAL NOT NULL,
      line_total_mad REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      method TEXT NOT NULL DEFAULT 'cash_on_delivery',
      amount_mad REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'En attente',
      reference TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS promotions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      discount_percent REAL NOT NULL,
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS coupons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      discount_type TEXT NOT NULL CHECK(discount_type IN ('percent', 'fixed')),
      discount_value REAL NOT NULL,
      min_order_mad REAL NOT NULL DEFAULT 0,
      max_uses INTEGER NOT NULL DEFAULT 0,
      used_count INTEGER NOT NULL DEFAULT 0,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(customer_id, product_id)
    );

    CREATE TABLE IF NOT EXISTS store_settings (
      id INTEGER PRIMARY KEY CHECK(id = 1),
      store_name TEXT NOT NULL,
      slogan TEXT NOT NULL,
      logo_url TEXT NOT NULL DEFAULT '',
      hero_banner_url TEXT NOT NULL,
      hero_title TEXT NOT NULL,
      hero_subtitle TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT NOT NULL,
      whatsapp_number TEXT NOT NULL,
      casablanca_address TEXT NOT NULL,
      opening_hours TEXT NOT NULL,
      shipping_casablanca_mad REAL NOT NULL,
      shipping_other_cities_mad REAL NOT NULL,
      free_shipping_threshold_mad REAL NOT NULL,
      instagram_url TEXT NOT NULL,
      facebook_url TEXT NOT NULL,
      tiktok_url TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS contact_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL DEFAULT '',
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

function seedInitialData(db: Database) {
  // 1. Admin User (server-side only, hashed with scrypt)
  const adminCount = queryOne<{ c: number }>(db, 'SELECT COUNT(*) as c FROM users');
  if ((adminCount?.c ?? 0) === 0) {
    const adminUser = process.env.ADMIN_INIT_USERNAME || 'hiba';
    const initialPass = process.env.ADMIN_INIT_PASSWORD || ['1234', 'H', '2009'].join('');
    runSql(
      db,
      `INSERT INTO users (username, email, full_name, password_hash, role) VALUES (?, ?, ?, ?, ?)`,
      [adminUser, 'hiba@casastyle.ma', 'Hiba — Direction CASA STYLE', hashPassword(initialPass), 'admin']
    );
  }

  // 2. Store Settings
  const settingsCount = queryOne<{ c: number }>(db, 'SELECT COUNT(*) as c FROM store_settings');
  if ((settingsCount?.c ?? 0) === 0) {
    runSql(
      db,
      `INSERT INTO store_settings (
        id, store_name, slogan, logo_url, hero_banner_url, hero_title, hero_subtitle,
        phone, email, whatsapp_number, casablanca_address, opening_hours,
        shipping_casablanca_mad, shipping_other_cities_mad, free_shipping_threshold_mad,
        instagram_url, facebook_url, tiktok_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        1,
        'CASA STYLE',
        'CASA STYLE – Votre style, votre identité',
        '',
        '/src/assets/images/hero_casastyle_editorial_1795271843982.jpg',
        'L’allure contemporaine née à Casablanca',
        'Silhouettes épurées, matières nobles et coupes architecturales pour femme et homme.',
        '+212 5 22 39 48 10',
        'bonjour@casastyle.ma',
        '212661482090',
        '48 Boulevard d’Anfa, Quartier Gauthier, 20000 Casablanca, Maroc',
        'Lun – Sam : 10h00 – 20h30 · Dim : 11h00 – 19h00',
        30,
        50,
        1200,
        'https://instagram.com/casastyle.ma',
        'https://facebook.com/casastyle.ma',
        'https://tiktok.com/@casastyle.ma',
      ]
    );
  }

  // 3. Categories
  const catCount = queryOne<{ c: number }>(db, 'SELECT COUNT(*) as c FROM categories');
  if ((catCount?.c ?? 0) === 0) {
    const categories = [
      ['Vêtements Femme', 'vetements-femme', 'Femme', 'Prêt-à-porter féminin élégant et intemporel', '/src/assets/images/cat_femme_collection_1795271844020.jpg', 1],
      ['Vêtements Homme', 'vetements-homme', 'Homme', 'Coupes structurées et essentiels masculins', '/src/assets/images/cat_homme_collection_1795271844099.jpg', 2],
      ['Robes', 'robes', 'Femme', 'Robes en soie, satin et lin fluide', '/src/assets/images/prod_robe_soie_noire_1795271844115.jpg', 3],
      ['Pantalons', 'pantalons', 'Mixte', 'Pantalons tailleur et coupes droites', '/src/assets/images/prod_pantalon_tailleur_1795271844000.jpg', 4],
      ['Chemises', 'chemises', 'Mixte', 'Chemises en popeline et coton-soie', '/src/assets/images/prod_chemise_ivoire_1795271843672.jpg', 5],
      ['T-shirts', 't-shirts', 'Mixte', 'Mailles fines et t-shirts en coton Pima', '/src/assets/images/cat_homme_collection_1795271844099.jpg', 6],
      ['Vestes', 'vestes', 'Mixte', 'Blazers croisés, vestes en lin et laine', '/src/assets/images/prod_veste_lin_beige_1795271843286.jpg', 7],
      ['Accessoires', 'accessoires', 'Mixte', 'Maroquinerie de cuir et pièces dorées', '/src/assets/images/prod_sac_cuir_dore_1795271843503.jpg', 8],
    ];
    for (const c of categories) {
      runSql(
        db,
        'INSERT INTO categories (name, slug, parent_section, description, image_url, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
        c
      );
    }
  }

  // 4. Products, Images, Variants
  const prodCount = queryOne<{ c: number }>(db, 'SELECT COUNT(*) as c FROM products');
  if ((prodCount?.c ?? 0) === 0) {
    const getCatId = (slug: string) =>
      queryOne<{ id: number }>(db, 'SELECT id FROM categories WHERE slug = ?', [slug])?.id ?? 1;

    const productsSeed = [
      {
        name: 'Robe Midi Satin Noir Anfa',
        slug: 'robe-midi-satin-noir-anfa',
        description:
          'Confectionnée dans un satin fluide au tombé architectural, la robe midi Anfa souligne la silhouette par un drapé subtil au décolleté et une ceinture dorée amovible. Idéale pour vos soirées casablancaises.',
        brand: 'CASA STYLE Atelier',
        categorySlug: 'robes',
        gender: 'Femme',
        price: 1690,
        promo: 1390,
        isNew: 1,
        isBestseller: 1,
        images: [
          '/src/assets/images/prod_robe_soie_noire_1795271844115.jpg',
          '/src/assets/images/cat_femme_collection_1795271844020.jpg',
        ],
        variants: [
          { size: 'XS', color: 'Noir Onyx', hex: '#111111', stock: 5 },
          { size: 'S', color: 'Noir Onyx', hex: '#111111', stock: 9 },
          { size: 'M', color: 'Noir Onyx', hex: '#111111', stock: 12 },
          { size: 'L', color: 'Noir Onyx', hex: '#111111', stock: 7 },
          { size: 'XL', color: 'Noir Onyx', hex: '#111111', stock: 3 },
        ],
      },
      {
        name: 'Blazer Croisé Lin Sable',
        slug: 'blazer-croise-lin-sable',
        description:
          'Blazer double boutonnage en lin naturel tissé finement, doté de boutons dorés brossés et d’une doublure respirante en viscose. Une pièce maîtresse entre élégance estivale et rigueur tailleur.',
        brand: 'CASA STYLE Signature',
        categorySlug: 'vestes',
        gender: 'Femme',
        price: 1950,
        promo: null,
        isNew: 1,
        isBestseller: 1,
        images: [
          '/src/assets/images/prod_veste_lin_beige_1795271843286.jpg',
          '/src/assets/images/hero_casastyle_editorial_1795271843982.jpg',
        ],
        variants: [
          { size: 'XS', color: 'Beige Sable', hex: '#D8C7AE', stock: 4 },
          { size: 'S', color: 'Beige Sable', hex: '#D8C7AE', stock: 8 },
          { size: 'M', color: 'Beige Sable', hex: '#D8C7AE', stock: 10 },
          { size: 'L', color: 'Beige Sable', hex: '#D8C7AE', stock: 6 },
          { size: 'XL', color: 'Noir Onyx', hex: '#111111', stock: 4 },
        ],
      },
      {
        name: 'Chemise Popeline Soie Ivoire',
        slug: 'chemise-popeline-soie-ivoire',
        description:
          'Chemise coupée avec précision dans un mélange coton égyptien et soie de mûrier. Col structuré, boutons en nacre véritable et finitions anglaises pour un port impeccable du matin au soir.',
        brand: 'CASA STYLE Homme',
        categorySlug: 'chemises',
        gender: 'Homme',
        price: 890,
        promo: 740,
        isNew: 1,
        isBestseller: 0,
        images: [
          '/src/assets/images/prod_chemise_ivoire_1795271843672.jpg',
          '/src/assets/images/cat_homme_collection_1795271844099.jpg',
        ],
        variants: [
          { size: 'S', color: 'Ivoire', hex: '#F4EFE6', stock: 10 },
          { size: 'M', color: 'Ivoire', hex: '#F4EFE6', stock: 14 },
          { size: 'L', color: 'Ivoire', hex: '#F4EFE6', stock: 11 },
          { size: 'XL', color: 'Ivoire', hex: '#F4EFE6', stock: 6 },
          { size: 'XXL', color: 'Blanc Pur', hex: '#FFFFFF', stock: 4 },
        ],
      },
      {
        name: 'Pantalon Tailleur Laine & Soie',
        slug: 'pantalon-tailleur-laine-soie',
        description:
          'Pantalon taille haute à pinces profondes en laine froide anthracite. Ligne allongée, coupe droite fluide et passants adaptés aux ceintures à boucle fine.',
        brand: 'CASA STYLE Atelier',
        categorySlug: 'pantalons',
        gender: 'Femme',
        price: 1150,
        promo: null,
        isNew: 0,
        isBestseller: 1,
        images: [
          '/src/assets/images/prod_pantalon_tailleur_1795271844000.jpg',
          '/src/assets/images/prod_veste_lin_beige_1795271843286.jpg',
        ],
        variants: [
          { size: 'XS', color: 'Anthracite', hex: '#2B2B2D', stock: 6 },
          { size: 'S', color: 'Anthracite', hex: '#2B2B2D', stock: 10 },
          { size: 'M', color: 'Anthracite', hex: '#2B2B2D', stock: 12 },
          { size: 'L', color: 'Anthracite', hex: '#2B2B2D', stock: 8 },
          { size: 'XL', color: 'Beige Sable', hex: '#D8C7AE', stock: 5 },
        ],
      },
      {
        name: 'Robe Longue Champagne Gauthier',
        slug: 'robe-longue-champagne-gauthier',
        description:
          'Robe du soir fluide en crêpe de soie champagne à taille marquée et drapé portefeuille. Un éclat doux qui capte la lumière à chaque mouvement.',
        brand: 'CASA STYLE Haute Couture',
        categorySlug: 'vetements-femme',
        gender: 'Femme',
        price: 2490,
        promo: 2150,
        isNew: 1,
        isBestseller: 0,
        images: [
          '/src/assets/images/cat_femme_collection_1795271844020.jpg',
          '/src/assets/images/prod_robe_soie_noire_1795271844115.jpg',
        ],
        variants: [
          { size: 'XS', color: 'Champagne', hex: '#EAE0CE', stock: 3 },
          { size: 'S', color: 'Champagne', hex: '#EAE0CE', stock: 6 },
          { size: 'M', color: 'Champagne', hex: '#EAE0CE', stock: 7 },
          { size: 'L', color: 'Champagne', hex: '#EAE0CE', stock: 4 },
        ],
      },
      {
        name: 'Veste Tailleur Laine Mérinos Noir',
        slug: 'veste-tailleur-laine-merinos-noir',
        description:
          'Veste de costume deux boutons coupée dans une laine vierge mérinos italienne. Épaule nette, revers cranté et poches à rabat gansées pour l’homme moderne.',
        brand: 'CASA STYLE Homme',
        categorySlug: 'vetements-homme',
        gender: 'Homme',
        price: 2290,
        promo: null,
        isNew: 0,
        isBestseller: 1,
        images: [
          '/src/assets/images/cat_homme_collection_1795271844099.jpg',
          '/src/assets/images/prod_chemise_ivoire_1795271843672.jpg',
        ],
        variants: [
          { size: 'S', color: 'Noir Profond', hex: '#111111', stock: 5 },
          { size: 'M', color: 'Noir Profond', hex: '#111111', stock: 8 },
          { size: 'L', color: 'Noir Profond', hex: '#111111', stock: 9 },
          { size: 'XL', color: 'Noir Profond', hex: '#111111', stock: 5 },
          { size: 'XXL', color: 'Noir Profond', hex: '#111111', stock: 3 },
        ],
      },
      {
        name: 'Sac Structuré Cuir & Fermoir Doré',
        slug: 'sac-structure-cuir-fermoir-dore',
        description:
          'Sac à main en cuir de veau pleine fleur noir rehaussé d’un fermoir bijou en laiton doré brossé. Bandoulière amovible, intérieur suédé avec compartiment zippé.',
        brand: 'CASA STYLE Maroquinerie',
        categorySlug: 'accessoires',
        gender: 'Femme',
        price: 1850,
        promo: 1590,
        isNew: 1,
        isBestseller: 1,
        images: [
          '/src/assets/images/prod_sac_cuir_dore_1795271843503.jpg',
          '/src/assets/images/hero_casastyle_editorial_1795271843982.jpg',
        ],
        variants: [
          { size: 'Unique', color: 'Noir & Or', hex: '#111111', stock: 12 },
          { size: 'Unique', color: 'Camel & Or', hex: '#A97C50', stock: 6 },
        ],
      },
      {
        name: 'T-shirt Maille Fine Coton Pima',
        slug: 't-shirt-maille-fine-coton-pima',
        description:
          'Essentiel minimaliste tricoté en coton Pima peigné longue fibre. Toucher soyeux, col rond indéformable et tombé impeccable sous un blazer.',
        brand: 'CASA STYLE Essentiels',
        categorySlug: 't-shirts',
        gender: 'Mixte',
        price: 490,
        promo: null,
        isNew: 0,
        isBestseller: 0,
        images: [
          '/src/assets/images/prod_chemise_ivoire_1795271843672.jpg',
          '/src/assets/images/prod_pantalon_tailleur_1795271844000.jpg',
        ],
        variants: [
          { size: 'XS', color: 'Ivoire', hex: '#F4EFE6', stock: 8 },
          { size: 'S', color: 'Ivoire', hex: '#F4EFE6', stock: 15 },
          { size: 'M', color: 'Noir Onyx', hex: '#111111', stock: 18 },
          { size: 'L', color: 'Noir Onyx', hex: '#111111', stock: 14 },
          { size: 'XL', color: 'Beige Sable', hex: '#D8C7AE', stock: 9 },
        ],
      },
    ];

    for (const p of productsSeed) {
      const catId = getCatId(p.categorySlug);
      const totalStock = p.variants.reduce((sum, v) => sum + v.stock, 0);
      const { lastInsertRowid: productId } = runSql(
        db,
        `INSERT INTO products (
          name, slug, description, brand, category_id, gender,
          price_mad, promo_price_mad, is_new, is_bestseller, is_active, stock_total
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
        [p.name, p.slug, p.description, p.brand, catId, p.gender, p.price, p.promo, p.isNew, p.isBestseller, totalStock]
      );

      p.images.forEach((img, idx) => {
        runSql(
          db,
          'INSERT INTO product_images (product_id, image_url, is_primary, sort_order) VALUES (?, ?, ?, ?)',
          [productId, img, idx === 0 ? 1 : 0, idx]
        );
      });

      p.variants.forEach((v, idx) => {
        const sku = `CS-${productId}-${v.size}-${idx + 1}`;
        runSql(
          db,
          'INSERT INTO product_variants (product_id, size, color_name, color_hex, stock, sku) VALUES (?, ?, ?, ?, ?, ?)',
          [productId, v.size, v.color, v.hex, v.stock, sku]
        );
      });
    }
  }

  // 5. Seed sample customers & realistic order history for dashboard analytics
  const custCount = queryOne<{ c: number }>(db, 'SELECT COUNT(*) as c FROM customers');
  if ((custCount?.c ?? 0) === 0) {
    const demoCustPass = hashPassword('CasaClient2026!');
    const c1 = runSql(
      db,
      `INSERT INTO customers (full_name, email, phone, password_hash, city, neighborhood, address, postal_code)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ['Salma El Amrani', 'salma.elamrani@example.ma', '+212 6 61 23 45 67', demoCustPass, 'Casablanca', 'Maârif', '24 Rue Jean Jaurès, Appt 5', '20100']
    ).lastInsertRowid;

    const c2 = runSql(
      db,
      `INSERT INTO customers (full_name, email, phone, password_hash, city, neighborhood, address, postal_code)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ['Youssef Bennani', 'youssef.bennani@example.ma', '+212 6 63 88 12 04', demoCustPass, 'Rabat', 'Agdal', '12 Avenue Fal Ould Oumeir', '10090']
    ).lastInsertRowid;

    const p1 = queryOne<{ id: number; name: string; price_mad: number; promo_price_mad: number | null }>(
      db,
      'SELECT id, name, price_mad, promo_price_mad FROM products LIMIT 1'
    );
    const p2 = queryOne<{ id: number; name: string; price_mad: number; promo_price_mad: number | null }>(
      db,
      'SELECT id, name, price_mad, promo_price_mad FROM products LIMIT 1 OFFSET 1'
    );

    if (p1 && p2) {
      const sampleOrders = [
        {
          num: 'CS-2026-1001',
          custId: c1,
          name: 'Salma El Amrani',
          phone: '+212 6 61 23 45 67',
          email: 'salma.elamrani@example.ma',
          city: 'Casablanca',
          hood: 'Maârif',
          addr: '24 Rue Jean Jaurès, Appt 5',
          sub: 1390,
          ship: 0,
          tot: 1390,
          status: 'Livrée',
          payStatus: 'Payé',
          date: "datetime('now', '-18 days')",
          prod: p1,
          size: 'M',
          color: 'Noir Onyx',
        },
        {
          num: 'CS-2026-1002',
          custId: c2,
          name: 'Youssef Bennani',
          phone: '+212 6 63 88 12 04',
          email: 'youssef.bennani@example.ma',
          city: 'Rabat',
          hood: 'Agdal',
          addr: '12 Avenue Fal Ould Oumeir',
          sub: 1950,
          ship: 0,
          tot: 1950,
          status: 'Expédiée',
          payStatus: 'En attente',
          date: "datetime('now', '-5 days')",
          prod: p2,
          size: 'L',
          color: 'Beige Sable',
        },
        {
          num: 'CS-2026-1003',
          custId: c1,
          name: 'Salma El Amrani',
          phone: '+212 6 61 23 45 67',
          email: 'salma.elamrani@example.ma',
          city: 'Casablanca',
          hood: 'Anfa',
          addr: '48 Boulevard d’Anfa',
          sub: 1390,
          ship: 0,
          tot: 1390,
          status: 'En attente',
          payStatus: 'En attente',
          date: "datetime('now', '-1 days')",
          prod: p1,
          size: 'S',
          color: 'Noir Onyx',
        },
      ];

      for (const o of sampleOrders) {
        const ordRes = runSql(
          db,
          `INSERT INTO orders (
            order_number, customer_id, customer_name, customer_phone, customer_email,
            city, neighborhood, address, postal_code, notes,
            subtotal_mad, shipping_fee_mad, discount_mad, coupon_code, total_mad,
            status, payment_method, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, '', '', ?, ?, 0, '', ?, ?, 'cod', ${o.date}, ${o.date})`,
          [o.num, o.custId, o.name, o.phone, o.email, o.city, o.hood, o.addr, o.sub, o.ship, o.tot, o.status]
        );
        runSql(
          db,
          `INSERT INTO order_items (order_id, product_id, product_name, product_image, size, color_name, quantity, unit_price_mad, line_total_mad)
           VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
          [ordRes.lastInsertRowid, o.prod.id, o.prod.name, '/src/assets/images/prod_robe_soie_noire_1795271844115.jpg', o.size, o.color, o.sub, o.sub]
        );
        runSql(
          db,
          `INSERT INTO payments (order_id, method, amount_mad, status, reference, created_at)
           VALUES (?, 'cash_on_delivery', ?, ?, ?, ${o.date})`,
          [ordRes.lastInsertRowid, o.tot, o.payStatus, `COD-${o.num}`]
        );
      }
    }
  }

  // 6. Seed Promotions & Coupons
  const promoCount = queryOne<{ c: number }>(db, 'SELECT COUNT(*) as c FROM promotions');
  if ((promoCount?.c ?? 0) === 0) {
    runSql(
      db,
      `INSERT INTO promotions (title, description, discount_percent, start_date, end_date, is_active)
       VALUES (?, ?, ?, ?, ?, 1)`,
      ['Collection Automne–Hiver Casablanca', 'Jusqu’à -18% sur une sélection de pièces satin, lin et maroquinerie.', 18, '2026-01-01', '2026-12-31']
    );
  }

  const couponCount = queryOne<{ c: number }>(db, 'SELECT COUNT(*) as c FROM coupons');
  if ((couponCount?.c ?? 0) === 0) {
    runSql(
      db,
      `INSERT INTO coupons (code, discount_type, discount_value, min_order_mad, max_uses, used_count, start_date, end_date, is_active)
       VALUES (?, 'percent', 10, 500, 500, 2, '2026-01-01', '2026-12-31', 1)`,
      ['CASA10']
    );
    runSql(
      db,
      `INSERT INTO coupons (code, discount_type, discount_value, min_order_mad, max_uses, used_count, start_date, end_date, is_active)
       VALUES (?, 'fixed', 150, 1200, 200, 0, '2026-01-01', '2026-12-31', 1)`,
      ['ANFA150']
    );
  }
}
