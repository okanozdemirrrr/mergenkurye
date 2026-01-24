# ✅ MERGEN AGENT V2.0 - KURULUM KONTROL LİSTESİ

## 📍 DURUM: Hazır - Yapılandırma Bekleniyor

Mergen Agent v2.0 tüm dosyalarıyla birlikte hazır durumda. Aşağıdaki adımları tamamlayarak sistemi aktif hale getirebilirsiniz.

---

## 🔧 YAPILMASI GEREKENLER

### 1️⃣ Supabase Yapılandırması (ÖNEMLİ!)

**Dosya:** `C:\Users\90505\Desktop\mergen_agent_chrome_extension\background.js`

**Satır 8-11'i güncelleyin:**

```javascript
const SUPABASE_CONFIG = {
  url: 'BURAYA_SUPABASE_URL_GIRIN',  // https://xxxxx.supabase.co
  anonKey: 'BURAYA_SUPABASE_ANON_KEY_GIRIN'  // Supabase Dashboard -> Settings -> API
}
```

**Nereden bulunur:**
- Supabase Dashboard'a giriş yapın
- Project Settings → API
- URL: "Project URL" alanından kopyalayın
- anon key: "Project API keys" → "anon public" key'i kopyalayın

---

### 2️⃣ Veritabanı Migrasyonu

**Dosya:** `database_migration_add_coordinates.sql` (proje klasöründe oluşturuldu)

**Supabase SQL Editor'de çalıştırın:**

1. Supabase Dashboard → SQL Editor
2. "New query" butonuna tıklayın
3. `database_migration_add_coordinates.sql` dosyasının içeriğini yapıştırın
4. "Run" butonuna tıklayın

**Bu migration şunları ekler:**
- `latitude` (FLOAT) - Enlem
- `longitude` (FLOAT) - Boylam
- `source` (TEXT) - Platform adı (trendyol/yemeksepeti/getir)
- `external_order_number` (TEXT) - Platform sipariş numarası
- İndeksler (performans için)

---

### 3️⃣ Chrome Extension Yükleme

