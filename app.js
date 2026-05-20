const state = {
  settings: { services: [], barbers: [], salonName: "", salonPhone: "", salonAddress: "", salonImage: "" },
  timeSlots: [], selectedDate: todayISO(), selectedBarberId: "", selectedTime: "", availableSlots: [], allBarbersSlots: {}, appointments: [],
  adminToken: sessionStorage.getItem("barberline-admin-token") || "", adminUnlocked: Boolean(sessionStorage.getItem("barberline-admin-token")),
  showLoginScreen: false, adminSelectedDate: todayISO(), lastCreatedApp: null
};

const elements = {
  customerMain: document.querySelector("#customerMain"), adminMain: document.querySelector("#adminMain"), adminLoginSection: document.querySelector("#adminLoginSection"), adminDashboardSection: document.querySelector("#adminDashboardSection"),
  btnShowLogin: document.querySelector("#btnShowLogin"), btnCancelLogin: document.querySelector("#btnCancelLogin"), lockSettings: document.querySelector("#lockSettings"), adminGreeting: document.querySelector("#adminGreeting"),
  bookingForm: document.querySelector("#bookingForm"), customerName: document.querySelector("#customerName"), customerPhone: document.querySelector("#customerPhone"), serviceCheckboxes: document.querySelector("#serviceCheckboxes"), totalPriceDisplay: document.querySelector("#totalPriceDisplay"), barberSelect: document.querySelector("#barberSelect"), dateSelect: document.querySelector("#dateSelect"), timeSelect: document.querySelector("#timeSelect"), formMessage: document.querySelector("#formMessage"),
  settingsForm: document.querySelector("#settingsForm"), adminLoginForm: document.querySelector("#adminLoginForm"), adminPinInput: document.querySelector("#adminPinInput"), adminMessage: document.querySelector("#adminMessage"),
  salonNameInput: document.querySelector("#salonNameInput"), salonPhoneInput: document.querySelector("#salonPhoneInput"), salonAddressInput: document.querySelector("#salonAddressInput"), salonImageInput: document.querySelector("#salonImageInput"),
  displayPhone: document.querySelector("#displayPhone"), displayAddress: document.querySelector("#displayAddress"), displayMapLink: document.querySelector("#displayMapLink"), mainShopImage: document.querySelector("#mainShopImage"),
  settingsMessage: document.querySelector("#settingsMessage"), barberSettings: document.querySelector("#barberSettings"), serviceSettings: document.querySelector("#serviceSettings"), salonNameDisplay: document.querySelector("#salonNameDisplay"),
  addBarber: document.querySelector("#addBarber"), addService: document.querySelector("#addService"), slotBoard: document.querySelector("#slotBoard"),
  appointmentsList: document.querySelector("#appointmentsList"), todayCount: document.querySelector("#todayCount"), openSlots: document.querySelector("#openSlots"),
  cancelForm: document.querySelector("#cancelForm"), cancelCodeInput: document.querySelector("#cancelCodeInput"), cancelMessage: document.querySelector("#cancelMessage"),
  blockDateInput: document.querySelector("#blockDateInput"), blockTimeInput: document.querySelector("#blockTimeInput"), btnBlockSlot: document.querySelector("#btnBlockSlot"), blockMessage: document.querySelector("#blockMessage"),
  blockBarberSelect: document.querySelector("#blockBarberSelect"), adminSearchInput: document.querySelector("#adminSearchInput"),
  customerDateView: document.querySelector("#customerDateView"), liveStatusContainer: document.querySelector("#liveStatusContainer"),
  successCalendarArea: document.querySelector("#successCalendarArea"), btnAddToCalendar: document.querySelector("#btnAddToCalendar")
};

