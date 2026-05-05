const state = {
  settings: null,
  services: [],
  barbers: [],
  timeSlots: [],
  selectedDate: todayISO(),
  selectedBarberId: "",
  selectedTime: "",
  availableSlots: [],
  barberCounts: {},
  todayCount: 0,
  adminToken: sessionStorage.getItem("barberline-admin-token") || "",
  adminUnlocked: Boolean(sessionStorage.getItem("barberline-admin-token")),
  adminPanelOpen: Boolean(sessionStorage.getItem("barberline-admin-token")),
  appointments: [],
};

const elements = {
  bookingForm: document.querySelector("#bookingForm"),
  customerName: document.querySelector("#customerName"),
  customerPhone: document.querySelector("#customerPhone"),
  serviceSelect: document.querySelector("#serviceSelect"),
  barberSelect: document.querySelector("#barberSelect"),
  dateSelect: document.querySelector("#dateSelect"),
  timeSelect: document.querySelector("#timeSelect"),
  formMessage: document.querySelector("#formMessage"),
  settingsPanel: document.querySelector("#settingsPanel"),
  settingsForm: document.querySelector("#settingsForm"),
  adminLoginForm: document.querySelector("#adminLoginForm"),
  adminPinInput: document.querySelector("#adminPinInput"),
  adminMessage: document.querySelector("#adminMessage"),
  salonNameInput: document.querySelector("#salonNameInput"),
  settingsMessage: document.querySelector("#settingsMessage"),
  barberSettings: document.querySelector("#barberSettings"),
  salonNameDisplay: document.querySelector("#salonNameDisplay"),
  brandMark: document.querySelector("#brandMark"),
  lockSettings: document.querySelector("#lockSettings"),
  openSettings: document.querySelector("#openSettings"),
  addBarber: document.querySelector("#addBarber"),
  barberList: document.querySelector("#barberList"),
  slotBoard: document.querySelector("#slotBoard"),
  appointmentsPanel: document.querySelector("#appointmentsPanel"),
  appointmentsList: document.querySelector("#appointmentsList"),
  todayCount: document.querySelector("#todayCount"),
  openSlots: document.querySelector("#openSlots"),
  scrollBooking: document.querySelector("#scrollBooking"),
  cancelForm: document.querySelector("#cancelForm"),
  cancelCodeInput: document.querySelector("#cancelCodeInput"),
  cancelMessage: document.querySelector("#cancelMessage"),
};

function todayISO() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function escapeHtml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function makeInitials(name) {
  const words = String(name).trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "BL";
  return words.slice(0, 2).map((word) => word[0].toLocaleUpperCase("tr-TR")).join("");
}

function formatPrice(price) {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(price);
}

function formatDate(dateValue) {
  return new Intl.DateTimeFormat("tr-TR", { weekday: "short", day: "numeric", month: "long" }).format(new Date(`${dateValue}T12:00:00`));
}

async function api(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (state.adminToken) headers.Authorization = `Bearer ${state.adminToken}`;
  const response = await fetch(path, { ...options, headers });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || "İşlem başarısız.");
  return payload;
}

function setMessage(element, message, type = "success") {
  if(element) {
    element.textContent = message;
    element.classList.toggle("error", type === "error");
  }
}

function renderBrand() {
  const salonName = state.settings?.salonName || "Salon Bayber";
  if(elements.salonNameDisplay) elements.salonNameDisplay.textContent = salonName;
  if(elements.salonNameInput) elements.salonNameInput.value = salonName;
  if(elements.brandMark) elements.brandMark.textContent = makeInitials(salonName);
  document.title = `${salonName} Randevu`;
}

function renderSelects() {
  const selectedService = elements.serviceSelect?.value;
  const selectedBarber = state.selectedBarberId || elements.barberSelect?.value;

  if(elements.serviceSelect) {
    elements.serviceSelect.innerHTML = state.services.map(s => `<option value="${s.id}">${escapeHtml(s.name)} - ${formatPrice(s.price)}</option>`).join("");
    if (selectedService && state.services.some(s => s.id === selectedService)) elements.serviceSelect.value = selectedService;
  }

  if(elements.barberSelect) {
    elements.barberSelect.innerHTML = state.barbers.map(b => `<option value="${b.id}">${escapeHtml(b.name)}</option>`).join("");
    if (selectedBarber && state.barbers.some(b => b.id === selectedBarber)) elements.barberSelect.value = selectedBarber;
    state.selectedBarberId = elements.barberSelect.value;
  }
}

function renderTimeSelect() {
  if(!elements.timeSelect) return;
  const currentValue = state.selectedTime || elements.timeSelect.value;
  elements.timeSelect.innerHTML = state.availableSlots.map(t => `<option value="${t}">${t}</option>`).join("");
  
  if (currentValue && state.availableSlots.includes(currentValue)) elements.timeSelect.value = currentValue;
  else if (state.availableSlots.length) elements.timeSelect.value = state.availableSlots[0];
  else elements.timeSelect.innerHTML = `<option value="">Müsait yok</option>`;
  
  state.selectedTime = elements.timeSelect.value;
}

