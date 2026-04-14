
const fs = require('fs');
const path = require('path');
const os = require('os');
const express = require('express');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const Database = require('better-sqlite3');
require('dotenv').config();

const app = express();
const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, 'public');
const UPLOADS_DIR = path.join(ROOT, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const db = new Database(path.join(ROOT, 'database.sqlite'));
db.pragma('journal_mode = WAL');

app.use(express.json({ limit: '12mb' }));
app.use(express.urlencoded({ extended: true, limit: '12mb' }));
app.use(cookieParser());
app.use('/uploads', express.static(UPLOADS_DIR));
app.use(express.static(PUBLIC_DIR));

const upload = multer({
  storage: multer.diskStorage({
    destination: (_, __, cb) => cb(null, UPLOADS_DIR),
    filename: (_, file, cb) => cb(null, `${Date.now()}_${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`)
  })
});

const DEFAULT_HOURS = {
  mon: { active: true, ranges: [['08:30', '16:00'], ['17:30', '20:30']] },
  tue: { active: true, ranges: [['08:30', '16:00'], ['17:30', '20:30']] },
  wed: { active: true, ranges: [['08:30', '16:00'], ['17:30', '20:30']] },
  thu: { active: true, ranges: [['08:30', '16:00'], ['17:30', '20:30']] },
  fri: { active: true, ranges: [['08:30', '16:00'], ['17:30', '20:30']] },
  sat: { active: true, ranges: [['08:30', '16:00'], ['17:30', '19:30']] },
  sun: { active: false, ranges: [] }
};

function createSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      price REAL NOT NULL,
      duration_min INTEGER NOT NULL DEFAULT 30,
      category TEXT NOT NULL DEFAULT 'Cortes',
      image_url TEXT DEFAULT '',
      active INTEGER NOT NULL DEFAULT 1,
      featured INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      price REAL NOT NULL,
      stock INTEGER NOT NULL DEFAULT 0,
      category TEXT NOT NULL DEFAULT 'Styling',
      image_url TEXT DEFAULT '',
      active INTEGER NOT NULL DEFAULT 1,
      featured INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS coupons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      discount_type TEXT NOT NULL,
      discount_value REAL NOT NULL,
      min_total REAL NOT NULL DEFAULT 0,
      expires_at TEXT,
      active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS blocked_periods (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      reason TEXT NOT NULL,
      show_notice INTEGER NOT NULL DEFAULT 1,
      active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      folio TEXT UNIQUE NOT NULL,
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      customer_email TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      date_ymd TEXT NOT NULL,
      start_time TEXT NOT NULL,
      service_id INTEGER NOT NULL,
      service_name TEXT NOT NULL,
      service_duration_min INTEGER NOT NULL,
      qty_slots INTEGER NOT NULL DEFAULT 1,
      slots_consumed INTEGER NOT NULL,
      products_json TEXT NOT NULL DEFAULT '[]',
      coupon_code TEXT DEFAULT '',
      subtotal REAL NOT NULL,
      discount_amount REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'confirmed',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      folio TEXT UNIQUE NOT NULL,
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      customer_email TEXT DEFAULT '',
      items_json TEXT NOT NULL,
      total REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'new',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      author_name TEXT NOT NULL,
      message TEXT NOT NULL,
      approved INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS suggestions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT DEFAULT '',
      message TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS loyalty_clients (
      phone TEXT PRIMARY KEY,
      name TEXT DEFAULT '',
      email TEXT DEFAULT '',
      visits_count INTEGER NOT NULL DEFAULT 0,
      free_cuts_earned INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
}
createSchema();

function ensureColumn(table, column, definition) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name);
  if (!cols.includes(column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

ensureColumn('reviews', 'rating', 'INTEGER NOT NULL DEFAULT 5');
ensureColumn('coupons', 'remaining_uses', 'INTEGER NOT NULL DEFAULT 1');
ensureColumn('blocked_periods', 'specific_days_json', "TEXT NOT NULL DEFAULT '[]'");


function setSetting(key, value) {
  db.prepare(`INSERT INTO settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value=excluded.value`).run(key, value);
}
function getSetting(key, fallback = null) {
  const row = db.prepare(`SELECT value FROM settings WHERE key=?`).get(key);
  return row ? row.value : fallback;
}
function parseJsonSafe(v, fallback) {
  try { return JSON.parse(v); } catch { return fallback; }
}
function seed() {
  const defaults = {
    business_name: 'Julio Aguilar',
    business_subtitle: 'BARBERSHOP PREMIUM',
    slogan: 'Más que un corte, una experiencia.',
    contact_phone: '+52 (963) 109-2302',
    contact_email: 'contacto@julioaguilar.com',
    contact_address: 'Av. 8 PTE/NTE #7, Barrio de Candelaria, Comitán',
    whatsapp_url: 'https://wa.me/529631092302',
    instagram_url: '#',
    facebook_url: '#',
    tiktok_url: '#',
    google_maps_embed: 'https://www.google.com/maps?q=Barberia%20Y%20Peluqueria%20Julio%20Aguilar&z=17&output=embed',
    hours_json: JSON.stringify(DEFAULT_HOURS),
    slot_step_min: '30',
    default_slot_capacity: '1',
    policies_text: 'La cancelación debe realizarse con al menos 2 horas de anticipación.',
    hero_notice: '',
    hours_exceptions_json: JSON.stringify({ mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] })
  };
  Object.entries(defaults).forEach(([k,v])=> { if (getSetting(k) === null) setSetting(k,v); });

  if (!db.prepare('SELECT COUNT(*) c FROM services').get().c) {
    const stmt = db.prepare(`INSERT INTO services
      (name,description,price,duration_min,category,active,featured,image_url)
      VALUES (?,?,?,?,?,?,?,?)`);
    [
      ['Corte Clásico','Corte tradicional con acabado limpio y profesional.',250,30,'Cortes',1,0,''],
      ['Corte Moderno','Estilos contemporáneos, texturas y técnicas actuales.',280,40,'Cortes',1,0,''],
      ['Fade / Degradado','Degradado preciso con transición suave.',300,45,'Cortes',1,0,''],
      ['Corte con Diseño','Personalización con líneas o figuras.',350,50,'Cortes',1,0,''],
      ['Perfilado de Barba','Definición precisa y simetría impecable.',150,20,'Barba',1,0,''],
      ['Arreglo de Barba','Recorte, perfilado y acondicionamiento completo.',200,30,'Barba',1,0,''],
      ['Afeitado Clásico','Navaja, toallas calientes y tratamiento facial.',250,40,'Barba',1,0,''],
      ['Corte + Barba','Paquete premium más solicitado.',400,60,'Paquetes Premium',1,1,''],
      ['Experiencia Premium','Corte, barba, tratamiento capilar y masaje.',550,90,'Paquetes Premium',1,1,''],
      ['Servicio VIP','Servicio completo con atención preferente.',700,120,'Paquetes Premium',1,1,'']
    ].forEach(r=>stmt.run(...r));
  }

  if (!db.prepare('SELECT COUNT(*) c FROM products').get().c) {
    const stmt = db.prepare(`INSERT INTO products
      (name,description,price,stock,category,active,featured,image_url)
      VALUES (?,?,?,?,?,?,?,?)`);
    [
      ['Pomada Mate Premium','Fijación fuerte con acabado mate natural.',350,8,'Styling',1,1,''],
      ['Cera Modeladora','Flexibilidad y brillo controlado.',280,10,'Styling',1,1,''],
      ['Aceite para Barba','Nutre y suaviza la barba.',320,7,'Barba',1,1,''],
      ['Bálsamo para Barba','Hidratación profunda y control del frizz.',290,7,'Barba',1,0,''],
      ['Shampoo Anticaída','Fortalece el cabello desde la raíz.',420,5,'Cabello',1,0,''],
      ['Gel Fijador Extra Fuerte','Máxima fijación todo el día.',180,0,'Cabello',1,0,'']
    ].forEach(r=>stmt.run(...r));
  }

  if (!db.prepare('SELECT COUNT(*) c FROM coupons').get().c) {
    db.prepare(`INSERT INTO coupons (code,discount_type,discount_value,min_total,active)
      VALUES ('BIENVENIDO10','percent',10,300,1)`).run();
  }
}
seed();

function isAdmin(req) {
  return req.cookies && req.cookies.admin === '1';
}
function adminOnly(req,res,next){
  if(!isAdmin(req)) return res.status(401).json({ ok:false, error:'No autorizado' });
  next();
}
function makeFolio(prefix) {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;
}
function parseClockToMin(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return null;
  const normalized = raw
    .replace(/\./g, '')
    .replace(/\s+/g, ' ')
    .replace('a m', 'am')
    .replace('p m', 'pm');
  const match12 = normalized.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/);
  if (match12) {
    let h = Number(match12[1]) % 12;
    const m = Number(match12[2]);
    if (match12[3] === 'pm') h += 12;
    return h * 60 + m;
  }
  const match24 = normalized.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    return Number(match24[1]) * 60 + Number(match24[2]);
  }
  return null;
}
function hmToMin(hm) {
  return parseClockToMin(hm) ?? 0;
}
function minToHm(min) {
  const h = String(Math.floor(min/60)).padStart(2,'0');
  const m = String(min%60).padStart(2,'0');
  return `${h}:${m}`;
}
function normalizeDayRanges(ranges) {
  const clean = [];
  let previousEnd = null;
  for (const pair of Array.isArray(ranges) ? ranges : []) {
    if (!Array.isArray(pair) || pair.length !== 2) continue;
    let start = parseClockToMin(pair[0]);
    let end = parseClockToMin(pair[1]);
    if (start === null || end === null) continue;
    if (previousEnd !== null && start <= previousEnd && start < 12 * 60) start += 12 * 60;
    if (end <= start && end < 12 * 60) end += 12 * 60;
    if (end <= start) continue;
    clean.push([minToHm(start), minToHm(end)]);
    previousEnd = end;
  }
  return clean;
}
function weekdayKey(dateYmd) {
  const d = new Date(`${dateYmd}T12:00:00`);
  return ['sun','mon','tue','wed','thu','fri','sat'][d.getDay()];
}
function computeSlotsForDay(dateYmd) {
  const blocked = db.prepare(`SELECT * FROM blocked_periods WHERE active=1 AND ? BETWEEN start_date AND end_date`).get(dateYmd);
  if (blocked) return { slots: [], blocked };
  const hours = parseJsonSafe(getSetting('hours_json', JSON.stringify(DEFAULT_HOURS)), DEFAULT_HOURS);
  const exceptionsAll = parseJsonSafe(getSetting('hours_exceptions_json', JSON.stringify({ mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] })), { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] });
  const dayKey = weekdayKey(dateYmd);
  const exceptions = new Set(exceptionsAll[dayKey] || []);
  const step = Number(getSetting('slot_step_min', '30'));
  const day = hours[dayKey] || { active: false, ranges: [] };
  if (!day.active) return { slots: [], blocked: null };
  const slots = [];
  for (const [start, end] of day.ranges) {
    for (let t = hmToMin(start); t + step <= hmToMin(end); t += step) {
      const hm = minToHm(t);
      if (!exceptions.has(hm)) slots.push(hm);
    }
  }
  return { slots, blocked: null };
}
function buildOccupiedMap(dateYmd) {
  const rows = db.prepare(`SELECT * FROM bookings WHERE date_ymd=? AND status='confirmed'`).all(dateYmd);
  const step = Number(getSetting('slot_step_min', '30'));
  const cap = 1;
  const used = {};
  for (const row of rows) {
    const base = hmToMin(row.start_time);
    for (let i=0; i<Number(row.slots_consumed); i++) {
      const key = minToHm(base + i*step);
      if (!used[key]) used[key] = 0;
      used[key] += 1;
    }
  }
  const map = {};
  for (const [k, count] of Object.entries(used)) {
    map[k] = { used: count, remaining: Math.max(0, cap - count) };
  }
  return map;
}

