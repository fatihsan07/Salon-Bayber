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
  notifications: [],
};

const elements = {
  bookingForm: document.querySelector("#bookingForm"),
  customerName: document.querySelector("#customerName"),
  customerPhone: document.querySelector("#customerPhone"),
  serviceSelect: document.querySelector("#serviceSelect"),
  barberSelect: document.querySelector("#barberSelect"),
  dateSelect: document.querySelector("#dateSelect"),
  timeSelect: document.querySelector("#timeSelect"),
  noteInput: document.querySelector("#noteInput"),
  formMessage: document.querySelector("#formMessage"),
  settingsPanel: document.querySelector("#settingsPanel"),
  settingsForm: document.querySelector("#settingsForm"),
  adminLoginForm: document.querySelector("#adminLoginForm"),
  adminPinInput: document.querySelector("#adminPinInput"),
  adminMessage: document.querySelector("#adminMessage"),
  salonNameInput: document.querySelector("#salonNameInput"),
  adminPinNewInput: document.querySelector("#adminPinNewInput"),
  adminPinConfirmInput: document.querySelector("#adminPinConfirmInput"),
  settingsMessage: document.querySelector("#settingsMessage"),
  barberSettings: document.querySelector("#barberSettings"),
  salonNameDisplay: document.querySelector("#salonNameDisplay"),
  brandMark: document.querySelector("#brandMark"),
  resetSettings: document.querySelector("#resetSettings"),
  lockSettings: document.querySelector("#lockSettings"),
  openSettings: document.querySelector("#openSettings"),
  addBarber: document.querySelector("#addBarber"),
  barberList: document.querySelector("#barberList"),
  slotBoard: document.querySelector("#slotBoard"),
  appointmentsPanel: document.querySelector("#appointmentsPanel"),
  appointmentsList: document.querySelector("#appointmentsList"),
  notificationPanel: document.querySelector("#notificationPanel"),
  notificationList: document.querySelector("#notificationList"),
  todayCount: document.querySelector("#todayCount"),
  openSlots: document.querySelector("#openSlots"),
  clearDemo: document.querySelector("#clearDemo"),
  scrollBooking: document.querySelector("#scrollBooking"),
  bookingPanel: document.querySelector("#bookingPanel"),
};

function todayISO() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function makeInitials(name) {
  const words = String(name).trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "BL";

  return words
    .slice(0, 2)
    .map((word) => word[0].toLocaleUpperCase("tr-TR"))
    .join("");
}

function createLocalBarberId(name) {
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

  return `${normalized || "berber"}-${Date.now().toString(36)}`;
}

function formatPrice(price) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(price);
}

function formatDate(dateValue) {
  return new Intl.DateTimeFormat("tr-TR", {
    weekday: "short",
    day: "numeric",
    month: "long",
  }).format(new Date(`${dateValue}T12:00:00`));
}

async function api(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (state.adminToken) {
    headers.Authorization = `Bearer ${state.adminToken}`;
  }

  const response = await fetch(path, {
    ...options,
    headers,
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.message || "İşlem tamamlanamadı.");
  }

  return payload;
}

function getService(id) {
  return state.services.find((service) => service.id === id);
}

function getBarber(id) {
  return state.barbers.find((barber) => barber.id === id);
}

function setMessage(element, message, type = "success") {
  element.textContent = message;
  element.classList.toggle("error", type === "error");
}

function readBarberFormRows() {
  return state.barbers.map((barber) => {
    const nameInput = document.querySelector(`[name="barberName-${CSS.escape(barber.id)}"]`);
    const titleInput = document.querySelector(`[name="barberTitle-${CSS.escape(barber.id)}"]`);
    const name = nameInput?.value.trim() || barber.name;
    const title = titleInput?.value.trim() || barber.title;

    return {
      ...barber,
      name,
      title,
      initials: makeInitials(name),
    };
  });
}

