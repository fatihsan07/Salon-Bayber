const state = {
  settings: { services: [], barbers: [], salonName: "", salonPhone: "", salonAddress: "", salonImage: "" },
  timeSlots: [],
  selectedDate: todayISO(),
  selectedBarberId: "",
  selectedTime: "",
  availableSlots: [],
  todayCount: 0,
  adminToken: sessionStorage.getItem("barberline-admin-token") || "",
  adminUnlocked: Boolean(sessionStorage.getItem("barberline-admin-token")),
  showLoginScreen: false,
  appointments: [],
};

const elements = {
  customerMain: document.querySelector("#customerMain"),
  adminMain: document.querySelector("#adminMain"),
  adminLoginSection: document.querySelector("#adminLoginSection"),
  adminDashboardSection: document.querySelector("#adminDashboardSection"),
  btnShowLogin: document.querySelector("#btnShowLogin"),
  btnCancelLogin: document.querySelector("#btnCancelLogin"),
  lockSettings: document.querySelector("#lockSettings"),
  adminGreeting: document.querySelector("#adminGreeting"),

  bookingForm: document.querySelector("#bookingForm"),
  customerName: document.querySelector("#customerName"),
  customerPhone: document.querySelector("#customerPhone"),
  serviceCheckboxes: document.querySelector("#serviceCheckboxes"),
  totalPriceDisplay: document.querySelector("#totalPriceDisplay"),
  barberSelect: document.querySelector("#barberSelect"),
  dateSelect: document.querySelector("#dateSelect"),
  timeSelect: document.querySelector("#timeSelect"),
  formMessage: document.querySelector("#formMessage"),
  
  settingsForm: document.querySelector("#settingsForm"),
  adminLoginForm: document.querySelector("#adminLoginForm"),
  adminPinInput: document.querySelector("#adminPinInput"),
  adminMessage: document.querySelector("#adminMessage"),
  
  salonNameInput: document.querySelector("#salonNameInput"),
  salonPhoneInput: document.querySelector("#salonPhoneInput"),
  salonAddressInput: document.querySelector("#salonAddressInput"),
  salonImageInput: document.querySelector("#salonImageInput"),
  
  displayPhone: document.querySelector("#displayPhone"),
  displayAddress: document.querySelector("#displayAddress"),
  displayMapLink: document.querySelector("#displayMapLink"),
  mainShopImage: document.querySelector("#mainShopImage"),
  
  settingsMessage: document.querySelector("#settingsMessage"),
  barberSettings: document.querySelector("#barberSettings"),
  serviceSettings: document.querySelector("#serviceSettings"),
  salonNameDisplay: document.querySelector("#salonNameDisplay"),
  addBarber: document.querySelector("#addBarber"),
  addService: document.querySelector("#addService"),
  barberList: document.querySelector("#barberList"),
  slotBoard: document.querySelector("#slotBoard"),
  appointmentsList: document.querySelector("#appointmentsList"),
  todayCount: document.querySelector("#todayCount"),
  openSlots: document.querySelector("#openSlots"),
  cancelForm: document.querySelector("#cancelForm"),
  cancelCodeInput: document.querySelector("#cancelCodeInput"),
  cancelMessage: document.querySelector("#cancelMessage")
};

function todayISO() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function escapeHtml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
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
  const salonPhone = state.settings?.salonPhone || "0539 577 2999";
  const salonAddress = state.settings?.salonAddress || "Reyhanlı, Hatay";
  const salonImage = state.settings?.salonImage || "https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=1200&q=80";

  if(elements.salonNameInput) elements.salonNameInput.value = salonName;
  if(elements.salonPhoneInput) elements.salonPhoneInput.value = salonPhone;
  if(elements.salonAddressInput) elements.salonAddressInput.value = salonAddress;
  if(elements.salonImageInput) elements.salonImageInput.value = salonImage;
  
  if(elements.displayPhone) elements.displayPhone.textContent = salonPhone;
  if(elements.displayAddress) elements.displayAddress.textContent = salonAddress;
  if(elements.displayMapLink) elements.displayMapLink.href = `https://maps.google.com/?q=${encodeURIComponent(salonAddress)}`;
  if(elements.mainShopImage) elements.mainShopImage.src = salonImage;

  document.title = `${salonName} Randevu`;
}

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
  state.settings.services = state.settings.services || [];
  state.settings.barbers = state.settings.barbers || [];

  if(elements.serviceCheckboxes) {
    elements.serviceCheckboxes.innerHTML = state.settings.services.map(s => `
      <label class="checkbox-label" style="background-color: #0a0a0a !important; color: #fff !important; border: 1px solid #333 !important;">
        <input type="checkbox" name="serviceItem" value="${s.id}">
        <span style="color:#fff !important;">${escapeHtml(s.name)}</span>
        <span class="service-price-tag" style="color:var(--primary) !important;">${formatPrice(s.price)}</span>
      </label>
    `).join("");
    document.querySelectorAll('input[name="serviceItem"]').forEach(cb => cb.addEventListener('change', calculateTotal));
    calculateTotal(); 
  }

  if(elements.barberSelect) {
    elements.barberSelect.innerHTML = state.settings.barbers.map(b => `<option value="${b.id}" style="background-color:#0a0a0a; color:#fff;">${escapeHtml(b.name)}</option>`).join("");
    if (selectedBarber && state.settings.barbers.some(b => b.id === selectedBarber)) elements.barberSelect.value = selectedBarber;
    state.selectedBarberId = elements.barberSelect.value;
  }
}