function getAvailability(dateYmd, serviceId, qtySlots=1) {
  const { slots, blocked } = computeSlotsForDay(dateYmd);
  if (blocked) return { blocked, items: [] };
  const cap = 1;
  const occ = buildOccupiedMap(dateYmd);
  let durationSteps = 1;
  if (serviceId) {
    const service = db.prepare('SELECT * FROM services WHERE id=? AND active=1').get(serviceId);
    if (!service) return { blocked:null, items:[] };
    const step = Number(getSetting('slot_step_min', '30'));
    durationSteps = Math.max(1, Math.ceil(Number(service.duration_min)/step));
  }
  const requiredSteps = Math.max(durationSteps, Number(qtySlots || 1));
  const items = slots.map((slot, idx) => {
    let disabled = false;
    for (let i=0;i<requiredSteps;i++) {
      const hm = slots[idx+i];
      if (!hm) { disabled = true; break; }
      const info = occ[hm] || { remaining: cap };
      if (info.remaining < 1) { disabled = true; break; }
    }
    return { time: slot, remaining: disabled ? 0 : cap, capacity: cap, disabled };
  });
  return { blocked:null, items };
}



function getPreferredBaseUrl(req = null) {
  if (req) {
    const proto = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const host = req.headers['x-forwarded-host'] || req.get('host');
    if (host && !/localhost|127\.0\.0\.1/i.test(host)) return `${proto}://${host}`.replace(/\/$/, '');
  }
  const envBase = process.env.PUBLIC_BASE_URL || process.env.PUBLIC_URL || '';
  if (envBase && !/localhost|127\.0\.0\.1/i.test(envBase)) return envBase.replace(/\/$/, '');
  const nets = os.networkInterfaces ? os.networkInterfaces() : {};
  for (const list of Object.values(nets)) {
    for (const item of (list || [])) {
      if (item && item.family === 'IPv4' && !item.internal) {
        return `http://${item.address}:${PORT}`;
      }
    }
  }
  return `http://localhost:${PORT}`;
}

