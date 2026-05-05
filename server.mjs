import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import { dirname, extname, join, normalize } from "node:path";

const port = Number(process.env.PORT || process.argv[2] || 5173);
const host = process.env.HOST || "0.0.0.0";
const root = process.cwd();
const dbPath = join(root, "data", "db.json");
const adminSessions = new Map();

const defaultSettings = {
  salonName: "Salon Bayber",
  adminPinHash: hashPin(process.env.ADMIN_PIN || "1234"),
  barbers: [
    { id: "mehmet-ali-sanverdi", name: "Mehmet Ali Şanverdi", title: "Usta berber", initials: "MA" },
  ],
  services: [
    { id: "haircut", name: "Saç kesimi", price: 350 },
    { id: "beard", name: "Sakal düzeltme", price: 200 },
    { id: "combo", name: "Saç + sakal", price: 500 },
    { id: "care", name: "Bakım paketi", price: 750 },
  ]
};

// YENİ SAATLER 09:00 - 21:00 ARASI YAPILDI
const timeSlots = [
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30",
  "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30",
  "17:00", "17:30", "18:00", "18:30", "19:00", "19:30", "20:00", "20:30", "21:00"
];

const types = {
  ".css": "text/css; charset=utf-8", ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8",
};

function hashPin(pin) { return createHash("sha256").update(String(pin)).digest("hex"); }
function todayISO() { const offset = new Date().getTimezoneOffset() * 60000; return new Date(Date.now() - offset).toISOString().slice(0, 10); }

function isClosedDate(dateValue) { return new Date(`${dateValue}T12:00:00`).getDay() === 0; }
function isPastSlot(dateValue, time) {
  if (dateValue !== todayISO()) return false;
  const [hours, minutes] = time.split(":").map(Number);
  const slotDate = new Date(); slotDate.setHours(hours, minutes, 0, 0);
  return slotDate.getTime() <= Date.now();
}

function getAvailableSlots(db, barberId, date) {
  if (isClosedDate(date)) return [];
  const bookedTimes = db.appointments.filter(a => a.barberId === barberId && a.date === date).map(a => a.time);
  return timeSlots.filter(t => !bookedTimes.includes(t) && !isPastSlot(date, t));
}

async function ensureDb() {
  try { await readFile(dbPath, "utf8"); } 
  catch { await writeDb({ settings: structuredClone(defaultSettings), appointments: [] }); }
}

async function readDb() {
  await ensureDb();
  const raw = await readFile(dbPath, "utf8");
  const db = JSON.parse(raw);
  db.settings = normalizeSettings(db.settings);
  db.appointments = Array.isArray(db.appointments) ? db.appointments : [];
  return db;
}

async function writeDb(db) {
  await mkdir(dirname(dbPath), { recursive: true });
  await writeFile(dbPath, `${JSON.stringify(db, null, 2)}\n`, "utf8");
}

function normalizeSettings(settings = {}) {
  const salonName = settings.salonName || defaultSettings.salonName;
  const adminPinHash = settings.adminPinHash || defaultSettings.adminPinHash;
  const barbers = Array.isArray(settings.barbers) && settings.barbers.length ? settings.barbers : structuredClone(defaultSettings.barbers);
  const services = Array.isArray(settings.services) && settings.services.length ? settings.services : structuredClone(defaultSettings.services);
  return { salonName, adminPinHash, barbers, services };
}