function todayISO() { const offset = new Date().getTimezoneOffset() * 60000; return new Date(Date.now() - offset).toISOString().slice(0, 10); }
function escapeHtml(value) { return String(value).replaceAll("&", "&").replaceAll("<", "<").replaceAll(">", ">"); }
function formatPrice(price) { return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(price); }
function formatDate(dateValue) { return new Intl.DateTimeFormat("tr-TR", { weekday: "long", day: "numeric", month: "long" }).format(new Date(`${dateValue}T12:00:00`)); }

async function api(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (state.adminToken) headers.Authorization = `Bearer ${state.adminToken}`;
  const response = await fetch(path, { ...options, headers }); const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || "Hata oluştu."); return payload;
}

function renderBrand() {
  const s = state.settings;
  if(elements.salonNameInput) { elements.salonNameInput.value = s.salonName; elements.salonPhoneInput.value = s.salonPhone; elements.salonAddressInput.value = s.salonAddress; }
  if(elements.displayPhone) elements.displayPhone.textContent = s.salonPhone; if(elements.displayAddress) elements.displayAddress.textContent = s.salonAddress;
  if(elements.displayMapLink) elements.displayMapLink.href = `https://maps.google.com/?q=${encodeURIComponent(s.salonAddress || "Reyhanlı, Hatay")}`;
  if(elements.mainShopImage) elements.mainShopImage.src = s.salonImage || "https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=1200&q=80";
  if(elements.salonNameDisplay) elements.salonNameDisplay.textContent = s.salonName;
}

function renderLiveStatusGrid() {
  if(!elements.liveStatusContainer) return;
  state.settings.barbers = state.settings.barbers || [];
  
  elements.liveStatusContainer.innerHTML = state.settings.barbers.map(b => {
    const slots = state.allBarbersSlots[b.id] || [];
    return `
      <div class="live-barber-row">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="font-weight:800; color:#fff; font-size:1.05rem;">✂️ ${escapeHtml(b.name)} (${b.title})</span>
          <span style="font-size:0.8rem; background:rgba(255,215,0,0.1); color:var(--primary); padding:3px 8px; border-radius:4px; font-weight:700;">${slots.length} Seans Boş</span>
        </div>
        <div class="live-slots-grid">
          ${slots.length === 0 ? `<span style="color:#ff4d4d; font-size:0.85rem; font-weight:700; grid-column: 1/-1;">⚠️ ŞUAN MÜSAİT DEĞİL</span>` : 
            slots.slice(0, 6).map(s => `<button type="button" class="slot-button" onclick="quickSelectSlot('${b.id}','${s}')" style="padding:6px 2px; font-size:0.8rem;">${s}</button>`).join("") + (slots.length > 6 ? `<span style="color:#888; font-size:0.75rem; align-self:center; text-align:center;">+${slots.length-6}</span>` : '')
          }
        </div>
      </div>`;
  }).join("");
}

window.quickSelectSlot = function(barberId, timeStr) {
  if(elements.barberSelect) elements.barberSelect.value = barberId;
  state.selectedBarberId = barberId; state.selectedTime = timeStr;
  triggerStateUpdate();
}

function renderServicesAndBarbers() {
  if(elements.serviceCheckboxes) {
    elements.serviceCheckboxes.innerHTML = (state.settings.services || []).map(s => `
      <label class="modern-service-card">
        <input type="checkbox" name="serviceItem" value="${s.id}">
        <div class="service-left"><div class="custom-checkbox"></div><div><span class="service-name">${escapeHtml(s.name)}</span><span style="font-size:0.75rem; color:#666; display:block; margin-top:2px;">🕒 Süre: ${s.duration || '30 dk'}</span></div></div>
        <span class="service-price">${formatPrice(s.price)}</span>
      </label>`).join("");
    document.querySelectorAll('input[name="serviceItem"]').forEach(cb => { cb.addEventListener('change', () => { calculateTotal(); triggerStateUpdate(); }); });
    calculateTotal();
  }
  if(elements.barberSelect) {
    elements.barberSelect.innerHTML = (state.settings.barbers || []).map(b => `<option value="${b.id}">${escapeHtml(b.name)}</option>`).join("");
    if(state.selectedBarberId) elements.barberSelect.value = state.selectedBarberId;
    state.selectedBarberId = elements.barberSelect.value;
  }
  if(elements.blockBarberSelect) {
    elements.blockBarberSelect.innerHTML = (state.settings.barbers || []).map(b => `<option value="${b.id}">${escapeHtml(b.name)}</option>`).join("");
  }
}

