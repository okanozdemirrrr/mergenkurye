# 🧪 RESTORAN KOMİSYON SİSTEMİ - TEST SENARYOLARI

## ✅ TAMAMLANAN GÜNCELLEMELER

### 1. SQL Güncellemeleri
- ✅ Trigger artık INSERT + UPDATE'te çalışıyor
- ✅ İptal edilen siparişler (`status = 'cancelled'`) için komisyon 0
- ✅ Tüm hesaplamalar ROUND() ile 2 ondalık basamağa yuvarlanıyor
- ✅ RPC fonksiyonu `get_restaurant_web_order_stats()` eklendi

### 2. Frontend Güncellemeleri
- ✅ Manuel hesaplama kaldırıldı
- ✅ RPC entegrasyonu tamamlandı
- ✅ Server-side hesaplama kullanılıyor (egress koruması)

---

## 🚀 KURULUM

### Adım 1: SQL Dosyasını Çalıştır

Supabase SQL Editor'e git ve şu dosyayı çalıştır:

```bash
database/add_restaurant_commission_system.sql
```

**Beklenen Sonuç:**
```
✅ ALTER TABLE restaurants (current_commission_rate eklendi)
✅ ALTER TABLE packages (applied_commission_rate, commission_amount eklendi)
✅ CREATE FUNCTION seal_commission_on_web_order()
✅ CREATE TRIGGER trigger_seal_commission
✅ UPDATE packages (mevcut siparişler mühürlendi)
✅ CREATE FUNCTION get_restaurant_web_order_stats()
```

---

## 🧪 TEST SENARYOLARI

### Test 1: Trigger INSERT Testi

**Amaç**: Yeni sipariş eklendiğinde komisyonun otomatik mühürlendiğini doğrula

```sql
-- 1. Bir restoran seç
SELECT id, name, current_commission_rate 
FROM restaurants 
LIMIT 1;

-- Örnek sonuç:
-- id: 'abc-123'
-- name: 'İkramdöner'
-- current_commission_rate: 10.00

-- 2. Test siparişi ekle
INSERT INTO packages (
    restaurant_id,
    platform,
    amount,
    status,
    customer_name,
    delivery_address,
    payment_method
)
VALUES (
    'abc-123',        -- Yukarıdaki restoran ID
    'web',            -- Platform: web
    1000.00,          -- Tutar: 1000₺
    'delivered',      -- Durum: teslim edildi
    'Test Müşteri',
    'Test Adres',
    'cash'
)
RETURNING id, applied_commission_rate, commission_amount;

-- Beklenen sonuç:
-- applied_commission_rate: 10.00
-- commission_amount: 100.00  (1000 × 10 / 100)
```

**✅ Başarı Kriteri**: `applied_commission_rate = 10.00` ve `commission_amount = 100.00`

---

### Test 2: Trigger UPDATE Testi

**Amaç**: Sipariş güncellendiğinde komisyonun yeniden hesaplandığını doğrula

```sql
-- 1. Yukarıda oluşturduğun paketin ID'sini al
-- Örnek: 'pkg-456'

-- 2. Tutarı güncelle
UPDATE packages
SET amount = 2000.00
WHERE id = 'pkg-456'
RETURNING applied_commission_rate, commission_amount;

-- Beklenen sonuç:
-- applied_commission_rate: 10.00 (değişmedi)
-- commission_amount: 200.00  (2000 × 10 / 100, yeniden hesaplandı)
```

**✅ Başarı Kriteri**: `commission_amount` yeni tutara göre güncellendi

---

### Test 3: İptal Edilen Sipariş Testi

**Amaç**: İptal edilen siparişlerin komisyonunun 0 olduğunu doğrula

```sql
-- 1. İptal edilmiş sipariş ekle
INSERT INTO packages (
    restaurant_id,
    platform,
    amount,
    status,
    customer_name,
    delivery_address,
    payment_method
)
VALUES (
    'abc-123',
    'web',
    1000.00,
    'cancelled',      -- Durum: iptal edildi
    'Test Müşteri',
    'Test Adres',
    'cash'
)
RETURNING id, applied_commission_rate, commission_amount;

-- Beklenen sonuç:
-- applied_commission_rate: 0.00
-- commission_amount: 0.00
```

**✅ Başarı Kriteri**: Her iki değer de `0.00`

---

### Test 4: ROUND() Testi

**Amaç**: Küsuratlı tutarların doğru yuvarlandığını doğrula