function renderTimeSelect() {
  if(!elements.timeSelect) return;
  const currentValue = state.selectedTime || elements.timeSelect.value;
  elements.timeSelect.innerHTML = state.availableSlots.map(t => `<option value="${t}" style="background-color:#0a0a0a; color:#fff;">${t}</option>`).join("");
  if (currentValue && state.availableSlots.includes(currentValue)) elements.timeSelect.value = currentValue;
  else if (state.availableSlots.length) elements.timeSelect.value = state.availableSlots[0];
  else elements.timeSelect.innerHTML = `<option value="" style="background-color:#0a0a0a; color:#fff;">Müsait yok</option>`;
  state.selectedTime = elements.timeSelect.value;
}

function renderBarbersList() {
  if(!elements.barberList) return;
  state.settings.barbers = state.settings.barbers || [];
  elements.barberList.innerHTML = state.settings.barbers.map(b => {
    const initials = b.initials || "BL";
    const selectedClass = b.id === state.selectedBarberId ? " is-selected" : "";
    return `<article class="barber-card${selectedClass}" style="background-color:#0a0a0a !important; color:#ffffff !important; border:1px solid #333 !important;">
              <div style="background:var(--primary) !important; color:#000 !important; padding:10px 14px; border-radius:8px; font-weight:800; font-size:1.1rem;">${escapeHtml(initials)}</div>
              <div><h3 style="color:#ffffff !important; margin:0 0 3px 0 !important;">${escapeHtml(b.name)}</h3><p style="color:#aaaaaa !important; margin:0 !important;">${escapeHtml(b.title)}</p></div>
            </article>`;
  }).join("");
}

function renderSlotBoard() {
  if(!elements.slotBoard) return;
  elements.slotBoard.innerHTML = state.timeSlots.map(t => {
    const isAvailable = state.availableSlots.includes(t);
    const selectedClass = state.selectedTime === t ? " is-selected" : "";
    const disabled = isAvailable ? "" : "disabled";
    return `<button class="slot-button${selectedClass}" type="button" data-time="${t}" ${disabled} style="background-color:#0a0a0a !important; color:#fff !important;">${t}</button>`;
  }).join("");
}

function renderStats() {
  if(elements.todayCount) elements.todayCount.textContent = String(state.todayCount || 0);
  if(elements.openSlots) elements.openSlots.textContent = String(state.availableSlots.length);
}

function renderSettingsVisibility() {
  if (state.adminUnlocked) {
    elements.customerMain.hidden = true;
    elements.adminMain.hidden = false;
    elements.adminLoginSection.hidden = true;
    elements.adminDashboardSection.hidden = false;
    elements.lockSettings.hidden = false;
    elements.adminGreeting.textContent = "Kontrol Paneli";
  } else if (state.showLoginScreen) {
    elements.customerMain.hidden = true;
    elements.adminMain.hidden = false;
    elements.adminLoginSection.hidden = false;
    elements.adminDashboardSection.hidden = true;
    elements.lockSettings.hidden = true;
    elements.adminGreeting.textContent = "Yetkili Girişi";
  } else {
    elements.customerMain.hidden = false;
    elements.adminMain.hidden = true;
  }
}

