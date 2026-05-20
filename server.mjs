import { createServer } from "node:http";
import { createHash, randomUUID } from "node:crypto";
import { extname, join, normalize } from "node:path";
import { readFile } from "node:fs/promises";

const port = Number(process.env.PORT || process.argv[2] || 5173);
const host = process.env.HOST || "0.0.0.0";
const root = process.cwd();
const adminSessions = new Map();

const FIREBASE_URL = "https://salon-bayber-dbddd-default-rtdb.firebaseio.com";
const SLOT_STEP_MINUTES = 30;
const DEFAULT_OPEN_MINUTES = 9 * 60;
const DEFAULT_CLOSE_MINUTES = (21 * 60) + 30;
const FULL_OPEN_FROM = "2026-05-20";
const FULL_OPEN_TO = "2026-05-26";
const FULL_OPEN_CLOSE_MINUTES = 24 * 60;

const defaultSettings = {
  salonName: "Salon Bayber",
  salonPhone: "0539 596 0584",
  salonAddress: "Reyhanli, Hatay",
  salonImage: "https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=1200&q=80",
  adminPinHash: createHash("sha256").update("1234").digest("hex"),
  barbers: [
    { id: "meh-ali", name: "Mehmet Ali Sanverdi", title: "Usta Berber", initials: "MA" },
    { id: "abdullah", name: "Abdullah Polat Sanverdi", title: "Uzman Berber", initials: "AP" }
  ],
  services: [
    { id: "haircut", name: "Sac Kesimi", price: 350, duration: "30 dk" },
    { id: "beard", name: "Sakal Duzeltme", price: 200, duration: "30 dk" },
    { id: "combo", name: "Sac + Sakal Komple", price: 500, duration: "60 dk" },
    { id: "care", name: "Hydrafacial Cilt Bakimi", price: 750, duration: "60 dk" }
  ]
};

const types = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8"
};

function hashPin(pin) {
  return createHash("sha256").update(String(pin)).digest("hex");
}

function getTurkeyTime() {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Istanbul" }));
}

function todayISO() {
  const d = getTurkeyTime();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isIsoDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
}

function parseTimeToMinutes(value) {
  const str = String(value || "");
  const [hoursStr, minutesStr] = str.split(":");
  const hours = Number(hoursStr);
  const minutes = Number(minutesStr);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return (hours * 60) + minutes;
}

