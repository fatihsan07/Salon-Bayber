const state = {
  settings: { services: [], barbers: [], salonName: "" },
  timeSlots: [],
  selectedDate: todayISO(),
  selectedBarberId: "",
  selectedTime: "",
  availableSlots: [],
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
  serviceCheckboxes: document.querySelector("#serviceCheckboxes"),
  totalPriceDisplay: document.querySelector("#totalPriceDisplay"),
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
  serviceSettings: document.querySelector("#serviceSettings"),
  salonNameDisplay: document.querySelector("#salonNameDisplay"),
  brandMark: document.querySelector("#brandMark"),
  lockSettings: document.querySelector("#lockSettings"),
  openSettings: document.querySelector("#openSettings"),
  addBarber: document.querySelector("#addBarber"),
  addService: document.querySelector("#addService"),
  barberList: document.querySelector("#barberList"),
  slotBoard: document.querySelector("#slotBoard"),
  appointmentsPanel: document.querySelector("#appointmentsPanel"),
  appointmentsList: document.querySelector("#appointmentsList"),
  todayCount: document.querySelector("#todayCount"),
  openSlots: document.querySelector("#openSlots"),
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
    element.style.color = type === "error" ? "#ff4d4d" : "var(--primary)";
  }
}

function renderBrand() {
  const salonName = state.settings?.salonName || "Salon Bayber";
  if(elements.salonNameDisplay) elements.salonNameDisplay.textContent = salonName;
  if(elements.salonNameInput) elements.salonNameInput.value = salonName;
  if(elements.brandMark) elements.brandMark.textContent = makeInitials(salonName);
  document.title = `${salonName} Randevu`;
}

// ÇOKLU HİZMET VE FİYAT HESAPLAMA
function calculateTotal() {
  const checkboxes = document.querySelectorAll('input[name="serviceItem"]:checked');
  let total = 0;
  checkboxes.forEach(cb => {
    const service = state.settings.services.find(s => s.id === cb.value);
    if(service) total += Number(service.price);
  });
  if(elements.totalPriceDisplay) elements.totalPriceDisplay.textContent = formatPrice(total);
}

