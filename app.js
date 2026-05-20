const state = {
  settings: {
    salonName: "",
    salonPhone: "",
    salonAddress: "",
    salonImage: "",
    services: [],
    barbers: []
  },
  selectedDate: todayISO(),
  selectedBarberId: "",
  selectedTime: "",
  selectedAdminDate: todayISO(),
  timeSlots: [],
  availableSlots: [],
  noAvailabilityReason: null,
  campaign: { isActive: false, from: "", to: "", closeTime: "00:00" },
  todayCount: 0,
  appointments: [],
  blocks: [],
  lastBooking: null,
  adminToken: sessionStorage.getItem("barberline-admin-token") || "",
  adminUnlocked: Boolean(sessionStorage.getItem("barberline-admin-token")),
  showLoginScreen: false
};

const elements = {
  customerMain: document.querySelector("#customerMain"),
  adminMain: document.querySelector("#adminMain"),
  adminLoginSection: document.querySelector("#adminLoginSection"),
  adminDashboardSection: document.querySelector("#adminDashboardSection"),
  adminGreeting: document.querySelector("#adminGreeting"),
  lockSettings: document.querySelector("#lockSettings"),

  salonNameDisplay: document.querySelector("#salonNameDisplay"),
  displayPhone: document.querySelector("#displayPhone"),
  displayAddress: document.querySelector("#displayAddress"),
  displayMapLink: document.querySelector("#displayMapLink"),
  mainShopImage: document.querySelector("#mainShopImage"),

  bookingForm: document.querySelector("#bookingForm"),
  customerName: document.querySelector("#customerName"),
  customerPhone: document.querySelector("#customerPhone"),
  dateSelect: document.querySelector("#dateSelect"),
  customerDateTabs: document.querySelector("#customerDateTabs"),
  barberSelect: document.querySelector("#barberSelect"),
  timeSelect: document.querySelector("#timeSelect"),
  barberTabs: document.querySelector("#barberTabs"),
  slotBoard: document.querySelector("#slotBoard"),
  slotHint: document.querySelector("#slotHint"),
  slotUnavailableAlert: document.querySelector("#slotUnavailableAlert"),
  serviceCheckboxes: document.querySelector("#serviceCheckboxes"),
  totalPriceDisplay: document.querySelector("#totalPriceDisplay"),
  totalDurationDisplay: document.querySelector("#totalDurationDisplay"),
  formMessage: document.querySelector("#formMessage"),
  campaignNotice: document.querySelector("#campaignNotice"),

  bookingSuccessCard: document.querySelector("#bookingSuccessCard"),
  successSummary: document.querySelector("#successSummary"),
  successWhatsappBtn: document.querySelector("#successWhatsappBtn"),
  successCalendarBtn: document.querySelector("#successCalendarBtn"),
  successCloseBtn: document.querySelector("#successCloseBtn"),

  cancelForm: document.querySelector("#cancelForm"),
  cancelCodeInput: document.querySelector("#cancelCodeInput"),
  cancelMessage: document.querySelector("#cancelMessage"),

  btnShowLogin: document.querySelector("#btnShowLogin"),
  btnCancelLogin: document.querySelector("#btnCancelLogin"),
  adminLoginForm: document.querySelector("#adminLoginForm"),
  adminPinInput: document.querySelector("#adminPinInput"),
  adminMessage: document.querySelector("#adminMessage"),

  adminDateInput: document.querySelector("#adminDateInput"),
  adminDateTabs: document.querySelector("#adminDateTabs"),
  appointmentsList: document.querySelector("#appointmentsList"),

  blockBarberInput: document.querySelector("#blockBarberInput"),
  blockDateInput: document.querySelector("#blockDateInput"),
  blockTypeInput: document.querySelector("#blockTypeInput"),
  blockStartInput: document.querySelector("#blockStartInput"),
  blockEndInput: document.querySelector("#blockEndInput"),
  btnAddBlock: document.querySelector("#btnAddBlock"),
  blockMessage: document.querySelector("#blockMessage"),
  blockList: document.querySelector("#blockList"),

  settingsForm: document.querySelector("#settingsForm"),
  salonNameInput: document.querySelector("#salonNameInput"),
  salonPhoneInput: document.querySelector("#salonPhoneInput"),
  salonAddressInput: document.querySelector("#salonAddressInput"),
  salonImageInput: document.querySelector("#salonImageInput"),
  serviceSettings: document.querySelector("#serviceSettings"),
  barberSettings: document.querySelector("#barberSettings"),
  addService: document.querySelector("#addService"),
  addBarber: document.querySelector("#addBarber"),
  settingsMessage: document.querySelector("#settingsMessage")
};

function todayISO() {
  const offset = new Date().getTimezoneOffset() * 60000;
  return new Date(Date.now() - offset).toISOString().slice(0, 10);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatPrice(price) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0
  }).format(Number(price || 0));
}

function parseDurationMinutes(value) {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return Math.round(value);
  const match = String(value || "").match(/\d+/);
  if (match) return Number(match[0]) || 30;
  return 30;
}

function dateLabel(dateStr) {
  const date = new Date(`${dateStr}T12:00:00`);
  return date.toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "long",
    weekday: "long"
  });
}

function toLocalISO(dateObj) {
  const offset = dateObj.getTimezoneOffset() * 60000;
  return new Date(dateObj.getTime() - offset).toISOString().slice(0, 10);
}