async function telegramSend(text, buttons=null) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatIds = (process.env.TELEGRAM_CHAT_IDS || process.env.TELEGRAM_CHAT_ID || '').split(',').map(s=>s.trim()).filter(Boolean);
  if (!token || !chatIds.length) return;
  for (const chat_id of chatIds) {
    try {
      let payload = { chat_id, text, parse_mode:'HTML' };
      if (buttons) payload.reply_markup = { inline_keyboard: buttons };
      let res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)
      });
      if (!res.ok && buttons) {
        payload = { chat_id, text, parse_mode:'HTML' };
        res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)
        });
      }
    } catch {}
  }
}
async function notifyBooking(booking, req = null) {
  const base = getPreferredBaseUrl(req);
  const url = `${base}/api/public/cancel-from-telegram?folio=${encodeURIComponent(booking.folio)}`;
  const htmlText = [
    '<b>Nueva cita</b>',
    `Folio: <code>${booking.folio}</code>`,
    `Cliente: ${booking.customer_name}`,
    `Teléfono: ${booking.customer_phone}`,
    `Servicio: ${booking.service_name}`,
    `Fecha: ${booking.date_ymd}`,
    `Hora: ${booking.start_time}`,
    `Espacios: ${booking.qty_slots}`,
    `Total: $${Number(booking.total).toFixed(2)} MXN`,
    `Cancelar: ${url}`
  ].join('\n');
  await telegramSend(htmlText);
  if (/^https?:\/\//i.test(url) && !/localhost|127\.0\.0\.1/i.test(url)) {
    await telegramSend(htmlText, [[{ text: '❌ Cancelar cita', url }]]);
  }
}
async function notifyOrder(order) {
  const text = [
    '<b>Nueva compra de productos</b>',
    `Folio: <code>${order.folio}</code>`,
    `Cliente: ${order.customer_name}`,
    `Teléfono: ${order.customer_phone}`,
    `Total: $${Number(order.total).toFixed(2)} MXN`
  ].join('\n');
  await telegramSend(text);
}