function renderServicesAndBarbers() {
  const selectedBarber = state.selectedBarberId || elements.barberSelect?.value;

  if(elements.serviceCheckboxes) {
    elements.serviceCheckboxes.innerHTML = state.settings.services.map(s => `
      <label class="checkbox-label">
        <input type="checkbox" name="serviceItem" value="${s.id}">
        <span>${escapeHtml(s.name)}</span>
        <span class="service-price-tag">${formatPrice(s.price)}</span>
      </label>
    `).join("");
    
    // Checkboxlara dinleyici ekle
    document.querySelectorAll('input[name="serviceItem"]').forEach(cb => {
      cb.addEventListener('change', calculateTotal);
    });
    calculateTotal(); // Sıfırla
  }

  if(elements.barberSelect) {
    elements.barberSelect.innerHTML = state.settings.barbers.map(b => `<option value="${b.id}">${escapeHtml(b.name)}</option>`).join("");
    if (selectedBarber && state.settings.barbers.some(b => b.id === selectedBarber)) elements.barberSelect.value = selectedBarber;
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

function renderBarbersList() {
  if(!elements.barberList) return;
  elements.barberList.innerHTML = state.settings.barbers.map(b => {
    const selectedClass = b.id === state.selectedBarberId ? " is-selected" : "";
    return `<article class="barber-card${selectedClass}" style="border-color: var(--border);">
              <div class="barber-avatar" style="background:var(--primary); color:#000;">${escapeHtml(b.initials)}</div>
              <div><h3>${escapeHtml(b.name)}</h3><p style="color:var(--text-muted);">${escapeHtml(b.title)}</p></div>
            </article>`;
  }).join("");
}

function renderSlotBoard() {
  if(!elements.slotBoard) return;
  elements.slotBoard.innerHTML = state.timeSlots.map(t => {
    const isAvailable = state.availableSlots.includes(t);
    const selectedClass = state.selectedTime === t ? " is-selected" : "";
    const disabled = isAvailable ? "" : "disabled";
    return `<button class="slot-button${selectedClass}" type="button" data-time="${t}" ${disabled} style="${isAvailable ? 'border-color:var(--border); color:var(--text);' : 'opacity:0.3;'}">${t}</button>`;
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

// YÖNETİCİ PANELİ İÇERİĞİ (FİYAT VE BERBER DÜZENLEME)
function renderSettingsForm() {
  if(!elements.serviceSettings || !elements.barberSettings) return;

  elements.serviceSettings.innerHTML = state.settings.services.map((s, index) => `
    <div class="admin-row-box">
      <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
        <span style="color:var(--primary); font-weight:bold;">Hizmet ${index + 1}</span>
        <button class="danger-button mini-danger-button" type="button" data-delete-service="${escapeHtml(s.id)}" style="background:transparent; color:#ff4d4d; border:1px solid #ff4d4d;">Sil</button>
      </div>
      <div class="field-row">
        <div class="field-group">
          <label>Hizmet Adı</label>
          <input name="serviceName-${s.id}" type="text" value="${escapeHtml(s.name)}" required />
        </div>
        <div class="field-group">
          <label>Fiyat (₺)</label>
          <input name="servicePrice-${s.id}" type="number" value="${s.price}" required />
        </div>
      </div>
    </div>
  `).join("");

  elements.barberSettings.innerHTML = state.settings.barbers.map((b, index) => `
    <div class="admin-row-box">
      <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
        <span style="color:var(--primary); font-weight:bold;">Berber ${index + 1}</span>
        <button class="danger-button mini-danger-button" type="button" data-delete-barber="${escapeHtml(b.id)}" style="background:transparent; color:#ff4d4d; border:1px solid #ff4d4d;">Sil</button>
      </div>
      <div class="field-row">
        <div class="field-group">
          <label>Berber Adı</label>
          <input name="barberName-${b.id}" type="text" value="${escapeHtml(b.name)}" required />
        </div>
        <div class="field-group">
          <label>Uzmanlık</label>
          <input name="barberTitle-${b.id}" type="text" value="${escapeHtml(b.title)}" required />
        </div>
      </div>
    </div>
  `).join("");
}

function renderAppointments() {
  if(!elements.appointmentsList) return;
  if (!state.appointments.length) {
    elements.appointmentsList.innerHTML = `<p class="empty-state">Aktif randevu bulunmuyor.</p>`;
    return;
  }
  elements.appointmentsList.innerHTML = state.appointments.map(app => {
    const barber = state.settings.barbers.find(b => b.id === app.barberId) || { name: "Berber" };
    // Hizmet isimlerini bul
    const serviceNames = app.serviceIds.map(id => {
       const s = state.settings.services.find(serv => serv.id === id);
       return s ? s.name : "Hizmet";
    }).join(", ");

    return `<article class="appointment-card" style="display: flex; justify-content: space-between; background:var(--bg); border-color:var(--border);">
              <div>
                <h3 style="color:var(--primary);">${escapeHtml(app.customerName)}</h3>
                <p>${escapeHtml(app.customerPhone)}</p>
                <div class="appointment-meta" style="margin-top:10px;">
                  <span class="meta-chip" style="border-color:var(--border);">${formatDate(app.date)} ${app.time}</span>
                  <span class="meta-chip" style="border-color:var(--border);">${escapeHtml(barber.name)}</span>
                  <span class="meta-chip" style="border-color:var(--border); color:var(--primary);">${escapeHtml(serviceNames)}</span>
                  <span class="meta-chip" style="border-color:#ff4d4d; color:#ff4d4d;">İptal Kodu: ${escapeHtml(app.cancelCode || '-')}</span>
                </div>
              </div>
              <button class="danger-button" type="button" data-cancel="${app.id}" style="background-color: #ff4d4d; color:white; border:none; height:fit-content;">İptal Et</button>
            </article>`;
  }).join("");
}

function renderAll() {
  renderBrand(); renderServicesAndBarbers(); renderTimeSelect(); renderBarbersList(); 
  renderSlotBoard(); renderStats(); renderSettingsVisibility(); renderSettingsForm(); renderAppointments();
}

async function loadPublicState() {
  const query = new URLSearchParams({ date: state.selectedDate, barberId: state.selectedBarberId });
  const payload = await api(`/api/public-state?${query.toString()}`);
  state.settings = payload.settings;
  state.timeSlots = payload.timeSlots;
  state.availableSlots = payload.availableSlots;
  state.todayCount = payload.todayCount;
  if (!state.selectedBarberId && state.settings.barbers.length) state.selectedBarberId = state.settings.barbers[0].id;
}

async function loadAdminDashboard() {
  if (!state.adminToken) return;
  try {
    const payload = await api("/api/admin/dashboard");
    state.appointments = payload.appointments;
    state.settings = payload.settings;
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

async function createAppointment(event) {
  event.preventDefault();
  setMessage(elements.formMessage, "Randevu kaydediliyor...", "success");

  const formData = new FormData(elements.bookingForm);
  const customerPhone = formData.get("customerPhone").trim();
  const customerName = formData.get("customerName").trim();
  const dateSelect = formData.get("dateSelect");
  const timeSelect = formData.get("timeSelect");

  // İşaretlenen hizmetleri topla
  const checkedServices = Array.from(document.querySelectorAll('input[name="serviceItem"]:checked')).map(cb => cb.value);
  if(checkedServices.length === 0) {
    setMessage(elements.formMessage, "Lütfen en az bir hizmet seçin.", "error");
    return;
  }

  try {
    const payload = await api("/api/appointments", {
      method: "POST",
      body: JSON.stringify({
        customerName: customerName,
        customerPhone: customerPhone,
        serviceIds: checkedServices,
        barberId: formData.get("barberSelect"),
        date: dateSelect,
        time: timeSelect
      }),
    });

    elements.bookingForm.reset();
    calculateTotal();
    elements.dateSelect.value = state.selectedDate;
    setMessage(elements.formMessage, "Randevu oluşturuldu! WhatsApp fişiniz açılıyor...");
    await refreshAll();

    let phone = customerPhone.replace(/[^0-9]/g, '');
    if (phone.startsWith('0')) phone = '90' + phone.substring(1);
    if (phone.length === 10) phone = '90' + phone; 

    // WhatsApp'ta gösterilecek hizmet isimleri ve toplam fiyat hesabı
    let totalPrice = 0;
    const serviceNames = checkedServices.map(id => {
      const s = state.settings.services.find(serv => serv.id === id);
      if(s) totalPrice += Number(s.price);
      return s ? s.name : "";
    }).join(", ");

    const waText = encodeURIComponent(`Merhaba ${customerName}! Salon Bayber randevunuz başarıyla oluşturulmuştur.\n\n📅 Tarih: ${formatDate(dateSelect)}\n⏰ Saat: ${timeSelect}\n✂️ Hizmetler: ${serviceNames}\n💰 Toplam Tutar: ₺${totalPrice}\n\nİPTAL KODUNUZ: ${payload.cancelCode}\nFikriniz değişirse sitemizden bu kod ile randevunuzu iptal edebilirsiniz.`);
    window.open(`https://wa.me/${phone}?text=${waText}`, '_blank');

  } catch (error) {
    setMessage(elements.formMessage, error.message, "error");
  }
}

async function customerCancelAppointment(event) {
  event.preventDefault();
  setMessage(elements.cancelMessage, "Kontrol ediliyor...");
  try {
    const payload = await api("/api/appointments/cancel", {
      method: "POST",
      body: JSON.stringify({ code: elements.cancelCodeInput.value.trim() }),
    });
    setMessage(elements.cancelMessage, payload.message);
    elements.cancelForm.reset();
    await refreshAll();
  } catch (error) {
    setMessage(elements.cancelMessage, error.message, "error");
  }
}

async function unlockSettings(event) {
  event.preventDefault();
  setMessage(elements.adminMessage, "Giriş yapılıyor...");
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

async function saveSettings(event) {
  event.preventDefault();
  const formData = new FormData(elements.settingsForm);
  
  // Hizmetleri Güncelle
  const newServices = state.settings.services.map(s => ({
    id: s.id,
    name: formData.get(`serviceName-${s.id}`)?.trim() || "",
    price: Number(formData.get(`servicePrice-${s.id}`)) || 0
  }));

  // Berberleri Güncelle
  const newBarbers = state.settings.barbers.map(b => ({
    id: b.id,
    name: formData.get(`barberName-${b.id}`)?.trim() || "",
    title: formData.get(`barberTitle-${b.id}`)?.trim() || "",
    initials: makeInitials(formData.get(`barberName-${b.id}`)?.trim() || "")
  }));

  try {
    await api("/api/admin/settings", {
      method: "PUT",
      body: JSON.stringify({
        salonName: formData.get("salonName").trim(),
        services: newServices,
        barbers: newBarbers
      }),
    });
    setMessage(elements.settingsMessage, "Ayarlar başarıyla kaydedildi.");
    await refreshAll();
  } catch (error) {
    setMessage(elements.settingsMessage, error.message, "error");
  }
}

function bindEvents() {
  if(elements.bookingForm) elements.bookingForm.addEventListener("submit", createAppointment);
  if(elements.cancelForm) elements.cancelForm.addEventListener("submit", customerCancelAppointment);
  if(elements.adminLoginForm) elements.adminLoginForm.addEventListener("submit", unlockSettings);
  if(elements.settingsForm) elements.settingsForm.addEventListener("submit", saveSettings);
  if(elements.openSettings) elements.openSettings.addEventListener("click", openSettingsPanel);
  if(elements.lockSettings) elements.lockSettings.addEventListener("click", lockSettingsPanel);

  if(elements.addService) elements.addService.addEventListener("click", () => {
    state.settings.services.push({ id: `srv-${Date.now()}`, name: "Yeni Hizmet", price: 100 });
    renderSettingsForm();
  });

  if(elements.addBarber) elements.addBarber.addEventListener("click", () => {
    state.settings.barbers.push({ id: `berber-${Date.now()}`, name: "Yeni Berber", title: "Uzman", initials: "YB" });
    renderSettingsForm();
  });

  // Silme butonları dinleyicisi
  document.addEventListener("click", async (event) => {
    const btnCancel = event.target.closest("[data-cancel]");
    if (btnCancel) {
      try { await api(`/api/admin/appointments/${encodeURIComponent(btnCancel.dataset.cancel)}`, { method: "DELETE" }); await refreshAll(); } 
      catch (e) { alert("Hata: " + e.message); }
    }
    
    const btnDelSrv = event.target.closest("[data-delete-service]");
    if(btnDelSrv) {
      state.settings.services = state.settings.services.filter(s => s.id !== btnDelSrv.dataset.deleteService);
      renderSettingsForm();
    }

    const btnDelBrb = event.target.closest("[data-delete-barber]");
    if(btnDelBrb) {
      state.settings.barbers = state.settings.barbers.filter(b => b.id !== btnDelBarber.dataset.deleteBarber);
      renderSettingsForm();
    }
  });

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