```sql
-- 1. Küsuratlı tutar ile sipariş ekle
INSERT INTO packages (
    restaurant_id,
    platform,
    amount,
    status,
    customer_name,
    delivery_address,
    payment_method
)
VALUES (
    'abc-123',
    'web',
    333.33,           -- Küsuratlı tutar
    'delivered',
    'Test Müşteri',
    'Test Adres',
    'cash'
)
RETURNING applied_commission_rate, commission_amount;

-- Beklenen sonuç:
-- applied_commission_rate: 10.00
-- commission_amount: 33.33  (333.33 × 10 / 100 = 33.333 → ROUND → 33.33)
```

**✅ Başarı Kriteri**: `commission_amount` tam 2 ondalık basamak

---

### Test 5: RPC Fonksiyonu Testi

**Amaç**: RPC fonksiyonunun doğru hesaplama yaptığını doğrula

```sql
-- 1. RPC'yi çağır
SELECT * FROM get_restaurant_web_order_stats('abc-123');

-- Beklenen sonuç (JSON):
-- {
--   "total_revenue": 12500.00,
--   "total_commission": 1250.00,
--   "total_cost": 4500.00,
--   "net_payable": 6750.00,
--   "order_count": 45,
--   "package_fee": 100.00
-- }
```

**Manuel Doğrulama:**
```sql
-- Toplam ciro
SELECT SUM(amount) 
FROM packages 
WHERE restaurant_id = 'abc-123' 
  AND platform = 'web' 
  AND status = 'delivered' 
  AND is_paid_to_restaurant = false;

-- Toplam komisyon
SELECT SUM(commission_amount) 
FROM packages 
WHERE restaurant_id = 'abc-123' 
  AND platform = 'web' 
  AND status = 'delivered' 
  AND is_paid_to_restaurant = false;

-- Sipariş sayısı
SELECT COUNT(*) 
FROM packages 
WHERE restaurant_id = 'abc-123' 
  AND platform = 'web' 
  AND status = 'delivered' 
  AND is_paid_to_restaurant = false;
```

**✅ Başarı Kriteri**: RPC sonucu manuel sorgu sonuçlarıyla eşleşiyor

---

### Test 6: Komisyon Oranı Değiştirme

**Amaç**: Komisyon oranı değiştirildiğinde sadece gelecek siparişlerin etkilendiğini doğrula

```sql
-- 1. Mevcut sipariş ekle (%10 ile)
INSERT INTO packages (restaurant_id, platform, amount, status, customer_name, delivery_address, payment_method)
VALUES ('abc-123', 'web', 1000.00, 'delivered', 'Test 1', 'Adres 1', 'cash')
RETURNING id, applied_commission_rate, commission_amount;
-- Sonuç: rate=10.00, amount=100.00

-- 2. Komisyon oranını değiştir
UPDATE restaurants 
SET current_commission_rate = 15.00 
WHERE id = 'abc-123';

-- 3. Yeni sipariş ekle (%15 ile)
INSERT INTO packages (restaurant_id, platform, amount, status, customer_name, delivery_address, payment_method)
VALUES ('abc-123', 'web', 1000.00, 'delivered', 'Test 2', 'Adres 2', 'cash')
RETURNING id, applied_commission_rate, commission_amount;
-- Sonuç: rate=15.00, amount=150.00

-- 4. Eski siparişin değişmediğini kontrol et
SELECT applied_commission_rate, commission_amount 
FROM packages 
WHERE customer_name = 'Test 1';
-- Sonuç: rate=10.00, amount=100.00 (değişmedi)
```

**✅ Başarı Kriteri**: Eski sipariş %10, yeni sipariş %15

---

## 🖥️ FRONTEND TESTLERI

### Test 7: Restoran Kartları

1. Tarayıcıda şu sayfaya git:
   ```
   http://localhost:3000/admin/restoranlar/uygulama-siparisleri
   ```

2. **Beklenen Görünüm:**
   - ✅ Restoranlar 3'lü grid düzeninde
   - ✅ Her kartta restoran adı
   - ✅ Mor rozet: "Komisyon: %10.00"
   - ✅ 2 buton: "Komisyon Düzenle" ve "Detaylar"

---

### Test 8: Komisyon Düzenleme