function calculateTotal() {
  const checkboxes = document.querySelectorAll('input[name="serviceItem"]:checked'); let total = 0;
  checkboxes.forEach(cb => { const s = state.settings.services.find(x => x.id === cb.value); if(s) total += Number(s.price); });
  if(elements.totalPriceDisplay) elements.totalPriceDisplay.textContent = formatPrice(total);
}

function renderSlotBoard() {
  if(!elements.slotBoard || !elements.timeSelect) return;
  const reqSlots = document.querySelectorAll('input[name="serviceItem"]:checked').length || 1;
  const startIndex = state.timeSlots.indexOf(state.selectedTime);
  
  elements.timeSelect.innerHTML = state.timeSlots.map(t => {
    let booked = !state.availableSlots.includes(t);
    if(!booked) {
      const idx = state.timeSlots.indexOf(t);
      for(let i=0; i<reqSlots; i++) { if(!state.availableSlots.includes(state.timeSlots[idx+i])) booked = true; }
    }
    return `<option value="${t}" ${booked?'disabled':''}>${t}</option>`;
  }).join("");

  elements.slotBoard.innerHTML = state.timeSlots.map(t => {
    let booked = !state.availableSlots.includes(t);
    if(!booked) {
      const idx = state.timeSlots.indexOf(t);
      for(let i=0; i<reqSlots; i++) { if(!state.availableSlots.includes(state.timeSlots[idx+i])) booked = true; }
    }
    const isSel = state.selectedTime === t;
    return `<button class="slot-button ${isSel?'is-selected':''}" type="button" data-time="${t}" ${booked?'disabled':''}>${t}</button>`;
  }).join("");
}

window.selectAdminDate = function(dateStr) { state.adminSelectedDate = dateStr; renderAppointments(); }

