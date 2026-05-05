import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import { dirname, extname, join, normalize } from "node:path";

const port = Number(process.env.PORT || process.argv[2] || 5173);
const host = process.env.HOST || "0.0.0.0";
const root = process.cwd();
const dbPath = join(root, "data", "db.json");
const adminSessions = new Map();

const services = [
  { id: "haircut", name: "Saç kesimi", duration: 30, price: 350 },
  { id: "beard", name: "Sakal düzeltme", duration: 20, price: 200 },
  { id: "combo", name: "Saç + sakal", duration: 45, price: 500 },
  { id: "care", name: "Bakım paketi", duration: 60, price: 750 },
];

const defaultSettings = {
  salonName: "Salon Bayber",
  adminPinHash: hashPin(process.env.ADMIN_PIN || "1234"),
  barbers: [
    { id: "mehmet-ali-sanverdi", name: "Mehmet Ali Şanverdi", title: "Usta berber", initials: "MA" },
  ],
};

const timeSlots = [
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30",
  "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30",
  "17:00", "17:30", "18:00", "18:30", "19:00", "19:30",
];

const types = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json; charset=utf-8",
};

function hashPin(pin) {
  return createHash("sha256").update(String(pin)).digest("hex");
}

function todayISO() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function makeInitials(name) {
  const words = String(name).trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "BL";
  return words.slice(0, 2).map((word) => word[0].toLocaleUpperCase("tr-TR")).join("");
}

function createBarberId(name) {
  const normalized = String(name)
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replaceAll("ı", "i")
    .replaceAll("ğ", "g")
    .replaceAll("ü", "u")
    .replaceAll("ş", "s")
    .replaceAll("ö", "o")
    .replaceAll("ç", "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || `berber-${randomUUID().slice(0, 8)}`;
}

function uniqueBarberId(baseId, usedIds) {
  let id = baseId;
  let counter = 2;
  while (usedIds.has(id)) {
    id = `${baseId}-${counter}`;
    counter += 1;
  }
  usedIds.add(id);
  return id;
}

function normalizePhone(phone) {
  const trimmed = String(phone || "").replace(/\s+/g, "");
  if (trimmed.startsWith("+")) return trimmed;
  if (trimmed.startsWith("0")) return `+90${trimmed.slice(1)}`;
  if (trimmed.startsWith("90")) return `+${trimmed}`;
  return trimmed;
}

function publicSettings(settings) {
  return {
    salonName: settings.salonName,
    barbers: settings.barbers,
  };
}

function sortAppointments(appointments) {
  return [...appointments].sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
}

function isClosedDate(dateValue) {
  return new Date(`${dateValue}T12:00:00`).getDay() === 0;
}

function isPastSlot(dateValue, time) {
  if (dateValue !== todayISO()) return false;
  const [hours, minutes] = time.split(":").map(Number);
  const slotDate = new Date();
  slotDate.setHours(hours, minutes, 0, 0);
  return slotDate.getTime() <= Date.now();
}

function getAvailableSlots(db, barberId, date) {
  if (isClosedDate(date)) return [];
  const bookedTimes = db.appointments
    .filter((appointment) => appointment.barberId === barberId && appointment.date === date)
    .map((appointment) => appointment.time);
  return timeSlots.filter((time) => !bookedTimes.includes(time) && !isPastSlot(date, time));
}

function getBarberCounts(db, date) {
  return Object.fromEntries(
    db.settings.barbers.map((barber) => [
      barber.id,
      db.appointments.filter((appointment) => appointment.barberId === barber.id && appointment.date === date).length,
    ]),
  );
}

function seededAppointments() {
  return [];
}

async function ensureDb() {
  try {
    await readFile(dbPath, "utf8");
  } catch {
    await writeDb({
      settings: structuredClone(defaultSettings),
      appointments: seededAppointments(),
      notifications: [],
    });
  }
}

async function readDb() {
  await ensureDb();
  const raw = await readFile(dbPath, "utf8");
  const db = JSON.parse(raw);
  db.settings = normalizeSettings(db.settings);
  db.appointments = Array.isArray(db.appointments) ? db.appointments : [];
  db.notifications = Array.isArray(db.notifications) ? db.notifications : [];
  db.appointments = db.appointments.filter(
    (appointment) =>
      services.some((service) => service.id === appointment.serviceId) &&
      db.settings.barbers.some((barber) => barber.id === appointment.barberId),
  );
  return db;
}

async function writeDb(db) {
  await mkdir(dirname(dbPath), { recursive: true });
  await writeFile(dbPath, `${JSON.stringify(db, null, 2)}\n`, "utf8");
}

function normalizeSettings(settings = {}) {
  const savedSalonName = typeof settings.salonName === "string" ? settings.salonName.trim() : "";
  const salonName = savedSalonName && savedSalonName !== "BarberLine" ? savedSalonName : defaultSettings.salonName;
  const adminPinHash = settings.adminPinHash || defaultSettings.adminPinHash;
  const savedBarbers = Array.isArray(settings.barbers) ? settings.barbers : [];
  const legacyDemoBarbers = ["emir", "mert", "can"];
  const isLegacyDemoList =
    savedBarbers.length === 3 && savedBarbers.every((barber) => legacyDemoBarbers.includes(barber.id));
  const sourceBarbers = savedBarbers.length && !isLegacyDemoList ? savedBarbers : defaultSettings.barbers;
  const usedIds = new Set();

  const barbers = sourceBarbers
    .map((barber) => {
      const name = typeof barber.name === "string" && barber.name.trim() ? barber.name.trim() : "";
      const title = typeof barber.title === "string" && barber.title.trim() ? barber.title.trim() : "Berber";
      if (!name) return null;
      const rawId = typeof barber.id === "string" && barber.id.trim() ? barber.id.trim() : createBarberId(name);
      return {
        id: uniqueBarberId(rawId, usedIds),
        name,
        title,
        initials: makeInitials(name),
      };
    })
    .filter(Boolean);

  return {
    salonName,
    adminPinHash,
    barbers: barbers.length ? barbers : structuredClone(defaultSettings.barbers),
  };
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(payload));
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 32_000) {
        reject(new Error("İstek çok büyük."));
        request.destroy();
      }
    });
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

