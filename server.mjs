import { createServer } from "node:http";
import { createHash, randomUUID } from "node:crypto";
import { extname, join, normalize } from "node:path";
import { readFile } from "node:fs/promises";

const port = Number(process.env.PORT || process.argv[2] || 5173);
const host = process.env.HOST || "0.0.0.0";
const root = process.cwd();
const adminSessions = new Map();

const FIREBASE_URL = "https://salon-bayber-dbddd-default-rtdb.firebaseio.com"; 

const defaultSettings = {
  salonName: "Salon Bayber", salonPhone: "0539 596 0584", salonAddress: "Reyhanlı, Hatay",
  salonImage: "https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=1200&q=80",
  adminPinHash: createHash("sha256").update("1234").digest("hex"),
  barbers: [
    { id: "meh-ali", name: "Mehmet Ali Şanverdi", title: "Usta Başi Berber", initials: "MA" },
    { id: "abdullah", name: "Abdullah Polat Şanverdi", title: "Uzman Berber", initials: "AP" }
  ],
  services: [
    { id: "haircut", name: "Saç Kesimi", price: 350, duration: "30 dk" },
    { id: "beard", name: "Sakal Düzeltme", price: 200, duration: "30 dk" },
    { id: "combo", name: "Saç + Sakal Komple", price: 500, duration: "60 dk" },
    { id: "care", name: "Hydrafacial Cilt Bakımı", price: 750, duration: "60 dk" }
  ]
};

const timeSlots = [
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30",
  "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30",
  "17:00", "17:30", "18:00", "18:30", "19:00", "19:30", "20:00", "20:30", "21:00"
];