1. Chrome'da `chrome://extensions/` adresine gidin
2. Sağ üstten "Geliştirici modu"nu aktif edin
3. "Paketlenmemiş öğe yükle" butonuna tıklayın
4. `C:\Users\90505\Desktop\mergen_agent_chrome_extension\` klasörünü seçin
5. Extension yüklendi! 🎉

---

### 4️⃣ Restoran ID Ayarlama

1. Chrome toolbar'da Mergen Agent ikonuna tıklayın
2. Restoran ID'nizi girin (örn: 12345)
3. "💾 Kaydet ve Aktif Et" butonuna tıklayın
4. "🧪 Bağlantıyı Test Et" ile kontrol edin
5. Badge "ON" olarak değişmeli ✅

---

### 5️⃣ Platform Selector'larını Güncelleme (ÖNEMLİ!)

**Dosya:** `C:\Users\90505\Desktop\mergen_agent_chrome_extension\content.js`

Her platform için gerçek DOM yapısına göre selector'ları güncelleyin:

#### Trendyol (Satır ~100)
```javascript
const SELECTORS = {
  orderNumber: '[class*="order-number"]',  // ← Gerçek class ismini girin
  customerName: '[class*="customer-name"]',
  address: '[class*="address"]',
  // ... diğer alanlar
}
```

#### Yemeksepeti (Satır ~200)
```javascript
const SELECTORS = {
  orderNumber: '[class*="siparis-no"]',  // ← Gerçek class ismini girin
  customerName: '[class*="musteri"]',
  // ... diğer alanlar
}
```

#### Getir (Satır ~300)
```javascript
const SELECTORS = {
  orderNumber: '[data-test*="order-id"]',  // ← Gerçek attribute'u girin
  customerName: '[class*="user-name"]',
  // ... diğer alanlar
}
```

**Nasıl bulunur:**
1. Platform paneline gidin
2. F12 ile Developer Tools'u açın
3. Elements sekmesinde sipariş kartlarını inceleyin
4. Class isimlerini ve data attribute'larını not edin
5. `content.js` dosyasındaki SELECTORS objelerini güncelleyin

---

### 6️⃣ İkon Dosyaları (Opsiyonel)

**Klasör:** `C:\Users\90505\Desktop\mergen_agent_chrome_extension\icons\`

Aşağıdaki boyutlarda PNG ikonlar ekleyin:
- `icon16.png` (16x16)
- `icon48.png` (48x48)
- `icon128.png` (128x128)

**Not:** İkonlar olmadan da çalışır, sadece görsel eksik olur.

---

## 🧪 TEST ADIMLARI

### Test 1: Bağlantı Kontrolü
1. Extension popup'ını açın
2. "🧪 Bağlantıyı Test Et" butonuna tıklayın
3. "✅ Bağlantı başarılı!" mesajını görmelisiniz

### Test 2: Platform Tespiti
1. Trendyol Partner paneline gidin
2. F12 → Console'u açın
3. Şu mesajı görmelisiniz: `🟠 Platform: TRENDYOL`

### Test 3: Sipariş Yakalama
1. Platform panelinde sipariş listesine gidin
2. Console'da şu mesajları izleyin:
   - `📦 Sipariş verisi çıkarıldı: {...}`
   - `✅ Sipariş başarıyla gönderildi`
3. Sağ üstte bildirim görmelisiniz: "✅ Sipariş Aktarıldı"

### Test 4: Koordinat Kontrolü
1. Console'da sipariş verisini inceleyin
2. `latitude` ve `longitude` alanlarını kontrol edin
3. Eğer `null` ise, koordinat yakalama çalışmıyor demektir

### Test 5: Duplicate Check
1. Aynı siparişi iki kez yakalamaya çalışın
2. Console'da şu mesajı görmelisiniz: `⚠️ DUPLICATE: Bu sipariş daha önce gönderilmiş`

---

## 📊 İSTATİSTİKLER

Extension popup'ında şunları görebilirsiniz:

- **Toplam Sipariş**: Tüm platformlardan toplam
- **🟠 Trendyol**: Trendyol siparişleri
- **🔴 Yemeksepeti**: Yemeksepeti siparişleri
- **🟣 Getir**: Getir siparişleri
- **❌ Hata**: Başarısız aktarımlar

---

## 🐛 SORUN GİDERME

### Sipariş yakalanmıyor
- Console'da hata var mı kontrol edin
- SELECTORS doğru mu kontrol edin
- Platform panelinde sipariş kartları yüklendi mi kontrol edin

### Koordinat yakalanmıyor
- Platform harita gösteriyor mu kontrol edin
- Console'da koordinat çıkarma loglarını inceleyin
- `extractXXXCoordinates()` fonksiyonlarını debug edin

### Duplicate check çalışmıyor
- Supabase'de `external_order_number` alanı var mı kontrol edin
- Console'da duplicate check loglarını inceleyin

### Supabase bağlantı hatası
- URL ve anon key doğru mu kontrol edin
- Supabase RLS politikaları aktif mi kontrol edin
- Network sekmesinde 401/403 hatası var mı kontrol edin

---

## 📁 DOSYA KONUMLARI

- **Extension Klasörü**: `C:\Users\90505\Desktop\mergen_agent_chrome_extension\`
- **Migration SQL**: `kurye_projesi/database_migration_add_coordinates.sql`
- **Bu Checklist**: `kurye_projesi/MERGEN_AGENT_V2_SETUP_CHECKLIST.md`

---

## ✅ TAMAMLANMA DURUMU

- [x] Dosyalar oluşturuldu
- [x] Desktop'a kopyalandı
- [x] Migration SQL hazırlandı
- [ ] Supabase yapılandırması (background.js)
- [ ] Veritabanı migrasyonu çalıştırıldı
- [ ] Chrome'a yüklendi
- [ ] Restoran ID ayarlandı
- [ ] Selector'lar güncellendi
- [ ] Test edildi

---

## 🎯 SONRAKİ ADIMLAR

1. **Supabase bilgilerini girin** → background.js
2. **Migration'ı çalıştırın** → Supabase SQL Editor
3. **Chrome'a yükleyin** → chrome://extensions/
4. **Restoran ID'yi ayarlayın** → Extension popup
5. **Platform paneline gidin ve test edin** → Trendyol/Yemeksepeti/Getir
6. **Selector'ları güncelleyin** → content.js (gerçek yapıya göre)

---

## 📞 DESTEK

Herhangi bir sorun yaşarsanız:
1. Console loglarını kontrol edin (F12)
2. Extension popup'ındaki hata mesajlarını okuyun
3. README_V2.md dosyasını inceleyin

Başarılar! 🚀
