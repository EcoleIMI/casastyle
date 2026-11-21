import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import express, { type Request, type Response, type NextFunction } from 'express';
import multer from 'multer';
import { getDb, persistDb, queryAll, queryOne, runSql } from './db.ts';
import {
  clearSessionCookie,
  extractBearerOrCookie,
  generateSessionToken,
  hashPassword,
  hashToken,
  sanitizeImageUrl,
  setSessionCookie,
  verifyCsrfIfCookieAuth,
  verifyPassword,
} from './security.ts';

const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const ALLOWED_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
    filename: (_req, file, cb) => {
      const ext = ALLOWED_MIME[file.mimetype] || '.jpg';
      cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME[file.mimetype]) {
      cb(null, true);
    } else {
      cb(new Error('Format image non supporté (JPG, PNG, WebP uniquement).'));
    }
  },
});

interface AdminRow {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role: string;
  password_hash: string;
}

interface CustomerRow {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  city: string;
  neighborhood: string;
  address: string;
  postal_code: string;
  password_hash: string;
  created_at: string;
}

interface AuthedRequest extends Request {
  adminUser?: Omit<AdminRow, 'password_hash'>;
  customer?: Omit<CustomerRow, 'password_hash'>;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || `produit-${Date.now()}`;
}

async function hydrateProducts(rows: Record<string, unknown>[]) {
  const db = await getDb();
  if (rows.length === 0) return [];
  const allImages = queryAll<{
    id: number;
    product_id: number;
    image_url: string;
    is_primary: number;
    sort_order: number;
  }>(db, 'SELECT * FROM product_images ORDER BY is_primary DESC, sort_order ASC, id ASC');
  const allVariants = queryAll<{
    id: number;
    product_id: number;
    size: string;
    color_name: string;
    color_hex: string;
    stock: number;
    sku: string;
  }>(db, 'SELECT * FROM product_variants ORDER BY id ASC');

  const imgMap = new Map<number, typeof allImages>();
  for (const img of allImages) {
    const arr = imgMap.get(img.product_id) || [];
    arr.push(img);
    imgMap.set(img.product_id, arr);
  }
  const varMap = new Map<number, typeof allVariants>();
  for (const v of allVariants) {
    const arr = varMap.get(v.product_id) || [];
    arr.push(v);
    varMap.set(v.product_id, arr);
  }

  return rows.map((p) => {
    const pid = Number(p.id);
    const imgs = imgMap.get(pid) || [];
    const vars = varMap.get(pid) || [];
    return {
      ...p,
      images: imgs,
      primary_image: imgs[0]?.image_url || '',
      variants: vars,
    };
  });
}

async function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  if (req.method !== 'GET' && !verifyCsrfIfCookieAuth(req)) {
    return res.status(403).json({ error: 'Vérification CSRF échouée.' });
  }
  const token = extractBearerOrCookie(req, 'cs_admin_token');
  if (!token) {
    return res.status(401).json({ error: 'Authentification administrateur requise.' });
  }
  const db = await getDb();
  const tokenHash = hashToken(token);
  const session = queryOne<{ subject_id: number }>(
    db,
    `SELECT subject_id FROM sessions
     WHERE token_hash = ? AND subject_type = 'admin' AND expires_at > datetime('now')`,
    [tokenHash]
  );
  if (!session) {
    return res.status(401).json({ error: 'Session expirée ou invalide.' });
  }
  const user = queryOne<AdminRow>(db, 'SELECT * FROM users WHERE id = ?', [session.subject_id]);
  if (!user) {
    return res.status(401).json({ error: 'Compte administrateur introuvable.' });
  }
  const { password_hash: _ph, ...safeUser } = user;
  req.adminUser = safeUser;
  next();
}

async function requireCustomer(req: AuthedRequest, res: Response, next: NextFunction) {
  if (req.method !== 'GET' && !verifyCsrfIfCookieAuth(req)) {
    return res.status(403).json({ error: 'Vérification CSRF échouée.' });
  }
  const token = extractBearerOrCookie(req, 'cs_customer_token');
  if (!token) {
    return res.status(401).json({ error: 'Veuillez vous connecter à votre espace client.' });
  }
  const db = await getDb();
  const tokenHash = hashToken(token);
  const session = queryOne<{ subject_id: number }>(
    db,
    `SELECT subject_id FROM sessions
     WHERE token_hash = ? AND subject_type = 'customer' AND expires_at > datetime('now')`,
    [tokenHash]
  );
  if (!session) {
    return res.status(401).json({ error: 'Session client expirée.' });
  }
  const cust = queryOne<CustomerRow>(db, 'SELECT * FROM customers WHERE id = ?', [session.subject_id]);
  if (!cust) {
    return res.status(401).json({ error: 'Client introuvable.' });
  }
  const { password_hash: _ph, ...safeCust } = cust;
  req.customer = safeCust;
  next();
}

async function getOptionalCustomerId(req: Request): Promise<number | null> {
  const token = extractBearerOrCookie(req, 'cs_customer_token');
  if (!token) return null;
  const db = await getDb();
  const session = queryOne<{ subject_id: number }>(
    db,
    `SELECT subject_id FROM sessions
     WHERE token_hash = ? AND subject_type = 'customer' AND expires_at > datetime('now')`,
    [hashToken(token)]
  );
  return session?.subject_id ?? null;
}