const types = { ".css": "text/css; charset=utf-8", ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8" };
function hashPin(pin) { return createHash("sha256").update(String(pin)).digest("hex"); }

function getTurkeyTime() {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Istanbul" }));
}
function todayISO() { 
  const d = getTurkeyTime();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function isClosedDate(dateValue) { return new Date(`${dateValue}T12:00:00`).getDay() === 0; }

function isPastSlot(dateValue, time) {
  if (dateValue !== todayISO()) return false;
  const [hours, minutes] = time.split(":").map(Number);
  const now = getTurkeyTime();
  return (hours * 60 + minutes) <= (now.getHours() * 60 + now.getMinutes());
}

function getBookedTimes(db, barberId, date) {
  let booked = [];
  const appointments = db.appointments.filter(a => a.barberId === barberId && a.date === date);
  for (const app of appointments) {
    const startIndex = timeSlots.indexOf(app.time);
    if (startIndex !== -1) {
      const slotCount = Array.isArray(app.serviceIds) ? app.serviceIds.length : 1;
      for (let i = 0; i < slotCount; i++) {
        if (startIndex + i < timeSlots.length) booked.push(timeSlots[startIndex + i]);
      }
    }
  }
  return booked;
}

function getAvailableSlots(db, barberId, date) {
  if (isClosedDate(date)) return [];
  const bookedTimes = getBookedTimes(db, barberId, date);
  return timeSlots.filter(t => !bookedTimes.includes(t) && !isPastSlot(date, t));
}

async function readDb() {
  try {
    const response = await fetch(`${FIREBASE_URL.replace(/\/$/, "")}/db.json`);
    let db = await response.json();
    if (!db) { db = { settings: structuredClone(defaultSettings), appointments: [] }; await writeDb(db); }
    db.settings = normalizeSettings(db.settings); db.appointments = Array.isArray(db.appointments) ? db.appointments : []; return db;
  } catch (error) { return { settings: normalizeSettings({}), appointments: [] }; }
}

async function writeDb(db) {
  try {
    await fetch(`${FIREBASE_URL.replace(/\/$/, "")}/db.json`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(db) });
  } catch (error) {}
}

function normalizeSettings(settings = {}) {
  return {
    salonName: settings.salonName || defaultSettings.salonName,
    salonPhone: settings.salonPhone || defaultSettings.salonPhone,
    salonAddress: settings.salonAddress || defaultSettings.salonAddress,
    salonImage: settings.salonImage || defaultSettings.salonImage,
    adminPinHash: settings.adminPinHash || defaultSettings.adminPinHash,
    barbers: Array.isArray(settings.barbers) && settings.barbers.length ? settings.barbers : structuredClone(defaultSettings.barbers),
    services: Array.isArray(settings.services) && settings.services.length ? settings.services : structuredClone(defaultSettings.services)
  };
}

function sendJson(res, status, payload) { res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" }); res.end(JSON.stringify(payload)); }
async function readJson(request) { let body = ""; for await (const chunk of request) body += chunk; return body ? JSON.parse(body) : {}; }
function requireAdmin(req, res) { const token = (req.headers.authorization || "").replace("Bearer ", ""); if (!adminSessions.has(token)) { sendJson(res, 401, { message: "Yetkisiz işlem." }); return false; } return true; }

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (req.method === "GET" && url.pathname === "/api/public-state") {
      const db = await readDb();
      const date = url.searchParams.get("date") || todayISO();
      const barberId = url.searchParams.get("barberId") || db.settings.barbers[0]?.id || "";
      return sendJson(res, 200, {
        settings: db.settings, timeSlots, availableSlots: getAvailableSlots(db, barberId, date),
        allBarbersSlots: db.settings.barbers.reduce((acc, b) => { acc[b.id] = getAvailableSlots(db, b.id, date); return acc; }, {}),
        appointments: db.appointments
      });
    }
    if (req.method === "POST" && url.pathname === "/api/appointments") {
      const db = await readDb(); const payload = await readJson(req);
      const serviceIds = Array.isArray(payload.serviceIds) ? payload.serviceIds : [];
      if (!payload.customerName || !payload.barberId || !payload.date || !payload.time) return sendJson(res, 400, { message: "Eksik bilgi." });

      const startIndex = timeSlots.indexOf(payload.time);
      const bookedTimes = getBookedTimes(db, payload.barberId, payload.date);
      for (let i = 0; i < serviceIds.length; i++) {
        const slot = timeSlots[startIndex + i];
        if (!slot || bookedTimes.includes(slot) || isPastSlot(payload.date, slot)) {
          return sendJson(res, 409, { message: "Seçilen saat veya süre dolu/uygun değil." });
        }
      }
      const cancelCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const app = { id: randomUUID(), cancelCode, customerName: String(payload.customerName).trim(), customerPhone: String(payload.customerPhone || "").trim(), serviceIds, barberId: String(payload.barberId), date: String(payload.date), time: String(payload.time) };
      db.appointments.push(app); await writeDb(db);
      return sendJson(res, 201, { message: "Başarılı", cancelCode });
    }
    if (req.method === "POST" && url.pathname === "/api/appointments/cancel") {
      const db = await readDb(); const code = String((await readJson(req)).code || "").trim().toUpperCase();
      const len = db.appointments.length; db.appointments = db.appointments.filter(a => a.cancelCode !== code);
      if (db.appointments.length === len) return sendJson(res, 404, { message: "Kod bulunamadı." });
      await writeDb(db); return sendJson(res, 200, { message: "İptal edildi." });
    }
    if (req.method === "POST" && url.pathname === "/api/admin/login") {
      const db = await readDb(); if (hashPin((await readJson(req)).pin) !== db.settings.adminPinHash) return sendJson(res, 401, { message: "Şifre hatalı." });
      const token = randomUUID(); adminSessions.set(token, true); return sendJson(res, 200, { token });
    }
    if (req.method === "GET" && url.pathname === "/api/admin/dashboard") {
      if (!requireAdmin(req, res)) return; const db = await readDb(); return sendJson(res, 200, { settings: db.settings, appointments: db.appointments });
    }
    if (req.method === "PUT" && url.pathname === "/api/admin/settings") {
      if (!requireAdmin(req, res)) return; const db = await readDb(); const payload = await readJson(req);
      Object.assign(db.settings, payload); await writeDb(db); return sendJson(res, 200, { settings: db.settings });
    }
    if (req.method === "DELETE" && url.pathname.startsWith("/api/admin/appointments/")) {
      if (!requireAdmin(req, res)) return; const db = await readDb();
      db.appointments = db.appointments.filter(a => a.id !== decodeURIComponent(url.pathname.split("/").at(-1)));
      await writeDb(db); return sendJson(res, 200, { message: "Silindi." });
    }
    const pathname = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
    if (pathname.startsWith("/data/") || pathname === "/server.mjs") { res.writeHead(404); return res.end(); }
    const filePath = normalize(join(root, pathname));
    try { const file = await readFile(filePath); res.writeHead(200, { "Content-Type": types[extname(filePath)] || "application/octet-stream" }); res.end(file); } catch { res.writeHead(404); res.end(); }
  } catch { sendJson(res, 500, { message: "Sistem hatası." }); }
});

server.listen(port, host, () => console.log(`Çalışıyor: http://localhost:${port}`));