function minutesToTime(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function parseDurationMinutes(value) {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return Math.round(value);
  const match = String(value || "").match(/\d+/);
  if (match) {
    const parsed = Number(match[0]);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return 30;
}

function formatDuration(minutes) {
  return `${Math.max(30, Math.round(minutes || 30))} dk`;
}

function isCampaignDate(dateValue) {
  return isIsoDate(dateValue) && dateValue >= FULL_OPEN_FROM && dateValue <= FULL_OPEN_TO;
}

function getCloseMinutesForDate(dateValue) {
  return isCampaignDate(dateValue) ? FULL_OPEN_CLOSE_MINUTES : DEFAULT_CLOSE_MINUTES;
}

function getTimeSlotsForDate(dateValue) {
  const closeMinutes = getCloseMinutesForDate(dateValue);
  const slots = [];
  for (let minute = DEFAULT_OPEN_MINUTES; minute < closeMinutes; minute += SLOT_STEP_MINUTES) {
    slots.push(minutesToTime(minute));
  }
  return slots;
}

function isClosedDate(dateValue) {
  if (!isIsoDate(dateValue)) return true;
  if (isCampaignDate(dateValue)) return false;
  return new Date(`${dateValue}T12:00:00`).getDay() === 0;
}

function isPastSlot(dateValue, time) {
  if (dateValue !== todayISO()) return false;
  const slotMinutes = parseTimeToMinutes(time);
  if (slotMinutes === null) return true;
  const now = getTurkeyTime();
  const nowMinutes = (now.getHours() * 60) + now.getMinutes();
  return slotMinutes <= nowMinutes;
}

function normalizeBarbers(barbers) {
  const source = Array.isArray(barbers) ? barbers : [];
  const normalized = source
    .map((barber, index) => {
      const id = String(barber?.id || `barber-${index + 1}`).trim();
      const name = String(barber?.name || "Berber").trim();
      const title = String(barber?.title || "Uzman").trim();
      const initials = String(barber?.initials || name.split(/\s+/).map((part) => part[0] || "").slice(0, 2).join("")).trim().slice(0, 2).toUpperCase() || "BR";
      return { id, name, title, initials };
    })
    .filter((barber) => barber.id && barber.name);

  return normalized.length ? normalized : structuredClone(defaultSettings.barbers);
}

function normalizeServices(services) {
  const source = Array.isArray(services) ? services : [];
  const normalized = source
    .map((service, index) => {
      const id = String(service?.id || `service-${index + 1}`).trim();
      const name = String(service?.name || "Hizmet").trim();
      const price = Number(service?.price);
      const numericPrice = Number.isFinite(price) && price > 0 ? Math.round(price) : 100;
      const minutes = parseDurationMinutes(service?.duration ?? service?.durationMinutes);
      return {
        id,
        name,
        price: numericPrice,
        duration: formatDuration(minutes)
      };
    })
    .filter((service) => service.id && service.name);

  return normalized.length ? normalized : structuredClone(defaultSettings.services);
}

function normalizeSettings(settings = {}) {
  return {
    salonName: String(settings.salonName || defaultSettings.salonName),
    salonPhone: String(settings.salonPhone || defaultSettings.salonPhone),
    salonAddress: String(settings.salonAddress || defaultSettings.salonAddress),
    salonImage: String(settings.salonImage || defaultSettings.salonImage),
    adminPinHash: String(settings.adminPinHash || defaultSettings.adminPinHash),
    barbers: normalizeBarbers(settings.barbers),
    services: normalizeServices(settings.services)
  };
}

function normalizeIncomingServiceIds(payload, settings) {
  const rawList = Array.isArray(payload?.serviceIds)
    ? payload.serviceIds
    : Array.isArray(payload?.services)
      ? payload.services
      : [];

  const validIds = rawList
    .map((id) => String(id))
    .filter((id) => settings.services.some((service) => service.id === id));

  if (validIds.length) return validIds;
  if (settings.services[0]?.id) return [settings.services[0].id];
  return [];
}

function normalizeAppointments(appointments, settings) {
  const source = Array.isArray(appointments) ? appointments : [];
  return source
    .map((appointment) => {
      const date = String(appointment?.date || "").trim();
      const time = String(appointment?.time || "").trim();
      const barberId = String(appointment?.barberId || "").trim();
      const customerName = String(appointment?.customerName || "").trim();
      const customerPhone = String(appointment?.customerPhone || "").trim();
      const serviceIds = normalizeIncomingServiceIds(appointment, settings);
      if (!date || !time || !barberId || !customerName) return null;
      return {
        id: String(appointment?.id || randomUUID()),
        cancelCode: String(appointment?.cancelCode || ""),
        customerName,
        customerPhone,
        serviceIds,
        barberId,
        date,
        time
      };
    })
    .filter(Boolean);
}

function normalizeHourRanges(hours) {
  const ranges = [];
  const source = Array.isArray(hours) ? hours : [];

  for (const hourItem of source) {
    let start;
    let end;

    if (typeof hourItem === "string" && hourItem.includes("-")) {
      const [startRaw, endRaw] = hourItem.split("-");
      start = String(startRaw || "").trim();
      end = String(endRaw || "").trim();
    } else if (hourItem && typeof hourItem === "object") {
      start = String(hourItem.start || "").trim();
      end = String(hourItem.end || "").trim();
    }

    const startMinutes = parseTimeToMinutes(start);
    const endMinutes = parseTimeToMinutes(end);
    if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) continue;
    ranges.push({ start: minutesToTime(startMinutes), end: minutesToTime(endMinutes) });
  }

  const uniq = new Map();
  for (const range of ranges) {
    uniq.set(`${range.start}-${range.end}`, range);
  }

  return Array.from(uniq.values()).sort((a, b) => parseTimeToMinutes(a.start) - parseTimeToMinutes(b.start));
}

function normalizeBlocks(blocks) {
  const source = Array.isArray(blocks) ? blocks : [];
  return source
    .map((block) => {
      const type = block?.type === "full_day" ? "full_day" : "hours";
      const barberId = String(block?.barberId || "").trim();
      const date = String(block?.date || "").trim();
      if (!barberId || !isIsoDate(date)) return null;

      if (type === "full_day") {
        return {
          id: String(block?.id || randomUUID()),
          barberId,
          date,
          type,
          hours: [],
          createdAt: String(block?.createdAt || new Date().toISOString())
        };
      }

      const normalizedHours = normalizeHourRanges(block?.hours);
      if (!normalizedHours.length) return null;
      return {
        id: String(block?.id || randomUUID()),
        barberId,
        date,
        type: "hours",
        hours: normalizedHours,
        createdAt: String(block?.createdAt || new Date().toISOString())
      };
    })
    .filter(Boolean);
}

function normalizeDb(db) {
  const safeDb = db && typeof db === "object" ? db : {};
  safeDb.settings = normalizeSettings(safeDb.settings);
  safeDb.appointments = normalizeAppointments(safeDb.appointments, safeDb.settings);
  safeDb.blocks = normalizeBlocks(safeDb.blocks);
  return safeDb;
}

function sanitizeSettings(settings) {
  const { adminPinHash, ...publicSettings } = settings;
  return publicSettings;
}

function getRequiredSlotCount(serviceIds, settings) {
  const totalMinutes = (Array.isArray(serviceIds) ? serviceIds : []).reduce((sum, serviceId) => {
    const service = settings.services.find((item) => item.id === serviceId);
    return sum + parseDurationMinutes(service?.duration);
  }, 0);

  return Math.max(1, Math.ceil((totalMinutes || SLOT_STEP_MINUTES) / SLOT_STEP_MINUTES));
}

function getBookedTimes(db, barberId, date) {
  const daySlots = getTimeSlotsForDate(date);
  const booked = new Set();

  for (const appointment of db.appointments) {
    if (appointment.barberId !== barberId || appointment.date !== date) continue;

    const startIndex = daySlots.indexOf(appointment.time);
    if (startIndex === -1) continue;

    const slotCount = getRequiredSlotCount(appointment.serviceIds, db.settings);
    for (let i = 0; i < slotCount; i += 1) {
      const nextSlot = daySlots[startIndex + i];
      if (nextSlot) booked.add(nextSlot);
    }
  }

  return booked;
}

function getBlockInfoForDay(db, barberId, date) {
  const daySlots = getTimeSlotsForDate(date);
  const blocks = db.blocks.filter((block) => block.barberId === barberId && block.date === date);

  if (blocks.some((block) => block.type === "full_day")) {
    return {
      fullDay: true,
      blockedSlots: new Set(daySlots)
    };
  }

  const blockedSlots = new Set();

  for (const block of blocks) {
    if (block.type !== "hours") continue;
    for (const range of block.hours) {
      const start = parseTimeToMinutes(range.start);
      const end = parseTimeToMinutes(range.end);
      if (start === null || end === null) continue;

      for (const slot of daySlots) {
        const slotMinute = parseTimeToMinutes(slot);
        if (slotMinute === null) continue;
        if (slotMinute >= start && slotMinute < end) blockedSlots.add(slot);
      }
    }
  }

  return {
    fullDay: false,
    blockedSlots
  };
}

function getAvailabilityForBarberDate(db, barberId, date) {
  if (isClosedDate(date)) {
    return { slots: [], reason: "day_closed" };
  }

  const daySlots = getTimeSlotsForDate(date);
  const blockInfo = getBlockInfoForDay(db, barberId, date);

  if (blockInfo.fullDay) {
    return { slots: [], reason: "full_day_block" };
  }

  const booked = getBookedTimes(db, barberId, date);
  const available = daySlots.filter((slot) => !booked.has(slot) && !blockInfo.blockedSlots.has(slot) && !isPastSlot(date, slot));

  if (!available.length) {
    if (blockInfo.blockedSlots.size) return { slots: [], reason: "blocked" };
    return { slots: [], reason: "fully_booked" };
  }

  return { slots: available, reason: null };
}

function isSlotWindowAvailable(availableSlots, daySlots, startTime, requiredSlots) {
  const startIndex = daySlots.indexOf(startTime);
  if (startIndex === -1) return false;
  const availableSet = new Set(availableSlots);

  for (let i = 0; i < requiredSlots; i += 1) {
    const slot = daySlots[startIndex + i];
    if (!slot || !availableSet.has(slot)) return false;
  }

  return true;
}

async function readDb() {
  try {
    const response = await fetch(`${FIREBASE_URL.replace(/\/$/, "")}/db.json`);
    const rawDb = await response.json();

    if (!rawDb) {
      const initialDb = normalizeDb({ settings: structuredClone(defaultSettings), appointments: [], blocks: [] });
      await writeDb(initialDb);
      return initialDb;
    }

    return normalizeDb(rawDb);
  } catch {
    return normalizeDb({ settings: structuredClone(defaultSettings), appointments: [], blocks: [] });
  }
}

async function writeDb(db) {
  try {
    await fetch(`${FIREBASE_URL.replace(/\/$/, "")}/db.json`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(db)
    });
  } catch {
    // Sessiz gec, cunku uzak DB gecici olarak erisilemeyebilir.
  }
}