function renderSettingsForm() {
  if(!elements.serviceSettings || !elements.barberSettings) return;
  state.settings.services = state.settings.services || [];
  state.settings.barbers = state.settings.barbers || [];

  elements.serviceSettings.innerHTML = state.settings.services.map((s, index) => `
    <div class="admin-row-box" style="padding: 20px; margin-bottom: 15px; border-radius: 10px;">
      <div style="display:flex; justify-content:space-between; margin-bottom:15px; border-bottom:1px solid #333; padding-bottom:10px;">
        <span style="color:var(--primary); font-size:1.1rem;">Hizmet ${index + 1}</span>
        <button class="danger-button" type="button" data-delete-service="${escapeHtml(s.id)}" style="padding:4px 10px; font-size:0.8rem;">Sil</button>
      </div>
      <div class="field-row" style="display:flex; gap:15px;">
        <div class="field-group" style="flex:2;"><label style="font-size:0.85rem; color:#aaa; margin-bottom:5px; display:block;">Hizmet Adı</label><input name="serviceName-${s.id}" type="text" value="${escapeHtml(s.name)}" required /></div>
        <div class="field-group" style="flex:1;"><label style="font-size:0.85rem; color:#aaa; margin-bottom:5px; display:block;">Fiyat (₺)</label><input name="servicePrice-${s.id}" type="number" value="${s.price}" required /></div>
      </div>
    </div>
  `).join("");

  elements.barberSettings.innerHTML = state.settings.barbers.map((b, index) => `
    <div class="admin-row-box" style="padding: 20px; margin-bottom: 15px; border-radius: 10px;">
      <div style="display:flex; justify-content:space-between; margin-bottom:15px; border-bottom:1px solid #333; padding-bottom:10px;">
        <span style="color:var(--primary); font-size:1.1rem;">Berber ${index + 1}</span>
        <button class="danger-button" type="button" data-delete-barber="${escapeHtml(b.id)}" style="padding:4px 10px; font-size:0.8rem;">Sil</button>
      </div>
      <div class="field-row" style="display:flex; gap:15px;">
        <div class="field-group" style="flex:1;"><label style="font-size:0.85rem; color:#aaa; margin-bottom:5px; display:block;">Berber Adı</label><input name="barberName-${b.id}" type="text" value="${escapeHtml(b.name)}" required /></div>
        <div class="field-group" style="flex:1;"><label style="font-size:0.85rem; color:#aaa; margin-bottom:5px; display:block;">Uzmanlık</label><input name="barberTitle-${b.id}" type="text" value="${escapeHtml(b.title)}" required /></div>
      </div>
    </div>
  `).join("");
}