async function readJson(request) {
  const body = await readRequestBody(request);
  return body ? JSON.parse(body) : {};
}

function authToken(request) {
  const header = request.headers.authorization || "";
  return header.startsWith("Bearer ") ? header.slice(7) : "";
}

function requireAdmin(request, response) {
  const token = authToken(request);
  const session = adminSessions.get(token);
  if (!session || Date.now() - session.createdAt > 1000 * 60 * 60 * 8) {
    sendJson(response, 401, { message: "Yönetici oturumu gerekli." });
    return false;
  }
  return true;
}

function smsMessage(db, appointment) {
  const barber = db.settings.barbers.find((item) => item.id === appointment.barberId);
  const service = services.find((item) => item.id === appointment.serviceId);
  return `${db.settings.salonName}: ${appointment.date} saat ${appointment.time} için ${service.name} randevunuz oluşturuldu. Berber: ${barber.name}.`;
}

// Tamamen temizlenmiş WhatsApp yönlendirme motoru
async function deliverSms(to, message) {
  return {
    status: "success",
    label: "WhatsApp Onayı Bekliyor",
    detail: "Müşteriye Yönetici Panelinden WhatsApp mesajı atabilirsiniz.",
  };
}

function addNotification(db, appointment, smsResult, message) {
  db.notifications = [
    {
      id: randomUUID(),
      appointmentId: appointment.id,
      customerName: appointment.customerName,
      phone: appointment.customerPhone,
      message,
      status: "success",
      label: smsResult.label,
      detail: smsResult.detail,
      createdAt: new Date().toISOString(),
    },
    ...db.notifications,
  ].slice(0, 50);
}