function renderBrand() {
  const salonName = state.settings?.salonName || "Salon Bayber";
  elements.salonNameDisplay.textContent = salonName;
  elements.salonNameInput.value = salonName;
  elements.brandMark.textContent = makeInitials(salonName);
  document.title = `${salonName} Randevu`;
}

function renderSelects() {
  const selectedService = elements.serviceSelect.value;
  const selectedBarber = state.selectedBarberId || elements.barberSelect.value;

  elements.serviceSelect.innerHTML = state.services
    .map(
      (service) =>
        `<option value="${service.id}">${escapeHtml(service.name)} - ${service.duration} dk - ${formatPrice(
          service.price,
        )}</option>`,
    )
    .join("");

  elements.barberSelect.innerHTML = state.barbers
    .map(
      (barber) =>
        `<option value="${barber.id}">${escapeHtml(barber.name)} - ${escapeHtml(barber.title)}</option>`,
    )
    .join("");

  if (selectedService && state.services.some((service) => service.id === selectedService)) {
    elements.serviceSelect.value = selectedService;
  }

  if (selectedBarber && state.barbers.some((barber) => barber.id === selectedBarber)) {
    elements.barberSelect.value = selectedBarber;
  }

  state.selectedBarberId = elements.barberSelect.value;
}

function renderTimeSelect() {
  const currentValue = state.selectedTime || elements.timeSelect.value;

  elements.timeSelect.innerHTML = state.availableSlots
    .map((time) => `<option value="${time}">${time}</option>`)
    .join("");

  if (currentValue && state.availableSlots.includes(currentValue)) {
    elements.timeSelect.value = currentValue;
  } else if (state.availableSlots.length) {
    elements.timeSelect.value = state.availableSlots[0];
  } else {
    elements.timeSelect.innerHTML = `<option value="">Müsait saat yok</option>`;
  }

  state.selectedTime = elements.timeSelect.value;
}

function renderBarbers() {
  elements.barberList.innerHTML = state.barbers
    .map((barber) => {
      const selectedClass = barber.id === state.selectedBarberId ? " is-selected" : "";
      const dailyCount = state.barberCounts[barber.id] || 0;

      return `
        <article class="barber-card${selectedClass}">
          <div class="barber-avatar" aria-hidden="true">${escapeHtml(barber.initials)}</div>
          <div>
            <h3>${escapeHtml(barber.name)}</h3>
            <p>${escapeHtml(barber.title)}</p>
          </div>
          <span class="pill">${dailyCount} randevu</span>
        </article>
      `;
    })
    .join("");
}

function renderSlotBoard() {
  elements.slotBoard.innerHTML = state.timeSlots
    .map((time) => {
      const isAvailable = state.availableSlots.includes(time);
      const selectedClass = state.selectedTime === time ? " is-selected" : "";
      const disabled = isAvailable ? "" : "disabled";

      return `<button class="slot-button${selectedClass}" type="button" data-time="${time}" ${disabled}>${time}</button>`;
    })
    .join("");
}

function renderStats() {
  elements.todayCount.textContent = String(state.todayCount || 0);
  elements.openSlots.textContent = String(state.availableSlots.length);
}

function renderSettingsVisibility() {
  elements.settingsPanel.hidden = !state.adminPanelOpen;
  elements.adminLoginForm.hidden = state.adminUnlocked;
  elements.settingsForm.hidden = !state.adminUnlocked;
  elements.appointmentsPanel.hidden = !state.adminUnlocked;
  elements.notificationPanel.hidden = !state.adminUnlocked;
  elements.clearDemo.hidden = !state.adminUnlocked;
}

