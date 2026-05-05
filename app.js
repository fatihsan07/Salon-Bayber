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
        time: timeSelect,
        note: formData.get("noteInput").trim(),
      }),
    });

    elements.bookingForm.reset();
    elements.dateSelect.value = state.selectedDate;
    elements.noteInput.value = "";
    setMessage(elements.formMessage, "Randevu oluşturuldu! WhatsApp fişiniz açılıyor...");
    await refreshAll();

    // BİZİM EKLEDİĞİMİZ KISIM: Müşterinin WhatsApp'ını otomatik açma
    let phone = customerPhone.replace(/[^0-9]/g, '');
    if (phone.startsWith('0')) phone = '90' + phone.substring(1);
    if (phone.length === 10) phone = '90' + phone;

    // Müşteriye gidecek otomatik randevu metni
    const waText = encodeURIComponent(`Merhaba ${customerName}! Salon Bayber randevunuz başarıyla oluşturulmuştur. Tarih: ${dateSelect} Saat: ${timeSelect}. Bizi tercih ettiğiniz için teşekkürler!`);

    // Müşterinin numarasını kullanarak kendi kendine mesaj atmasını (not almasını) sağlar
    window.open(`https://wa.me/${phone}?text=${waText}`, '_blank');

  } catch (error) {
    setMessage(elements.formMessage, error.message, "error");
    await refreshAll();
  }
}