# Salon Bayber Randevu

Salon Bayber icin profesyonel, web tabanli berber randevu sistemi.

Bu proje yerel demo mantigindan cikarildi. Node.js sunucusu, API katmani, yonetici paneli, randevu kaydi, berber yonetimi ve SMS bildirim altyapisi birlikte calisir. Internetten herkesin girebilecegi site yapmak icin bu kodu Node.js destekleyen bir hosting servisine yayinlamak gerekir.

## Varsayilan Kurulum

- Salon adi: `Salon Bayber`
- Varsayilan berber: `Mehmet Ali Şanverdi`
- Varsayilan yonetici sifresi: `1234`

Yayina almadan once yonetici sifresini degistir.

## Musteri Ozellikleri

- Randevu alma
- Hizmet secme
- Berber secme
- Tarih ve saat secme
- Dolu saatleri otomatik kapatma
- Gecmis saatleri kapatma
- Pazar gununu kapali kabul etme
- Telefon, tablet ve masaustu uyumlu arayuz
- Telefonda ana ekrana eklenerek uygulama gibi kullanma

## Yonetici Ozellikleri

Sag ustteki `Yonetici` butonu ile girilir.

- Salon adini degistirme
- Berber ekleme
- Berber silme
- Berber adi ve uzmanligini duzenleme
- Yonetici sifresini degistirme
- Randevu iptal etme
- SMS gonderim durumlarini gorme

Not: Randevusu bulunan berber silinemez. Once o berberin randevularini iptal etmek gerekir.

## Yerelde Calistirma

PowerShell:

```powershell
cd "C:\Users\LENOVO\OneDrive\Belgeler\New project"
node server.mjs 5173
```

Bilgisayarda:

```text
http://localhost:5173
```

Telefonda `localhost` kullanma. Bilgisayarin IPv4 adresi ile ac:

```text
http://BILGISAYAR_IP_ADRESI:5173
```

Ornek:

```text
http://192.168.1.35:5173
```

## Internetten Herkesin Girecegi Site

Bu uygulama artik gercek web sitesi olarak yayinlanmaya hazir Node.js uygulamasidir. Herkesin girebilmesi icin hosting gerekir.

En pratik secenekler:

- Render
- Railway
- Fly.io
- DigitalOcean VPS
- Hetzner VPS
- Kendi sunucun

## Render ile Yayinlama

1. Bu klasoru GitHub reposuna yukle.
2. Render.com hesabina gir.
3. `New Web Service` sec.
4. GitHub reposunu bagla.
5. Start command:

```text
npm start
```

6. Ortam degiskenlerini ekle:

```text
HOST=0.0.0.0
ADMIN_PIN=guclu-bir-sifre
```

7. Randevu verilerinin silinmemesi icin persistent disk ekle:

```text
Mount path: /opt/render/project/src/data
Size: 1 GB
```

Bu repo icinde `render.yaml` hazir. Render Blueprint olarak da kullanilabilir.

## VPS ile Yayinlama

Sunucuda Node.js 22+ kurulu olmalidir.

```bash
git clone REPO_ADRESI
cd REPO_KLASORU
npm install
PORT=80 HOST=0.0.0.0 npm start
```

Domaini sunucu IP adresine yonlendir. HTTPS icin Nginx + Certbot kullan.

## SMS

SMS gonderimi Twilio icin hazirlandi. Sunucuda su ortam degiskenleri gerekir:

```text
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_FROM_NUMBER=+1234567890
```

Bu bilgiler yoksa randevu kaydedilir ama SMS durumu yonetici panelinde `SMS servisi bagli degil` olarak gorunur.

## Veri Saklama

Varsayilan olarak veriler:

```text
data/db.json
```

dosyasina kaydedilir. Kucuk isletme MVP'si icin yeterlidir. Cok kullanicili ve yuksek trafikli yayinda PostgreSQL gibi gercek veritabani onerilir.
