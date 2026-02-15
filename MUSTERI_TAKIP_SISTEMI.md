# 📦 Müşteri Takip Sistemi - Mergen Kurye

## ✅ Tamamlanan Özellikler

### 1. Web Müşteri Takip Paneli (`/takip`)

**Özellikler:**
- ✅ Bağımsız, mobil uyumlu web sayfası
- ✅ Leaflet harita entegrasyonu
- ✅ Sipariş kodu ile giriş sistemi
- ✅ Gerçek zamanlı kurye konumu takibi
- ✅ Sadece ilgili sipariş ve kurye gösterimi (diğer kuryeler gizli)
- ✅ Koyu tema (dark mode)

**Erişim:**
```
https://yourdomain.com/takip?kod=MRG-2024-001
```

---

### 2. Giriş Kontrolü ve Doğrulama

**Sipariş Durumlarına Göre Davranış:**

#### ✅ Aktif Sipariş (assigned, picking_up, on_the_way)
- Müşteriyi canlı takip haritasına yönlendirir
- Kurye konumunu gerçek zamanlı gösterir
- Teslimat noktasını işaretler
- Rota çizgisi gösterir

#### ✅ Teslim Edilmiş Sipariş (delivered)
- Harita gösterilmez
- Teslim mesajı gösterilir:
  ```
  [11.02.2026] tarihinde, saat [14:30] itibariyle 
  [MRG-2024-001] numaralı siparişiniz başarıyla 
  teslim edilmiştir. Afiyet olsun!
  ```

#### ✅ Hatalı/İptal Edilmiş Sipariş
- "Girdiğiniz sipariş numarasını kontrol edin" uyarısı
- "Bu sipariş iptal edilmiştir" mesajı

---

### 3. Dinamik Zaman Algoritması

**Sipariş Durumuna Göre Tahmini Süreler:**

| Durum | Tahmini Süre | Açıklama |
|-------|--------------|----------|
| `assigned` | 40-45 dk | Kurye atandı, hazırlık aşamasında |
| `picking_up` | 30-35 dk | Kurye restoranda, sipariş alınıyor |
| `on_the_way` | 15-20 dk | Kurye yolda, teslimat yakın |

**Görünüm:**
- Üst panelde büyük fontla gösterilir
- Örnek: "15-20 dk" (turuncu renkte)
- "tahmini süre" alt yazısı

---

### 4. WhatsApp Entegrasyonu

**Kurye Paneli - Otomatik Mesaj Taslağı:**

#### 📱 Sipariş Kabul Edildiğinde (assigned, picking_up)
```
Merhaba [Müşteri Adı], siparişinizi aldım! 🏍️

Siparişinizi buradan takip edebilirsiniz:
https://yourdomain.com/takip?kod=MRG-2024-001

Mergen Kurye
```

#### 📱 Teslimata Çıkıldığında (on_the_way)
```
Merhaba [Müşteri Adı], siparişiniz yolda! 🏍️

Siparişinizi buradan takip edebilirsiniz:
https://yourdomain.com/takip?kod=MRG-2024-001

Mergen Kurye
```

**Buton Konumları:**
- `assigned` ve `picking_up`: Müşteri telefonu altında "💬 Takip Linki Gönder" butonu
- `on_the_way`: "📞 Ara" ve "💬 WhatsApp" butonları yan yana

---

## 🗺️ Harita Özellikleri

### Müşteri Görünümü
- **Teslimat Noktası**: Kırmızı pin (📍)
- **Kurye Konumu**: Yeşil motor ikonu (🏍️)
- **Rota Çizgisi**: Turuncu kesikli çizgi
- **Gerçek Zamanlı Güncelleme**: 10 saniyede bir + Realtime subscription

### Gösterilen Bilgiler
- Sipariş numarası
- Kurye adı
- Restoran adı
- Sipariş tutarı
- Teslimat adresi
- Tahmini süre
- Sipariş durumu

---

## 📱 Mobil Uyumluluk

- ✅ Responsive tasarım
- ✅ Touch-friendly butonlar
- ✅ Mobil harita kontrolleri
- ✅ Gradient arka planlar
- ✅ Koyu tema (göz yormuyor)

---

## 🔧 Teknik Detaylar

### Kullanılan Teknolojiler
- **Harita**: Leaflet.js
- **Harita Katmanı**: CartoDB Dark Theme
- **Realtime**: Supabase Realtime Subscriptions
- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS

### Dosya Yapısı
```
src/app/takip/
├── page.tsx                          # Ana sayfa (giriş + routing)
└── components/
    └── CustomerTrackingMap.tsx       # Harita bileşeni
```

### API Sorguları
```typescript
// Sipariş sorgulama
supabase
  .from('packages')
  .select('*, restaurant:restaurants(id, name, latitude, longitude)')
  .eq('order_number', orderCode)
  .single()

// Kurye konumu
supabase
  .from('couriers')
  .select('last_location')
  .eq('id', courier_id)
  .single()

// Realtime dinleme
supabase
  .channel(`courier-${courier_id}`)
  .on('postgres_changes', { ... })
  .subscribe()
```

---

## 🚀 Kullanım Senaryosu

1. **Kurye siparişi kabul eder** → WhatsApp butonu aktif olur
2. **Kurye WhatsApp butonuna basar** → Otomatik mesaj taslağı açılır
3. **Kurye mesajı gönderir** → Müşteri takip linkini alır
4. **Müşteri linke tıklar** → Otomatik olarak harita açılır
5. **Müşteri gerçek zamanlı takip eder** → Kurye konumu 10 saniyede bir güncellenir
6. **Sipariş teslim edilir** → Müşteri teslim mesajını görür

---

## 📊 Sürüm Bilgileri

**Versiyon:** v1.1.9 (versionCode: 11)
**Tarih:** 11.02.2026
**AAB Boyutu:** 7.7 MB
**Konum:** `C:\Users\90505\Desktop\kurye_projesi\android\app\build\outputs\bundle\release\app-release.aab`

---

## 🎯 Sonraki Adımlar (Opsiyonel)

- [ ] SMS entegrasyonu (WhatsApp alternatifi)
- [ ] Push notification (sipariş durumu değiştiğinde)
- [ ] Tahmini süre hesaplama (Google Maps API ile gerçek mesafe)
- [ ] Müşteri geri bildirimi (teslim sonrası rating)
- [ ] Sipariş geçmişi (müşteri için)

---

## 📝 Notlar

- WhatsApp linkleri mobil cihazlarda otomatik olarak WhatsApp uygulamasını açar
- Web'de WhatsApp Web açılır
- Telefon numaraları otomatik olarak temizlenir (sadece rakamlar)
- Harita SSR devre dışı (client-side only)
- Suspense boundary ile Next.js 16 uyumluluğu sağlandı

---

**Hazırlayan:** Kiro AI
**Proje:** Mergen Kurye Sistemi