function renderBarbers() {
  if(!elements.barberList) return;
  elements.barberList.innerHTML = state.barbers.map(b => {
    const selectedClass = b.id === state.selectedBarberId ? " is-selected" : "";
    return `<article class="barber-card${selectedClass}">
              <div class="barber-avatar">${escapeHtml(b.initials)}</div>
              <div><h3>${escapeHtml(b.name)}</h3><p>${escapeHtml(b.title)}</p></div>
            </article>`;
  }).join("");
}

function renderSlotBoard() {
  if(!elements.slotBoard) return;
  elements.slotBoard.innerHTML = state.timeSlots.map(t => {
    const isAvailable = state.availableSlots.includes(t);
    const selectedClass = state.selectedTime === t ? " is-selected" : "";
    const disabled = isAvailable ? "" : "disabled";
    return `<button class="slot-button${selectedClass}" type="button" data-time="${t}" ${disabled}>${t}</button>`;
  }).join("");
}

function renderStats() {
  if(elements.todayCount) elements.todayCount.textContent = String(state.todayCount || 0);
  if(elements.openSlots) elements.openSlots.textContent = String(state.availableSlots.length);
}

function renderSettingsVisibility() {
  if(elements.settingsPanel) elements.settingsPanel.hidden = !state.adminPanelOpen;
  if(elements.adminLoginForm) elements.adminLoginForm.hidden = state.adminUnlocked;
  if(elements.settingsForm) elements.settingsForm.hidden = !state.adminUnlocked;
  if(elements.appointmentsPanel) elements.appointmentsPanel.hidden = !state.adminUnlocked;
}

function renderAppointments() {
  if(!elements.appointmentsList) return;
  if (!state.appointments.length) {
    elements.appointmentsList.innerHTML = `<p class="empty-state">Aktif randevu bulunmuyor.</p>`;
    return;
  }
  elements.appointmentsList.innerHTML = state.appointments.map(app => {
    const barber = state.barbers.find(b => b.id === app.barberId) || { name: "Berber" };
    return `<article class="appointment-card" style="display: flex; justify-content: space-between;">
              <div>
                <h3>${escapeHtml(app.customerName)}</h3>
                <p>${escapeHtml(app.customerPhone)}</p>
                <div class="appointment-meta">
                  <span class="meta-chip">${formatDate(app.date)} ${app.time}</span>
                  <span class="meta-chip">${escapeHtml(barber.name)}</span>
                  <span class="meta-chip">İptal Kodu: ${escapeHtml(app.cancelCode || '-')}</span>
                </div>
              </div>
              <button class="danger-button" type="button" data-cancel="${app.id}">Sistemi İptal Et</button>
            </article>`;
  }).join("");
}

function renderAll() {
  renderBrand(); renderSelects(); renderTimeSelect(); renderBarbers(); 
  renderSlotBoard(); renderStats(); renderSettingsVisibility(); renderAppointments();
}

async function loadPublicState() {
  const query = new URLSearchParams({ date: state.selectedDate, barberId: state.selectedBarberId });
  const payload = await api(`/api/public-state?${query.toString()}`);
  Object.assign(state, payload);
  if (!state.selectedBarberId && state.barbers.length) state.selectedBarberId = state.barbers[0].id;
}

async function loadAdminDashboard() {
  if (!state.adminToken) return;
  try {
    const payload = await api("/api/admin/dashboard");
    state.appointments = payload.appointments;
    state.settings = payload.settings;
    state.barbers = payload.settings.barbers;
  } catch {
    state.adminToken = ""; state.adminUnlocked = false; state.adminPanelOpen = false;
    sessionStorage.removeItem("barberline-admin-token");
  }
}

async function refreshAll() {
  await loadPublicState();
  await loadAdminDashboard();
  renderAll();
}