function shiftISODate(baseDate, dayOffset) {
  const d = new Date(`${baseDate}T12:00:00`);
  d.setDate(d.getDate() + dayOffset);
  return toLocalISO(d);
}

function adminDateTabLabel(dateStr) {
  const today = todayISO();
  if (dateStr === today) return "Bugun";
  const date = new Date(`${dateStr}T12:00:00`);
  const day = String(date.getDate()).padStart(2, "0");
  const month = date.toLocaleDateString("tr-TR", { month: "short" });
  return `${day} ${month}`;
}

function customerDateTabLabel(dateStr) {
  const today = todayISO();
  const tomorrow = shiftISODate(today, 1);
  if (dateStr === today) return "Bugun";
  if (dateStr === tomorrow) return "Yarin";
  const date = new Date(`${dateStr}T12:00:00`);
  const day = String(date.getDate()).padStart(2, "0");
  const month = date.toLocaleDateString("tr-TR", { month: "short" });
  return `${day} ${month}`;
}

function normalizeWhatsappPhone(rawPhone) {
  const digits = String(rawPhone || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("90")) return digits;
  if (digits.startsWith("0")) return `90${digits.slice(1)}`;
  if (digits.length === 10) return `90${digits}`;
  return digits;
}

function setMessage(element, message, type = "success") {
  if (!element) return;
  element.textContent = message;
  if (type === "error") {
    element.style.color = "#ff8f8f";
  } else {
    element.style.color = "#9be0bb";
  }
}

function applyMobileViewportMode() {
  const width = window.visualViewport?.width || window.innerWidth || document.documentElement.clientWidth || 0;
  const coarsePointer = window.matchMedia ? window.matchMedia("(pointer: coarse)").matches : false;
  const shouldForceMobile = coarsePointer || width <= 980;
  document.documentElement.classList.toggle("is-mobile-viewport", shouldForceMobile);
}

async function cleanupLegacyBarberlineServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
  } catch {
    // Eski SW kayitlari silinemese bile uygulama calismaya devam etsin.
  }

  if (!("caches" in window)) return;
  try {
    const cacheKeys = await caches.keys();
    const legacyKeys = cacheKeys.filter((key) => key.startsWith("barberline-"));
    await Promise.all(legacyKeys.map((key) => caches.delete(key)));
  } catch {
    // Cache temizligi basarisiz olsa da bloklama yapma.
  }
}

async function api(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (state.adminToken) {
    headers.Authorization = `Bearer ${state.adminToken}`;
  }

  const response = await fetch(path, { ...options, headers });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.message || "Islem basarisiz.");
  }

  return payload;
}

function getSelectedServiceIds() {
  return Array.from(document.querySelectorAll('input[name="serviceItem"]:checked')).map((input) => input.value);
}

function getSelectedServices() {
  const ids = getSelectedServiceIds();
  return ids
    .map((id) => state.settings.services.find((service) => service.id === id))
    .filter(Boolean);
}

function getServiceTotals() {
  const selectedServices = getSelectedServices();
  const totalPrice = selectedServices.reduce((sum, service) => sum + Number(service.price || 0), 0);
  const totalMinutes = selectedServices.reduce((sum, service) => sum + parseDurationMinutes(service.duration), 0);

  return {
    totalPrice,
    totalMinutes,
    requiredSlots: Math.max(1, Math.ceil((totalMinutes || 30) / 30))
  };
}

function canFitFromSlot(timeValue, requiredSlots) {
  const startIndex = state.timeSlots.indexOf(timeValue);
  if (startIndex === -1) return false;

  const availableSet = new Set(state.availableSlots);
  for (let i = 0; i < requiredSlots; i += 1) {
    const slot = state.timeSlots[startIndex + i];
    if (!slot || !availableSet.has(slot)) return false;
  }

  return true;
}

function getFittingSlots(requiredSlots) {
  const availableSet = new Set(state.availableSlots);
  return state.timeSlots.filter((slot) => availableSet.has(slot) && canFitFromSlot(slot, requiredSlots));
}

function availabilityReasonDetail() {
  const reason = state.noAvailabilityReason;
  if (reason === "full_day_block") return "Bu berber bu tarihte yonetici tarafindan tum gun kapatildi.";
  if (reason === "blocked") return "Bu tarih icin saatlerin tamami yonetici bloklari nedeniyle kapali.";
  if (reason === "day_closed") return "Bu tarih standart takvimde kapali gun olarak isaretli.";
  if (reason === "fully_booked") return "Tum uygun saatler dolmus durumda.";
  return "";
}

function renderVisibility() {
  if (state.adminUnlocked) {
    elements.customerMain.hidden = true;
    elements.adminMain.hidden = false;
    elements.adminLoginSection.hidden = true;
    elements.adminDashboardSection.hidden = false;
    elements.lockSettings.hidden = false;
    elements.adminGreeting.textContent = "Kontrol Paneli";
    return;
  }

  if (state.showLoginScreen) {
    elements.customerMain.hidden = true;
    elements.adminMain.hidden = false;
    elements.adminLoginSection.hidden = false;
    elements.adminDashboardSection.hidden = true;
    elements.lockSettings.hidden = true;
    elements.adminGreeting.textContent = "Yetkili Girisi";
    return;
  }

  elements.customerMain.hidden = false;
  elements.adminMain.hidden = true;
}