async function handlePublicState(request, response, url) {
  const db = await readDb();
  const date = url.searchParams.get("date") || todayISO();
  const barberId = url.searchParams.get("barberId") || db.settings.barbers[0]?.id || "";

  sendJson(response, 200, {
    settings: publicSettings(db.settings),
    services,
    barbers: db.settings.barbers,
    timeSlots,
    availableSlots: getAvailableSlots(db, barberId, date),
    barberCounts: getBarberCounts(db, date),
    todayCount: db.appointments.filter((appointment) => appointment.date === todayISO()).length,
  });
}

async function handleCreateAppointment(request, response) {
  const db = await readDb();
  const payload = await readJson(request);
  const appointment = {
    id: randomUUID(),
    customerName: String(payload.customerName || "").trim(),
    customerPhone: String(payload.customerPhone || "").trim(),
    serviceId: String(payload.serviceId || ""),
    barberId: String(payload.barberId || ""),
    date: String(payload.date || ""),
    time: String(payload.time || ""),
    note: String(payload.note || "").trim(),
    createdAt: new Date().toISOString(),
  };

  if (!appointment.customerName || !appointment.customerPhone || !appointment.serviceId || !appointment.barberId || !appointment.date || !appointment.time) {
    sendJson(response, 400, { message: "Tüm zorunlu alanları doldur." });
    return;
  }
  if (!services.some((service) => service.id === appointment.serviceId)) {
    sendJson(response, 400, { message: "Geçersiz hizmet seçildi." });
    return;
  }
  if (!db.settings.barbers.some((barber) => barber.id === appointment.barberId)) {
    sendJson(response, 400, { message: "Geçersiz berber seçildi." });
    return;
  }
  if (appointment.date < todayISO()) {
    sendJson(response, 400, { message: "Geçmiş tarihe randevu alınamaz." });
    return;
  }
  const availableSlots = getAvailableSlots(db, appointment.barberId, appointment.date);
  if (!availableSlots.includes(appointment.time)) {
    sendJson(response, 409, { message: "Bu saat artık müsait değil. Lütfen başka saat seç." });
    return;
  }

  db.appointments.push(appointment);
  const message = smsMessage(db, appointment);
  const smsResult = await deliverSms(appointment.customerPhone, message);
  addNotification(db, appointment, smsResult, message);
  await writeDb(db);

  // Ekranda çıkacak hatasız ve temiz mesaj
  sendJson(response, 201, {
    message: "Randevu başarıyla oluşturuldu.",
    appointmentId: appointment.id,
    smsStatus: "success",
  });
}

async function handleAdminLogin(request, response) {
  const db = await readDb();
  const payload = await readJson(request);
  if (hashPin(payload.pin || "") !== db.settings.adminPinHash) {
    sendJson(response, 401, { message: "Şifre hatalı." });
    return;
  }
  const token = randomUUID();
  adminSessions.set(token, { createdAt: Date.now() });
  sendJson(response, 200, { token });
}

async function handleAdminDashboard(request, response) {
  if (!requireAdmin(request, response)) return;
  const db = await readDb();
  sendJson(response, 200, {
    settings: publicSettings(db.settings),
    appointments: sortAppointments(db.appointments),
    notifications: db.notifications,
  });
}

