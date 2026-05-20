const state = {
  settings: { services: [], barbers: [], salonName: "", salonPhone: "", salonAddress: "", salonImage: "" },
  timeSlots: [], selectedDate: todayISO(), selectedBarberId: "", selectedTime: "", availableSlots: [], todayCount: 0,
  adminToken: sessionStorage.getItem("barberline-admin-token") || "", adminUnlocked: Boolean(sessionStorage.getItem("barberline-admin-token")),
  showLoginScreen: false, appointments: [],
  adminSelectedDate: "" 
};

const elements = {
  customerMain: document.querySelector("#customerMain"), adminMain: document.querySelector("#adminMain"), adminLoginSection: document.querySelector("#adminLoginSection"), adminDashboardSection: document.querySelector("#adminDashboardSection"),
  btnShowLogin: document.querySelector("#btnShowLogin"), btnCancelLogin: document.querySelector("#btnCancelLogin"), lockSettings: document.querySelector("#lockSettings"), adminGreeting: document.querySelector("#adminGreeting"),
  bookingForm: document.querySelector("#bookingForm"), customerName: document.querySelector("#customerName"), customerPhone: document.querySelector("#customerPhone"), serviceCheckboxes: document.querySelector("#serviceCheckboxes"), totalPriceDisplay: document.querySelector("#totalPriceDisplay"), barberSelect: document.querySelector("#barberSelect"), dateSelect: document.querySelector("#dateSelect"), timeSelect: document.querySelector("#timeSelect"), formMessage: document.querySelector("#formMessage"),
  settingsForm: document.querySelector("#settingsForm"), adminLoginForm: document.querySelector("#adminLoginForm"), adminPinInput: document.querySelector("#adminPinInput"), adminMessage: document.querySelector("#adminMessage"),
  salonNameInput: document.querySelector("#salonNameInput"), salonPhoneInput: document.querySelector("#salonPhoneInput"), salonAddressInput: document.querySelector("#salonAddressInput"), salonImageInput: document.querySelector("#salonImageInput"),
  displayPhone: document.querySelector("#displayPhone"), displayAddress: document.querySelector("#displayAddress"), displayMapLink: document.querySelector("#displayMapLink"), mainShopImage: document.querySelector("#mainShopImage"),
  settingsMessage: document.querySelector("#settingsMessage"), barberSettings: document.querySelector("#barberSettings"), serviceSettings: document.querySelector("#serviceSettings"), salonNameDisplay: document.querySelector("#salonNameDisplay"),
  addBarber: document.querySelector("#addBarber"), addService: document.querySelector("#addService"), barberList: document.querySelector("#barberList"), slotBoard: document.querySelector("#slotBoard"),
  appointmentsList: document.querySelector("#appointmentsList"), todayCount: document.querySelector("#todayCount"), openSlots: document.querySelector("#openSlots"),
  cancelForm: document.querySelector("#cancelForm"), cancelCodeInput: document.querySelector("#cancelCodeInput"), cancelMessage: document.querySelector("#cancelMessage"),
  blockDateInput: document.querySelector("#blockDateInput"), blockTimeInput: document.querySelector("#blockTimeInput"), btnBlockSlot: document.querySelector("#btnBlockSlot"), blockMessage: document.querySelector("#blockMessage")
};

function todayISO() { const offset = new Date().getTimezoneOffset() * 60000; return new Date(Date.now() - offset).toISOString().slice(0, 10); }
function escapeHtml(value) { return String(value).replaceAll("&", "&").replaceAll("<", "<").replaceAll(">", ">"); }
function makeInitials(name) { const words = String(name).trim().split(/\s+/).filter(Boolean); if (!words.length) return "BL"; return words.slice(0, 2).map((word) => word[0].toLocaleUpperCase("tr-TR")).join(""); }
function formatPrice(price) { return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(price); }