function renderBrand() {
  const salonName = state.settings.salonName || "Salon Bayber";
  const salonPhone = state.settings.salonPhone || "0539 596 0584";
  const salonAddress = state.settings.salonAddress || "Reyhanli, Hatay";
  const salonImage = state.settings.salonImage || "https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=1200&q=80";

  if (elements.salonNameDisplay) elements.salonNameDisplay.textContent = salonName;
  if (elements.displayPhone) elements.displayPhone.textContent = salonPhone;
  if (elements.displayAddress) elements.displayAddress.textContent = salonAddress;
  if (elements.displayMapLink) elements.displayMapLink.href = `https://maps.google.com/?q=${encodeURIComponent(salonAddress)}`;
  if (elements.mainShopImage) elements.mainShopImage.src = salonImage;

  document.title = `${salonName} | Premium Randevu`;
}

function renderCampaignBadge() {
  if (!elements.campaignNotice) return;
  elements.campaignNotice.hidden = !state.campaign?.isActive;
}

function renderCustomerDateTabs() {
  if (!elements.customerDateTabs) return;

  const today = todayISO();
  const dateList = [];
  for (let i = 0; i <= 14; i += 1) {
    dateList.push(shiftISODate(today, i));
  }

  if (!dateList.includes(state.selectedDate)) {
    dateList.push(state.selectedDate);
    dateList.sort((a, b) => a.localeCompare(b));
  }

  elements.customerDateTabs.innerHTML = dateList
    .map((dateStr) => {
      const activeClass = dateStr === state.selectedDate ? " is-active" : "";
      const longTitle = dateLabel(dateStr);
      return `<button type="button" class="date-tab${activeClass}" data-customer-date="${dateStr}" title="${escapeHtml(longTitle)}">${escapeHtml(customerDateTabLabel(dateStr))}</button>`;
    })
    .join("");

  if (elements.dateSelect) {
    elements.dateSelect.value = state.selectedDate;
  }
}

function renderBarberTabs() {
  if (!elements.barberTabs) return;

  const barbers = state.settings.barbers || [];
  if (!barbers.length) {
    elements.barberTabs.innerHTML = "<span class=\"mini\">Berber bulunamadi.</span>";
    state.selectedBarberId = "";
    elements.barberSelect.value = "";
    return;
  }

  if (!barbers.some((barber) => barber.id === state.selectedBarberId)) {
    state.selectedBarberId = barbers[0].id;
  }

  elements.barberTabs.innerHTML = barbers
    .map((barber) => {
      const activeClass = barber.id === state.selectedBarberId ? " is-active" : "";
      return `<button class="barber-tab${activeClass}" type="button" data-barber-id="${escapeHtml(barber.id)}">${escapeHtml(barber.name)}</button>`;
    })
    .join("");

  elements.barberSelect.value = state.selectedBarberId;

}

function renderServices() {
  if (!elements.serviceCheckboxes) return;

  const selectedIds = new Set(getSelectedServiceIds());
  const services = state.settings.services || [];

  elements.serviceCheckboxes.innerHTML = services
    .map((service) => {
      const isChecked = selectedIds.has(service.id);
      const activeClass = isChecked ? " is-active" : "";
      return `
        <label class="service-card${activeClass}">
          <input type="checkbox" name="serviceItem" value="${escapeHtml(service.id)}" ${isChecked ? "checked" : ""}>
          <span class="check">${isChecked ? "✓" : ""}</span>
          <span>
            <span class="service-name">${escapeHtml(service.name)}</span>
            <span class="service-duration">${escapeHtml(service.duration || "30 dk")}</span>
          </span>
          <span class="service-price">${formatPrice(service.price)}</span>
        </label>
      `;
    })
    .join("");

  updateTotalsAndSlots();
}

function updateTotalsAndSlots() {
  const totals = getServiceTotals();

  if (elements.totalPriceDisplay) {
    elements.totalPriceDisplay.textContent = formatPrice(totals.totalPrice);
  }

  if (elements.totalDurationDisplay) {
    elements.totalDurationDisplay.textContent = `${Math.max(0, totals.totalMinutes)} dk`;
  }

  renderSlots();
}

function renderSlots() {
  if (!elements.slotBoard) return;

  const totals = getServiceTotals();
  const fittingSlots = getFittingSlots(totals.requiredSlots);

  if (state.selectedTime && !fittingSlots.includes(state.selectedTime)) {
    state.selectedTime = "";
  }

  if (!state.selectedTime && fittingSlots.length) {
    state.selectedTime = fittingSlots[0];
  }

  elements.timeSelect.value = state.selectedTime;

  const fittingSet = new Set(fittingSlots);
  elements.slotBoard.innerHTML = state.timeSlots
    .map((slot) => {
      const canChoose = fittingSet.has(slot);
      const selectedClass = state.selectedTime === slot ? " is-selected" : "";
      return `<button type="button" class="slot-button${selectedClass}" data-time="${slot}" ${canChoose ? "" : "disabled"}>${slot}</button>`;
    })
    .join("");

  const hasSlot = fittingSlots.length > 0;
  elements.slotUnavailableAlert.hidden = hasSlot;

  const reasonText = availabilityReasonDetail();
  if (hasSlot) {
    elements.slotHint.textContent = `${totals.requiredSlots} slot sure ihtiyaci ile secilebilir saatler listelendi.`;
  } else if (reasonText) {
    elements.slotHint.textContent = reasonText;
  } else {
    elements.slotHint.textContent = "Bu secimde uygun saat bulunamadi.";
  }
}