function renderSettingsForm() {
  elements.barberSettings.innerHTML = state.barbers
    .map(
      (barber, index) => `
        <fieldset class="barber-setting-row">
          <legend>
            <span>${index + 1}. berber</span>
            <button class="danger-button mini-danger-button" type="button" data-delete-barber="${escapeHtml(
              barber.id,
            )}">Sil</button>
          </legend>
          <div class="field-group">
            <label for="barber-name-${barber.id}">Berber adı</label>
            <input id="barber-name-${barber.id}" name="barberName-${barber.id}" type="text" value="${escapeHtml(
              barber.name,
            )}" required />
          </div>
          <div class="field-group">
            <label for="barber-title-${barber.id}">Uzmanlık</label>
            <input id="barber-title-${barber.id}" name="barberTitle-${barber.id}" type="text" value="${escapeHtml(
              barber.title,
            )}" required />
          </div>
        </fieldset>
      `,
    )
    .join("");

  elements.adminPinNewInput.value = "";
  elements.adminPinConfirmInput.value = "";
}

function renderAppointments() {
  if (!state.appointments.length) {
    elements.appointmentsList.innerHTML = `<p class="empty-state">Aktif randevu bulunmuyor.</p>`;
    return;
  }

  elements.appointmentsList.innerHTML = state.appointments
    .map((appointment) => {
      const barber = getBarber(appointment.barberId) || { name: appointment.barberName || "Berber" };
      const service = getService(appointment.serviceId) || { name: appointment.serviceName || "Hizmet", price: 0 };
      const note = appointment.note ? `<span class="meta-chip">${escapeHtml(appointment.note)}</span>` : "";

      return `
        <article class="appointment-card">
          <div>
            <h3>${escapeHtml(appointment.customerName)}</h3>
            <p>${escapeHtml(appointment.customerPhone)}</p>
            <div class="appointment-meta">
              <span class="meta-chip">${formatDate(appointment.date)} ${appointment.time}</span>
              <span class="meta-chip">${escapeHtml(barber.name)}</span>
              <span class="meta-chip">${escapeHtml(service.name)}</span>
              <span class="meta-chip">${formatPrice(service.price)}</span>
              ${note}
            </div>
          </div>
          <button class="danger-button" type="button" data-cancel="${appointment.id}">İptal et</button>
        </article>
      `;
    })
    .join("");
}

function renderNotifications() {
  if (!state.notifications.length) {
    elements.notificationList.innerHTML = `<p class="empty-state">Henüz SMS bildirimi oluşmadı.</p>`;
    return;
  }

  elements.notificationList.innerHTML = state.notifications
    .map(
      (notification) => `
        <article class="notification-card">
          <div>
            <h3>${escapeHtml(notification.customerName)}</h3>
            <p>${escapeHtml(notification.phone)}</p>
            <p class="notification-text">${escapeHtml(notification.message)}</p>
            ${notification.detail ? `<p class="notification-detail">${escapeHtml(notification.detail)}</p>` : ""}
          </div>
          <span class="notification-status ${notification.status}">${escapeHtml(notification.label)}</span>
        </article>
      `,
    )
    .join("");
}

function renderAll() {
  renderBrand();
  renderSelects();
  renderTimeSelect();
  renderBarbers();
  renderSlotBoard();
  renderStats();
  renderSettingsVisibility();
  renderSettingsForm();
  renderAppointments();
  renderNotifications();
}

async function loadPublicState() {
  const query = new URLSearchParams({
    date: state.selectedDate,
    barberId: state.selectedBarberId,
  });
  const payload = await api(`/api/public-state?${query.toString()}`, {
    headers: {},
  });

  state.settings = payload.settings;
  state.services = payload.services;
  state.barbers = payload.barbers;
  state.timeSlots = payload.timeSlots;
  state.availableSlots = payload.availableSlots;
  state.barberCounts = payload.barberCounts;
  state.todayCount = payload.todayCount;

  if (!state.selectedBarberId && state.barbers.length) {
    state.selectedBarberId = state.barbers[0].id;
  }
}