// AKILLI YATAY TAKVİM VE ARAMA MOTORLU LİSTELEME
function renderAppointments() {
  if(!elements.appointmentsList) return;
  let tabsHtml = `<div class="admin-calendar-tabs">`;
  const todayDate = new Date();
  for(let i = -2; i <= 14; i++) {
      const d = new Date(todayDate); d.setDate(todayDate.getDate() + i);
      const offset = d.getTimezoneOffset() * 60000;
      const dateStr = new Date(d.getTime() - offset).toISOString().slice(0, 10);
      const isActive = dateStr === state.adminSelectedDate;
      const day = new Date(dateStr + "T12:00:00").getDate();
      const month = new Date(dateStr + "T12:00:00").toLocaleString('tr-TR', { month: 'short' });
      tabsHtml += `<div class="cal-tab ${isActive?'active':''}" onclick="window.selectAdminDate('${dateStr}')">${day} ${month}${dateStr===todayISO()?' (Bugün)':''}</div>`;
  }
  tabsHtml += `</div>`;

  let query = (elements.adminSearchInput?.value || "").toLowerCase().trim();
  let dailyApps = state.appointments.filter(a => {
    if (a.date !== state.adminSelectedDate) return false;
    if (query) { return a.customerName.toLowerCase().includes(query) || a.customerPhone.includes(query); }
    return true;
  });
  dailyApps.sort((a,b) => a.time.localeCompare(b.time));

  let appsHtml = `<div style="background:#050505; border:1px solid #222; padding:15px; border-radius:12px; width:100%;">`;
  if(dailyApps.length === 0) {
    appsHtml += `<p style="text-align:center; color:#666; font-size:0.9rem; margin:0; padding:10px 0;">Randevu veya kilit bulunmuyor.</p>`;
  } else {
    dailyApps.forEach(app => {
      if(app.customerName === "KAPALI_SAAT") {
        const barber = state.settings.barbers.find(b => b.id === app.barberId) || {name:"Usta"};
        appsHtml += `<div style="background:#0a0a0a; border:1px dashed #444; padding:12px; border-radius:10px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center; gap:10px;">
          <span style="color:#aaa; font-weight:600; font-size:0.9rem;">🚫 ${app.time} - Blok: ${escapeHtml(barber.name)}</span>
          <button class="danger-button" type="button" data-cancel="${app.id}" style="padding:4px 10px; font-size:0.75rem;">Kaldır</button>
        </div>`;
      } else {
        const b = state.settings.barbers.find(x => x.id === app.barberId) || { name: "Berber" };
        const s = app.serviceIds.map(id => (state.settings.services.find(x=>x.id===id)||{}).name || "Hizmet").join(", ");
        appsHtml += `<div style="background:#111; border:1px solid #222; padding:15px; border-radius:12px; margin-bottom:12px;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:10px; margin-bottom:10px;">
            <div><h3 style="margin:0 0 3px 0; font-size:1.1rem;">${escapeHtml(app.customerName)}</h3><p style="margin:0; color:#888; font-size:0.85rem;">📞 ${escapeHtml(app.customerPhone)}</p></div>
            <div style="display:flex; gap:8px;"><button class="ghost-button" type="button" data-remind="${app.id}" style="padding:5px 10px; font-size:0.8rem; border-color:#25D366; color:#25D366;">📲 Hatırlat</button><button class="danger-button" type="button" data-cancel="${app.id}" style="padding:5px 10px; font-size:0.8rem;">İptal</button></div>
          </div>
          <div style="display:flex; gap:6px; flex-wrap:wrap; border-top:1px solid #1a1a1a; padding-top:10px; font-size:0.8rem; font-weight:600;">
            <span style="background:rgba(255,215,0,0.1); color:var(--primary); padding:3px 6px; border-radius:4px;">⏰ ${app.time}</span>
            <span style="background:#000; padding:3px 6px; border-radius:4px; border:1px solid #222;">✂️ ${escapeHtml(b.name)}</span>
            <span style="background:#000; padding:3px 6px; border-radius:4px; border:1px solid #222;">📋 ${escapeHtml(s)}</span>
          </div>
        </div>`;
      }
    });
  }
  appsHtml += `</div>`;
  elements.appointmentsList.innerHTML = tabsHtml + appsHtml;
}

function renderSettingsForm() {
  if(!elements.serviceSettings || !elements.barberSettings || !elements.blockTimeInput) return;
  elements.serviceSettings.innerHTML = state.settings.services.map((s,i) => `<div style="background:#0a0a0a; border:1px solid #333; padding:15px; margin-bottom:10px; border-radius:12px;"><div style="display:flex; justify-content:space-between; margin-bottom:10px;"><span style="color:var(--primary); font-weight:700;">Hizmet ${i+1}</span><button class="danger-button" type="button" data-delete-service="${s.id}" style="padding:4px 8px; font-size:0.75rem;">Sil</button></div><div style="display:flex; gap:10px; flex-wrap:wrap;"><input name="serviceName-${s.id}" type="text" value="${escapeHtml(s.name)}" style="flex:2; min-width:130px;" placeholder="Hizmet Adı" /><input name="servicePrice-${s.id}" type="number" value="${s.price}" style="flex:1; min-width:80px;" placeholder="Fiyat" /></div></div>`).join("");
  elements.barberSettings.innerHTML = state.settings.barbers.map((b,i) => `<div style="background:#0a0a0a; border:1px solid #333; padding:15px; margin-bottom:10px; border-radius:12px;"><div style="display:flex; justify-content:space-between; margin-bottom:10px;"><span style="color:var(--primary); font-weight:700;">Berber ${i+1}</span><button class="danger-button" type="button" data-delete-barber="${b.id}" style="padding:4px 8px; font-size:0.75rem;">Sil</button></div><div style="display:flex; gap:10px; flex-wrap:wrap;"><input name="barberName-${b.id}" type="text" value="${escapeHtml(b.name)}" style="flex:1; min-width:120px;" placeholder="İsim" /><input name="barberTitle-${b.id}" type="text" value="${escapeHtml(b.title)}" style="flex:1; min-width:120px;" placeholder="Uzmanlık" /></div></div>`).join("");
  elements.blockTimeInput.innerHTML = state.timeSlots.map(t => `<option value="${t}">${t}</option>`).join("");
}

