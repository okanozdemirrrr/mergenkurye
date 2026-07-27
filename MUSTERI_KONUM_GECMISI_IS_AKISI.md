# Müşteri Konum Geçmişi (Geolocation Binding) — İş Akışı

Bu doküman, `customer_locations` tablosu etrafında kurulan **konum toplama** ve **konum seçme** döngüsünü uçtan uca açıklar.

Amaç: Aynı müşteri telefonuna ikinci (ve sonraki) siparişlerde, kuryenin daha önce mühürlediği GPS noktalarını restoran panelinde haritadan seçip siparişe bağlamak.

---

## 1. Büyük resim

```
┌─────────────────┐     GPS + etiket      ┌──────────────────────┐
│  Kurye uygulaması│ ───────────────────► │  customer_locations  │
│  "Konumu Kaydet" │      INSERT           │  (Supabase)          │
└─────────────────┘                       └──────────┬───────────┘
                                                     │
                                                     │ SELECT (telefon)
                                                     ▼
                                          ┌──────────────────────┐
                                          │  Restoran paneli     │
                                          │  Yeni Sipariş Modal  │
                                          │  + CustomerMap       │
                                          └──────────┬───────────┘
                                                     │
                                                     │ lat/lng → packages
                                                     ▼
                                          ┌──────────────────────┐
                                          │  packages            │
                                          │  latitude/longitude  │
                                          └──────────────────────┘
```

| Rol | Ne yapar? |
|-----|-----------|
| **Kurye** | Teslimat noktasında GPS alır, etiketi seçer, kaydı mühürler (yazma). |
| **Restoran** | Telefon girince kayıtlı konumları haritada görür, birini seçer, siparişe yazar (okuma + bağlama). |
| **Sistem** | Telefon numarası anahtar; konumlar bu numaraya bağlanır. |

---

## 2. Veritabanı

**Migration:** `database/migrations/014_customer_locations.sql`

### Tablo: `customer_locations`

| Kolon | Tip | Açıklama |
|-------|-----|----------|
| `id` | UUID (PK) | Otomatik `gen_random_uuid()` |
| `phone_number` | TEXT NOT NULL | Müşteri telefonu (siparişten) |
| `latitude` | DOUBLE PRECISION | GPS enlem |
| `longitude` | DOUBLE PRECISION | GPS boylam |
| `label` | TEXT | Ev / İş/Sanayi / Yurt/Okul / özel isim |
| `created_at` | TIMESTAMPTZ | Kayıt zamanı (DESC sıralama için) |

### İndeksler

- `idx_customer_locations_phone` → telefon ile arama
- `idx_customer_locations_phone_created` → telefon + `created_at DESC`

### RLS

`anon` ve `authenticated` için SELECT / INSERT / UPDATE / DELETE açık (mevcut proje politikasıyla uyumlu).

### Kurulum

Supabase SQL Editor'da migration dosyasını çalıştırın. Tablo yoksa konum kaydı ve harita sorguları sessizce başarısız olur / boş döner.

---

## 3. Dosya haritası

| Dosya | Görev |
|-------|--------|
| `database/migrations/014_customer_locations.sql` | Tablo + RLS |
| `src/utils/getCurrentPosition.ts` | Hibrit GPS (Capacitor / Web) |
| `src/components/SaveCustomerLocationModal.tsx` | Kurye etiket modalı + insert |
| `src/app/kurye/page.tsx` | "Konumu Kaydet" butonu + toast |
| `src/components/CustomerMap.tsx` | Leaflet harita + marker seçimi |
| `src/app/restoran/components/NewOrderModal.tsx` | Telefon → konum çekme → harita → siparişe lat/lng |

**Bağımlılıklar:** `leaflet`, `react-leaflet`, `@types/leaflet`, `@capacitor/geolocation`

---

## 4. Akış A — Kurye: Konumu mühürleme (veri toplama)

### 4.1 Tetikleyici

Aktif paket kartında, teslimat adresinin hemen altında:

- Buton: **Konumu Kaydet**
- Koşul: Pakette `customer_phone` dolu olmalı
- Konum: `src/app/kurye/page.tsx` → paket listesi

Butona basılınca `locationModalPackage` state'i o pakete set edilir ve modal açılır.