function publicSettings() {
  return {
    business_name: getSetting('business_name','Julio Aguilar'),
    business_subtitle: getSetting('business_subtitle','BARBERSHOP PREMIUM'),
    slogan: getSetting('slogan','Más que un corte, una experiencia.'),
    contact_phone: getSetting('contact_phone',''),
    contact_email: getSetting('contact_email',''),
    contact_address: getSetting('contact_address',''),
    whatsapp_url: getSetting('whatsapp_url','#'),
    instagram_url: getSetting('instagram_url','#'),
    facebook_url: getSetting('facebook_url','#'),
    tiktok_url: getSetting('tiktok_url','#'),
    google_maps_embed: getSetting('google_maps_embed',''),
    policies_text: getSetting('policies_text', getSetting('policies_html','')),
    hero_image_url: getSetting('hero_image_url',''),
    google_maps_url: getSetting('google_maps_url',''),
    slot_step_min: Number(getSetting('slot_step_min','30')),
    default_slot_capacity: 1,
    hero_notice: getSetting('hero_notice','')
  };
}

app.get('/api/public/bootstrap', (req,res) => {
  const notice = db.prepare(`SELECT * FROM blocked_periods WHERE active=1 AND show_notice=1 AND date('now') <= end_date ORDER BY start_date LIMIT 1`).get();
  res.json({
    ok:true,
    settings: publicSettings(),
    services: db.prepare('SELECT * FROM services WHERE active=1 ORDER BY category,id').all(),
    products: db.prepare('SELECT * FROM products WHERE active=1 ORDER BY category,id').all(),
    reviews: db.prepare('SELECT * FROM reviews WHERE approved=1 ORDER BY created_at DESC LIMIT 6').all(),
    blocked_periods: db.prepare('SELECT * FROM blocked_periods WHERE active=1 ORDER BY start_date').all(),
    notice
  });
});

app.get('/api/public/services', (req,res) => {
  res.json({ ok:true, items: db.prepare('SELECT * FROM services WHERE active=1 ORDER BY category,id').all() });
});
app.get('/api/public/products', (req,res) => {
  res.json({ ok:true, items: db.prepare('SELECT * FROM products WHERE active=1 ORDER BY category,id').all() });
});
app.get('/api/public/availability', (req,res) => {
  const { date, service_id, qtySlots } = req.query;
  if (!date) return res.status(400).json({ ok:false, error:'Fecha requerida' });
  res.json({ ok:true, ...getAvailability(date, Number(service_id || 0), Number(qtySlots || 1)) });
});

app.post('/api/public/apply-coupon', (req,res) => {
  const { code, subtotal } = req.body;
  const row = db.prepare(`SELECT * FROM coupons WHERE code=? AND active=1`).get(String(code || '').trim().toUpperCase());
  if (!row) return res.status(404).json({ ok:false, error:'Cupón inválido' });
  if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) {
    return res.status(400).json({ ok:false, error:'Cupón expirado' });
  }
  if (Number(row.remaining_uses || 0) <= 0) {
    return res.status(400).json({ ok:false, error:'Cupón agotado' });
  }
  const sub = Number(subtotal || 0);
  if (sub < Number(row.min_total || 0)) {
    return res.status(400).json({ ok:false, error:`Compra mínima de $${row.min_total} MXN` });
  }
  const discount = row.discount_type === 'percent'
    ? +(sub * (Number(row.discount_value)/100)).toFixed(2)
    : Math.min(sub, Number(row.discount_value));
  res.json({ ok:true, coupon: row, discount });
});