async function handleUpdateSettings(request, response) {
  if (!requireAdmin(request, response)) return;
  const db = await readDb();
  const payload = await readJson(request);
  const salonName = String(payload.salonName || "").trim();
  const incomingBarbers = Array.isArray(payload.barbers) ? payload.barbers : [];
  const adminPinNew = String(payload.adminPinNew || "").trim();

  if (!salonName) {
    sendJson(response, 400, { message: "Salon adı boş bırakılamaz." });
    return;
  }

  const usedIds = new Set();
  const barbers = incomingBarbers.map((incoming) => {
    const existing = db.settings.barbers.find((barber) => barber.id === incoming.id);
    const name = String(incoming.name || "").trim();
    const title = String(incoming.title || "").trim();
    const rawId = String(incoming.id || existing?.id || createBarberId(name)).trim();
    if (!name || !title) return null;
    return { id: uniqueBarberId(rawId, usedIds), name, title, initials: makeInitials(name) };
  }).filter(Boolean);

  if (!barbers.length) {
    sendJson(response, 400, { message: "En az bir berber bulunmalı." });
    return;
  }
  if (barbers.length !== incomingBarbers.length) {
    sendJson(response, 400, { message: "Berber adı ve uzmanlık alanı boş bırakılamaz." });
    return;
  }

  const nextBarberIds = new Set(barbers.map((barber) => barber.id));
  const removedBarberIds = db.settings.barbers.map((barber) => barber.id).filter((id) => !nextBarberIds.has(id));
  const hasAppointmentsForRemovedBarber = db.appointments.some((appointment) => removedBarberIds.includes(appointment.barberId));

  if (hasAppointmentsForRemovedBarber) {
    sendJson(response, 409, { message: "Randevusu bulunan berber silinemez. Önce o berberin randevularını iptal et." });
    return;
  }
  if (adminPinNew && adminPinNew.length < 4) {
    sendJson(response, 400, { message: "Yeni yönetici şifresi en az 4 karakter olmalı." });
    return;
  }

  db.settings = {
    salonName,
    barbers,
    adminPinHash: adminPinNew ? hashPin(adminPinNew) : db.settings.adminPinHash,
  };

  await writeDb(db);
  sendJson(response, 200, { settings: publicSettings(db.settings) });
}

async function handleResetSettings(request, response) {
  if (!requireAdmin(request, response)) return;
  const db = await readDb();
  db.settings = structuredClone(defaultSettings);
  await writeDb(db);
  sendJson(response, 200, { settings: publicSettings(db.settings) });
}

async function handleResetDemo(request, response) {
  if (!requireAdmin(request, response)) return;
  const db = await readDb();
  db.appointments = seededAppointments();
  db.notifications = [];
  await writeDb(db);
  sendJson(response, 200, { message: "Demo verisi yenilendi." });
}

async function handleDeleteAppointment(request, response, id) {
  if (!requireAdmin(request, response)) return;
  const db = await readDb();
  const before = db.appointments.length;
  db.appointments = db.appointments.filter((appointment) => appointment.id !== id);

  if (db.appointments.length === before) {
    sendJson(response, 404, { message: "Randevu bulunamadı." });
    return;
  }
  await writeDb(db);
  sendJson(response, 200, { message: "Randevu iptal edildi." });
}

async function handleStaticFile(response, url) {
  const pathname = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
  if (pathname.startsWith("/data/") || pathname === "/server.mjs") {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }
  const filePath = normalize(join(root, pathname));
  if (!filePath.startsWith(root)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }
  try {
    const file = await readFile(filePath);
    response.writeHead(200, {
      "Content-Type": types[extname(filePath)] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    response.end(file);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  try {
    if (request.method === "GET" && url.pathname === "/api/public-state") {
      await handlePublicState(request, response, url);
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/appointments") {
      await handleCreateAppointment(request, response);
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/admin/login") {
      await handleAdminLogin(request, response);
      return;
    }
    if (request.method === "GET" && url.pathname === "/api/admin/dashboard") {
      await handleAdminDashboard(request, response);
      return;
    }
    if (request.method === "PUT" && url.pathname === "/api/admin/settings") {
      await handleUpdateSettings(request, response);
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/admin/settings/reset") {
      await handleResetSettings(request, response);
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/admin/reset-demo") {
      await handleResetDemo(request, response);
      return;
    }
    if (request.method === "DELETE" && url.pathname.startsWith("/api/admin/appointments/")) {
      await handleDeleteAppointment(request, response, decodeURIComponent(url.pathname.split("/").at(-1)));
      return;
    }
    if (url.pathname.startsWith("/api/")) {
      sendJson(response, 404, { message: "API adresi bulunamadı." });
      return;
    }
    await handleStaticFile(response, url);
  } catch (error) {
    sendJson(response, 500, { message: error.message || "Sunucu hatası oluştu." });
  }
});

server.listen(port, host, () => {
  console.log(`BarberLine running at http://localhost:${port}`);
});