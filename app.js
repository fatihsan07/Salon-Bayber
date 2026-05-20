const state = {
  settings: { services: [], barbers: [] },
  appointments: [],
  allBarbersSlots: {},
  selectedDate: todayISO(),
  selectedBarberId: "",
  selectedTime: "",
  adminToken: sessionStorage.getItem("token")
};

function todayISO() {
  return new Date(
    new Date().getTime() - new Date().getTimezoneOffset() * 60000
  )
    .toISOString()
    .slice(0, 10);
}

async function api(path, options = {}) {
  try {
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${state.adminToken || ""}`
    };

    const res = await fetch(path, {
      ...options,
      headers
    });

    if (!res.ok) {
      throw new Error("API Hatası");
    }

    return await res.json();
  } catch (err) {
    console.error(err);
    alert("Sunucu bağlantı hatası.");
  }
}

async function initUI() {
  const payload = await api(
    `/api/public-state?date=${state.selectedDate}`
  );

  if (!payload) return;

  state.settings = payload.settings || {};
  state.appointments = payload.appointments || [];
  state.allBarbersSlots = payload.allBarbersSlots || {};

  renderBarbers();
  renderServices();
  renderSlots();

  const dateInput = document.getElementById("dateSelect");
  if (dateInput) {
    dateInput.value = state.selectedDate;

    dateInput.addEventListener("change", async () => {
      state.selectedDate = dateInput.value;

      const payload = await api(
        `/api/public-state?date=${state.selectedDate}`
      );

      state.allBarbersSlots =
        payload.allBarbersSlots || {};

      renderSlots();
    });
  }
}

function renderBarbers() {
  const bSelect =
    document.getElementById("barberSelect");

  if (!bSelect) return;

  if (!state.settings.barbers?.length) {
    bSelect.innerHTML =
      `<option>Berber bulunamadı</option>`;
    return;
  }

  bSelect.innerHTML = state.settings.barbers
    .map(
      b =>
        `<option value="${b.id}">${b.name}</option>`
    )
    .join("");

  state.selectedBarberId =
    state.settings.barbers[0].id;

  bSelect.addEventListener("change", () => {
    state.selectedBarberId = bSelect.value;
    renderSlots();
  });
}

function renderServices() {
  const sBox = document.getElementById(
    "serviceCheckboxes"
  );

  if (!sBox) return;

  sBox.innerHTML = state.settings.services
    .map(
      s => `
      <div 
        class="v-card" 
        data-id="${s.id}" 
        onclick="toggleService('${s.id}')"
      >
        <div class="v-service-left">
          <div class="v-check-icon"></div>
          <span class="v-service-name">
            ${s.name}
          </span>
        </div>

        <span class="v-service-price">
          ${s.price}₺
        </span>
      </div>
    `
    )
    .join("");
}

window.toggleService = id => {
  const card = document.querySelector(
    `[data-id="${id}"]`
  );

  if (!card) return;

  card.classList.toggle("is-checked");

  renderSlots();
};

function renderSlots() {
  if (!state.settings.barbers?.length) return;

  const bId =
    state.selectedBarberId ||
    state.settings.barbers[0].id;

  const slots =
    state.allBarbersSlots[bId] || [];

  const board =
    document.getElementById("slotBoard");

  if (!board) return;

  if (!slots.length) {
    board.innerHTML =
      "<p>Müsait saat bulunamadı.</p>";
    return;
  }

  board.innerHTML = slots
    .map(
      t => `
      <button
        type="button"
        class="slot-button ${
          state.selectedTime === t
            ? "active"
            : ""
        }"
        onclick="selectTime('${t}')"
      >
        ${t}
      </button>
    `
    )
    .join("");
}

window.selectTime = t => {
  state.selectedTime = t;
  renderSlots();
};

const form =
  document.getElementById("bookingForm");

if (form) {
  form.addEventListener(
    "submit",
    async e => {
      e.preventDefault();

      const selectedServices = [
        ...document.querySelectorAll(
          ".v-card.is-checked"
        )
      ].map(el => el.dataset.id);

      if (!state.selectedTime) {
        alert("Saat seçiniz");
        return;
      }

      const payload = {
        customerName:
          document.getElementById(
            "customerName"
          )?.value || "",

        customerPhone:
          document.getElementById(
            "customerPhone"
          )?.value || "",

        barberId:
          document.getElementById(
            "barberSelect"
          )?.value || "",

        services: selectedServices,

        date:
          document.getElementById(
            "dateSelect"
          )?.value || "",

        time: state.selectedTime
      };

      console.log(payload);

      alert(
        "Randevu başarıyla oluşturuldu."
      );
    }
  );
}

initUI();