function sendJson(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

async function readJson(request) {
  let body = "";
  for await (const chunk of request) body += chunk;
  if (!body) return {};

  try {
    return JSON.parse(body);
  } catch {
    throw new Error("Gecersiz JSON gonderildi.");
  }
}

function requireAdmin(req, res) {
  const token = String(req.headers.authorization || "").replace("Bearer ", "");
  if (!adminSessions.has(token)) {
    sendJson(res, 401, { message: "Yetkisiz islem." });
    return false;
  }
  return true;
}

function sortByDateAndTime(items) {
  return [...items].sort((a, b) => {
    const dateCmp = String(a.date).localeCompare(String(b.date));
    if (dateCmp !== 0) return dateCmp;
    return String(a.time || "").localeCompare(String(b.time || ""));
  });
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  try {
    if (req.method === "GET" && url.pathname === "/api/public-state") {
      const db = await readDb();
      const requestedDate = url.searchParams.get("date");
      const date = isIsoDate(requestedDate) ? requestedDate : todayISO();

      const requestedBarberId = String(url.searchParams.get("barberId") || "");
      const activeBarberId = db.settings.barbers.some((barber) => barber.id === requestedBarberId)
        ? requestedBarberId
        : (db.settings.barbers[0]?.id || "");

      const availability = getAvailabilityForBarberDate(db, activeBarberId, date);
      const allBarbersSlots = db.settings.barbers.reduce((acc, barber) => {
        acc[barber.id] = getAvailabilityForBarberDate(db, barber.id, date).slots;
        return acc;
      }, {});

      return sendJson(res, 200, {
        settings: sanitizeSettings(db.settings),
        selectedBarberId: activeBarberId,
        selectedDate: date,
        timeSlots: getTimeSlotsForDate(date),
        availableSlots: availability.slots,
        noAvailabilityReason: availability.reason,
        allBarbersSlots,
        todayCount: db.appointments.filter((appointment) => appointment.date === todayISO()).length,
        campaign: {
          isActive: isCampaignDate(date),
          from: FULL_OPEN_FROM,
          to: FULL_OPEN_TO,
          closeTime: "00:00"
        }
      });
    }

    if (req.method === "POST" && url.pathname === "/api/appointments") {
      const db = await readDb();
      const payload = await readJson(req);

      const customerName = String(payload.customerName || "").trim();
      const customerPhone = String(payload.customerPhone || "").trim();
      const barberId = String(payload.barberId || "").trim();
      const date = String(payload.date || "").trim();
      const time = String(payload.time || "").trim();
      const serviceIds = normalizeIncomingServiceIds(payload, db.settings);

      if (!customerName || !barberId || !date || !time || !serviceIds.length) {
        return sendJson(res, 400, { message: "Eksik veya gecersiz bilgi." });
      }

      if (!db.settings.barbers.some((barber) => barber.id === barberId)) {
        return sendJson(res, 400, { message: "Gecersiz berber secimi." });
      }

      if (!isIsoDate(date)) {
        return sendJson(res, 400, { message: "Gecersiz tarih formati." });
      }

      const daySlots = getTimeSlotsForDate(date);
      if (!daySlots.includes(time)) {
        return sendJson(res, 400, { message: "Secilen saat bu tarih icin gecersiz." });
      }

      const availability = getAvailabilityForBarberDate(db, barberId, date);
      const requiredSlots = getRequiredSlotCount(serviceIds, db.settings);

      if (!isSlotWindowAvailable(availability.slots, daySlots, time, requiredSlots)) {
        return sendJson(res, 409, { message: "Secilen saat veya sure uygun degil." });
      }

      const cancelCode = Math.random().toString(36).slice(2, 8).toUpperCase();
      const appointment = {
        id: randomUUID(),
        cancelCode,
        customerName,
        customerPhone,
        serviceIds,
        barberId,
        date,
        time
      };

      db.appointments.push(appointment);
      await writeDb(db);

      return sendJson(res, 201, { message: "Randevu olusturuldu.", cancelCode, appointment });
    }

    if (req.method === "POST" && url.pathname === "/api/appointments/cancel") {
      const db = await readDb();
      const payload = await readJson(req);
      const code = String(payload.code || "").trim().toUpperCase();

      const before = db.appointments.length;
      db.appointments = db.appointments.filter((appointment) => String(appointment.cancelCode || "").toUpperCase() !== code);

      if (db.appointments.length === before) {
        return sendJson(res, 404, { message: "Kod bulunamadi." });
      }

      await writeDb(db);
      return sendJson(res, 200, { message: "Randevu iptal edildi." });
    }

    if (req.method === "POST" && url.pathname === "/api/admin/login") {
      const db = await readDb();
      const payload = await readJson(req);
      const pinHash = hashPin(payload.pin);

      if (pinHash !== db.settings.adminPinHash) {
        return sendJson(res, 401, { message: "Sifre hatali." });
      }

      const token = randomUUID();
      adminSessions.set(token, true);
      return sendJson(res, 200, { token });
    }

    if (req.method === "GET" && url.pathname === "/api/admin/dashboard") {
      if (!requireAdmin(req, res)) return;

      const db = await readDb();
      return sendJson(res, 200, {
        settings: sanitizeSettings(db.settings),
        appointments: sortByDateAndTime(db.appointments),
        blocks: db.blocks
      });
    }

    if (req.method === "PUT" && url.pathname === "/api/admin/settings") {
      if (!requireAdmin(req, res)) return;

      const db = await readDb();
      const payload = await readJson(req);

      const nextSettings = {
        ...db.settings,
        salonName: String(payload.salonName || db.settings.salonName).trim() || db.settings.salonName,
        salonPhone: String(payload.salonPhone || db.settings.salonPhone).trim() || db.settings.salonPhone,
        salonAddress: String(payload.salonAddress || db.settings.salonAddress).trim() || db.settings.salonAddress,
        salonImage: String(payload.salonImage || db.settings.salonImage).trim() || db.settings.salonImage,
        barbers: Array.isArray(payload.barbers) && payload.barbers.length ? payload.barbers : db.settings.barbers,
        services: Array.isArray(payload.services) && payload.services.length ? payload.services : db.settings.services,
        adminPinHash: db.settings.adminPinHash
      };

      db.settings = normalizeSettings(nextSettings);
      db.appointments = normalizeAppointments(db.appointments, db.settings);
      await writeDb(db);

      return sendJson(res, 200, { settings: sanitizeSettings(db.settings) });
    }

    if (req.method === "GET" && url.pathname === "/api/admin/blocks") {
      if (!requireAdmin(req, res)) return;

      const db = await readDb();
      const barberIdFilter = String(url.searchParams.get("barberId") || "").trim();
      const dateFilter = String(url.searchParams.get("date") || "").trim();

      const filtered = db.blocks.filter((block) => {
        if (barberIdFilter && block.barberId !== barberIdFilter) return false;
        if (dateFilter && block.date !== dateFilter) return false;
        return true;
      });

      return sendJson(res, 200, { blocks: filtered });
    }

    if (req.method === "POST" && url.pathname === "/api/admin/blocks") {
      if (!requireAdmin(req, res)) return;

      const db = await readDb();
      const payload = await readJson(req);

      const barberId = String(payload.barberId || "").trim();
      const date = String(payload.date || "").trim();
      const type = payload.type === "full_day" ? "full_day" : "hours";

      if (!barberId || !db.settings.barbers.some((barber) => barber.id === barberId)) {
        return sendJson(res, 400, { message: "Gecersiz berber secimi." });
      }

      if (!isIsoDate(date)) {
        return sendJson(res, 400, { message: "Gecersiz tarih." });
      }

      if (type === "full_day") {
        db.blocks = db.blocks.filter((block) => !(block.barberId === barberId && block.date === date));

        const block = {
          id: randomUUID(),
          barberId,
          date,
          type: "full_day",
          hours: [],
          createdAt: new Date().toISOString()
        };

        db.blocks.push(block);
        await writeDb(db);
        return sendJson(res, 201, { message: "Tum gun engeli eklendi.", block });
      }

      const existingFullDay = db.blocks.some((block) => block.barberId === barberId && block.date === date && block.type === "full_day");
      if (existingFullDay) {
        return sendJson(res, 409, { message: "Bu berber bu tarihte tum gun kapali. Once tum gun engelini silin." });
      }

      const ranges = normalizeHourRanges(payload.hours ?? [{ start: payload.start, end: payload.end }]);
      if (!ranges.length) {
        return sendJson(res, 400, { message: "Saat araligi gecersiz." });
      }

      const block = {
        id: randomUUID(),
        barberId,
        date,
        type: "hours",
        hours: ranges,
        createdAt: new Date().toISOString()
      };

      db.blocks.push(block);
      await writeDb(db);
      return sendJson(res, 201, { message: "Saat engeli eklendi.", block });
    }

    if (req.method === "DELETE" && url.pathname === "/api/admin/blocks") {
      if (!requireAdmin(req, res)) return;

      const db = await readDb();
      let blockId = String(url.searchParams.get("id") || "").trim();

      if (!blockId) {
        try {
          const payload = await readJson(req);
          blockId = String(payload.id || "").trim();
        } catch {
          blockId = "";
        }
      }

      if (!blockId) {
        return sendJson(res, 400, { message: "Silinecek engel id bilgisi gerekli." });
      }

      const before = db.blocks.length;
      db.blocks = db.blocks.filter((block) => block.id !== blockId);

      if (db.blocks.length === before) {
        return sendJson(res, 404, { message: "Engel kaydi bulunamadi." });
      }

      await writeDb(db);
      return sendJson(res, 200, { message: "Engel kaldirildi." });
    }

    if (req.method === "DELETE" && url.pathname.startsWith("/api/admin/appointments/")) {
      if (!requireAdmin(req, res)) return;

      const db = await readDb();
      const appointmentId = decodeURIComponent(url.pathname.split("/").at(-1) || "");
      const before = db.appointments.length;
      db.appointments = db.appointments.filter((appointment) => appointment.id !== appointmentId);

      if (db.appointments.length === before) {
        return sendJson(res, 404, { message: "Randevu bulunamadi." });
      }

      await writeDb(db);
      return sendJson(res, 200, { message: "Randevu silindi." });
    }

    const pathname = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
    if (pathname.startsWith("/data/") || pathname === "/server.mjs") {
      res.writeHead(404);
      return res.end();
    }

    const filePath = normalize(join(root, pathname));
    if (!filePath.toLowerCase().startsWith(root.toLowerCase())) {
      res.writeHead(404);
      return res.end();
    }

    try {
      const file = await readFile(filePath);
      res.writeHead(200, { "Content-Type": types[extname(filePath)] || "application/octet-stream" });
      res.end(file);
    } catch {
      res.writeHead(404);
      res.end();
    }
  } catch (error) {
    sendJson(res, 500, { message: error instanceof Error ? error.message : "Sistem hatasi." });
  }
});

server.listen(port, host, () => {
  console.log(`Calisiyor: http://localhost:${port}`);
});