async function api(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (state.adminToken) headers.Authorization = `Bearer ${state.adminToken}`;
  const response = await fetch(path, { ...options, headers }); const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || "İşlem başarısız."); return payload;
}
function setMessage(element, message, type = "success") { if(element) { element.textContent = message; element.style.color = type === "error" ? "#ff4d4d" : "var(--primary)"; } }

function renderBrand() {
  const salonName = state.settings?.salonName || "Salon Bayber"; const salonPhone = state.settings?.salonPhone || "0539 596 0584"; const salonAddress = state.settings?.salonAddress || "Reyhanlı, Hatay"; const salonImage = state.settings?.salonImage || "https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=1200&q=80";
  if(elements.salonNameInput) elements.salonNameInput.value = salonName; if(elements.salonPhoneInput) elements.salonPhoneInput.value = salonPhone; if(elements.salonAddressInput) elements.salonAddressInput.value = salonAddress;
  if(elements.displayPhone) elements.displayPhone.textContent = salonPhone; if(elements.displayAddress) elements.displayAddress.textContent = salonAddress; 
  if(elements.displayMapLink) elements.displayMapLink.href = `https://maps.google.com/?q=${encodeURIComponent(salonAddress)}`;
  if(elements.mainShopImage) elements.mainShopImage.src = salonImage; document.title = `${salonName} Randevu`;
}

function canFitServices(timeStr, reqSlots) {
  const startIndex = state.timeSlots.indexOf(timeStr); if (startIndex === -1) return false;
  for (let i = 0; i < reqSlots; i++) { const nextSlot = state.timeSlots[startIndex + i]; if (!nextSlot || !state.availableSlots.includes(nextSlot)) return false; } return true;
}

function calculateTotal() {
  const checkboxes = document.querySelectorAll('input[name="serviceItem"]:checked'); let total = 0; checkboxes.forEach(cb => { const service = state.settings.services.find(s => s.id === cb.value); if(service) total += Number(service.price); });
  if(elements.totalPriceDisplay) elements.totalPriceDisplay.textContent = formatPrice(total);
}