app.post('/api/public/review', (req,res) => {
  const { name, message, rating } = req.body;
  const stars = Math.max(1, Math.min(5, Number(rating || 5)));
  if (!name || !message || String(message).trim().length < 10) {
    return res.status(400).json({ ok:false, error:'Datos inválidos' });
  }
  db.prepare('INSERT INTO reviews (author_name,message,approved,rating) VALUES (?,?,1,?)').run(name.trim(), message.trim(), stars);
  res.json({ ok:true });
});

app.post('/api/public/suggestion', (req,res) => {
  const { name, email, message } = req.body;
  if (!name || !message) return res.status(400).json({ ok:false, error:'Datos inválidos' });
  db.prepare('INSERT INTO suggestions (name,email,message) VALUES (?,?,?)').run(name.trim(), (email||'').trim(), message.trim());
  res.json({ ok:true });
});

app.post('/api/public/order-products', async (req,res) => {
  const { customer, items } = req.body;
  if (!customer?.name || !customer?.phone || !Array.isArray(items) || !items.length) {
    return res.status(400).json({ ok:false, error:'Datos incompletos' });
  }
  const products = db.prepare('SELECT * FROM products WHERE active=1').all();
  const byId = new Map(products.map(p=>[p.id,p]));
  let total = 0;
  const normalized = [];
  for (const item of items) {
    const p = byId.get(Number(item.product_id));
    const qty = Number(item.qty || 0);
    if (!p || qty <= 0) continue;
    if (p.stock < qty) return res.status(400).json({ ok:false, error:`Stock insuficiente para ${p.name}` });
    total += p.price * qty;
    normalized.push({ product_id: p.id, name: p.name, price: p.price, qty });
  }
  if (!normalized.length) return res.status(400).json({ ok:false, error:'No hay productos válidos' });

  const trx = db.transaction(() => {
    for (const item of normalized) {
      db.prepare('UPDATE products SET stock = stock - ? WHERE id=?').run(item.qty, item.product_id);
    }
    const folio = makeFolio('ORD');
    db.prepare(`INSERT INTO orders
      (folio,customer_name,customer_phone,customer_email,items_json,total,status)
      VALUES (?,?,?,?,?,?,?)`)
      .run(folio, customer.name.trim(), customer.phone.trim(), (customer.email||'').trim(), JSON.stringify(normalized), total, 'new');
    return db.prepare('SELECT * FROM orders WHERE folio=?').get(folio);
  });
  const order = trx();
  await notifyOrder(order);
  res.json({ ok:true, order });
});