### 4.2 Modal arayüzü

Bileşen: `SaveCustomerLocationModal`

Motor üstündeki kullanım için tasarlandı: büyük, tek kolon, kolay tıklanır butonlar.

| Buton | Davranış |
|-------|----------|
| **Ev** | Direkt GPS al → kaydet (`label = "Ev"`) |
| **İş/Sanayi** | Direkt GPS al → kaydet (`label = "İş/Sanayi"`) |
| **Yurt/Okul** | Direkt GPS al → kaydet (`label = "Yurt/Okul"`) |
| **Diğer** | Modal içinde text input + **Kaydet** butonu açılır |

**Diğer** seçilince:

1. Input görünür (`placeholder` örn. "Mavi apartman arka kapı")
2. Kullanıcı isim yazar → **Kaydet**
3. Enter tuşu da kaydı tetikler
4. Capacitor klavyesi için: input focus olunca `scrollIntoView({ block: 'center' })` (300 ms gecikmeli); modal mobilde alta yaslanır (`items-end`)

Kayıt sırasında butonlar kilitlenir; durum metinleri:

1. `GPS konumu alınıyor...`
2. `Konum kaydediliyor...`

### 4.3 Hibrit GPS (`getCurrentPosition`)

Dosya: `src/utils/getCurrentPosition.ts`

```
Native (Capacitor.isNativePlatform)?
  ├─ Evet → @capacitor/geolocation
  │         checkPermissions → gerekirse requestPermissions
  │         getCurrentPosition({ enableHighAccuracy, timeout: 20s, maximumAge: 0 })
  │         başarısızsa → Web API fallback
  └─ Hayır → navigator.geolocation.getCurrentPosition (aynı seçenekler)
```

- `enableHighAccuracy: true` → mümkün olduğunca gerçek GPS
- `maximumAge: 0` → cache yok, taze konum
- İzin reddi / timeout / GPS kapalı için Türkçe hata mesajları

### 4.4 Supabase insert

Etiket netleştiği anda:

```ts
supabase.from('customer_locations').insert([{
  phone_number: paket.customer_phone,
  latitude: coords.latitude,
  longitude: coords.longitude,
  label: seçilenVeyaYazılanEtiket,
}])
```

### 4.5 Başarı / hata

| Durum | UI |
|-------|-----|
| Başarı | Modal kapanır; üstte yeşil toast: **Konum başarıyla mühürlendi (Ev)** (~3 sn) |
| Hata | Modal açık kalır; kırmızı hata bandı (izin, GPS, DB vb.) |

Toast, scroll'dan bağımsız görünsün diye `fixed top-4` + yüksek z-index ile ayrı state (`locationToast`) kullanır; genel `successMessage` bandına karışmaz.

---

## 5. Akış B — Restoran: Haritadan konum seçme (veriyi kullanma)

### 5.1 Tetikleyici

`NewOrderModal` içinde müşteri telefonu yazılırken:

1. Rakamlar temizlenir (`\D` çıkarılır)
2. En az **10 hane** yoksa konum listesi temizlenir, harita gösterilmez
3. 10+ hane olunca **300 ms debounce** sonrası sorgu

### 5.2 Sorgu

```ts
supabase
  .from('customer_locations')
  .select('id, phone_number, latitude, longitude, label, created_at')
  .or(`phone_number.eq.${phone},phone_number.eq.${digits},phone_number.ilike.%${last10}`)
  .order('created_at', { ascending: false })
  .limit(20)
```

Amaç: `05xx...`, `5xx...`, boşluklu format gibi varyasyonlarda aynı müşteriyi yakalamak (son 10 hane ile `ilike`).

### 5.3 Harita (`CustomerMap`)

- `next/dynamic` + `ssr: false` → Leaflet SSR'da `window is not defined` hatası önlenir
- Varsayılan marker ikonları CDN ile düzeltilir (`L.Icon.Default.mergeOptions`)
- Marker popup içinde **Bu Konumu Seç**
- Birden fazla nokta varsa `fitBounds`; tek noktada zoom 15

### 5.4 Seçim sonrası

`handleSelectLocation`:

- `selectedLocation` state set edilir
- Adres alanı boşsa `label` teslimat adresine yazılabilir
- Yeşil bant: **Seçilen Adres: …**

### 5.5 Sipariş oluşturma

`packages` insert payload'ına, seçim varsa:

```ts
latitude: selectedLocation.latitude
longitude: selectedLocation.longitude
```

Böylece sonraki navigasyon / "Konuma Git" gibi özellikler koordinat kullanabilir.

Müşteri temizlenince (`clearCustomer`) konum state'leri de sıfırlanır.

---

## 6. Uçtan uca senaryo (örnek)

1. Müşteri **0555 123 45 67** ilk siparişini verir; konum tablosu boştur → restoran harita görmez.
2. Kurye teslimatta kapıda **Konumu Kaydet** → **Ev** basar.
3. Native/Web GPS alınır → `customer_locations` satırı oluşur:
   - `phone_number`: `05551234567` (siparişteki hali)
   - `label`: `Ev`
   - `lat` / `lng`: anlık GPS
4. Aynı numara ile ikinci siparişte restoran telefona yazar.
5. Debounce sonrası haritada **Ev** marker'ı çıkar.
6. Restoran **Bu Konumu Seç** → sipariş `packages.latitude/longitude` ile kaydolur.
7. İleride kurye **İş/Sanayi** veya **Diğer** ile yeni noktalar ekleyebilir; haritada birden fazla pin görünür.

---

## 7. UI / UX notları

- Marka renkleri (turuncu / yeşil) korunur; kurye kaydet butonu slate tonlarında, toast yeşil.
- Modal mobilde alt sheet benzeri; masaüstünde ortalanmış.
- Kayıt sırasında çift tıklama engeli (`saving` flag).
- Telefon yoksa konum butonu gösterilmez / modal kayıt reddeder.

---

## 8. Test kontrol listesi

### Ön koşul

- [ ] `014_customer_locations.sql` Supabase'de çalıştırıldı
- [ ] Konum izinleri (tarayıcıda HTTPS veya localhost; native'de app izinleri)

### Kurye

- [ ] Aktif pakette telefon varken **Konumu Kaydet** görünüyor
- [ ] Ev / İş / Yurt tek dokunuşta kaydediyor
- [ ] Diğer → input + Kaydet çalışıyor; boş isimde uyarı veriyor
- [ ] Başarıda yeşil toast + modal kapanıyor
- [ ] Supabase Table Editor'da satır görünüyor

### Restoran

- [ ] Aynı telefona 10+ hane girince harita / "kayıtlı konum" metni geliyor
- [ ] Marker popup'tan seçim yeşil "Seçilen Adres" gösteriyor
- [ ] Yeni siparişte `packages` satırında `latitude` / `longitude` dolu

### Ortam

- [ ] Web (Chrome) geolocation
- [ ] Capacitor APK (izin diyaloğu + GPS)

---

## 9. Bilinen sınırlar / dikkat

1. **Telefon formatı:** Kurye siparişteki string'i aynen yazar; restoran sorgusu `eq` + son 10 hane `ilike` ile yumuşatır. İdeal olarak ileride tek normalize format (E.164) düşünülebilir.
2. **RLS geniş:** Tablo şu an herkese açık okuma/yazma; production'da role göre daraltılabilir.
3. **Doğruluk:** `maximumAge: 0` + high accuracy istenir; kapalı alan / zayıf GPS'te timeout veya düşük accuracy olabilir — kurye açık alanda tekrar denemelidir.
4. **packages şeması:** `latitude` / `longitude` kolonlarının `packages` tablosunda mevcut olması gerekir (önceden eklenmiş web platform / navigasyon akışı).

---

## 10. Özet

| Adım | Aktör | Sonuç |
|------|--------|--------|
| 1 | Kurye | Kapıda GPS + etiket → `customer_locations` |
| 2 | Restoran | Telefon → geçmiş pinler haritada |
| 3 | Restoran | Pin seç → yeni siparişe lat/lng |
| 4 | Sistem | Tekrarlayan adreslerde daha hızlı ve doğru teslimat koordinatı |

Bu döngü **Geolocation Binding**: konum bir kez mühürlenir, sonraki siparişlerde telefon anahtarıyla tekrar kullanılır.