function renderServicesAndBarbers() {
  const selectedBarber = state.selectedBarberId || elements.barberSelect?.value;
  state.settings.services = state.settings.services || []; state.settings.barbers = state.settings.barbers || [];

  if(elements.serviceCheckboxes) {
    elements.serviceCheckboxes.innerHTML = state.settings.services.map(s => `
      <label class="modern-service-card">
        <input type="checkbox" name="serviceItem" value="${s.id}">
        <div class="service-left">
          <div class="custom-checkbox"></div>
          <span class="service-name">${escapeHtml(s.name)}</span>
        </div>
        <span class="service-price">${formatPrice(s.price)}</span>
      </label>
    `).join("");
    document.querySelectorAll('input[name="serviceItem"]').forEach(cb => { cb.addEventListener('change', () => { calculateTotal(); renderTimeSelect(); renderSlotBoard(); }); });
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
  const reqSlots = document.querySelectorAll('input[name="serviceItem"]:checked').length || 1;
  const fittingSlots = state.availableSlots.filter(t => canFitServices(t, reqSlots));
  const currentValue = state.selectedTime || elements.timeSelect.value;
  elements.timeSelect.innerHTML = fittingSlots.map(t => `<option value="${t}" style="background-color:#0a0a0a; color:#fff;">${t}</option>`).join("");
  if (currentValue && fittingSlots.includes(currentValue)) elements.timeSelect.value = currentValue;
  else if (fittingSlots.length) elements.timeSelect.value = fittingSlots[0];
  else elements.timeSelect.innerHTML = `<option value="" style="background-color:#0a0a0a; color:#fff;">Müsait Yok</option>`;
  state.selectedTime = elements.timeSelect.value;
}

function renderSlotBoard() {
  if(!elements.slotBoard) return;
  const reqSlots = document.querySelectorAll('input[name="serviceItem"]:checked').length || 1;
  elements.slotBoard.innerHTML = state.timeSlots.map(t => {
    const isAvailable = canFitServices(t, reqSlots); const selectedClass = state.selectedTime === t ? " is-selected" : ""; const disabled = isAvailable ? "" : "disabled";
    return `<button class="slot-button${selectedClass}" type="button" data-time="${t}" ${disabled}>${t}</button>`;
  }).join("");
  if (state.selectedTime && !canFitServices(state.selectedTime, reqSlots)) { state.selectedTime = ""; if(elements.timeSelect) elements.timeSelect.value = ""; setTimeout(renderSlotBoard, 10); }
}

function renderBarbersList() {
  if(!elements.barberList) return;
  state.settings.barbers = state.settings.barbers || [];
  elements.barberList.innerHTML = state.settings.barbers.map(b => {
    return `<article style="background-color:#0a0a0a; border: 2px solid #222; padding: 15px; border-radius: 12px; display: flex; align-items: center; gap: 15px; margin-bottom: 12px; width: 100%;">
              <div style="background:var(--primary); color:#000; padding:10px 14px; border-radius:10px; font-weight:900; font-size:1rem; flex-shrink:0;">${escapeHtml(b.initials || "BL")}</div>
              <div style="min-width:0; flex:1;"><h3 style="color:#ffffff; margin:0 0 3px 0; font-size:1.05rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(b.name)}</h3><p style="color:#aaa; margin:0; font-size:0.85rem; font-weight:500; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(b.title)}</p></div>
            </article>`;
  }).join("");
}

function renderStats() { if(elements.todayCount) elements.todayCount.textContent = String(state.todayCount || 0); if(elements.openSlots) elements.openSlots.textContent = String(state.availableSlots.length); }

function renderSettingsVisibility() {
  if (state.adminUnlocked) { elements.customerMain.hidden = true; elements.adminMain.hidden = false; elements.adminLoginSection.hidden = true; elements.adminDashboardSection.hidden = false; elements.lockSettings.hidden = false; elements.adminGreeting.textContent = "Kontrol Paneli"; } 
  else if (state.showLoginScreen) { elements.customerMain.hidden = true; elements.adminMain.hidden = false; elements.adminLoginSection.hidden = false; elements.adminDashboardSection.hidden = true; elements.lockSettings.hidden = true; elements.adminGreeting.textContent = "Yetkili Girişi"; } 
  else { elements.customerMain.hidden = false; elements.adminMain.hidden = true; }
}

// GÖRSEL 2 DETAYLI AYARLAR: MOBİL SIKIŞTIRMA VE SİLME ALANI ESNEK HALE GETİRİLDİ
function renderSettingsForm() {
  if(!elements.serviceSettings || !elements.barberSettings) return;
  state.settings.services = state.settings.services || []; state.settings.barbers = state.settings.barbers || [];
  
  elements.serviceSettings.innerHTML = state.settings.services.map((s, index) => `
    <div style="background: #0a0a0a; border: 1px solid #333; padding: 15px; margin-bottom: 15px; border-radius: 12px; width: 100%;">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:15px; border-bottom:1px solid #222; padding-bottom:15px;">
        <span style="color:var(--primary); font-size:1rem; font-weight:800;">Hizmet ${index + 1}</span>
        <button class="danger-button" type="button" data-delete-service="${escapeHtml(s.id)}" style="padding:6px 12px; font-size:0.8rem; height:auto; width:auto;">Sil</button>
      </div>
      <div style="display:flex; gap:15px; flex-wrap:wrap; width:100%;">
        <div style="flex:2; min-width:140px;"><label style="font-size:0.85rem; color:#aaa; margin-bottom:6px; display:block; font-weight:600;">Hizmet Adı</label><input name="serviceName-${s.id}" type="text" value="${escapeHtml(s.name)}" required /></div>
        <div style="flex:1; min-width:100px;"><label style="font-size:0.85rem; color:#aaa; margin-bottom:6px; display:block; font-weight:600;">Fiyat (₺)</label><input name="servicePrice-${s.id}" type="number" value="${s.price}" required /></div>
      </div>
    </div>`).join("");
  
  elements.barberSettings.innerHTML = state.settings.barbers.map((b, index) => `
    <div style="background: #0a0a0a; border: 1px solid #333; padding: 15px; margin-bottom: 15px; border-radius: 12px; width: 100%;">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:15px; border-bottom:1px solid #222; padding-bottom:15px;">
        <span style="color:var(--primary); font-size:1rem; font-weight:800;">Berber ${index + 1}</span>
        <button class="danger-button" type="button" data-delete-barber="${escapeHtml(b.id)}" style="padding:6px 12px; font-size:0.8rem; height:auto; width:auto;">Sil</button>
      </div>
      <div style="display:flex; gap:15px; flex-wrap:wrap; width:100%;">
        <div style="flex:1; min-width:140px;"><label style="font-size:0.85rem; color:#aaa; margin-bottom:6px; display:block; font-weight:600;">Berber Adı</label><input name="barberName-${b.id}" type="text" value="${escapeHtml(b.name)}" required /></div>
        <div style="flex:1; min-width:140px;"><label style="font-size:0.85rem; color:#aaa; margin-bottom:6px; display:block; font-weight:600;">Uzmanlık</label><input name="barberTitle-${b.id}" type="text" value="${escapeHtml(b.title)}" required /></div>
      </div>
    </div>`).join("");
  
  if (elements.blockTimeInput) {
    elements.blockTimeInput.innerHTML = state.timeSlots.map(t => `<option value="${t}">${t}</option>`).join("");
    if(!elements.blockDateInput.value) elements.blockDateInput.value = todayISO();
  }
}

window.selectAdminDate = function(dateStr) {
  state.adminSelectedDate = dateStr;
  renderAppointments();
}

// KUSURSUZ VE SIKIŞMAYAN MOBİL TAKVİM AJANDASI ÇİZİCİSİ
function renderAppointments() {
  if(!elements.appointmentsList) return;
  const todayStr = todayISO(); 
  if(!state.adminSelectedDate) state.adminSelectedDate = todayStr;

  let tabsHtml = `<div class="admin-calendar-tabs">`;
  const todayDate = new Date();
  for(let i = -2; i <= 14; i++) {
      const d = new Date(todayDate);
      d.setDate(todayDate.getDate() + i);
      const offset = d.getTimezoneOffset() * 60000;
      const dateStr = new Date(d.getTime() - offset).toISOString().slice(0, 10);
      
      const isToday = dateStr === todayStr;
      const isActive = dateStr === state.adminSelectedDate;
      
      const dateObj = new Date(dateStr + "T12:00:00");
      const day = dateObj.getDate();
      const month = dateObj.toLocaleString('tr-TR', { month: 'short' }); // Kısa ay adı mobilde yer kazandırır
      let label = `${day} ${month}`;
      if(isToday) label = `Bugün`;

      tabsHtml += `<div class="cal-tab ${isActive ? 'active' : ''}" onclick="window.selectAdminDate('${dateStr}')">${label}</div>`;
  }
  tabsHtml += `</div>`;

  let dailyApps = state.appointments.filter(a => a.date === state.adminSelectedDate);
  dailyApps.sort((a, b) => a.time.localeCompare(b.time));

  let appsHtml = `<div style="background: #050505; border: 1px solid #222; border-radius: 12px; padding: 15px; width:100%;">`;
  
  if(dailyApps.length === 0) {
      appsHtml += `<p style="text-align:center; color:#666; font-size:0.9rem; margin:0; padding:15px 0; font-weight:500;">Bu tarihte henüz randevu bulunmuyor.</p>`;
  } else {
      dailyApps.forEach(app => {
        if (app.customerName === "KAPALI_SAAT") {
          appsHtml += `
            <article style="background:#0a0a0a; border:1px dashed #444; padding:12px; border-radius:10px; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center; gap:10px; width:100%;">
                <span style="color:#888; font-weight:600; font-size:0.9rem;">🚫 ${app.time} - Mola/Kapalı</span>
                <button class="ghost-button" type="button" data-cancel="${app.id}" style="padding:6px 12px; font-size:0.8rem; width:auto; height:auto;">Aç</button>
            </article>`;
        } else {
          const barber = state.settings.barbers.find(b => b.id === app.barberId) || { name: "Berber" };
          const serviceNames = app.serviceIds.map(sid => { const s = state.settings.services.find(serv => serv.id === sid); return s ? s.name : "Hizmet"; }).join(", ");
          
          appsHtml += `
            <article style="background:#111; border:1px solid #222; padding:15px; border-radius:12px; margin-bottom:12px; width:100%; overflow:hidden;">
              <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:10px; margin-bottom: 12px; width:100%;">
                <div style="min-width:0; flex:1;"><h3 style="color:#fff; font-size:1.15rem; margin:0 0 4px 0; word-break:break-word;">${escapeHtml(app.customerName)}</h3><p style="margin:0; color:#888; font-weight:600; font-size:0.85rem;">📞 ${escapeHtml(app.customerPhone)}</p></div>
                <div style="display:flex; gap:8px; flex-shrink:0;">
                  <button class="ghost-button" type="button" data-remind="${app.id}" style="padding:6px 10px; font-size:0.8rem; border-color:#25D366; color:#25D366; width:auto; height:auto;">📲 Hatırlat</button>
                  <button class="danger-button" type="button" data-cancel="${app.id}" style="padding:6px 10px; font-size:0.8rem; width:auto; height:auto;">İptal</button>
                </div>
              </div>
              <div style="display:flex; gap:6px; flex-wrap:wrap; border-top:1px solid #1a1a1a; padding-top:12px; width:100%;">
                <span style="background: rgba(255,215,0,0.1); color: var(--primary); padding: 4px 8px; border-radius: 6px; font-size: 0.8rem; font-weight:700;">⏰ ${app.time}</span>
                <span style="background: #000; color: #ccc; border: 1px solid #222; padding: 4px 8px; border-radius: 6px; font-size: 0.8rem; font-weight:600; max-width:150px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">✂️ ${escapeHtml(barber.name)}</span>
                <span style="background: #000; color: #ccc; border: 1px solid #222; padding: 4px 8px; border-radius: 6px; font-size: 0.8rem; font-weight:600; flex:1; min-width:100px;">📋 ${escapeHtml(serviceNames)}</span>
              </div>
            </article>`;
        }
      });
  }
  appsHtml += `</div>`;

  elements.appointmentsList.innerHTML = tabsHtml + appsHtml;
}

function renderAll() { renderBrand(); renderServicesAndBarbers(); renderTimeSelect(); renderBarbersList(); renderSlotBoard(); renderStats(); renderSettingsVisibility(); renderSettingsForm(); renderAppointments(); }

async function loadPublicState() {
  const query = new URLSearchParams({ date: state.selectedDate, barberId: state.selectedBarberId });
  const payload = await api(`/api/public-state?${query.toString()}`);
  state.settings = payload.settings; state.timeSlots = payload.timeSlots; state.availableSlots = payload.availableSlots; state.todayCount = payload.todayCount;
  if (!state.selectedBarberId && state.settings.barbers.length) state.selectedBarberId = state.settings.barbers[0].id;
}

async function loadAdminDashboard() {
  if (!state.adminToken) return;
  try { const payload = await api("/api/admin/dashboard"); state.appointments = payload.appointments; state.settings = payload.settings; } 
  catch { state.adminToken = ""; state.adminUnlocked = false; state.showLoginScreen = false; sessionStorage.removeItem("barberline-admin-token"); }
}
async function refreshAll() { await loadPublicState(); await loadAdminDashboard(); renderAll(); }

async function createAppointment(event) {
  event.preventDefault(); setMessage(elements.formMessage, "Randevu kaydediliyor...", "success");
  const formData = new FormData(elements.bookingForm); const customerPhone = formData.get("customerPhone").trim(); const customerName = formData.get("customerName").trim(); const dateSelect = formData.get("dateSelect"); const timeSelect = formData.get("timeSelect");
  const checkedServices = Array.from(document.querySelectorAll('input[name="serviceItem"]:checked')).map(cb => cb.value);
  if(checkedServices.length === 0) return setMessage(elements.formMessage, "Lütfen en az bir hizmet seçin.", "error");

  try {
    const payload = await api("/api/appointments", { method: "POST", body: JSON.stringify({ customerName, customerPhone, serviceIds: checkedServices, barberId: formData.get("barberSelect"), date: dateSelect, time: timeSelect }) });
    elements.bookingForm.reset(); calculateTotal(); elements.dateSelect.value = state.selectedDate;
    setMessage(elements.formMessage, "Randevu oluşturuldu! WhatsApp fişiniz açılıyor...", "success"); await refreshAll();

    const barberPhone = "905395960584"; let totalPrice = 0;
    const serviceNames = checkedServices.map(id => { const s = state.settings.services.find(serv => serv.id === id); if(s) totalPrice += Number(s.price); return s ? s.name : ""; }).join(", ");
    const waText = encodeURIComponent(`🚨 YENİ RANDEVU ALINDI (${checkedServices.length} Seans)\n\n👤 Müşteri: ${customerName}\n📞 Telefon: ${customerPhone}\n📅 Tarih: ${new Date(dateSelect).toLocaleDateString('tr-TR')} \n⏰ Saat: ${timeSelect}\n✂️ Hizmetler: ${serviceNames}\n💰 Toplam Tutar: ₺${totalPrice}\n\nİptal Kodu: ${payload.cancelCode}`);
    window.location.href = `https://api.whatsapp.com/send/?phone=${barberPhone}&text=${waText}`;
  } catch (error) { setMessage(elements.formMessage, error.message, "error"); }
}

async function customerCancelAppointment(event) {
  event.preventDefault(); setMessage(elements.cancelMessage, "Kontrol ediliyor...");
  try {
    const payload = await api("/api/appointments/cancel", { method: "POST", body: JSON.stringify({ code: elements.cancelCodeInput.value.trim() }) });
    setMessage(elements.cancelMessage, payload.message); elements.cancelForm.reset(); await refreshAll();
  } catch (error) { setMessage(elements.cancelMessage, error.message, "error"); }
}

async function unlockSettings(event) {
  event.preventDefault(); setMessage(elements.adminMessage, "Giriş yapılıyor...");
  try {
    const payload = await api("/api/admin/login", { method: "POST", body: JSON.stringify({ pin: new FormData(elements.adminLoginForm).get("adminPin").trim() }) });
    state.adminToken = payload.token; state.adminUnlocked = true; state.showLoginScreen = false;
    sessionStorage.setItem("barberline-admin-token", payload.token); elements.adminPinInput.value = ""; setMessage(elements.adminMessage, ""); await refreshAll();
  } catch (error) { setMessage(elements.adminMessage, error.message, "error"); }
}

async function saveSettings(event) {
  event.preventDefault(); setMessage(elements.settingsMessage, "İşleniyor...", "success");
  try {
    state.settings.services = state.settings.services || []; state.settings.barbers = state.settings.barbers || [];
    const newServices = state.settings.services.map(s => { const nameInput = document.querySelector(`input[name="serviceName-${s.id}"]`); const priceInput = document.querySelector(`input[name="servicePrice-${s.id}"]`); return { id: s.id, name: nameInput ? nameInput.value.trim() : s.name, price: priceInput ? Number(priceInput.value) : s.price }; });
    const newBarbers = state.settings.barbers.map(b => { const nameInput = document.querySelector(`input[name="barberName-${b.id}"]`); const titleInput = document.querySelector(`input[name="barberTitle-${b.id}"]`); const newName = nameInput ? nameInput.value.trim() : b.name; return { id: b.id, name: newName, title: titleInput ? titleInput.value.trim() : b.title, initials: makeInitials(newName) }; });

    let finalImage = state.settings.salonImage; const imageInput = document.querySelector("#salonImageInput");
    if (imageInput && imageInput.files && imageInput.files[0]) {
      const file = imageInput.files[0];
      finalImage = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image(); img.onload = () => {
            const canvas = document.createElement("canvas"); const MAX_WIDTH = 800; const MAX_HEIGHT = 800; let width = img.width; let height = img.height;
            if (width > height) { if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; } } else { if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; } }
            canvas.width = width; canvas.height = height; const ctx = canvas.getContext("2d"); ctx.drawImage(img, 0, 0, width, height); resolve(canvas.toDataURL("image/jpeg", 0.7)); 
          }; img.src = e.target.result;
        }; reader.readAsDataURL(file);
      });
    }

    const payload = { salonName: elements.salonNameInput ? elements.salonNameInput.value.trim() : state.settings.salonName, salonPhone: elements.salonPhoneInput ? elements.salonPhoneInput.value.trim() : state.settings.salonPhone, salonAddress: elements.salonAddressInput ? elements.salonAddressInput.value.trim() : state.settings.salonAddress, salonImage: finalImage, services: newServices, barbers: newBarbers };
    await api("/api/admin/settings", { method: "PUT", body: JSON.stringify(payload) });
    setMessage(elements.settingsMessage, "Ayarlar başarıyla kaydedildi! ✅"); if (imageInput) imageInput.value = ""; await refreshAll();
  } catch (error) { console.error(error); setMessage(elements.settingsMessage, "HATA OLUŞTU: " + error.message, "error"); }
}