async function loadAdminDashboard() {
  if (!state.adminToken) return;

  try {
    const payload = await api("/api/admin/dashboard");
    state.appointments = payload.appointments;
    state.notifications = payload.notifications;
    state.settings = payload.settings;
    state.barbers = payload.settings.barbers;
  } catch {
    state.adminToken = "";
    state.adminUnlocked = false;
    state.adminPanelOpen = false;
    sessionStorage.removeItem("barberline-admin-token");
  }
}

async function refreshAll() {
  await loadPublicState();
  await loadAdminDashboard();
  renderAll();
}

async function createAppointment(event) {
  event.preventDefault();
  setMessage(elements.formMessage, "Randevu kaydediliyor...");

  const formData = new FormData(elements.bookingForm);

  try {
    const payload = await api("/api/appointments", {
      method: "POST",
      body: JSON.stringify({
        customerName: formData.get("customerName").trim(),
        customerPhone: formData.get("customerPhone").trim(),
        serviceId: formData.get("serviceSelect"),
        barberId: formData.get("barberSelect"),
        date: formData.get("dateSelect"),
        time: formData.get("timeSelect"),
        note: formData.get("noteInput").trim(),
      }),
    });

    elements.bookingForm.reset();
    elements.dateSelect.value = state.selectedDate;
    elements.noteInput.value = "";
    setMessage(elements.formMessage, payload.message || "Randevu oluşturuldu.");
    await refreshAll();
  } catch (error) {
    setMessage(elements.formMessage, error.message, "error");
    await refreshAll();
  }
}

async function unlockSettings(event) {
  event.preventDefault();
  setMessage(elements.adminMessage, "Kontrol ediliyor...");

  try {
    const payload = await api("/api/admin/login", {
      method: "POST",
      body: JSON.stringify({
        pin: new FormData(elements.adminLoginForm).get("adminPin").trim(),
      }),
    });

    state.adminToken = payload.token;
    state.adminUnlocked = true;
    state.adminPanelOpen = true;
    sessionStorage.setItem("barberline-admin-token", payload.token);
    elements.adminPinInput.value = "";
    setMessage(elements.adminMessage, "");
    await refreshAll();
    setMessage(elements.settingsMessage, "Yönetici paneli açıldı.");
  } catch (error) {
    setMessage(elements.adminMessage, error.message, "error");
  }
}

function openSettingsPanel() {
  state.adminPanelOpen = true;
  renderSettingsVisibility();
  elements.settingsPanel.scrollIntoView({ behavior: "smooth", block: "start" });

  if (!state.adminToken) {
    state.adminUnlocked = false;
    renderSettingsVisibility();
    elements.adminPinInput.focus({ preventScroll: true });
  }
}

function lockSettingsPanel() {
  state.adminToken = "";
  state.adminUnlocked = false;
  state.adminPanelOpen = false;
  sessionStorage.removeItem("barberline-admin-token");
  elements.adminPinInput.value = "";
  setMessage(elements.adminMessage, "");
  setMessage(elements.settingsMessage, "");
  renderAll();
}

async function updateSettings(event) {
  event.preventDefault();
  const formData = new FormData(elements.settingsForm);
  const adminPinNew = formData.get("adminPinNew").trim();
  const adminPinConfirm = formData.get("adminPinConfirm").trim();

  if (adminPinNew && adminPinNew !== adminPinConfirm) {
    setMessage(elements.settingsMessage, "Yeni şifre ve tekrarı aynı değil.", "error");
    return;
  }

  const barbers = state.barbers.map((barber) => {
    const name = formData.get(`barberName-${barber.id}`)?.trim() || "";
    const title = formData.get(`barberTitle-${barber.id}`)?.trim() || "";
    return { ...barber, name, title, initials: makeInitials(name) };
  });

  try {
    await api("/api/admin/settings", {
      method: "PUT",
      body: JSON.stringify({
        salonName: formData.get("salonName").trim(),
        barbers,
        adminPinNew,
      }),
    });

    setMessage(elements.settingsMessage, "Ayarlar kaydedildi.");
    await refreshAll();
  } catch (error) {
    setMessage(elements.settingsMessage, error.message, "error");
  }
}