1. Bir restoran kartında **"Komisyon Düzenle"** butonuna bas
2. Modal açılmalı
3. Yeni oran gir: **15**
4. **"Güncelle"** butonuna bas
5. **Beklenen:**
   - ✅ Yeşil başarı mesajı: "✅ [Restoran] için komisyon oranı %15 olarak güncellendi!"
   - ✅ Kart üzerindeki rozet güncellendi: "Komisyon: %15.00"

---

### Test 9: Detaylar Paneli (RPC Testi)

1. Bir restoran kartında **"Detaylar"** butonuna bas
2. Modal açılmalı
3. **Beklenen:**
   - ✅ 4 finansal kart:
     - Toplam Ciro (mavi)
     - Komisyon Tutarı (mor)
     - Kurye Masrafı (kırmızı)
     - Net Ödenecek (yeşil/kırmızı)
   - ✅ Formül gösterimi: `Ciro - Komisyon - Masraf = Net`
   - ✅ Sipariş tablosu (100 satır max)

4. **Console'u kontrol et:**
   ```javascript
   // Network sekmesinde RPC çağrısını gör
   POST /rest/v1/rpc/get_restaurant_web_order_stats
   
   // Response:
   {
     "total_revenue": 12500.00,
     "total_commission": 1250.00,
     "total_cost": 4500.00,
     "net_payable": 6750.00,
     "order_count": 45,
     "package_fee": 100.00
   }
   ```

**✅ Başarı Kriteri**: RPC çağrısı başarılı, veriler doğru gösteriliyor

---

## 🔍 DOĞRULAMA SORULARI

### Trigger Kontrolü
```sql
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'trigger_seal_commission';

-- Beklenen:
-- trigger_name: trigger_seal_commission
-- event_manipulation: INSERT, UPDATE
-- action_timing: BEFORE
-- event_object_table: packages
```

### RPC Kontrolü
```sql
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines
WHERE routine_name = 'get_restaurant_web_order_stats';

-- Beklenen:
-- routine_name: get_restaurant_web_order_stats
-- routine_type: FUNCTION
-- data_type: json
```

### Mühürleme Kontrolü
```sql
-- Tüm web siparişlerinin mühürlendiğini kontrol et
SELECT 
    COUNT(*) as toplam,
    COUNT(CASE WHEN applied_commission_rate > 0 OR status = 'cancelled' THEN 1 END) as muhurlenmi,
    COUNT(CASE WHEN applied_commission_rate = 0 AND status != 'cancelled' THEN 1 END) as muhurlenme
FROM packages
WHERE platform = 'web';

-- Beklenen: muhurlenme = 0 (tüm siparişler mühürlenmiş)
```

---

## ⚠️ SORUN GİDERME

### Hata: "function get_restaurant_web_order_stats does not exist"

**Çözüm**: SQL dosyasını tekrar çalıştır, RPC bölümünü kontrol et

### Hata: "applied_commission_rate is null"

**Çözüm**: Mevcut siparişleri mühürle:
```sql
UPDATE packages p
SET 
    applied_commission_rate = CASE 
        WHEN p.status = 'cancelled' THEN 0.00
        ELSE COALESCE(r.current_commission_rate, 10.00)
    END,
    commission_amount = CASE 
        WHEN p.status = 'cancelled' THEN 0.00
        ELSE ROUND((p.amount * COALESCE(r.current_commission_rate, 10.00) / 100), 2)
    END
FROM restaurants r
WHERE p.restaurant_id = r.id
  AND p.platform = 'web';
```

### Frontend'de Veri Görünmüyor

**Kontrol Et:**
1. Console'da hata var mı?
2. RPC çağrısı başarılı mı? (Network sekmesi)
3. Restoran ID doğru mu?
4. `is_paid_to_restaurant = false` olan sipariş var mı?

---

## ✅ BAŞARI KRİTERLERİ

Tüm testler başarılı ise:

- ✅ Trigger INSERT ve UPDATE'te çalışıyor
- ✅ İptal edilen siparişler komisyonsuz
- ✅ ROUND() doğru çalışıyor (2 ondalık)
- ✅ RPC fonksiyonu doğru hesaplıyor
- ✅ Komisyon oranı değişikliği sadece gelecek siparişleri etkiliyor
- ✅ Frontend RPC kullanıyor (manuel hesaplama yok)
- ✅ Detaylar paneli doğru veri gösteriyor

**Sistem hazır! 🎉**

---

**Test Tarihi**: 20 Mayıs 2026  
**Versiyon**: 1.0.0  
**Durum**: ✅ Tamamlandı