app.post('/api/public/book', async (req,res) => {
  const { service_id, date_ymd, time_hm, customer, qtySlots, coupon_code, notes, products } = req.body;
  const service = db.prepare('SELECT * FROM services WHERE id=? AND active=1').get(Number(service_id));
  if (!service) return res.status(404).json({ ok:false, error:'Servicio no encontrado' });
  if (!date_ymd || !time_hm || !customer?.name || !customer?.phone) {
    return res.status(400).json({ ok:false, error:'Datos incompletos' });
  }
  const qty = Math.max(1, Math.min(5, Number(qtySlots || 1)));
  const step = Number(getSetting('slot_step_min', '30'));
  const durationBlocks = Math.max(1, Math.ceil(Number(service.duration_min)/step));
  const consumed = Math.max(durationBlocks, qty);
  const availability = getAvailability(date_ymd, service.id, qty);
  const slotData = availability.items.find(x => x.time === time_hm);
  if (!slotData || slotData.disabled) return res.status(400).json({ ok:false, error:'Horario ya no disponible' });

  const productRows = db.prepare('SELECT * FROM products WHERE active=1').all();
  const prodMap = new Map(productRows.map(p=>[p.id,p]));
  const selectedProducts = [];
  let subtotal = Number(service.price);
  if (Array.isArray(products)) {
    for (const item of products) {
      const row = prodMap.get(Number(item.product_id));
      const qtyp = Number(item.qty || 0);
      if (!row || qtyp <= 0) continue;
      if (row.stock < qtyp) return res.status(400).json({ ok:false, error:`Stock insuficiente en ${row.name}` });
      selectedProducts.push({ product_id: row.id, name: row.name, price: row.price, qty: qtyp });
      subtotal += row.price * qtyp;
    }
  }

  let discountAmount = 0;
  let couponCode = '';
  if (coupon_code) {
    const c = db.prepare('SELECT * FROM coupons WHERE code=? AND active=1').get(String(coupon_code).trim().toUpperCase());
    if (c) {
      if ((!c.expires_at || new Date(c.expires_at).getTime() >= Date.now()) && subtotal >= Number(c.min_total || 0)) {
        discountAmount = c.discount_type === 'percent'
          ? +(subtotal * (Number(c.discount_value)/100)).toFixed(2)
          : Math.min(subtotal, Number(c.discount_value));
        couponCode = c.code;
      }
    }
  }
  const total = +(subtotal - discountAmount).toFixed(2);

  const trx = db.transaction(() => {
    const current = getAvailability(date_ymd, service.id, qty);
    const live = current.items.find(x => x.time === time_hm);
    if (!live || live.disabled) throw new Error('Horario ya no disponible');
    for (const item of selectedProducts) {
      db.prepare('UPDATE products SET stock = stock - ? WHERE id=?').run(item.qty, item.product_id);
    }
    if (couponCode) {
      const couponRow = db.prepare('SELECT * FROM coupons WHERE code=? AND active=1').get(couponCode);
      if (couponRow && Number(couponRow.remaining_uses || 0) > 0) {
        db.prepare('UPDATE coupons SET remaining_uses = remaining_uses - 1 WHERE id=?').run(couponRow.id);
      }
    }
    const phone = String(customer.phone).trim();
    const existingLoyal = db.prepare('SELECT * FROM loyalty_clients WHERE phone=?').get(phone);
    if (existingLoyal) {
      const newVisits = Number(existingLoyal.visits_count || 0) + 1;
      const freeCuts = Math.floor(newVisits / 5);
      db.prepare('UPDATE loyalty_clients SET name=?, email=?, visits_count=?, free_cuts_earned=?, updated_at=CURRENT_TIMESTAMP WHERE phone=?').run(customer.name.trim(), (customer.email || '').trim(), newVisits, freeCuts, phone);
    } else {
      db.prepare('INSERT INTO loyalty_clients (phone,name,email,visits_count,free_cuts_earned) VALUES (?,?,?,?,?)').run(phone, customer.name.trim(), (customer.email || '').trim(), 1, 0);
    }
    const folio = makeFolio('CIT');
    db.prepare(`INSERT INTO bookings
      (folio,customer_name,customer_phone,customer_email,notes,date_ymd,start_time,service_id,service_name,service_duration_min,qty_slots,slots_consumed,products_json,coupon_code,subtotal,discount_amount,total,status)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .run(
        folio,
        customer.name.trim(),
        customer.phone.trim(),
        (customer.email || '').trim(),
        (notes || '').trim(),
        date_ymd,
        time_hm,
        service.id,
        service.name,
        service.duration_min,
        qty,
        consumed,
        JSON.stringify(selectedProducts),
        couponCode,
        subtotal,
        discountAmount,
        total,
        'confirmed'
      );
    return db.prepare('SELECT * FROM bookings WHERE folio=?').get(folio);
  });

  try {
    const booking = trx();
    await notifyBooking(booking, req);
    res.json({ ok:true, booking });
  } catch (err) {
    res.status(400).json({ ok:false, error: err.message || 'No fue posible reservar' });
  }
});

app.get('/api/public/cancel-from-telegram', (req,res) => {
  const { folio } = req.query;
  if (!folio) return res.status(400).send('Folio requerido');
  const row = db.prepare(`SELECT * FROM bookings WHERE folio=?`).get(folio);
  if (!row) return res.status(404).send('Cita no encontrada');
  if (row.status === 'cancelled') return res.send('<h1>La cita ya estaba cancelada.</h1>');
  db.prepare(`UPDATE bookings SET status='cancelled' WHERE folio=?`).run(folio);
  res.send('<h1>Cita cancelada correctamente. El horario quedó liberado.</h1>');
});

app.post('/api/admin/login', (req,res) => {
  const { email, password } = req.body;
  const allowedEmails = (process.env.ADMIN_EMAILS || '').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);
  const emailOk = email && allowedEmails.length ? allowedEmails.includes(String(email).trim().toLowerCase()) : true;
  const passOk = password === process.env.ADMIN_PASS;
  if (!(emailOk && passOk)) return res.status(401).json({ ok:false, error:'Credenciales inválidas' });
  res.cookie('admin','1',{ httpOnly:true, sameSite:'lax' });
  res.json({ ok:true });
});
app.post('/api/admin/logout', adminOnly, (req,res) => {
  res.clearCookie('admin');
  res.json({ ok:true });
});
app.get('/api/admin/overview', adminOnly, (req,res) => {
  res.json({
    ok:true,
    stats: {
      bookings_today: db.prepare(`SELECT COUNT(*) c FROM bookings WHERE status='confirmed'`).get().c,
      low_stock: db.prepare(`SELECT COUNT(*) c FROM products WHERE stock <= 2 AND active=1`).get().c,
      active_coupons: db.prepare(`SELECT COUNT(*) c FROM coupons WHERE active=1`).get().c,
      services: db.prepare(`SELECT COUNT(*) c FROM services WHERE active=1`).get().c,
      reviews: db.prepare(`SELECT COUNT(*) c FROM reviews`).get().c
    },
    settings: publicSettings(),
    hours_json: parseJsonSafe(getSetting('hours_json', JSON.stringify(DEFAULT_HOURS)), DEFAULT_HOURS),
    hours_exceptions_json: parseJsonSafe(getSetting('hours_exceptions_json', JSON.stringify({ mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] })), { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] }),
    blocked_periods: db.prepare(`SELECT * FROM blocked_periods ORDER BY start_date DESC`).all()
  });
});
app.get('/api/admin/services', adminOnly, (req,res) => {
  res.json({ ok:true, items: db.prepare('SELECT * FROM services ORDER BY category,id').all() });
});
app.post('/api/admin/services', adminOnly, upload.single('image'), (req,res) => {
  const body = req.body;
  const image_url = req.file ? `/uploads/${req.file.filename}` : (body.image_url || '');
  if (body.id) {
    db.prepare(`UPDATE services SET name=?,description=?,price=?,duration_min=?,category=?,active=?,featured=?,image_url=? WHERE id=?`).run(
      body.name, body.description, Number(body.price), Number(body.duration_min), body.category || 'Cortes',
      Number(body.active || 0), Number(body.featured || 0), image_url, Number(body.id)
    );
  } else {
    db.prepare(`INSERT INTO services (name,description,price,duration_min,category,active,featured,image_url) VALUES (?,?,?,?,?,?,?,?)`).run(
      body.name, body.description, Number(body.price), Number(body.duration_min), body.category || 'Cortes',
      Number(body.active || 0), Number(body.featured || 0), image_url
    );
  }
  res.json({ ok:true });
});
app.delete('/api/admin/services/:id', adminOnly, (req,res) => {
  db.prepare(`DELETE FROM services WHERE id=?`).run(Number(req.params.id));
  res.json({ ok:true });
});
app.get('/api/admin/products', adminOnly, (req,res) => {
  res.json({ ok:true, items: db.prepare('SELECT * FROM products ORDER BY category,id').all() });
});
app.post('/api/admin/products', adminOnly, upload.single('image'), (req,res) => {
  const body = req.body;
  const image_url = req.file ? `/uploads/${req.file.filename}` : (body.image_url || '');
  if (body.id) {
    db.prepare(`UPDATE products SET name=?,description=?,price=?,stock=?,category=?,active=?,featured=?,image_url=? WHERE id=?`).run(
      body.name, body.description, Number(body.price), Number(body.stock), body.category || 'Styling',
      Number(body.active || 0), Number(body.featured || 0), image_url, Number(body.id)
    );
  } else {
    db.prepare(`INSERT INTO products (name,description,price,stock,category,active,featured,image_url) VALUES (?,?,?,?,?,?,?,?)`).run(
      body.name, body.description, Number(body.price), Number(body.stock), body.category || 'Styling',
      Number(body.active || 0), Number(body.featured || 0), image_url
    );
  }
  res.json({ ok:true });
});
app.delete('/api/admin/products/:id', adminOnly, (req,res) => {
  db.prepare(`DELETE FROM products WHERE id=?`).run(Number(req.params.id));
  res.json({ ok:true });
});
app.get('/api/admin/bookings', adminOnly, (req,res) => {
  const { active_only, date } = req.query;
  let sql = `SELECT * FROM bookings WHERE 1=1`;
  const args = [];
  if (active_only === '1') sql += ` AND status='confirmed'`;
  if (date) { sql += ` AND date_ymd=?`; args.push(date); }
  sql += ` ORDER BY date_ymd ASC, start_time ASC`;
  res.json({ ok:true, items: db.prepare(sql).all(...args) });
});
app.post('/api/admin/bookings/:id/cancel', adminOnly, (req,res) => {
  db.prepare(`UPDATE bookings SET status='cancelled' WHERE id=?`).run(Number(req.params.id));
  res.json({ ok:true });
});
app.delete('/api/admin/bookings/:id', adminOnly, (req,res) => {
  db.prepare(`DELETE FROM bookings WHERE id=?`).run(Number(req.params.id));
  res.json({ ok:true });
});

app.get('/api/admin/coupons', adminOnly, (req,res) => {
  res.json({ ok:true, items: db.prepare('SELECT * FROM coupons ORDER BY id DESC').all() });
});
app.post('/api/admin/coupons', adminOnly, (req,res) => {
  const b = req.body;
  if (b.id) {
    db.prepare(`UPDATE coupons SET code=?,discount_type=?,discount_value=?,min_total=?,expires_at=?,active=?,remaining_uses=? WHERE id=?`).run(
      String(b.code).trim().toUpperCase(), b.discount_type, Number(b.discount_value), Number(b.min_total || 0), b.expires_at || null, Number(b.active || 0), Number(b.remaining_uses || 0), Number(b.id)
    );
  } else {
    db.prepare(`INSERT INTO coupons (code,discount_type,discount_value,min_total,expires_at,active,remaining_uses) VALUES (?,?,?,?,?,?,?)`).run(
      String(b.code).trim().toUpperCase(), b.discount_type, Number(b.discount_value), Number(b.min_total || 0), b.expires_at || null, Number(b.active || 0), Number(b.remaining_uses || 0)
    );
  }
  res.json({ ok:true });
});
app.delete('/api/admin/coupons/:id', adminOnly, (req,res) => {
  db.prepare(`DELETE FROM coupons WHERE id=?`).run(Number(req.params.id));
  res.json({ ok:true });
});

app.post('/api/admin/settings', adminOnly, (req,res) => {
  const { settings } = req.body;
  for (const [k,v] of Object.entries(settings || {})) setSetting(k, String(v ?? ''));
  res.json({ ok:true });
});
app.post('/api/admin/hours', adminOnly, (req,res) => {
  const inputHours = req.body.hours_json || DEFAULT_HOURS;
  const normalizedHours = {};
  for (const key of ['mon','tue','wed','thu','fri','sat','sun']) {
    const day = inputHours[key] || { active: false, ranges: [] };
    normalizedHours[key] = {
      active: !!day.active,
      ranges: normalizeDayRanges(day.ranges || [])
    };
  }
  setSetting('hours_json', JSON.stringify(normalizedHours));
  setSetting('hours_exceptions_json', JSON.stringify(req.body.hours_exceptions_json || { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] }));
  if (req.body.slot_step_min) setSetting('slot_step_min', String(req.body.slot_step_min));
  if (req.body.default_slot_capacity) setSetting('default_slot_capacity', String(req.body.default_slot_capacity));
  res.json({ ok:true, hours_json: normalizedHours });
});
app.post('/api/admin/blocked-periods', adminOnly, (req,res) => {
  const b = req.body;
  db.prepare(`INSERT INTO blocked_periods (start_date,end_date,reason,show_notice,active) VALUES (?,?,?,?,?)`).run(
    b.start_date, b.end_date, b.reason, Number(b.show_notice || 0), Number(b.active || 0)
  );
  res.json({ ok:true });
});
app.post('/api/admin/blocked-periods/:id/toggle', adminOnly, (req,res) => {
  db.prepare(`UPDATE blocked_periods SET active=?, show_notice=? WHERE id=?`).run(Number(req.body.active || 0), Number(req.body.show_notice || 0), Number(req.params.id));
  res.json({ ok:true });
});
app.delete('/api/admin/blocked-periods/:id', adminOnly, (req,res) => {
  db.prepare(`DELETE FROM blocked_periods WHERE id=?`).run(Number(req.params.id));
  res.json({ ok:true });
});


app.post('/api/admin/assets/hero-image', adminOnly, upload.single('hero_image'), (req,res) => {
  if (!req.file) return res.status(400).json({ ok:false, error:'Imagen requerida' });
  setSetting('hero_image_url', `/uploads/${req.file.filename}`);
  res.json({ ok:true, hero_image_url: `/uploads/${req.file.filename}` });
});

app.get('/api/admin/reviews', adminOnly, (req,res) => {
  res.json({ ok:true, items: db.prepare('SELECT * FROM reviews ORDER BY created_at DESC').all() });
});
app.post('/api/admin/reviews/:id/visibility', adminOnly, (req,res) => {
  db.prepare('UPDATE reviews SET approved=? WHERE id=?').run(Number(req.body.approved || 0), Number(req.params.id));
  res.json({ ok:true });
});
app.delete('/api/admin/reviews/:id', adminOnly, (req,res) => {
  db.prepare('DELETE FROM reviews WHERE id=?').run(Number(req.params.id));
  res.json({ ok:true });
});

app.get('/api/admin/loyalty', adminOnly, (req,res) => {
  res.json({ ok:true, items: db.prepare('SELECT * FROM loyalty_clients ORDER BY visits_count DESC, updated_at DESC').all() });
});
app.delete('/api/admin/loyalty/:phone', adminOnly, (req,res) => {
  db.prepare('DELETE FROM loyalty_clients WHERE phone=?').run(req.params.phone);
  res.json({ ok:true });
});

app.get('/manifest.webmanifest', (req,res) => res.sendFile(path.join(PUBLIC_DIR, 'manifest.webmanifest')));
app.get('/', (req,res) => res.sendFile(path.join(PUBLIC_DIR, 'index.html')));
['index','servicios','productos','agendar','contacto','politicas','compras','admin'].forEach(page => {
  app.get(`/${page}`, (req,res) => res.sendFile(path.join(PUBLIC_DIR, `${page}.html`)));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor en http://localhost:${PORT}`);
});