async function cancelAppointment(id) {
  try {
    await api(`/api/admin/appointments/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });

    setMessage(elements.settingsMessage, "Randevu iptal edildi.");
    await refreshAll();
  } catch (error) {
    setMessage(elements.settingsMessage, error.message, "error");
  }
}

async function resetDemoData() {
  try {
    await refreshAll();
    setMessage(elements.settingsMessage, "Panel yenilendi.");
  } catch (error) {
    setMessage(elements.settingsMessage, error.message, "error");
  }
}

function addBarberRow() {
  state.barbers = [
    ...readBarberFormRows(),
    {
      id: createLocalBarberId("yeni-berber"),
      name: "Yeni Berber",
      title: "Berber",
      initials: "YB",
    },
  ];
  renderSettingsForm();
  setMessage(elements.settingsMessage, "Yeni berber satırı eklendi. Kaydetmeyi unutma.");
}

function deleteBarberRow(id) {
  const nextBarbers = readBarberFormRows().filter((barber) => barber.id !== id);

  if (!nextBarbers.length) {
    setMessage(elements.settingsMessage, "En az bir berber bulunmalı.", "error");
    return;
  }

  state.barbers = nextBarbers;
  renderSettingsForm();
  setMessage(elements.settingsMessage, "Berber satırı kaldırıldı. Kalıcı olması için ayarları kaydet.");
}

async function resetSettingsToDefault() {
  try {
    await api("/api/admin/settings/reset", { method: "POST" });
    setMessage(elements.settingsMessage, "Varsayılan salon bilgileri yüklendi.");
    await refreshAll();
  } catch (error) {
    setMessage(elements.settingsMessage, error.message, "error");
  }
}

function bindEvents() {
  elements.bookingForm.addEventListener("submit", createAppointment);
  elements.adminLoginForm.addEventListener("submit", unlockSettings);
  elements.settingsForm.addEventListener("submit", updateSettings);
  elements.openSettings.addEventListener("click", openSettingsPanel);
  elements.lockSettings.addEventListener("click", lockSettingsPanel);
  elements.addBarber.addEventListener("click", addBarberRow);
  elements.clearDemo.addEventListener("click", resetDemoData);
  elements.resetSettings.addEventListener("click", resetSettingsToDefault);

  elements.barberSettings.addEventListener("click", (event) => {
    const button = event.target.closest("[data-delete-barber]");
    if (!button) return;
    deleteBarberRow(button.dataset.deleteBarber);
  });

  elements.barberSelect.addEventListener("change", async () => {
    state.selectedBarberId = elements.barberSelect.value;
    state.selectedTime = "";
    setMessage(elements.formMessage, "");
    await refreshAll();
  });

  elements.dateSelect.addEventListener("change", async () => {
    state.selectedDate = elements.dateSelect.value;
    state.selectedTime = "";
    setMessage(elements.formMessage, "");
    await refreshAll();
  });

  elements.timeSelect.addEventListener("change", () => {
    state.selectedTime = elements.timeSelect.value;
    renderSlotBoard();
  });

  elements.slotBoard.addEventListener("click", (event) => {
    const button = event.target.closest("[data-time]");
    if (!button || button.disabled) return;
    state.selectedTime = button.dataset.time;
    elements.timeSelect.value = button.dataset.time;
    renderSlotBoard();
  });

  elements.appointmentsList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-cancel]");
    if (!button) return;
    cancelAppointment(button.dataset.cancel);
  });

  elements.scrollBooking.addEventListener("click", () => {
    elements.bookingPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    elements.customerName.focus({ preventScroll: true });
  });
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
}

async function init() {
  elements.dateSelect.min = todayISO();
  elements.dateSelect.value = state.selectedDate;
  bindEvents();

  try {
    await refreshAll();
  } catch (error) {
    setMessage(elements.formMessage, error.message, "error");
  }

  registerServiceWorker();
}

init();