export function createApiRouter() {
  const router = express.Router();

  // Healthcheck
  router.get('/health', async (_req, res) => {
    try {
      await getDb();
      res.json({ ok: true });
    } catch {
      res.status(500).json({ ok: false });
    }
  });

  // Public Store Settings + Categories + Active Promotions
  router.get('/store', async (_req, res) => {
    try {
      const db = await getDb();
      const settings = queryOne(db, 'SELECT * FROM store_settings WHERE id = 1');
      const categories = queryAll(db, 'SELECT * FROM categories ORDER BY sort_order ASC, id ASC');
      const promotions = queryAll(
        db,
        `SELECT * FROM promotions
         WHERE is_active = 1 AND date('now') BETWEEN start_date AND end_date
         ORDER BY id DESC`
      );
      res.json({ settings, categories, promotions });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Impossible de charger la boutique.' });
    }
  });

  // Public Products Catalog with Dynamic Filters
  router.get('/products', async (req, res) => {
    try {
      const db = await getDb();
      const {
        category,
        gender,
        search,
        minPrice,
        maxPrice,
        size,
        color,
        inStock,
        isNew,
        isBestseller,
        onPromo,
        sort,
      } = req.query as Record<string, string | undefined>;

      const where: string[] = ['p.is_active = 1'];
      const params: (string | number)[] = [];

      if (category && category !== 'all') {
        where.push('(c.slug = ? OR c.name = ?)');
        params.push(category, category);
      }
      if (gender && gender !== 'all') {
        where.push('(p.gender = ? OR p.gender = ?)');
        params.push(gender, 'Mixte');
      }
      if (search && search.trim()) {
        const term = `%${search.trim().toLowerCase()}%`;
        where.push('(LOWER(p.name) LIKE ? OR LOWER(p.description) LIKE ? OR LOWER(p.brand) LIKE ? OR LOWER(c.name) LIKE ?)');
        params.push(term, term, term, term);
      }
      if (minPrice && !Number.isNaN(Number(minPrice))) {
        where.push('COALESCE(p.promo_price_mad, p.price_mad) >= ?');
        params.push(Number(minPrice));
      }
      if (maxPrice && !Number.isNaN(Number(maxPrice))) {
        where.push('COALESCE(p.promo_price_mad, p.price_mad) <= ?');
        params.push(Number(maxPrice));
      }
      if (inStock === '1' || inStock === 'true') {
        where.push('p.stock_total > 0');
      }
      if (isNew === '1' || isNew === 'true') {
        where.push('p.is_new = 1');
      }
      if (isBestseller === '1' || isBestseller === 'true') {
        where.push('p.is_bestseller = 1');
      }
      if (onPromo === '1' || onPromo === 'true') {
        where.push('p.promo_price_mad IS NOT NULL AND p.promo_price_mad < p.price_mad');
      }
      if (size && size !== 'all') {
        where.push('EXISTS (SELECT 1 FROM product_variants pv WHERE pv.product_id = p.id AND pv.size = ? AND pv.stock > 0)');
        params.push(size);
      }
      if (color && color !== 'all') {
        where.push('EXISTS (SELECT 1 FROM product_variants pv WHERE pv.product_id = p.id AND LOWER(pv.color_name) = ? AND pv.stock > 0)');
        params.push(color.toLowerCase());
      }

      let orderBy = 'p.created_at DESC, p.id DESC';
      if (sort === 'price_asc') orderBy = 'COALESCE(p.promo_price_mad, p.price_mad) ASC';
      if (sort === 'price_desc') orderBy = 'COALESCE(p.promo_price_mad, p.price_mad) DESC';
      if (sort === 'bestseller') orderBy = 'p.is_bestseller DESC, p.id DESC';

      const rows = queryAll(
        db,
        `SELECT p.*, c.name as category_name, c.slug as category_slug
         FROM products p
         LEFT JOIN categories c ON c.id = p.category_id
         WHERE ${where.join(' AND ')}
         ORDER BY ${orderBy}`,
        params
      );

      const hydrated = await hydrateProducts(rows);
      res.json({ products: hydrated });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Erreur lors du chargement des produits.' });
    }
  });

  // Single Product Detail
  router.get('/products/:slug', async (req, res) => {
    try {
      const db = await getDb();
      const row = queryOne(
        db,
        `SELECT p.*, c.name as category_name, c.slug as category_slug
         FROM products p
         LEFT JOIN categories c ON c.id = p.category_id
         WHERE p.slug = ? AND p.is_active = 1`,
        [req.params.slug]
      );
      if (!row) {
        return res.status(404).json({ error: 'Produit introuvable.' });
      }
      const [product] = await hydrateProducts([row]);
      res.json({ product });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Erreur serveur.' });
    }
  });

  // Coupon Validation
  router.post('/coupons/validate', async (req, res) => {
    try {
      const { code, subtotal } = req.body as { code?: string; subtotal?: number };
      if (!code || !code.trim()) {
        return res.status(400).json({ error: 'Veuillez saisir un code promo.' });
      }
      const db = await getDb();
      const coupon = queryOne<{
        id: number;
        code: string;
        discount_type: 'percent' | 'fixed';
        discount_value: number;
        min_order_mad: number;
        max_uses: number;
        used_count: number;
        start_date: string;
        end_date: string;
        is_active: number;
      }>(db, 'SELECT * FROM coupons WHERE UPPER(code) = UPPER(?)', [code.trim()]);

      if (!coupon || coupon.is_active !== 1) {
        return res.status(404).json({ error: 'Code promo invalide ou expiré.' });
      }
      const today = new Date().toISOString().slice(0, 10);
      if (today < coupon.start_date || today > coupon.end_date) {
        return res.status(400).json({ error: 'Ce code promo n’est plus valide à cette date.' });
      }
      if (coupon.max_uses > 0 && coupon.used_count >= coupon.max_uses) {
        return res.status(400).json({ error: 'Ce code promo a atteint sa limite d’utilisation.' });
      }
      const sub = Number(subtotal || 0);
      if (sub < coupon.min_order_mad) {
        return res.status(400).json({
          error: `Montant minimum requis de ${coupon.min_order_mad} MAD pour ce code.`,
        });
      }
      const discount =
        coupon.discount_type === 'percent'
          ? Math.round((sub * coupon.discount_value) / 100)
          : Math.min(sub, coupon.discount_value);

      res.json({
        coupon: {
          code: coupon.code,
          discount_type: coupon.discount_type,
          discount_value: coupon.discount_value,
          discount_mad: discount,
        },
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Erreur lors de la validation du code promo.' });
    }
  });

  // Create Order (Checkout)
  router.post('/orders', async (req, res) => {
    try {
      const db = await getDb();
      const {
        customer_name,
        customer_phone,
        customer_email = '',
        city,
        neighborhood = '',
        address,
        postal_code = '',
        notes = '',
        coupon_code = '',
        payment_method = 'cod',
        items,
      } = req.body as {
        customer_name?: string;
        customer_phone?: string;
        customer_email?: string;
        city?: string;
        neighborhood?: string;
        address?: string;
        postal_code?: string;
        notes?: string;
        coupon_code?: string;
        payment_method?: string;
        items?: Array<{
          product_id: number;
          variant_id?: number;
          size: string;
          color_name: string;
          quantity: number;
        }>;
      };

      if (!customer_name?.trim() || !customer_phone?.trim() || !city?.trim() || !address?.trim()) {
        return res.status(400).json({ error: 'Veuillez renseigner vos coordonnées complètes de livraison.' });
      }
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Votre panier est vide.' });
      }
      if (payment_method !== 'cod') {
        return res.status(400).json({ error: 'Seul le paiement à la livraison est actuellement activé.' });
      }

      const settings = queryOne<{
        shipping_casablanca_mad: number;
        shipping_other_cities_mad: number;
        free_shipping_threshold_mad: number;
      }>(db, 'SELECT * FROM store_settings WHERE id = 1');

      const customerId = await getOptionalCustomerId(req);

      let subtotalMad = 0;
      const resolvedItems: Array<{
        product_id: number;
        variant_id: number | null;
        product_name: string;
        product_image: string;
        size: string;
        color_name: string;
        quantity: number;
        unit_price_mad: number;
        line_total_mad: number;
      }> = [];

      db.run('BEGIN TRANSACTION;');
      try {
        for (const item of items) {
          const qty = Math.max(1, Math.floor(Number(item.quantity)));
          const product = queryOne<{
            id: number;
            name: string;
            price_mad: number;
            promo_price_mad: number | null;
            stock_total: number;
            is_active: number;
          }>(db, 'SELECT * FROM products WHERE id = ? AND is_active = 1', [Number(item.product_id)]);

          if (!product) {
            throw new Error('Un produit de votre panier n’est plus disponible.');
          }

          let variant = item.variant_id
            ? queryOne<{ id: number; stock: number; size: string; color_name: string }>(
                db,
                'SELECT * FROM product_variants WHERE id = ? AND product_id = ?',
                [Number(item.variant_id), product.id]
              )
            : queryOne<{ id: number; stock: number; size: string; color_name: string }>(
                db,
                'SELECT * FROM product_variants WHERE product_id = ? AND size = ? AND color_name = ?',
                [product.id, item.size || '', item.color_name || '']
              );

          if (variant) {
            if (variant.stock < qty) {
              throw new Error(`Stock insuffisant pour ${product.name} (${variant.size} / ${variant.color_name}).`);
            }
            runSql(db, 'UPDATE product_variants SET stock = stock - ? WHERE id = ?', [qty, variant.id]);
          } else if (product.stock_total < qty) {
            throw new Error(`Stock insuffisant pour ${product.name}.`);
          }

          runSql(db, 'UPDATE products SET stock_total = MAX(0, stock_total - ?) WHERE id = ?', [qty, product.id]);

          const primaryImg = queryOne<{ image_url: string }>(
            db,
            'SELECT image_url FROM product_images WHERE product_id = ? ORDER BY is_primary DESC, sort_order ASC LIMIT 1',
            [product.id]
          );

          const unitPrice =
            product.promo_price_mad !== null && product.promo_price_mad < product.price_mad
              ? product.promo_price_mad
              : product.price_mad;
          const lineTotal = unitPrice * qty;
          subtotalMad += lineTotal;

          resolvedItems.push({
            product_id: product.id,
            variant_id: variant?.id ?? null,
            product_name: product.name,
            product_image: primaryImg?.image_url || '',
            size: variant?.size || item.size || 'Unique',
            color_name: variant?.color_name || item.color_name || 'Standard',
            quantity: qty,
            unit_price_mad: unitPrice,
            line_total_mad: lineTotal,
          });
        }

        let discountMad = 0;
        let appliedCouponCode = '';
        if (coupon_code && coupon_code.trim()) {
          const coupon = queryOne<{
            id: number;
            code: string;
            discount_type: 'percent' | 'fixed';
            discount_value: number;
            min_order_mad: number;
            max_uses: number;
            used_count: number;
            start_date: string;
            end_date: string;
            is_active: number;
          }>(db, 'SELECT * FROM coupons WHERE UPPER(code) = UPPER(?)', [coupon_code.trim()]);
          const today = new Date().toISOString().slice(0, 10);
          if (
            coupon &&
            coupon.is_active === 1 &&
            today >= coupon.start_date &&
            today <= coupon.end_date &&
            (coupon.max_uses === 0 || coupon.used_count < coupon.max_uses) &&
            subtotalMad >= coupon.min_order_mad
          ) {
            discountMad =
              coupon.discount_type === 'percent'
                ? Math.round((subtotalMad * coupon.discount_value) / 100)
                : Math.min(subtotalMad, coupon.discount_value);
            appliedCouponCode = coupon.code;
            runSql(db, 'UPDATE coupons SET used_count = used_count + 1 WHERE id = ?', [coupon.id]);
          }
        }

        const isCasa = city.trim().toLowerCase() === 'casablanca';
        const threshold = settings?.free_shipping_threshold_mad ?? 1200;
        const baseShipping = isCasa
          ? (settings?.shipping_casablanca_mad ?? 30)
          : (settings?.shipping_other_cities_mad ?? 50);
        const shippingFeeMad = subtotalMad - discountMad >= threshold ? 0 : baseShipping;
        const totalMad = Math.max(0, subtotalMad - discountMad + shippingFeeMad);

        const orderNum = `CS-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

        const { lastInsertRowid: orderId } = runSql(
          db,
          `INSERT INTO orders (
            order_number, customer_id, customer_name, customer_phone, customer_email,
            city, neighborhood, address, postal_code, notes,
            subtotal_mad, shipping_fee_mad, discount_mad, coupon_code, total_mad,
            status, payment_method
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'En attente', 'cod')`,
          [
            orderNum,
            customerId,
            customer_name.trim(),
            customer_phone.trim(),
            customer_email.trim(),
            city.trim(),
            neighborhood.trim(),
            address.trim(),
            postal_code.trim(),
            notes.trim(),
            subtotalMad,
            shippingFeeMad,
            discountMad,
            appliedCouponCode,
            totalMad,
          ]
        );

        for (const ri of resolvedItems) {
          runSql(
            db,
            `INSERT INTO order_items (
              order_id, product_id, variant_id, product_name, product_image,
              size, color_name, quantity, unit_price_mad, line_total_mad
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              orderId,
              ri.product_id,
              ri.variant_id,
              ri.product_name,
              ri.product_image,
              ri.size,
              ri.color_name,
              ri.quantity,
              ri.unit_price_mad,
              ri.line_total_mad,
            ]
          );
        }

        runSql(
          db,
          `INSERT INTO payments (order_id, method, amount_mad, status, reference)
           VALUES (?, 'cash_on_delivery', ?, 'En attente', ?)`,
          [orderId, totalMad, `COD-${orderNum}`]
        );

        db.run('COMMIT;');
        persistDb(db);

        const createdOrder = queryOne(db, 'SELECT * FROM orders WHERE id = ?', [orderId]);
        const createdItems = queryAll(db, 'SELECT * FROM order_items WHERE order_id = ?', [orderId]);
        res.status(201).json({ order: createdOrder, items: createdItems });
      } catch (innerErr: unknown) {
        db.run('ROLLBACK;');
        const msg = innerErr instanceof Error ? innerErr.message : 'Erreur lors de la commande.';
        res.status(400).json({ error: msg });
      }
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Erreur serveur lors de la création de commande.' });
    }
  });

  // Public Contact Form
  router.post('/contact', async (req, res) => {
    try {
      const { name, email, phone = '', subject, message } = req.body as Record<string, string>;
      if (!name?.trim() || !email?.trim() || !subject?.trim() || !message?.trim()) {
        return res.status(400).json({ error: 'Veuillez remplir tous les champs obligatoires.' });
      }
      const db = await getDb();
      runSql(
        db,
        'INSERT INTO contact_messages (name, email, phone, subject, message) VALUES (?, ?, ?, ?, ?)',
        [name.trim(), email.trim(), phone.trim(), subject.trim(), message.trim()]
      );
      persistDb(db);
      res.status(201).json({ ok: true, message: 'Votre message a bien été envoyé à notre équipe de Casablanca.' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Erreur lors de l’envoi du message.' });
    }
  });

  // ========================
  // CUSTOMER AUTH & ACCOUNT
  // ========================

  router.post('/customer/register', async (req, res) => {
    try {
      const { full_name, email, phone = '', password, city = 'Casablanca', neighborhood = '', address = '', postal_code = '' } =
        req.body as Record<string, string>;
      if (!full_name?.trim() || !email?.trim() || !password || password.length < 6) {
        return res.status(400).json({ error: 'Nom, email et mot de passe (6 caractères min.) requis.' });
      }
      const db = await getDb();
      const existing = queryOne(db, 'SELECT id FROM customers WHERE LOWER(email) = LOWER(?)', [email.trim()]);
      if (existing) {
        return res.status(409).json({ error: 'Un compte client existe déjà avec cet e-mail.' });
      }
      const { lastInsertRowid: customerId } = runSql(
        db,
        `INSERT INTO customers (full_name, email, phone, password_hash, city, neighborhood, address, postal_code)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [full_name.trim(), email.trim().toLowerCase(), phone.trim(), hashPassword(password), city.trim(), neighborhood.trim(), address.trim(), postal_code.trim()]
      );
      const token = generateSessionToken();
      runSql(
        db,
        `INSERT INTO sessions (token_hash, subject_type, subject_id, expires_at)
         VALUES (?, 'customer', ?, datetime('now', '+7 days'))`,
        [hashToken(token), customerId]
      );
      persistDb(db);
      setSessionCookie(req, res, 'cs_customer_token', token, 7 * 24 * 3600);
      const customer = queryOne<CustomerRow>(db, 'SELECT * FROM customers WHERE id = ?', [customerId]);
      if (!customer) return res.status(500).json({ error: 'Erreur création compte.' });
      const { password_hash: _ph, ...safe } = customer;
      res.status(201).json({ customer: safe, token });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Erreur lors de l’inscription.' });
    }
  });

  router.post('/customer/login', async (req, res) => {
    try {
      const { email, password } = req.body as { email?: string; password?: string };
      if (!email?.trim() || !password) {
        return res.status(400).json({ error: 'E-mail et mot de passe requis.' });
      }
      const db = await getDb();
      const cust = queryOne<CustomerRow>(db, 'SELECT * FROM customers WHERE LOWER(email) = LOWER(?)', [email.trim()]);
      if (!cust || !verifyPassword(password, cust.password_hash)) {
        return res.status(401).json({ error: 'Identifiants client incorrects.' });
      }
      const token = generateSessionToken();
      runSql(
        db,
        `INSERT INTO sessions (token_hash, subject_type, subject_id, expires_at)
         VALUES (?, 'customer', ?, datetime('now', '+7 days'))`,
        [hashToken(token), cust.id]
      );
      persistDb(db);
      setSessionCookie(req, res, 'cs_customer_token', token, 7 * 24 * 3600);
      const { password_hash: _ph, ...safe } = cust;
      res.json({ customer: safe, token });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Erreur de connexion.' });
    }
  });

  router.post('/customer/logout', async (req, res) => {
    const token = extractBearerOrCookie(req, 'cs_customer_token');
    if (token) {
      const db = await getDb();
      runSql(db, 'DELETE FROM sessions WHERE token_hash = ?', [hashToken(token)]);
      persistDb(db);
    }
    clearSessionCookie(req, res, 'cs_customer_token');
    res.json({ ok: true });
  });

  router.get('/customer/me', requireCustomer, (req: AuthedRequest, res) => {
    res.json({ customer: req.customer });
  });

  router.put('/customer/profile', requireCustomer, async (req: AuthedRequest, res) => {
    try {
      const { full_name, phone, city, neighborhood, address, postal_code } = req.body as Record<string, string>;
      if (!full_name?.trim()) {
        return res.status(400).json({ error: 'Le nom complet est obligatoire.' });
      }
      const db = await getDb();
      runSql(
        db,
        `UPDATE customers
         SET full_name = ?, phone = ?, city = ?, neighborhood = ?, address = ?, postal_code = ?
         WHERE id = ?`,
        [
          full_name.trim(),
          (phone || '').trim(),
          (city || 'Casablanca').trim(),
          (neighborhood || '').trim(),
          (address || '').trim(),
          (postal_code || '').trim(),
          req.customer!.id,
        ]
      );
      persistDb(db);
      const updated = queryOne<CustomerRow>(db, 'SELECT * FROM customers WHERE id = ?', [req.customer!.id]);
      if (!updated) return res.status(404).json({ error: 'Client introuvable.' });
      const { password_hash: _ph, ...safe } = updated;
      res.json({ customer: safe });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Impossible de mettre à jour le profil.' });
    }
  });

  router.get('/customer/orders', requireCustomer, async (req: AuthedRequest, res) => {
    try {
      const db = await getDb();
      const orders = queryAll<{ id: number }>(
        db,
        `SELECT * FROM orders WHERE customer_id = ? OR LOWER(customer_email) = LOWER(?) ORDER BY created_at DESC, id DESC`,
        [req.customer!.id, req.customer!.email]
      );
      const enriched = orders.map((o) => ({
        ...o,
        items: queryAll(db, 'SELECT * FROM order_items WHERE order_id = ?', [o.id]),
      }));
      res.json({ orders: enriched });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Erreur chargement des commandes.' });
    }
  });

  router.get('/customer/favorites', requireCustomer, async (req: AuthedRequest, res) => {
    try {
      const db = await getDb();
      const rows = queryAll(
        db,
        `SELECT p.*, c.name as category_name, c.slug as category_slug
         FROM favorites f
         INNER JOIN products p ON p.id = f.product_id
         LEFT JOIN categories c ON c.id = p.category_id
         WHERE f.customer_id = ? AND p.is_active = 1
         ORDER BY f.created_at DESC`,
        [req.customer!.id]
      );
      const products = await hydrateProducts(rows);
      res.json({ favorites: products });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Erreur chargement des favoris.' });
    }
  });

  router.post('/customer/favorites/:productId', requireCustomer, async (req: AuthedRequest, res) => {
    try {
      const productId = Number(req.params.productId);
      const db = await getDb();
      const existing = queryOne<{ id: number }>(
        db,
        'SELECT id FROM favorites WHERE customer_id = ? AND product_id = ?',
        [req.customer!.id, productId]
      );
      let favorited = false;
      if (existing) {
        runSql(db, 'DELETE FROM favorites WHERE id = ?', [existing.id]);
        favorited = false;
      } else {
        runSql(db, 'INSERT INTO favorites (customer_id, product_id) VALUES (?, ?)', [req.customer!.id, productId]);
        favorited = true;
      }
      persistDb(db);
      res.json({ favorited, product_id: productId });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Erreur favoris.' });
    }
  });

  // ========================
  // ADMIN AUTH & SECURITY
  // ========================

  router.post('/admin/login', async (req, res) => {
    try {
      const { username, password } = req.body as { username?: string; password?: string };
      if (!username?.trim() || !password) {
        return res.status(400).json({ error: 'Identifiant et mot de passe requis.' });
      }
      const db = await getDb();
      const user = queryOne<AdminRow>(
        db,
        'SELECT * FROM users WHERE LOWER(username) = LOWER(?)',
        [username.trim()]
      );
      if (!user || !verifyPassword(password, user.password_hash)) {
        return res.status(401).json({ error: 'Identifiants administrateur invalides.' });
      }
      const token = generateSessionToken();
      runSql(
        db,
        `INSERT INTO sessions (token_hash, subject_type, subject_id, expires_at)
         VALUES (?, 'admin', ?, datetime('now', '+2 days'))`,
        [hashToken(token), user.id]
      );
      persistDb(db);
      setSessionCookie(req, res, 'cs_admin_token', token, 2 * 24 * 3600);
      const { password_hash: _ph, ...safe } = user;
      res.json({ user: safe, token });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Erreur lors de la connexion administrateur.' });
    }
  });

  router.post('/admin/logout', async (req, res) => {
    const token = extractBearerOrCookie(req, 'cs_admin_token');
    if (token) {
      const db = await getDb();
      runSql(db, 'DELETE FROM sessions WHERE token_hash = ?', [hashToken(token)]);
      persistDb(db);
    }
    clearSessionCookie(req, res, 'cs_admin_token');
    res.json({ ok: true });
  });

  router.get('/admin/me', requireAdmin, (req: AuthedRequest, res) => {
    res.json({ user: req.adminUser });
  });

  router.put('/admin/password', requireAdmin, async (req: AuthedRequest, res) => {
    try {
      const { current_password, new_password } = req.body as {
        current_password?: string;
        new_password?: string;
      };
      if (!current_password || !new_password || new_password.length < 8) {
        return res.status(400).json({
          error: 'Le nouveau mot de passe doit contenir au moins 8 caractères.',
        });
      }
      const db = await getDb();
      const user = queryOne<AdminRow>(db, 'SELECT * FROM users WHERE id = ?', [req.adminUser!.id]);
      if (!user || !verifyPassword(current_password, user.password_hash)) {
        return res.status(401).json({ error: 'Mot de passe actuel incorrect.' });
      }
      runSql(
        db,
        `UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?`,
        [hashPassword(new_password), user.id]
      );
      persistDb(db);
      res.json({ ok: true, message: 'Mot de passe administrateur modifié avec succès.' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Erreur modification mot de passe.' });
    }
  });

  // ========================
  // ADMIN DASHBOARD & ANALYTICS
  // ========================

  router.get('/admin/dashboard', requireAdmin, async (_req, res) => {
    try {
      const db = await getDb();
      const totalProducts = queryOne<{ c: number }>(db, 'SELECT COUNT(*) as c FROM products')?.c ?? 0;
      const outOfStockProducts = queryOne<{ c: number }>(db, 'SELECT COUNT(*) as c FROM products WHERE stock_total <= 0')?.c ?? 0;
      const totalOrders = queryOne<{ c: number }>(db, 'SELECT COUNT(*) as c FROM orders')?.c ?? 0;
      const pendingOrders = queryOne<{ c: number }>(db, "SELECT COUNT(*) as c FROM orders WHERE status = 'En attente'")?.c ?? 0;
      const totalCustomers = queryOne<{ c: number }>(db, 'SELECT COUNT(*) as c FROM customers')?.c ?? 0;
      const totalRevenueMad =
        queryOne<{ s: number }>(db, "SELECT COALESCE(SUM(total_mad), 0) as s FROM orders WHERE status != 'Annulée'")?.s ?? 0;

      const dailySales = queryAll<{ label: string; revenue: number; orders: number }>(
        db,
        `SELECT strftime('%d/%m', created_at) as label,
                date(created_at) as sort_key,
                COALESCE(SUM(CASE WHEN status != 'Annulée' THEN total_mad ELSE 0 END), 0) as revenue,
                COUNT(*) as orders
         FROM orders
         WHERE created_at >= datetime('now', '-30 days')
         GROUP BY date(created_at)
         ORDER BY sort_key ASC`
      );

      const monthlySales = queryAll<{ label: string; revenue: number; orders: number }>(
        db,
        `SELECT strftime('%Y-%m', created_at) as label,
                COALESCE(SUM(CASE WHEN status != 'Annulée' THEN total_mad ELSE 0 END), 0) as revenue,
                COUNT(*) as orders
         FROM orders
         GROUP BY strftime('%Y-%m', created_at)
         ORDER BY label ASC`
      );

      const yearlySales = queryAll<{ label: string; revenue: number; orders: number }>(
        db,
        `SELECT strftime('%Y', created_at) as label,
                COALESCE(SUM(CASE WHEN status != 'Annulée' THEN total_mad ELSE 0 END), 0) as revenue,
                COUNT(*) as orders
         FROM orders
         GROUP BY strftime('%Y', created_at)
         ORDER BY label ASC`
      );

      const recentOrders = queryAll(db, 'SELECT * FROM orders ORDER BY created_at DESC, id DESC LIMIT 6');

      res.json({
        kpis: {
          totalProducts,
          outOfStockProducts,
          totalOrders,
          pendingOrders,
          totalCustomers,
          totalRevenueMad,
        },
        charts: {
          daily: dailySales,
          monthly: monthlySales,
          yearly: yearlySales,
        },
        recentOrders,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Erreur chargement tableau de bord.' });
    }
  });

  // Admin Image Upload
  router.post('/admin/upload', requireAdmin, upload.array('images', 8), (req, res) => {
    const files = (req.files as Express.Multer.File[]) || [];
    const urls = files.map((f) => `/uploads/${f.filename}`);
    res.json({ urls });
  });

  // ========================
  // ADMIN PRODUCTS CRUD
  // ========================

  router.get('/admin/products', requireAdmin, async (req, res) => {
    try {
      const db = await getDb();
      const { search = '', category = 'all' } = req.query as Record<string, string>;
      const where: string[] = ['1=1'];
      const params: (string | number)[] = [];
      if (search.trim()) {
        const t = `%${search.trim().toLowerCase()}%`;
        where.push('(LOWER(p.name) LIKE ? OR LOWER(p.brand) LIKE ?)');
        params.push(t, t);
      }
      if (category !== 'all') {
        where.push('c.slug = ?');
        params.push(category);
      }
      const rows = queryAll(
        db,
        `SELECT p.*, c.name as category_name, c.slug as category_slug
         FROM products p
         LEFT JOIN categories c ON c.id = p.category_id
         WHERE ${where.join(' AND ')}
         ORDER BY p.id DESC`,
        params
      );
      const products = await hydrateProducts(rows);
      res.json({ products });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Erreur chargement des produits.' });
    }
  });

  router.post('/admin/products', requireAdmin, async (req, res) => {
    try {
      const db = await getDb();
      const {
        name,
        description = '',
        brand = 'CASA STYLE',
        category_id,
        gender = 'Femme',
        price_mad,
        promo_price_mad = null,
        is_new = 0,
        is_bestseller = 0,
        is_active = 1,
        images = [],
        variants = [],
      } = req.body as {
        name?: string;
        description?: string;
        brand?: string;
        category_id?: number;
        gender?: string;
        price_mad?: number;
        promo_price_mad?: number | null;
        is_new?: number | boolean;
        is_bestseller?: number | boolean;
        is_active?: number | boolean;
        images?: string[];
        variants?: Array<{ size: string; color_name: string; color_hex?: string; stock: number }>;
      };

      if (!name?.trim() || price_mad === undefined || Number(price_mad) <= 0) {
        return res.status(400).json({ error: 'Nom et prix valide en MAD requis.' });
      }

      let baseSlug = slugify(name);
      const dup = queryOne(db, 'SELECT id FROM products WHERE slug = ?', [baseSlug]);
      if (dup) baseSlug = `${baseSlug}-${Date.now().toString().slice(-4)}`;

      const cleanVariants = Array.isArray(variants) && variants.length > 0
        ? variants
        : [{ size: 'M', color_name: 'Noir Onyx', color_hex: '#111111', stock: 10 }];

      const stockTotal = cleanVariants.reduce((sum, v) => sum + Math.max(0, Number(v.stock || 0)), 0);
      const promoVal = promo_price_mad !== null && promo_price_mad !== undefined && Number(promo_price_mad) > 0
        ? Number(promo_price_mad)
        : null;

      const { lastInsertRowid: productId } = runSql(
        db,
        `INSERT INTO products (
          name, slug, description, brand, category_id, gender,
          price_mad, promo_price_mad, is_new, is_bestseller, is_active, stock_total
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          name.trim(),
          baseSlug,
          description.trim(),
          brand.trim() || 'CASA STYLE',
          category_id ? Number(category_id) : null,
          gender,
          Number(price_mad),
          promoVal,
          is_new ? 1 : 0,
          is_bestseller ? 1 : 0,
          is_active ? 1 : 0,
          stockTotal,
        ]
      );

      const validImages = (Array.isArray(images) ? images : []).map(sanitizeImageUrl).filter(Boolean);
      validImages.forEach((url, idx) => {
        runSql(
          db,
          'INSERT INTO product_images (product_id, image_url, is_primary, sort_order) VALUES (?, ?, ?, ?)',
          [productId, url, idx === 0 ? 1 : 0, idx]
        );
      });

      cleanVariants.forEach((v, idx) => {
        const sku = `CS-${productId}-${v.size}-${idx + 1}`;
        runSql(
          db,
          'INSERT INTO product_variants (product_id, size, color_name, color_hex, stock, sku) VALUES (?, ?, ?, ?, ?, ?)',
          [productId, v.size, v.color_name, v.color_hex || '#111111', Math.max(0, Number(v.stock || 0)), sku]
        );
      });

      persistDb(db);
      const created = queryOne(
        db,
        `SELECT p.*, c.name as category_name, c.slug as category_slug
         FROM products p LEFT JOIN categories c ON c.id = p.category_id WHERE p.id = ?`,
        [productId]
      );
      const [hydrated] = created ? await hydrateProducts([created]) : [null];
      res.status(201).json({ product: hydrated });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Erreur création produit.' });
    }
  });

  router.put('/admin/products/:id', requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const db = await getDb();
      const existing = queryOne(db, 'SELECT id FROM products WHERE id = ?', [id]);
      if (!existing) return res.status(404).json({ error: 'Produit introuvable.' });

      const {
        name,
        description = '',
        brand = 'CASA STYLE',
        category_id,
        gender = 'Femme',
        price_mad,
        promo_price_mad = null,
        is_new = 0,
        is_bestseller = 0,
        is_active = 1,
        images = [],
        variants = [],
      } = req.body as {
        name?: string;
        description?: string;
        brand?: string;
        category_id?: number;
        gender?: string;
        price_mad?: number;
        promo_price_mad?: number | null;
        is_new?: number | boolean;
        is_bestseller?: number | boolean;
        is_active?: number | boolean;
        images?: string[];
        variants?: Array<{ size: string; color_name: string; color_hex?: string; stock: number }>;
      };

      if (!name?.trim() || price_mad === undefined || Number(price_mad) <= 0) {
        return res.status(400).json({ error: 'Nom et prix valide en MAD requis.' });
      }

      const cleanVariants = Array.isArray(variants) && variants.length > 0
        ? variants
        : [{ size: 'M', color_name: 'Noir Onyx', color_hex: '#111111', stock: 0 }];

      const stockTotal = cleanVariants.reduce((sum, v) => sum + Math.max(0, Number(v.stock || 0)), 0);
      const promoVal = promo_price_mad !== null && promo_price_mad !== undefined && Number(promo_price_mad) > 0
        ? Number(promo_price_mad)
        : null;

      runSql(
        db,
        `UPDATE products
         SET name = ?, description = ?, brand = ?, category_id = ?, gender = ?,
             price_mad = ?, promo_price_mad = ?, is_new = ?, is_bestseller = ?, is_active = ?,
             stock_total = ?, updated_at = datetime('now')
         WHERE id = ?`,
        [
          name.trim(),
          description.trim(),
          brand.trim() || 'CASA STYLE',
          category_id ? Number(category_id) : null,
          gender,
          Number(price_mad),
          promoVal,
          is_new ? 1 : 0,
          is_bestseller ? 1 : 0,
          is_active ? 1 : 0,
          stockTotal,
          id,
        ]
      );

      runSql(db, 'DELETE FROM product_images WHERE product_id = ?', [id]);
      const validImages = (Array.isArray(images) ? images : []).map(sanitizeImageUrl).filter(Boolean);
      validImages.forEach((url, idx) => {
        runSql(
          db,
          'INSERT INTO product_images (product_id, image_url, is_primary, sort_order) VALUES (?, ?, ?, ?)',
          [id, url, idx === 0 ? 1 : 0, idx]
        );
      });

      runSql(db, 'DELETE FROM product_variants WHERE product_id = ?', [id]);
      cleanVariants.forEach((v, idx) => {
        const sku = `CS-${id}-${v.size}-${idx + 1}`;
        runSql(
          db,
          'INSERT INTO product_variants (product_id, size, color_name, color_hex, stock, sku) VALUES (?, ?, ?, ?, ?, ?)',
          [id, v.size, v.color_name, v.color_hex || '#111111', Math.max(0, Number(v.stock || 0)), sku]
        );
      });

      persistDb(db);
      const updated = queryOne(
        db,
        `SELECT p.*, c.name as category_name, c.slug as category_slug
         FROM products p LEFT JOIN categories c ON c.id = p.category_id WHERE p.id = ?`,
        [id]
      );
      const [hydrated] = updated ? await hydrateProducts([updated]) : [null];
      res.json({ product: hydrated });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Erreur mise à jour produit.' });
    }
  });

  router.patch('/admin/products/:id/toggle', requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const db = await getDb();
      runSql(db, 'UPDATE products SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END WHERE id = ?', [id]);
      persistDb(db);
      const row = queryOne<{ is_active: number }>(db, 'SELECT is_active FROM products WHERE id = ?', [id]);
      res.json({ id, is_active: row?.is_active ?? 0 });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Erreur changement statut produit.' });
    }
  });

  router.delete('/admin/products/:id', requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const db = await getDb();
      runSql(db, 'DELETE FROM products WHERE id = ?', [id]);
      persistDb(db);
      res.json({ ok: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Impossible de supprimer ce produit.' });
    }
  });

  // ========================
  // ADMIN ORDERS CRUD
  // ========================

  router.get('/admin/orders', requireAdmin, async (req, res) => {
    try {
      const db = await getDb();
      const { search = '', status = 'all' } = req.query as Record<string, string>;
      const where: string[] = ['1=1'];
      const params: (string | number)[] = [];
      if (search.trim()) {
        const t = `%${search.trim().toLowerCase()}%`;
        where.push('(LOWER(order_number) LIKE ? OR LOWER(customer_name) LIKE ? OR LOWER(customer_phone) LIKE ?)');
        params.push(t, t, t);
      }
      if (status !== 'all') {
        where.push('status = ?');
        params.push(status);
      }
      const orders = queryAll<{ id: number }>(
        db,
        `SELECT * FROM orders WHERE ${where.join(' AND ')} ORDER BY created_at DESC, id DESC`,
        params
      );
      const enriched = orders.map((o) => ({
        ...o,
        items: queryAll(db, 'SELECT * FROM order_items WHERE order_id = ?', [o.id]),
        payment: queryOne(db, 'SELECT * FROM payments WHERE order_id = ?', [o.id]),
      }));
      res.json({ orders: enriched });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Erreur chargement des commandes.' });
    }
  });

  router.patch('/admin/orders/:id/status', requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { status } = req.body as { status?: string };
      const allowed = ['En attente', 'Confirmée', 'En préparation', 'Expédiée', 'Livrée', 'Annulée'];
      if (!status || !allowed.includes(status)) {
        return res.status(400).json({ error: 'Statut de commande invalide.' });
      }
      const db = await getDb();
      const order = queryOne<{ id: number; status: string }>(db, 'SELECT id, status FROM orders WHERE id = ?', [id]);
      if (!order) return res.status(404).json({ error: 'Commande introuvable.' });

      // Restore stock if cancelling from a non-cancelled state
      if (status === 'Annulée' && order.status !== 'Annulée') {
        const items = queryAll<{ product_id: number | null; variant_id: number | null; quantity: number }>(
          db,
          'SELECT product_id, variant_id, quantity FROM order_items WHERE order_id = ?',
          [id]
        );
        for (const it of items) {
          if (it.variant_id) {
            runSql(db, 'UPDATE product_variants SET stock = stock + ? WHERE id = ?', [it.quantity, it.variant_id]);
          }
          if (it.product_id) {
            runSql(db, 'UPDATE products SET stock_total = stock_total + ? WHERE id = ?', [it.quantity, it.product_id]);
          }
        }
        runSql(db, "UPDATE payments SET status = 'Annulé' WHERE order_id = ?", [id]);
      } else if (status === 'Livrée') {
        runSql(db, "UPDATE payments SET status = 'Payé' WHERE order_id = ?", [id]);
      }

      runSql(db, "UPDATE orders SET status = ?, updated_at = datetime('now') WHERE id = ?", [status, id]);
      persistDb(db);
      res.json({ ok: true, id, status });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Erreur mise à jour statut.' });
    }
  });

  // ========================
  // ADMIN CUSTOMERS
  // ========================

  router.get('/admin/customers', requireAdmin, async (req, res) => {
    try {
      const db = await getDb();
      const { search = '' } = req.query as Record<string, string>;
      const where = search.trim()
        ? 'WHERE LOWER(c.full_name) LIKE ? OR LOWER(c.email) LIKE ? OR LOWER(c.phone) LIKE ? OR LOWER(c.city) LIKE ?'
        : '';
      const t = `%${search.trim().toLowerCase()}%`;
      const params = search.trim() ? [t, t, t, t] : [];
      const customers = queryAll(
        db,
        `SELECT c.id, c.full_name, c.email, c.phone, c.city, c.neighborhood, c.address, c.postal_code, c.created_at,
                COUNT(o.id) as order_count,
                COALESCE(SUM(CASE WHEN o.status != 'Annulée' THEN o.total_mad ELSE 0 END), 0) as total_spent_mad
         FROM customers c
         LEFT JOIN orders o ON o.customer_id = c.id OR LOWER(o.customer_email) = LOWER(c.email)
         ${where}
         GROUP BY c.id
         ORDER BY c.created_at DESC`,
        params
      );
      res.json({ customers });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Erreur chargement clients.' });
    }
  });

  router.get('/admin/customers/:id', requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const db = await getDb();
      const cust = queryOne<CustomerRow>(
        db,
        'SELECT id, full_name, email, phone, city, neighborhood, address, postal_code, created_at FROM customers WHERE id = ?',
        [id]
      );
      if (!cust) return res.status(404).json({ error: 'Client introuvable.' });
      const orders = queryAll(
        db,
        `SELECT * FROM orders WHERE customer_id = ? OR LOWER(customer_email) = LOWER(?) ORDER BY created_at DESC`,
        [cust.id, cust.email]
      );
      res.json({ customer: cust, orders });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Erreur chargement fiche client.' });
    }
  });

  // ========================
  // ADMIN PROMOTIONS & COUPONS
  // ========================

  router.get('/admin/promotions', requireAdmin, async (_req, res) => {
    const db = await getDb();
    const promotions = queryAll(db, 'SELECT * FROM promotions ORDER BY id DESC');
    const coupons = queryAll(db, 'SELECT * FROM coupons ORDER BY id DESC');
    res.json({ promotions, coupons });
  });

  router.post('/admin/promotions', requireAdmin, async (req, res) => {
    try {
      const { title, description = '', discount_percent, category_id = null, product_id = null, start_date, end_date, is_active = 1 } =
        req.body as Record<string, unknown>;
      if (!String(title || '').trim() || !start_date || !end_date) {
        return res.status(400).json({ error: 'Titre et dates requis.' });
      }
      const db = await getDb();
      const { lastInsertRowid } = runSql(
        db,
        `INSERT INTO promotions (title, description, discount_percent, category_id, product_id, start_date, end_date, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          String(title).trim(),
          String(description).trim(),
          Number(discount_percent || 0),
          category_id ? Number(category_id) : null,
          product_id ? Number(product_id) : null,
          String(start_date),
          String(end_date),
          is_active ? 1 : 0,
        ]
      );
      persistDb(db);
      res.status(201).json({ promotion: queryOne(db, 'SELECT * FROM promotions WHERE id = ?', [lastInsertRowid]) });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Erreur création promotion.' });
    }
  });

  router.put('/admin/promotions/:id', requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { title, description = '', discount_percent, start_date, end_date, is_active = 1 } =
        req.body as Record<string, unknown>;
      const db = await getDb();
      runSql(
        db,
        `UPDATE promotions SET title = ?, description = ?, discount_percent = ?, start_date = ?, end_date = ?, is_active = ? WHERE id = ?`,
        [String(title).trim(), String(description).trim(), Number(discount_percent || 0), String(start_date), String(end_date), is_active ? 1 : 0, id]
      );
      persistDb(db);
      res.json({ promotion: queryOne(db, 'SELECT * FROM promotions WHERE id = ?', [id]) });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Erreur mise à jour promotion.' });
    }
  });

  router.delete('/admin/promotions/:id', requireAdmin, async (req, res) => {
    const db = await getDb();
    runSql(db, 'DELETE FROM promotions WHERE id = ?', [Number(req.params.id)]);
    persistDb(db);
    res.json({ ok: true });
  });

  router.post('/admin/coupons', requireAdmin, async (req, res) => {
    try {
      const { code, discount_type = 'percent', discount_value, min_order_mad = 0, max_uses = 0, start_date, end_date, is_active = 1 } =
        req.body as Record<string, unknown>;
      if (!String(code || '').trim() || !start_date || !end_date) {
        return res.status(400).json({ error: 'Code et dates requis.' });
      }
      const db = await getDb();
      const { lastInsertRowid } = runSql(
        db,
        `INSERT INTO coupons (code, discount_type, discount_value, min_order_mad, max_uses, start_date, end_date, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          String(code).trim().toUpperCase(),
          discount_type === 'fixed' ? 'fixed' : 'percent',
          Number(discount_value || 0),
          Number(min_order_mad || 0),
          Number(max_uses || 0),
          String(start_date),
          String(end_date),
          is_active ? 1 : 0,
        ]
      );
      persistDb(db);
      res.status(201).json({ coupon: queryOne(db, 'SELECT * FROM coupons WHERE id = ?', [lastInsertRowid]) });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Code promo déjà existant ou invalide.' });
    }
  });

  router.put('/admin/coupons/:id', requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { is_active, discount_value, min_order_mad, max_uses, start_date, end_date } =
        req.body as Record<string, unknown>;
      const db = await getDb();
      runSql(
        db,
        `UPDATE coupons SET discount_value = ?, min_order_mad = ?, max_uses = ?, start_date = ?, end_date = ?, is_active = ? WHERE id = ?`,
        [Number(discount_value || 0), Number(min_order_mad || 0), Number(max_uses || 0), String(start_date), String(end_date), is_active ? 1 : 0, id]
      );
      persistDb(db);
      res.json({ coupon: queryOne(db, 'SELECT * FROM coupons WHERE id = ?', [id]) });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Erreur mise à jour code promo.' });
    }
  });

  router.delete('/admin/coupons/:id', requireAdmin, async (req, res) => {
    const db = await getDb();
    runSql(db, 'DELETE FROM coupons WHERE id = ?', [Number(req.params.id)]);
    persistDb(db);
    res.json({ ok: true });
  });

  // ========================
  // ADMIN SETTINGS & MESSAGES
  // ========================

  router.put('/admin/settings', requireAdmin, async (req, res) => {
    try {
      const s = req.body as Record<string, unknown>;
      const db = await getDb();
      runSql(
        db,
        `UPDATE store_settings SET
          store_name = ?, slogan = ?, logo_url = ?, hero_banner_url = ?, hero_title = ?, hero_subtitle = ?,
          phone = ?, email = ?, whatsapp_number = ?, casablanca_address = ?, opening_hours = ?,
          shipping_casablanca_mad = ?, shipping_other_cities_mad = ?, free_shipping_threshold_mad = ?,
          instagram_url = ?, facebook_url = ?, tiktok_url = ?, updated_at = datetime('now')
         WHERE id = 1`,
        [
          String(s.store_name || 'CASA STYLE').trim(),
          String(s.slogan || '').trim(),
          sanitizeImageUrl(s.logo_url),
          sanitizeImageUrl(s.hero_banner_url) || '/src/assets/images/hero_casastyle_editorial_1795271843982.jpg',
          String(s.hero_title || '').trim(),
          String(s.hero_subtitle || '').trim(),
          String(s.phone || '').trim(),
          String(s.email || '').trim(),
          String(s.whatsapp_number || '').replace(/[^0-9]/g, ''),
          String(s.casablanca_address || '').trim(),
          String(s.opening_hours || '').trim(),
          Number(s.shipping_casablanca_mad ?? 30),
          Number(s.shipping_other_cities_mad ?? 50),
          Number(s.free_shipping_threshold_mad ?? 1200),
          sanitizeImageUrl(s.instagram_url),
          sanitizeImageUrl(s.facebook_url),
          sanitizeImageUrl(s.tiktok_url),
        ]
      );
      persistDb(db);
      res.json({ settings: queryOne(db, 'SELECT * FROM store_settings WHERE id = 1') });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Erreur mise à jour paramètres.' });
    }
  });

  router.get('/admin/messages', requireAdmin, async (_req, res) => {
    const db = await getDb();
    const messages = queryAll(db, 'SELECT * FROM contact_messages ORDER BY created_at DESC');
    res.json({ messages });
  });

  return router;
}