// YENİ: SAF MÜŞTERİ GOOGLE/APPLE TAKVİM ENTEGRASYON MOTORU
function setupCalendarButton() {
  if(!elements.btnAddToCalendar || !state.lastCreatedApp) return;
  const app = state.lastCreatedApp;
  const b = state.settings.barbers.find(x => x.id === app.barberId) || {name:"Usta"};
  
  const startDateTime = new Date(`${app.date}T${app.time}:00`);
  const endDateTime = new Date(startDateTime.getTime() + 30 * 60000 * (app.serviceIds?.length || 1));
  
  const fTime = (d) => d.toISOString().replace(/-|:|\.\d\d\d/g,"");
  const gLink = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(state.settings.salonName || "Salon Bayber")}+Randevusu&dates=${fTime(startDateTime)}/${fTime(endDateTime)}&details=${encodeURIComponent("Berber: "+b.name+"\nLütfen randevu saatinden 10 dk önce dükkanda olunuz.")}&location=${encodeURIComponent(state.settings.salonAddress || "Reyhanlı, Hatay")}&sf=true&output=xml`;
  
  elements.btnAddToCalendar.href = gLink;
  elements.btnAddToCalendar.target = "_blank";
  if(elements.successCalendarArea) elements.successCalendarArea.style.display = "block";
}

async function triggerStateUpdate() {
  const query = new URLSearchParams({ date: state.selectedDate, barberId: state.selectedBarberId });
  const payload = await api(`/api/public-state?${query.toString()}`);
  state.settings = payload.settings; state.timeSlots = payload.timeSlots; state.availableSlots = payload.availableSlots; state.todayCount = payload.todayCount; state.allBarbersSlots = payload.allBarbersSlots || {}; state.appointments = payload.appointments || [];
  renderBrand(); renderLiveStatusGrid(); renderSlotBoard(); renderStats(); renderAppointments();
}

function bindEvents() {
  if(elements.bookingForm) {
    elements.bookingForm.addEventListener("submit", async (e) => {
      e.preventDefault(); setMessage(elements.formMessage, "Randevu oluşturuluyor...", "success");
      const sIds = Array.from(document.querySelectorAll('input[name="serviceItem"]:checked')).map(cb => cb.value);
      if(!sIds.length) return setMessage(elements.formMessage, "En az bir hizmet seçmelisiniz.", "error");
      try {
        const payload = { customerName: elements.customerName.value.trim(), customerPhone: elements.customerPhone.value.trim(), serviceIds: sIds, barberId: state.selectedBarberId, date: state.selectedDate, time: state.selectedTime };
        const res = await api("/api/appointments", { method: "POST", body: JSON.stringify(payload) });
        state.lastCreatedApp = payload; setupCalendarButton();
        setMessage(elements.formMessage, "Randevunuz oluşturuldu! WhatsApp fişiniz hazırlanıyor...", "success");
        setTimeout(() => {
          const sNames = sIds.map(id => (state.settings.services.find(x=>x.id===id)||{}).name).join(", ");
          window.location.href = `https://api.whatsapp.com/send/?phone=905395960584&text=${encodeURIComponent(`👤 Müşteri: ${payload.customerName}\n📅 Tarih: ${formatDate(payload.date)}\n⏰ Saat: ${payload.time}\n✂️ Berber: ${(state.settings.barbers.find(x=>x.id===payload.barberId)||{}).name}\n📋 Hizmetler: ${sNames}\n❌ İptal Kodu: ${res.cancelCode}`)}`;
        }, 1500);
        await triggerStateUpdate();
      } catch(err) { setMessage(elements.formMessage, err.message, "error"); }
    });
  }
  
  if(elements.btnBlockSlot) {
    elements.btnBlockSlot.addEventListener("click", async () => {
      const bBarber = elements.blockBarberSelect.value; const bDate = elements.blockDateInput.value; const bTime = elements.blockTimeInput.value;
      if(!bBarber || !bDate || !bTime) return setMessage(elements.blockMessage, "Tüm alanları doldurun.", "error");
      try {
        setMessage(elements.blockMessage, "Saat Bloke Ediliyor...", "success");
        await api("/api/appointments", { method: "POST", body: JSON.stringify({ customerName: "KAPALI_SAAT", customerPhone: "000", serviceIds: [state.settings.services[0].id], barberId: bBarber, date: bDate, time: bTime }) });
        setMessage(elements.blockMessage, "Saat Başarıyla Kapatıldı! 🚫", "success"); await triggerStateUpdate();
      } catch(err) { setMessage(elements.blockMessage, err.message, "error"); }
    });
  }

  if(elements.adminSearchInput) elements.adminSearchInput.addEventListener("input", renderAppointments);
  if(elements.customerDateView) elements.customerDateView.addEventListener("change", (e) => { state.selectedDate = e.target.value; if(elements.dateSelect) elements.dateSelect.value = e.target.value; triggerStateUpdate(); });
  if(elements.dateSelect) elements.dateSelect.addEventListener("change", (e) => { state.selectedDate = e.target.value; if(elements.customerDateView) elements.customerDateView.value = e.target.value; triggerStateUpdate(); });
  if(elements.barberSelect) elements.barberSelect.addEventListener("change", (e) => { state.selectedBarberId = e.target.value; triggerStateUpdate(); });
  
  if(elements.slotBoard) {
    elements.slotBoard.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-time]"); if(!btn || btn.disabled) return;
      state.selectedTime = btn.dataset.time; if(elements.timeSelect) elements.timeSelect.value = btn.dataset.time; renderSlotBoard();
    });
  }

  if(elements.adminLoginForm) {
    elements.adminLoginForm.addEventListener("submit", async (e) => {
      e.preventDefault(); try {
        const res = await api("/api/admin/login", { method: "POST", body: JSON.stringify({ pin: elements.adminPinInput.value.trim() }) });
        state.adminToken = res.token; state.adminUnlocked = true; sessionStorage.setItem("barberline-admin-token", res.token);
        elements.adminPinInput.value = ""; await loadAdminDashboard(); renderSettingsVisibility(); renderSettingsForm(); renderAppointments();
      } catch(err) { setMessage(elements.adminMessage, err.message, "error"); }
    });
  }

  if(elements.settingsForm) {
    elements.settingsForm.addEventListener("submit", async (e) => {
      e.preventDefault(); setMessage(elements.settingsMessage, "Ayarlar Kaydediliyor...", "success");
      try {
        const srv = state.settings.services.map(s => ({ id: s.id, name: document.querySelector(`input[name="serviceName-${s.id}"]`).value.trim(), price: Number(document.querySelector(`input[name="servicePrice-${s.id}"]`).value), duration: s.duration || "30 dk" }));
        const brb = state.settings.barbers.map(b => { const n = document.querySelector(`input[name="barberName-${b.id}"]`).value.trim(); return { id: b.id, name: n, title: document.querySelector(`input[name="barberTitle-${b.id}"]`).value.trim(), initials: makeInitials(n) }; });
        
        let finalImage = state.settings.salonImage; const imgInp = elements.salonImageInput;
        if(imgInp && imgInp.files && imgInp.files[0]) {
          finalImage = await new Promise(res => {
            const rd = new FileReader(); rd.onload = (ev) => {
              const im = new Image(); im.onload = () => {
                const cv = document.createElement("canvas"); cv.width = 600; cv.height = 400; cv.getContext("2d").drawImage(im,0,0,600,400); res(cv.toDataURL("image/jpeg", 0.7));
              }; im.src = ev.target.result;
            }; rd.readAsDataURL(imgInp.files[0]);
          });
        }
        const payload = { salonName: elements.salonNameInput.value.trim(), salonPhone: elements.salonPhoneInput.value.trim(), salonAddress: elements.salonAddressInput.value.trim(), salonImage: finalImage, services: srv, barbers: brb };
        await api("/api/admin/settings", { method: "PUT", body: JSON.stringify(payload) });
        setMessage(elements.settingsMessage, "Tüm Ayarlar Başarıyla Paketlenip Kaydedildi! ✅", "success"); await triggerStateUpdate();
      } catch(err) { setMessage(elements.settingsMessage, err.message, "error"); }
    });
  }

  if(elements.btnShowLogin) elements.btnShowLogin.addEventListener("click", (e) => { e.preventDefault(); state.showLoginScreen = true; renderSettingsVisibility(); });
  if(elements.btnCancelLogin) elements.btnCancelLogin.addEventListener("click", (e) => { e.preventDefault(); state.showLoginScreen = false; renderSettingsVisibility(); });
  if(elements.lockSettings) elements.lockSettings.addEventListener("click", () => { state.adminToken = ""; state.adminUnlocked = false; state.showLoginScreen = false; sessionStorage.removeItem("barberline-admin-token"); renderSettingsVisibility(); });
  if(elements.addService) elements.addService.addEventListener("click", () => { state.settings.services.push({ id: `srv-${Date.now()}`, name: "Yeni Hizmet", price: 150, duration:"30 dk" }); renderSettingsForm(); });
  if(elements.addBarber) elements.addBarber.addEventListener("click", () => { state.settings.barbers.push({ id: `brb-${Date.now()}`, name: "Yeni Berber", title: "Kalfalık", initials: "YB" }); renderSettingsForm(); });

  document.addEventListener("click", async (e) => {
    const btnCancel = e.target.closest("[data-cancel]");
    if(btnCancel && confirm("Bunu silmek istediğinize emin misiniz?")) {
      await api(`/api/admin/appointments/${encodeURIComponent(btnCancel.dataset.cancel)}`, { method: "DELETE" }); await triggerStateUpdate();
    }
    const btnRemind = e.target.closest("[data-remind]");
    if(btnRemind) {
      const app = state.appointments.find(x => x.id === btnRemind.dataset.remind);
      if(app) {
        window.open(`https://api.whatsapp.com/send/?phone=90${app.customerPhone.replace(/\D/g,'').slice(-10)}&text=${encodeURIComponent(`Merhaba ${app.customerName},\n\n(${formatDate(app.date)}) saat *${app.time}* itibariyle *${state.settings.salonName}* salonumuzda randevunuz bulunmaktadır. Gelemiyecekseniz lütfen bilgi veriniz. Sıhhatler dileriz! ✂️🔥`)}`, '_blank');
      }
    }
  });
}

async function loadAdminDashboard() { if(state.adminToken) { const res = await api("/api/admin/dashboard"); state.appointments = res.appointments; state.settings = res.settings; } }

async function init() {
  if(elements.dateSelect) { elements.dateSelect.min = todayISO(); elements.dateSelect.value = state.selectedDate; }
  if(elements.customerDateView) { elements.customerDateView.min = todayISO(); elements.customerDateView.value = state.selectedDate; }
  bindEvents(); renderServicesAndBarbers(); await triggerStateUpdate(); if(state.adminUnlocked) { await loadAdminDashboard(); renderSettingsForm(); } renderSettingsVisibility();
}
init();