function renderAppointments() {
  if(!elements.appointmentsList) return;
  if (!state.appointments.length) {
    elements.appointmentsList.innerHTML = `<div style="text-align:center; padding:30px; background:#0a0a0a; border-radius:10px; border:1px dashed #333;"><p style="color:#888; font-weight:normal; margin:0;">Şu an bekleyen randevu yok.</p></div>`;
    return;
  }
  
  elements.appointmentsList.innerHTML = state.appointments.map(app => {
    const barber = state.settings.barbers.find(b => b.id === app.barberId) || { name: "Berber" };
    const serviceNames = app.serviceIds.map(id => {
       const s = state.settings.services.find(serv => serv.id === id);
       return s ? s.name : "Hizmet";
    }).join(", ");

    return `
      <article class="appointment-card" style="background:#0a0a0a; border:1px solid #222; padding:20px; border-radius:12px; margin-bottom:15px; display:flex; flex-direction:column; gap:15px;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; width:100%;">
          <div>
            <h3 style="color:var(--text); font-size:1.3rem; margin:0 0 5px 0;">${escapeHtml(app.customerName)}</h3>
            <p style="margin:0; color:#aaa; font-weight:normal; font-size:0.9rem;">📞 ${escapeHtml(app.customerPhone)}</p>
          </div>
          <button class="danger-button" type="button" data-cancel="${app.id}" style="padding:8px 15px; font-size:0.85rem;">Randevuyu İptal Et</button>
        </div>
        
        <div style="display:flex; gap:10px; flex-wrap:wrap; border-top:1px solid #222; padding-top:15px; width:100%;">
          <span class="meta-chip highlight">📅 ${formatDate(app.date)} - ${app.time}</span>
          <span class="meta-chip">✂️ ${escapeHtml(barber.name)}</span>
          <span class="meta-chip">${escapeHtml(serviceNames)}</span>
          <span class="meta-chip danger">KOD: ${escapeHtml(app.cancelCode || '-')}</span>
        </div>
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
    state.adminToken = ""; state.adminUnlocked = false; state.showLoginScreen = false;
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
    setMessage(elements.formMessage, "Randevu oluşturuldu! Yöneticiye bilgi veriliyor...");
    await refreshAll();

    const barberPhone = "905395772999"; 
    
    let totalPrice = 0;
    const serviceNames = checkedServices.map(id => {
      const s = state.settings.services.find(serv => serv.id === id);
      if(s) totalPrice += Number(s.price);
      return s ? s.name : "";
    }).join(", ");

    const waText = encodeURIComponent(`🚨 YENİ RANDEVU ALINDI 🚨\n\n👤 Müşteri: ${customerName}\n📞 Telefon: ${customerPhone}\n📅 Tarih: ${formatDate(dateSelect)}\n⏰ Saat: ${timeSelect}\n✂️ Hizmetler: ${serviceNames}\n💰 Toplam Tutar: ₺${totalPrice}`);
    
    window.open(`https://wa.me/${barberPhone}?text=${waText}`, '_blank');

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

// ZIRHLI VE HATA FIRLATAN YENİ KAYDETME SİSTEMİ
async function saveSettings(event) {
  event.preventDefault();
  setMessage(elements.settingsMessage, "İşleniyor...", "success");

  try {
    state.settings.services = state.settings.services || [];
    state.settings.barbers = state.settings.barbers || [];

    const newServices = state.settings.services.map(s => {
      const nameInput = document.querySelector(`input[name="serviceName-${s.id}"]`);
      const priceInput = document.querySelector(`input[name="servicePrice-${s.id}"]`);
      return {
        id: s.id,
        name: nameInput ? nameInput.value.trim() : s.name,
        price: priceInput ? Number(priceInput.value) : s.price
      };
    });

    const newBarbers = state.settings.barbers.map(b => {
      const nameInput = document.querySelector(`input[name="barberName-${b.id}"]`);
      const titleInput = document.querySelector(`input[name="barberTitle-${b.id}"]`);
      const newName = nameInput ? nameInput.value.trim() : b.name;
      return {
        id: b.id,
        name: newName,
        title: titleInput ? titleInput.value.trim() : b.title,
        initials: makeInitials(newName)
      };
    });

    const payload = {
      salonName: elements.salonNameInput ? elements.salonNameInput.value.trim() : state.settings.salonName,
      salonPhone: elements.salonPhoneInput ? elements.salonPhoneInput.value.trim() : state.settings.salonPhone,
      salonAddress: elements.salonAddressInput ? elements.salonAddressInput.value.trim() : state.settings.salonAddress,
      salonImage: elements.salonImageInput ? elements.salonImageInput.value.trim() : state.settings.salonImage,
      services: newServices,
      barbers: newBarbers
    };

    await api("/api/admin/settings", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    
    setMessage(elements.settingsMessage, "Ayarlar başarıyla kaydedildi! ✅");
    await refreshAll();

  } catch (error) {
    // EN UFAK BİR HATADA BİLE BURASI KIRMIZI RENKLE EKRANA BASACAK
    console.error(error);
    setMessage(elements.settingsMessage, "HATA OLUŞTU: " + error.message, "error");
  }
}

function bindEvents() {
  if(elements.bookingForm) elements.bookingForm.addEventListener("submit", createAppointment);
  if(elements.cancelForm) elements.cancelForm.addEventListener("submit", customerCancelAppointment);
  if(elements.adminLoginForm) elements.adminLoginForm.addEventListener("submit", unlockSettings);
  if(elements.settingsForm) elements.settingsForm.addEventListener("submit", saveSettings);
  
  if(elements.btnShowLogin) elements.btnShowLogin.addEventListener("click", (e) => {
    e.preventDefault();
    state.showLoginScreen = true;
    renderAll();
  });

  if(elements.btnCancelLogin) elements.btnCancelLogin.addEventListener("click", (e) => {
    e.preventDefault();
    state.showLoginScreen = false;
    elements.adminPinInput.value = "";
    setMessage(elements.adminMessage, "");
    renderAll();
  });

  if(elements.lockSettings) elements.lockSettings.addEventListener("click", () => {
    state.adminToken = ""; 
    state.adminUnlocked = false; 
    state.showLoginScreen = false;
    sessionStorage.removeItem("barberline-admin-token");
    renderAll();
  });

  if(elements.addService) elements.addService.addEventListener("click", () => {
    state.settings.services.push({ id: `srv-${Date.now()}`, name: "Yeni Hizmet", price: 100 });
    renderSettingsForm();
  });

  if(elements.addBarber) elements.addBarber.addEventListener("click", () => {
    state.settings.barbers.push({ id: `berber-${Date.now()}`, name: "Yeni Berber", title: "Uzman", initials: "YB" });
    renderSettingsForm();
  });

  document.addEventListener("click", async (event) => {
    const btnCancel = event.target.closest("[data-cancel]");
    if (btnCancel) {
      if(confirm("Bu randevuyu silmek istediğinize emin misiniz?")) {
        try { await api(`/api/admin/appointments/${encodeURIComponent(btnCancel.dataset.cancel)}`, { method: "DELETE" }); await refreshAll(); } 
        catch (e) { alert("Hata: " + e.message); }
      }
    }
    
    const btnDelSrv = event.target.closest("[data-delete-service]");
    if(btnDelSrv) {
      if(confirm("Bu hizmeti silmek istiyor musunuz?")) {
        state.settings.services = state.settings.services.filter(s => s.id !== btnDelSrv.dataset.deleteService);
        renderSettingsForm();
      }
    }

    const btnDelBrb = event.target.closest("[data-delete-barber]");
    if(btnDelBrb) {
      if(confirm("Bu berberi silmek istiyor musunuz?")) {
        state.settings.barbers = state.settings.barbers.filter(b => b.id !== btnDelBrb.dataset.deleteBarber);
        renderSettingsForm();
      }
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