function renderSuccessCard() {
  if (!elements.bookingSuccessCard || !elements.successSummary) return;

  if (!state.lastBooking) {
    elements.bookingSuccessCard.hidden = true;
    return;
  }

  const booking = state.lastBooking;
  const servicesText = booking.services.map((service) => service.name).join(", ");

  elements.successSummary.innerHTML = `
    <div><strong>${escapeHtml(booking.customerName)}</strong> icin randevu olusturuldu.</div>
    <div class="mini">${escapeHtml(dateLabel(booking.date))} - ${escapeHtml(booking.time)}</div>
    <div class="mini">Berber: ${escapeHtml(booking.barberName)}</div>
    <div class="mini">Hizmetler: ${escapeHtml(servicesText)}</div>
    <div class="mini">Toplam: ${escapeHtml(formatPrice(booking.totalPrice))} / ${escapeHtml(String(booking.totalMinutes))} dk</div>
    <div class="mini">Iptal Kodu: ${escapeHtml(booking.cancelCode)}</div>
  `;

  const salonPhone = normalizeWhatsappPhone(state.settings.salonPhone);
  const waText = encodeURIComponent(
    `Merhaba, ${state.settings.salonName} icin randevum olustu.\nAd Soyad: ${booking.customerName}\nTarih: ${booking.date}\nSaat: ${booking.time}\nBerber: ${booking.barberName}\nHizmetler: ${servicesText}\nIptal Kodu: ${booking.cancelCode}`
  );

  elements.successWhatsappBtn.href = salonPhone
    ? `https://api.whatsapp.com/send/?phone=${salonPhone}&text=${waText}`
    : "#";

  elements.bookingSuccessCard.hidden = false;
}

function renderAppointments() {
  if (!elements.appointmentsList || !elements.adminDateInput) return;

  if (!state.selectedAdminDate) {
    state.selectedAdminDate = todayISO();
  }

  elements.adminDateInput.value = state.selectedAdminDate;

  if (elements.adminDateTabs) {
    const tabDates = [];
    for (let i = -5; i <= 10; i += 1) {
      tabDates.push(shiftISODate(state.selectedAdminDate, i));
    }

    elements.adminDateTabs.innerHTML = tabDates
      .map((dateStr) => {
        const activeClass = dateStr === state.selectedAdminDate ? " is-active" : "";
        return `<button type="button" class="admin-date-tab${activeClass}" data-admin-date="${dateStr}" title="${escapeHtml(dateLabel(dateStr))}">${escapeHtml(adminDateTabLabel(dateStr))}</button>`;
      })
      .join("");

  }

  const daily = state.appointments
    .filter((appointment) => appointment.date === state.selectedAdminDate)
    .sort((a, b) => a.time.localeCompare(b.time));

  if (!daily.length) {
    elements.appointmentsList.innerHTML = "<p class=\"mini\">Bu tarihte randevu bulunmuyor.</p>";
    return;
  }

  elements.appointmentsList.innerHTML = daily
    .map((appointment) => {
      const barber = state.settings.barbers.find((item) => item.id === appointment.barberId);
      const services = (appointment.serviceIds || [])
        .map((serviceId) => state.settings.services.find((service) => service.id === serviceId)?.name || "Hizmet")
        .join(", ");

      return `
        <article class="admin-item">
          <div class="admin-item-head">
            <div>
              <strong>${escapeHtml(appointment.customerName)}</strong>
              <div class="mini">${escapeHtml(appointment.customerPhone || "Telefon yok")}</div>
            </div>
            <div style="display:flex; gap:8px;">
              <button class="ghost-button" type="button" data-remind-id="${escapeHtml(appointment.id)}">WhatsApp Hatirlat</button>
              <button class="danger-button" type="button" data-delete-appointment="${escapeHtml(appointment.id)}">Sil</button>
            </div>
          </div>
          <div class="mini">Saat: ${escapeHtml(appointment.time)} | Berber: ${escapeHtml(barber?.name || "Bilinmiyor")}</div>
          <div class="mini">Hizmetler: ${escapeHtml(services)}</div>
        </article>
      `;
    })
    .join("");
}