// RANDEVU OLUŞTURMA VE WHATSAPP BİLDİRİMİ
async function createAppointment(event) {
  event.preventDefault();
  setMessage(elements.formMessage, "Randevu kaydediliyor...");

  const formData = new FormData(elements.bookingForm);
  const customerPhone = formData.get("customerPhone").trim();
  const customerName = formData.get("customerName").trim();
  const dateSelect = formData.get("dateSelect");
  const timeSelect = formData.get("timeSelect");

  try {
    const payload = await api("/api/appointments", {
      method: "POST",
      body: JSON.stringify({
        customerName: customerName,
        customerPhone: customerPhone,
        serviceId: formData.get("serviceSelect"),
        barberId: formData.get("barberSelect"),
        date: dateSelect,
        time: timeSelect
      }),
    });

    elements.bookingForm.reset();
    elements.dateSelect.value = state.selectedDate;
    setMessage(elements.formMessage, "Randevu oluşturuldu! WhatsApp fişiniz açılıyor...");
    await refreshAll();

    let phone = customerPhone.replace(/[^0-9]/g, '');
    if (phone.startsWith('0')) phone = '90' + phone.substring(1);
    if (phone.length === 10) phone = '90' + phone; 

    // İptal Kodu WhatsApp Fişine Ekleniyor
    const waText = encodeURIComponent(`Merhaba ${customerName}! Salon Bayber randevunuz başarıyla oluşturulmuştur.\nTarih: ${formatDate(dateSelect)}\nSaat: ${timeSelect}\n\nİPTAL KODUNUZ: ${payload.cancelCode}\nFikriniz değişirse bu kodla randevunuzu sitemizden iptal edebilirsiniz.`);
    window.open(`https://wa.me/${phone}?text=${waText}`, '_blank');

  } catch (error) {
    setMessage(elements.formMessage, error.message, "error");
  }
}

// MÜŞTERİ KENDİ RANDEVUSUNU İPTAL ETME
async function customerCancelAppointment(event) {
  event.preventDefault();
  setMessage(elements.cancelMessage, "Kontrol ediliyor...");
  const code = elements.cancelCodeInput.value.trim();

  try {
    const payload = await api("/api/appointments/cancel", {
      method: "POST",
      body: JSON.stringify({ code: code }),
    });
    setMessage(elements.cancelMessage, payload.message);
    elements.cancelForm.reset();
    await refreshAll();
  } catch (error) {
    setMessage(elements.cancelMessage, error.message, "error");
  }
}

// YÖNETİCİ GİRİŞİ
async function unlockSettings(event) {
  event.preventDefault();
  setMessage(elements.adminMessage, "Kontrol ediliyor...");
  try {
    const payload = await api("/api/admin/login", {
      method: "POST",
      body: JSON.stringify({ pin: new FormData(elements.adminLoginForm).get("adminPin").trim() }),
    });
    state.adminToken = payload.token; state.adminUnlocked = true; state.adminPanelOpen = true;
    sessionStorage.setItem("barberline-admin-token", payload.token);
    elements.adminPinInput.value = ""; setMessage(elements.adminMessage, "");
    await refreshAll();
  } catch (error) {
    setMessage(elements.adminMessage, error.message, "error");
  }
}

function openSettingsPanel() {
  state.adminPanelOpen = true; renderSettingsVisibility();
  if(elements.settingsPanel) elements.settingsPanel.scrollIntoView({ behavior: "smooth" });
}

function lockSettingsPanel() {
  state.adminToken = ""; state.adminUnlocked = false; state.adminPanelOpen = false;
  sessionStorage.removeItem("barberline-admin-token");
  renderAll();
}

function bindEvents() {
  if(elements.bookingForm) elements.bookingForm.addEventListener("submit", createAppointment);
  if(elements.cancelForm) elements.cancelForm.addEventListener("submit", customerCancelAppointment);
  if(elements.adminLoginForm) elements.adminLoginForm.addEventListener("submit", unlockSettings);
  if(elements.openSettings) elements.openSettings.addEventListener("click", openSettingsPanel);
  if(elements.lockSettings) elements.lockSettings.addEventListener("click", lockSettingsPanel);

  if(elements.barberSelect) elements.barberSelect.addEventListener("change", async () => {
    state.selectedBarberId = elements.barberSelect.value; state.selectedTime = "";
    await refreshAll();
  });

  if(elements.dateSelect) elements.dateSelect.addEventListener("change", async () => {
    state.selectedDate = elements.dateSelect.value; state.selectedTime = "";
    await refreshAll();
  });

  if(elements.timeSelect) elements.timeSelect.addEventListener("change", () => {
    state.selectedTime = elements.timeSelect.value; renderSlotBoard();
  });

  if(elements.slotBoard) elements.slotBoard.addEventListener("click", (event) => {
    const button = event.target.closest("[data-time]");
    if (!button || button.disabled) return;
    state.selectedTime = button.dataset.time; elements.timeSelect.value = button.dataset.time;
    renderSlotBoard();
  });

  if(elements.appointmentsList) elements.appointmentsList.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-cancel]");
    if (!button) return;
    try {
      await api(`/api/admin/appointments/${encodeURIComponent(button.dataset.cancel)}`, { method: "DELETE" });
      await refreshAll();
    } catch (e) { alert("Hata: " + e.message); }
  });
}

async function init() {
  if(elements.dateSelect) {
    elements.dateSelect.min = todayISO();
    elements.dateSelect.value = state.selectedDate;
  }
  bindEvents();
  try { await refreshAll(); } catch (error) { console.error(error); }
}

init();