function sendJson(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

async function readJson(request) {
  let body = "";
  for await (const chunk of request) body += chunk;
  return body ? JSON.parse(body) : {};
}

function requireAdmin(req, res) {
  const token = (req.headers.authorization || "").replace("Bearer ", "");
  if (!adminSessions.has(token)) { sendJson(res, 401, { message: "Yetkisiz işlem." }); return false; }
  return true;
}

async function handlePublicState(req, res, url) {
  const db = await readDb();
  const date = url.searchParams.get("date") || todayISO();
  const barberId = url.searchParams.get("barberId") || db.settings.barbers[0]?.id || "";
  sendJson(res, 200, {
    settings: { salonName: db.settings.salonName, barbers: db.settings.barbers, services: db.settings.services },
    timeSlots,
    availableSlots: getAvailableSlots(db, barberId, date),
    todayCount: db.appointments.filter(a => a.date === todayISO()).length,
  });
}

async function handleCreateAppointment(req, res) {
  const db = await readDb();
  const payload = await readJson(req);
  const serviceIds = Array.isArray(payload.serviceIds) ? payload.serviceIds : [];
  
  if (!payload.customerName || !payload.customerPhone || serviceIds.length === 0 || !payload.barberId || !payload.date || !payload.time) {
    return sendJson(res, 400, { message: "Tüm alanları doldurun ve en az 1 hizmet seçin." });
  }

  const cancelCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  const appointment = {
    id: randomUUID(), cancelCode, customerName: String(payload.customerName).trim(),
    customerPhone: String(payload.customerPhone).trim(), serviceIds,
    barberId: String(payload.barberId), date: String(payload.date), time: String(payload.time)
  };

  const availableSlots = getAvailableSlots(db, appointment.barberId, appointment.date);
  if (!availableSlots.includes(appointment.time)) return sendJson(res, 409, { message: "Bu saat artık dolu." });

  db.appointments.push(appointment);
  await writeDb(db);
  sendJson(res, 201, { message: "Başarılı", cancelCode: appointment.cancelCode });
}

async function handleCustomerCancel(req, res) {
  const db = await readDb();
  const code = String((await readJson(req)).code || "").trim().toUpperCase();
  const initialLength = db.appointments.length;
  db.appointments = db.appointments.filter(a => a.cancelCode !== code);
  if (db.appointments.length === initialLength) return sendJson(res, 404, { message: "Kod hatalı." });
  await writeDb(db);
  sendJson(res, 200, { message: "Randevunuz iptal edildi." });
}

async function handleUpdateSettings(req, res) {
  if (!requireAdmin(req, res)) return;
  const db = await readDb();
  const payload = await readJson(req);
  
  if (payload.services && Array.isArray(payload.services) && payload.services.length > 0) {
    db.settings.services = payload.services;
  }
  if (payload.barbers && Array.isArray(payload.barbers) && payload.barbers.length > 0) {
    db.settings.barbers = payload.barbers;
  }
  db.settings.salonName = payload.salonName || db.settings.salonName;
  
  await writeDb(db);
  sendJson(res, 200, { settings: db.settings });
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (req.method === "GET" && url.pathname === "/api/public-state") return await handlePublicState(req, res, url);
    if (req.method === "POST" && url.pathname === "/api/appointments") return await handleCreateAppointment(req, res);
    if (req.method === "POST" && url.pathname === "/api/appointments/cancel") return await handleCustomerCancel(req, res);
    if (req.method === "POST" && url.pathname === "/api/admin/login") {
      const db = await readDb();
      if (hashPin((await readJson(req)).pin) !== db.settings.adminPinHash) return sendJson(res, 401, { message: "Şifre hatalı." });
      const token = randomUUID(); adminSessions.set(token, true);
      return sendJson(res, 200, { token });
    }
    if (req.method === "GET" && url.pathname === "/api/admin/dashboard") {
      if (!requireAdmin(req, res)) return;
      const db = await readDb();
      return sendJson(res, 200, { settings: db.settings, appointments: db.appointments });
    }
    if (req.method === "PUT" && url.pathname === "/api/admin/settings") return await handleUpdateSettings(req, res);
    if (req.method === "DELETE" && url.pathname.startsWith("/api/admin/appointments/")) {
      if (!requireAdmin(req, res)) return;
      const db = await readDb();
      db.appointments = db.appointments.filter(a => a.id !== decodeURIComponent(url.pathname.split("/").at(-1)));
      await writeDb(db);
      return sendJson(res, 200, { message: "İptal edildi." });
    }
    
    // Statik Dosyalar
    const pathname = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
    if (pathname.startsWith("/data/") || pathname === "/server.mjs") { res.writeHead(404); return res.end("Not found"); }
    const filePath = normalize(join(root, pathname));
    try {
      const file = await readFile(filePath);
      res.writeHead(200, { "Content-Type": types[extname(filePath)] || "application/octet-stream" });
      res.end(file);
    } catch { res.writeHead(404); res.end("Not found"); }
  } catch { sendJson(res, 500, { message: "Sunucu hatası." }); }
});

server.listen(port, host, () => console.log(`Çalışıyor: http://localhost:${port}`));