function bindEvents() {
  if(elements.bookingForm) elements.bookingForm.addEventListener("submit", createAppointment);
  if(elements.cancelForm) elements.cancelForm.addEventListener("submit", customerCancelAppointment);
  if(elements.adminLoginForm) elements.adminLoginForm.addEventListener("submit", unlockSettings);
  if(elements.settingsForm) elements.settingsForm.addEventListener("submit", saveSettings);
  
  if(elements.btnShowLogin) elements.btnShowLogin.addEventListener("click", (e) => { e.preventDefault(); state.showLoginScreen = true; renderAll(); });
  if(elements.btnCancelLogin) elements.btnCancelLogin.addEventListener("click", (e) => { e.preventDefault(); state.showLoginScreen = false; elements.adminPinInput.value = ""; setMessage(elements.adminMessage, ""); renderAll(); });
  if(elements.lockSettings) elements.lockSettings.addEventListener("click", () => { state.adminToken = ""; state.adminUnlocked = false; state.showLoginScreen = false; sessionStorage.removeItem("barberline-admin-token"); renderAll(); });

  if(elements.addService) elements.addService.addEventListener("click", () => { state.settings.services.push({ id: `srv-${Date.now()}`, name: "Yeni Hizmet", price: 100 }); renderSettingsForm(); });
  if(elements.addBarber) elements.addBarber.addEventListener("click", () => { state.settings.barbers.push({ id: `berber-${Date.now()}`, name: "Yeni Berber", title: "Uzman", initials: "YB" }); renderSettingsForm(); });

  if(elements.btnBlockSlot) {
    elements.btnBlockSlot.addEventListener("click", async () => {
       const bDate = elements.blockDateInput.value; const bTime = elements.blockTimeInput.value;
       if(!bDate || !bTime) return setMessage(elements.blockMessage, "Tarih ve saat seçin.", "error");
       try {
         setMessage(elements.blockMessage, "Saat kapatılıyor...", "success");
         await api("/api/appointments", { method: "POST", body: JSON.stringify({ customerName: "KAPALI_SAAT", customerPhone: "0000000000", serviceIds: [state.settings.services[0].id], barberId: state.settings.barbers[0].id, date: bDate, time: bTime }) });
         setMessage(elements.blockMessage, "Saat başarıyla kapatıldı! ✅", "success"); await refreshAll();
       } catch(error) { setMessage(elements.blockMessage, error.message, "error"); }
    });
  }

  document.addEventListener("click", async (event) => {
    const btnRemind = event.target.closest("[data-remind]");
    if (btnRemind) {
      const appId = btnRemind.dataset.remind;
      const app = state.appointments.find(a => a.id === appId);
      if (app) {
        const salonName = state.settings.salonName || "Salon Bayber";
        const customerPhone = app.customerPhone.replace(/\D/g,''); 
        const dateObj = new Date(app.date + "T12:00:00");
        const formattedDate = dateObj.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' });
        
        const reminderText = encodeURIComponent(`Merhaba ${app.customerName},\n\nSizi harika bir görünüm için bekliyoruz! 😎\n\n*${formattedDate}* saat *${app.time}* itibariyle *${salonName}* salonumuzda randevunuz bulunmaktadır.\n\nLütfen randevu saatinizden 10 dakika önce salonumuzda olmaya özen gösteriniz. İptal veya erteleme durumunda lütfen bize bilgi veriniz.\n\nGörüşmek üzere! ✂️🔥`);
        window.open(`https://api.whatsapp.com/send/?phone=90${customerPhone.slice(-10)}&text=${reminderText}`, '_blank');
      }
    }

    const btnCancel = event.target.closest("[data-cancel]");
    if (btnCancel) { if(confirm("Bunu silmek istediğinize emin misiniz?")) { try { await api(`/api/admin/appointments/${encodeURIComponent(btnCancel.dataset.cancel)}`, { method: "DELETE" }); await refreshAll(); } catch (e) { alert("Hata: " + e.message); } } }
    const btnDelSrv = event.target.closest("[data-delete-service]");
    if(btnDelSrv) { if(confirm("Bu hizmeti silmek istiyor musunuz?")) { state.settings.services = state.settings.services.filter(s => s.id !== btnDelSrv.dataset.deleteService); renderSettingsForm(); } }
    const btnDelBrb = event.target.closest("[data-delete-barber]");
    if(btnDelBrb) { if(confirm("Bu berberi silmek istiyor musunuz?")) { state.settings.barbers = state.settings.barbers.filter(b => b.id !== btnDelBrb.dataset.deleteBarber); renderSettingsForm(); } }
  });

  if(elements.barberSelect) elements.barberSelect.addEventListener("change", async () => { state.selectedBarberId = elements.barberSelect.value; state.selectedTime = ""; await refreshAll(); });
  if(elements.dateSelect) elements.dateSelect.addEventListener("change", async () => { state.selectedDate = elements.dateSelect.value; state.selectedTime = ""; await refreshAll(); });
  if(elements.timeSelect) elements.timeSelect.addEventListener("change", () => { state.selectedTime = elements.timeSelect.value; renderSlotBoard(); });

  if(elements.slotBoard) elements.slotBoard.addEventListener("click", (event) => {
    const button = event.target.closest("[data-time]");
    if (!button || button.disabled) return;
    state.selectedTime = button.dataset.time; elements.timeSelect.value = button.dataset.time; renderSlotBoard();
  });
}

async function init() { if(elements.dateSelect) { elements.dateSelect.min = todayISO(); elements.dateSelect.value = state.selectedDate; } bindEvents(); try { await refreshAll(); } catch (error) { console.error(error); } }
init();