function renderBlocks() {
  if (!elements.blockBarberInput || !elements.blockList) return;

  const barbers = state.settings.barbers || [];
  const currentBlockBarber = elements.blockBarberInput.value;

  elements.blockBarberInput.innerHTML = barbers
    .map((barber) => `<option value="${escapeHtml(barber.id)}">${escapeHtml(barber.name)}</option>`)
    .join("");

  if (barbers.some((barber) => barber.id === currentBlockBarber)) {
    elements.blockBarberInput.value = currentBlockBarber;
  } else if (barbers[0]) {
    elements.blockBarberInput.value = barbers[0].id;
  }

  if (!elements.blockDateInput.value) {
    elements.blockDateInput.value = todayISO();
  }

  const blockType = elements.blockTypeInput.value;
  const disableHourInputs = blockType === "full_day";
  elements.blockStartInput.disabled = disableHourInputs;
  elements.blockEndInput.disabled = disableHourInputs;

  const selectedBarberId = elements.blockBarberInput.value;
  const selectedDate = elements.blockDateInput.value;

  const list = state.blocks
    .filter((block) => (!selectedBarberId || block.barberId === selectedBarberId) && (!selectedDate || block.date === selectedDate))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  if (!list.length) {
    elements.blockList.innerHTML = "<p class=\"mini\">Bu filtrede engel kaydi bulunmuyor.</p>";
    return;
  }

  elements.blockList.innerHTML = list
    .map((block) => {
      const barber = state.settings.barbers.find((item) => item.id === block.barberId);
      const details = block.type === "full_day"
        ? "Tum gun kapali"
        : block.hours.map((range) => `${range.start}-${range.end}`).join(", ");

      return `
        <article class="admin-item">
          <div class="admin-item-head">
            <div>
              <strong>${escapeHtml(barber?.name || block.barberId)}</strong>
              <div class="mini">${escapeHtml(block.date)} | ${escapeHtml(details)}</div>
            </div>
            <button class="danger-button" type="button" data-delete-block="${escapeHtml(block.id)}">Sil</button>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderSettingsForm() {
  if (!elements.settingsForm || !elements.serviceSettings || !elements.barberSettings) return;

  if (elements.salonNameInput) elements.salonNameInput.value = state.settings.salonName || "";
  if (elements.salonPhoneInput) elements.salonPhoneInput.value = state.settings.salonPhone || "";
  if (elements.salonAddressInput) elements.salonAddressInput.value = state.settings.salonAddress || "";

  elements.serviceSettings.innerHTML = (state.settings.services || [])
    .map((service) => {
      return `
        <div class="service-settings-card">
          <div style="display:flex;justify-content:space-between;gap:8px;align-items:center;">
            <strong>${escapeHtml(service.name)}</strong>
            <button class="danger-button" type="button" data-delete-service="${escapeHtml(service.id)}">Sil</button>
          </div>
          <div class="settings-row">
            <input name="serviceName-${escapeHtml(service.id)}" type="text" value="${escapeHtml(service.name)}" required />
            <input name="servicePrice-${escapeHtml(service.id)}" type="number" min="1" value="${escapeHtml(service.price)}" required />
          </div>
          <input name="serviceDuration-${escapeHtml(service.id)}" type="text" value="${escapeHtml(service.duration || "30 dk")}" placeholder="30 dk" required />
        </div>
      `;
    })
    .join("");

  elements.barberSettings.innerHTML = (state.settings.barbers || [])
    .map((barber) => {
      return `
        <div class="barber-settings-card">
          <div style="display:flex;justify-content:space-between;gap:8px;align-items:center;">
            <strong>${escapeHtml(barber.name)}</strong>
            <button class="danger-button" type="button" data-delete-barber="${escapeHtml(barber.id)}">Sil</button>
          </div>
          <div class="settings-row">
            <input name="barberName-${escapeHtml(barber.id)}" type="text" value="${escapeHtml(barber.name)}" required />
            <input name="barberTitle-${escapeHtml(barber.id)}" type="text" value="${escapeHtml(barber.title)}" required />
          </div>
        </div>
      `;
    })
    .join("");
}

function renderAll() {
  renderVisibility();
  renderBrand();
  renderCampaignBadge();
  renderCustomerDateTabs();
  renderBarberTabs();
  renderServices();
  renderSuccessCard();
  renderAppointments();
  renderBlocks();
  renderSettingsForm();
}

async function loadPublicState() {
  const query = new URLSearchParams({
    date: state.selectedDate
  });

  if (state.selectedBarberId) {
    query.set("barberId", state.selectedBarberId);
  }

  const payload = await api(`/api/public-state?${query.toString()}`);

  state.settings = payload.settings;
  state.timeSlots = payload.timeSlots || [];
  state.availableSlots = payload.availableSlots || [];
  state.noAvailabilityReason = payload.noAvailabilityReason;
  state.campaign = payload.campaign || { isActive: false };
  state.todayCount = payload.todayCount || 0;

  if (payload.selectedBarberId) {
    state.selectedBarberId = payload.selectedBarberId;
  }

  if (!state.settings.barbers.some((barber) => barber.id === state.selectedBarberId)) {
    state.selectedBarberId = state.settings.barbers[0]?.id || "";
  }

  if (elements.barberSelect) {
    elements.barberSelect.value = state.selectedBarberId;
  }
}

async function loadAdminDashboard() {
  if (!state.adminToken) return;

  try {
    const payload = await api("/api/admin/dashboard");
    state.settings = payload.settings || state.settings;
    state.appointments = payload.appointments || [];
    state.blocks = payload.blocks || [];
  } catch (error) {
    state.adminToken = "";
    state.adminUnlocked = false;
    state.showLoginScreen = false;
    sessionStorage.removeItem("barberline-admin-token");
    throw error;
  }
}

async function refreshAll() {
  await loadPublicState();

  if (state.adminUnlocked) {
    await loadAdminDashboard();
  } else {
    state.appointments = [];
    state.blocks = [];
  }

  renderAll();
}

function makeInitials(name) {
  const words = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "BR";
  return words.slice(0, 2).map((word) => word[0].toUpperCase()).join("");
}

async function fileToBase64(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.readAsDataURL(file);
  });
}

function toICSDate(date) {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function escapeICSText(text) {
  return String(text || "")
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function buildICS(booking) {
  const startDate = new Date(`${booking.date}T${booking.time}:00`);
  const endDate = new Date(startDate.getTime() + (booking.totalMinutes || 30) * 60 * 1000);
  const uid = `${Date.now()}-${Math.random().toString(16).slice(2)}@salon-bayber`;
  const serviceNames = booking.services.map((service) => service.name).join(", ");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Salon Bayber//Randevu//TR",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${toICSDate(new Date())}`,
    `DTSTART:${toICSDate(startDate)}`,
    `DTEND:${toICSDate(endDate)}`,
    `SUMMARY:${escapeICSText(`${state.settings.salonName} Randevusu`)}`,
    `DESCRIPTION:${escapeICSText(`Berber: ${booking.barberName} | Hizmetler: ${serviceNames}`)}`,
    `LOCATION:${escapeICSText(state.settings.salonAddress)}`,
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "DESCRIPTION:Randevunuza 1 gun kaldi.",
    "TRIGGER:-P1D",
    "END:VALARM",
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "DESCRIPTION:Randevunuza 2 saat kaldi.",
    "TRIGGER:-PT2H",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR"
  ].join("\r\n");
}

function downloadICS(booking) {
  const icsContent = buildICS(booking);
  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `randevu-${booking.date}-${booking.time.replace(":", "-")}.ics`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

async function createAppointment(event) {
  event.preventDefault();
  setMessage(elements.formMessage, "Randevu kaydediliyor...");

  const selectedServices = getSelectedServices();
  if (!selectedServices.length) {
    setMessage(elements.formMessage, "En az bir hizmet secmelisiniz.", "error");
    return;
  }

  if (!state.selectedTime) {
    setMessage(elements.formMessage, "Lutfen uygun bir saat secin.", "error");
    return;
  }

  const formData = new FormData(elements.bookingForm);
  const customerName = String(formData.get("customerName") || "").trim();
  const customerPhone = String(formData.get("customerPhone") || "").trim();
  const barberId = state.selectedBarberId;
  const date = state.selectedDate;

  if (!customerName || !customerPhone || !barberId || !date) {
    setMessage(elements.formMessage, "Lutfen zorunlu alanlari doldurun.", "error");
    return;
  }

  try {
    const payload = await api("/api/appointments", {
      method: "POST",
      body: JSON.stringify({
        customerName,
        customerPhone,
        serviceIds: selectedServices.map((service) => service.id),
        barberId,
        date,
        time: state.selectedTime
      })
    });

    const totals = getServiceTotals();
    const barber = state.settings.barbers.find((item) => item.id === barberId);

    state.lastBooking = {
      customerName,
      customerPhone,
      date,
      time: state.selectedTime,
      barberName: barber?.name || "Berber",
      services: selectedServices,
      totalPrice: totals.totalPrice,
      totalMinutes: totals.totalMinutes || 30,
      cancelCode: payload.cancelCode
    };

    elements.customerName.value = "";
    elements.customerPhone.value = "";
    document.querySelectorAll('input[name="serviceItem"]').forEach((input) => {
      input.checked = false;
    });
    state.selectedTime = "";

    await refreshAll();
    renderSuccessCard();
    setMessage(elements.formMessage, "Randevu olusturuldu. Ozet karti hazir.");
  } catch (error) {
    setMessage(elements.formMessage, error.message, "error");
  }
}

async function cancelAppointmentFromCustomer(event) {
  event.preventDefault();
  setMessage(elements.cancelMessage, "Kod kontrol ediliyor...");

  try {
    const payload = await api("/api/appointments/cancel", {
      method: "POST",
      body: JSON.stringify({ code: elements.cancelCodeInput.value.trim() })
    });

    elements.cancelForm.reset();
    setMessage(elements.cancelMessage, payload.message);
    await refreshAll();
  } catch (error) {
    setMessage(elements.cancelMessage, error.message, "error");
  }
}

async function unlockAdmin(event) {
  event.preventDefault();
  setMessage(elements.adminMessage, "Giris yapiliyor...");

  try {
    const payload = await api("/api/admin/login", {
      method: "POST",
      body: JSON.stringify({ pin: String(new FormData(elements.adminLoginForm).get("adminPin") || "").trim() })
    });

    state.adminToken = payload.token;
    state.adminUnlocked = true;
    state.showLoginScreen = false;
    sessionStorage.setItem("barberline-admin-token", payload.token);
    elements.adminPinInput.value = "";
    setMessage(elements.adminMessage, "");
    await refreshAll();
  } catch (error) {
    setMessage(elements.adminMessage, error.message, "error");
  }
}

async function saveSettings(event) {
  event.preventDefault();
  setMessage(elements.settingsMessage, "Kaydediliyor...");

  try {
    const services = (state.settings.services || []).map((service) => {
      const name = document.querySelector(`input[name="serviceName-${service.id}"]`)?.value.trim() || service.name;
      const priceRaw = document.querySelector(`input[name="servicePrice-${service.id}"]`)?.value;
      const duration = document.querySelector(`input[name="serviceDuration-${service.id}"]`)?.value.trim() || service.duration || "30 dk";
      const price = Number(priceRaw);

      return {
        id: service.id,
        name,
        price: Number.isFinite(price) && price > 0 ? Math.round(price) : Number(service.price || 100),
        duration
      };
    });

    const barbers = (state.settings.barbers || []).map((barber) => {
      const name = document.querySelector(`input[name="barberName-${barber.id}"]`)?.value.trim() || barber.name;
      const title = document.querySelector(`input[name="barberTitle-${barber.id}"]`)?.value.trim() || barber.title;

      return {
        id: barber.id,
        name,
        title,
        initials: makeInitials(name)
      };
    });

    let salonImage = state.settings.salonImage;
    if (elements.salonImageInput?.files?.[0]) {
      salonImage = await fileToBase64(elements.salonImageInput.files[0]);
      elements.salonImageInput.value = "";
    }

    await api("/api/admin/settings", {
      method: "PUT",
      body: JSON.stringify({
        salonName: elements.salonNameInput.value.trim(),
        salonPhone: elements.salonPhoneInput.value.trim(),
        salonAddress: elements.salonAddressInput.value.trim(),
        salonImage,
        services,
        barbers
      })
    });

    setMessage(elements.settingsMessage, "Ayarlar kaydedildi.");
    await refreshAll();
  } catch (error) {
    setMessage(elements.settingsMessage, error.message, "error");
  }
}

async function addBlock() {
  const barberId = elements.blockBarberInput.value;
  const date = elements.blockDateInput.value;
  const type = elements.blockTypeInput.value;

  if (!barberId || !date) {
    setMessage(elements.blockMessage, "Berber ve tarih secimi zorunlu.", "error");
    return;
  }

  const payload = {
    barberId,
    date,
    type
  };

  if (type === "hours") {
    const start = elements.blockStartInput.value;
    const end = elements.blockEndInput.value;

    if (!start || !end || end <= start) {
      setMessage(elements.blockMessage, "Saat araligi gecersiz.", "error");
      return;
    }

    payload.hours = [{ start, end }];
  }

  try {
    setMessage(elements.blockMessage, "Engel ekleniyor...");
    await api("/api/admin/blocks", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    setMessage(elements.blockMessage, "Engel basariyla eklendi.");
    await refreshAll();
  } catch (error) {
    setMessage(elements.blockMessage, error.message, "error");
  }
}

function openReminderWhatsApp(appointment) {
  const phone = normalizeWhatsappPhone(appointment.customerPhone);
  if (!phone) return;

  const salonName = state.settings.salonName || "Salon Bayber";
  const message = encodeURIComponent(
    `Merhaba ${appointment.customerName}, ${dateLabel(appointment.date)} saat ${appointment.time} icin ${salonName} randevunuzu hatirlatiyoruz. Lutfen 10 dakika once salonda olun.`
  );

  window.open(`https://api.whatsapp.com/send/?phone=${phone}&text=${message}`, "_blank");
}

function bindEvents() {
  window.addEventListener("resize", applyMobileViewportMode);
  window.addEventListener("orientationchange", applyMobileViewportMode);
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", applyMobileViewportMode);
  }

  if (elements.dateSelect) {
    elements.dateSelect.addEventListener("change", async () => {
      state.selectedDate = elements.dateSelect.value;
      state.selectedTime = "";
      await refreshAll();
    });
  }

  if (elements.customerDateTabs) {
    elements.customerDateTabs.addEventListener("click", async (event) => {
      const button = event.target.closest("[data-customer-date]");
      if (!button) return;
      const nextDate = button.dataset.customerDate;
      if (!nextDate || nextDate === state.selectedDate) return;
      state.selectedDate = nextDate;
      state.selectedTime = "";
      if (elements.dateSelect) elements.dateSelect.value = nextDate;
      await refreshAll();
    });
  }

  if (elements.barberTabs) {
    elements.barberTabs.addEventListener("click", async (event) => {
      const button = event.target.closest("[data-barber-id]");
      if (!button) return;
      const nextBarberId = button.dataset.barberId;
      if (!nextBarberId || nextBarberId === state.selectedBarberId) return;
      state.selectedBarberId = nextBarberId;
      state.selectedTime = "";
      await refreshAll();
    });
  }

  if (elements.slotBoard) {
    elements.slotBoard.addEventListener("click", (event) => {
      const button = event.target.closest("[data-time]");
      if (!button || button.disabled) return;
      state.selectedTime = button.dataset.time;
      elements.timeSelect.value = state.selectedTime;
      renderSlots();
    });
  }

  if (elements.serviceCheckboxes) {
    elements.serviceCheckboxes.addEventListener("change", () => {
      renderServices();
    });
  }

  if (elements.bookingForm) {
    elements.bookingForm.addEventListener("submit", createAppointment);
  }

  if (elements.cancelForm) {
    elements.cancelForm.addEventListener("submit", cancelAppointmentFromCustomer);
  }

  if (elements.successCalendarBtn) {
    elements.successCalendarBtn.addEventListener("click", () => {
      if (!state.lastBooking) return;
      downloadICS(state.lastBooking);
    });
  }

  if (elements.successCloseBtn) {
    elements.successCloseBtn.addEventListener("click", () => {
      state.lastBooking = null;
      renderSuccessCard();
    });
  }

  if (elements.btnShowLogin) {
    elements.btnShowLogin.addEventListener("click", (event) => {
      event.preventDefault();
      state.showLoginScreen = true;
      renderVisibility();
    });
  }

  if (elements.btnCancelLogin) {
    elements.btnCancelLogin.addEventListener("click", (event) => {
      event.preventDefault();
      state.showLoginScreen = false;
      elements.adminPinInput.value = "";
      setMessage(elements.adminMessage, "");
      renderVisibility();
    });
  }

  if (elements.lockSettings) {
    elements.lockSettings.addEventListener("click", () => {
      state.adminToken = "";
      state.adminUnlocked = false;
      state.showLoginScreen = false;
      sessionStorage.removeItem("barberline-admin-token");
      renderVisibility();
    });
  }

  if (elements.adminLoginForm) {
    elements.adminLoginForm.addEventListener("submit", unlockAdmin);
  }

  if (elements.adminDateInput) {
    elements.adminDateInput.addEventListener("change", () => {
      state.selectedAdminDate = elements.adminDateInput.value;
      renderAppointments();
    });
  }

  if (elements.adminDateTabs) {
    elements.adminDateTabs.addEventListener("click", (event) => {
      const tabButton = event.target.closest("[data-admin-date]");
      if (!tabButton) return;
      state.selectedAdminDate = tabButton.dataset.adminDate;
      renderAppointments();
    });
  }

  if (elements.blockTypeInput) {
    elements.blockTypeInput.addEventListener("change", renderBlocks);
  }

  if (elements.blockBarberInput) {
    elements.blockBarberInput.addEventListener("change", renderBlocks);
  }

  if (elements.blockDateInput) {
    elements.blockDateInput.addEventListener("change", renderBlocks);
  }

  if (elements.btnAddBlock) {
    elements.btnAddBlock.addEventListener("click", addBlock);
  }

  if (elements.settingsForm) {
    elements.settingsForm.addEventListener("submit", saveSettings);
  }

  if (elements.addService) {
    elements.addService.addEventListener("click", () => {
      state.settings.services.push({
        id: `srv-${Date.now()}`,
        name: "Yeni Hizmet",
        price: 100,
        duration: "30 dk"
      });
      renderSettingsForm();
      renderServices();
    });
  }

  if (elements.addBarber) {
    elements.addBarber.addEventListener("click", () => {
      state.settings.barbers.push({
        id: `berber-${Date.now()}`,
        name: "Yeni Berber",
        title: "Uzman",
        initials: "YB"
      });
      renderSettingsForm();
      renderBarberTabs();
    });
  }

  document.addEventListener("click", async (event) => {
    const deleteServiceBtn = event.target.closest("[data-delete-service]");
    if (deleteServiceBtn) {
      const serviceId = deleteServiceBtn.dataset.deleteService;
      state.settings.services = state.settings.services.filter((service) => service.id !== serviceId);
      renderSettingsForm();
      renderServices();
      return;
    }

    const deleteBarberBtn = event.target.closest("[data-delete-barber]");
    if (deleteBarberBtn) {
      const barberId = deleteBarberBtn.dataset.deleteBarber;
      state.settings.barbers = state.settings.barbers.filter((barber) => barber.id !== barberId);

      if (state.selectedBarberId === barberId) {
        state.selectedBarberId = state.settings.barbers[0]?.id || "";
      }

      renderSettingsForm();
      renderBarberTabs();
      return;
    }

    const deleteAppointmentBtn = event.target.closest("[data-delete-appointment]");
    if (deleteAppointmentBtn) {
      const appointmentId = deleteAppointmentBtn.dataset.deleteAppointment;
      if (!window.confirm("Bu randevuyu silmek istiyor musunuz?")) return;

      try {
        await api(`/api/admin/appointments/${encodeURIComponent(appointmentId)}`, { method: "DELETE" });
        await refreshAll();
      } catch (error) {
        window.alert(error.message);
      }
      return;
    }

    const remindBtn = event.target.closest("[data-remind-id]");
    if (remindBtn) {
      const app = state.appointments.find((appointment) => appointment.id === remindBtn.dataset.remindId);
      if (app) openReminderWhatsApp(app);
      return;
    }

    const deleteBlockBtn = event.target.closest("[data-delete-block]");
    if (deleteBlockBtn) {
      const blockId = deleteBlockBtn.dataset.deleteBlock;
      if (!window.confirm("Bu engel kaydini silmek istiyor musunuz?")) return;

      try {
        await api(`/api/admin/blocks?id=${encodeURIComponent(blockId)}`, { method: "DELETE" });
        await refreshAll();
      } catch (error) {
        setMessage(elements.blockMessage, error.message, "error");
      }
    }
  });
}

async function init() {
  await cleanupLegacyBarberlineServiceWorker();
  applyMobileViewportMode();

  if (elements.dateSelect) {
    elements.dateSelect.min = todayISO();
    elements.dateSelect.value = state.selectedDate;
  }

  if (elements.adminDateInput) {
    elements.adminDateInput.value = state.selectedAdminDate;
  }

  if (elements.blockDateInput) {
    elements.blockDateInput.value = todayISO();
  }

  bindEvents();
  applyMobileViewportMode();

  try {
    await refreshAll();
  } catch (error) {
    console.error(error);
    setMessage(elements.formMessage, "Sistem verisi yuklenemedi.", "error");
  }
}

init();
