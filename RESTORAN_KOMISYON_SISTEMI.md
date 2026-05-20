# 🏪 RESTORAN DİNAMİK KOMİSYON SİSTEMİ

## 📋 Genel Bakış

Restoran bazlı dinamik komisyon sistemi, **geçmiş siparişleri mühürleyerek** (snapshot) komisyon oranı değişikliklerinin sadece gelecek siparişleri etkilemesini sağlar.

## 🎯 Özellikler

### ✅ Mühürleme (Snapshotting)
- Yeni sipariş oluşturulduğunda restoranın **güncel komisyon oranı** pakete yazılır
- Komisyon tutarı hesaplanıp **sabitlenir**
- Gelecekte oran değişse bile geçmiş siparişler **değişmez**

### ✅ Platform Bazlı Komisyon
- **Sadece `platform = 'web'`** olan siparişlere komisyon uygulanır
- Diğer platformlar (telefon, restoran paneli) için komisyon **0**

### ✅ Finansal Şeffaflık
- Her paketin kendi komisyon oranı ve tutarı **görünür**
- Restoran bazlı detaylı raporlama
- Net ödenecek tutar: `Ciro - Komisyon - Kurye Masrafı`

---

## 🗄️ VERİTABANI YAPISI

### 1. `restaurants` Tablosu

**Yeni Kolon:**
```sql
current_commission_rate NUMERIC(5, 2) DEFAULT 10.00
```

- **Açıklama**: Restoranın güncel komisyon oranı (%)
- **Default**: %10.00
- **Değişebilir**: Admin tarafından güncellenebilir
- **Etki**: Sadece gelecekteki siparişleri etkiler

---

### 2. `packages` Tablosu

**Yeni Kolonlar:**
```sql
applied_commission_rate NUMERIC(5, 2) DEFAULT 0.00
commission_amount NUMERIC(10, 2) DEFAULT 0.00
```

#### `applied_commission_rate`
- **Açıklama**: Bu pakete uygulanan komisyon oranı (%)
- **Mühürleme**: Sipariş oluşturulduğunda restoranın `current_commission_rate` değeri buraya kopyalanır
- **Immutable**: Sonradan değişmez

#### `commission_amount`
- **Açıklama**: Komisyon tutarı (₺)
- **Hesaplama**: `amount × applied_commission_rate / 100`
- **Mühürleme**: Sipariş oluşturulduğunda hesaplanıp sabitlenir

---

## ⚙️ OTOMATİK MÜHÜRLEME MEKANİZMASI

### Trigger: `trigger_seal_commission`

**Çalışma Zamanı**: `BEFORE INSERT OR UPDATE ON packages`

**Kritik Kurallar:**
1. ✅ Trigger hem INSERT hem UPDATE'te çalışır
2. ✅ İptal edilen siparişler (`status = 'cancelled'`) için komisyon 0
3. ✅ Tüm hesaplamalar ROUND() ile 2 ondalık basamağa yuvarlanır
4. ✅ Sadece `platform = 'web'` olan siparişlere komisyon uygulanır

**Mantık:**
```sql
IF NEW.platform = 'web' THEN
    -- İptal edilen siparişlerden komisyon alınmaz
    IF NEW.status = 'cancelled' THEN
        NEW.applied_commission_rate := 0.00;
        NEW.commission_amount := 0.00;
        RETURN NEW;
    END IF;
    
    -- Restoranın güncel komisyon oranını al
    SELECT current_commission_rate INTO v_commission_rate
    FROM restaurants WHERE id = NEW.restaurant_id;
    
    -- Komisyon tutarını hesapla ve ROUND ile yuvarla
    v_calculated_commission := ROUND((NEW.amount * v_commission_rate / 100), 2);
    
    -- Mühürle
    NEW.applied_commission_rate := v_commission_rate;
    NEW.commission_amount := v_calculated_commission;
ELSE
    -- Web dışı platformlar için komisyon 0
    NEW.applied_commission_rate := 0.00;
    NEW.commission_amount := 0.00;
END IF;
```

---

## 🔧 RPC FONKSİYONU

### `get_restaurant_web_order_stats(p_restaurant_id UUID)`

**Amaç**: Server-side finansal hesaplama (frontend hesaplama yapmaz, egress koruması)

**Parametreler:**
- `p_restaurant_id`: Restoran UUID

**Dönen Veri (JSON):**
```json
{
  "total_revenue": 12500.00,      // Toplam ciro
  "total_commission": 1250.00,    // Toplam komisyon
  "total_cost": 4500.00,          // Kurye masrafı
  "net_payable": 6750.00,         // Net ödenecek
  "order_count": 45,              // Sipariş sayısı
  "package_fee": 100.00           // Paket başı ücret
}
```

**Kullanım (Frontend):**
```typescript
const { data: statsData } = await supabase
  .rpc('get_restaurant_web_order_stats', {
    p_restaurant_id: restaurantId
  })

// statsData.total_revenue, statsData.net_payable, vb.
```

**Avantajlar:**
- ✅ Tüm hesaplamalar server-side (güvenli)
- ✅ Egress koruması (az veri transferi)
- ✅ ROUND() ile doğru yuvarlama
- ✅ Tek RPC çağrısı (performanslı)

---

## 🖥️ FRONTEND YAPISI

### Sayfa: `/admin/restoranlar/uygulama-siparisleri`

#### 📊 Ana Ekran

**Grid Yapısı:**
- Mobil: 1 kolon
- Desktop: 3 kolon
- Responsive: `grid grid-cols-1 md:grid-cols-3 gap-6`

**Restoran Kartı İçeriği:**
1. **Restoran Adı** (başlık)
2. **Telefon** (opsiyonel)
3. **Komisyon Oranı Rozeti** (mor, vurgulu)
4. **2 Buton**:
   - ✏️ Komisyon Düzenle
   - 📊 Detaylar

---

#### ✏️ Komisyon Düzenleme Modalı

**Özellikler:**
- Mevcut oran gösterimi
- Yeni oran girişi (0-100 arası)
- Uyarı mesajı: "Sadece gelecekteki siparişleri etkiler"
- Güncelleme butonu

**Güncelleme:**
```typescript
await supabase
  .from('restaurants')
  .update({ current_commission_rate: newRate })
  .eq('id', restaurantId)
```

---

#### 📊 Detaylar Paneli

**4 Finansal Kart:**

1. **Toplam Ciro** (Mavi)
   - Kaynak: `SUM(packages.amount)`
   - Filtre: `platform = 'web' AND status = 'delivered' AND is_paid_to_restaurant = false`

2. **Komisyon Tutarı** (Mor)
   - Kaynak: `SUM(packages.commission_amount)`
   - Açıklama: Mühürlenmiş komisyon tutarları

3. **Kurye Masrafı** (Kırmızı)
   - Hesaplama: `order_count × restaurant.package_fee`
   - Kaynak: `restaurants.package_fee`

4. **Net Ödenecek** (Yeşil/Kırmızı)
   - Formül: `Ciro - Komisyon - Masraf`
   - Renk: Pozitif → Yeşil, Negatif → Kırmızı

**Formül Gösterimi:**
```
12,500.00₺ - 1,250.00₺ - 4,500.00₺ = 6,750.00₺
(Ciro)     (Komisyon)  (Masraf)    (Net)
```

**Sipariş Tablosu:**
| Sipariş No | Müşteri | Tutar | Komisyon Oranı | Komisyon Tutarı | Teslim Tarihi |
|------------|---------|-------|----------------|-----------------|---------------|
| #12345     | Ahmet   | 250₺  | %10.00         | 25.00₺          | 20 May 14:30  |

---

## 🔄 KULLANIM SENARYOLARI

### Senaryo 1: Yeni Sipariş Oluşturma

```sql
-- 1. Restoran komisyon oranı: %10
SELECT current_commission_rate FROM restaurants WHERE id = 'rest-123';
-- Sonuç: 10.00

-- 2. Yeni sipariş ekleniyor (amount = 500₺)
INSERT INTO packages (restaurant_id, platform, amount, ...)
VALUES ('rest-123', 'web', 500, ...);

-- 3. Trigger otomatik çalışır:
-- applied_commission_rate = 10.00
-- commission_amount = 500 × 10 / 100 = 50.00₺
```

---

### Senaryo 2: Komisyon Oranı Değiştirme

```sql
-- 1. Admin komisyon oranını %15'e çıkarıyor
UPDATE restaurants 
SET current_commission_rate = 15.00 
WHERE id = 'rest-123';

-- 2. Geçmiş siparişler değişmez:
SELECT applied_commission_rate, commission_amount 
FROM packages 
WHERE restaurant_id = 'rest-123' AND created_at < NOW();
-- Hala 10.00% ve eski tutarlar

-- 3. Yeni sipariş ekleniyor (amount = 500₺)
INSERT INTO packages (restaurant_id, platform, amount, ...)
VALUES ('rest-123', 'web', 500, ...);

-- 4. Yeni sipariş %15 ile mühürlenir:
-- applied_commission_rate = 15.00
-- commission_amount = 500 × 15 / 100 = 75.00₺
```

---

### Senaryo 3: Finansal Rapor (RPC Kullanımı)

```typescript
// Admin "Detaylar" butonuna basıyor

// 1. RPC ile finansal özet al (server-side hesaplama)
const { data: statsData } = await supabase
  .rpc('get_restaurant_web_order_stats', {
    p_restaurant_id: restaurantId
  })

// 2. Sonuçlar hazır (hesaplama yapılmış)
const totalRevenue = statsData.total_revenue
// Örnek: 12,500₺

const totalCommission = statsData.total_commission
// Örnek: 1,250₺ (bazıları %10, bazıları %15 ile mühürlenmiş)

const totalCost = statsData.total_cost
// Örnek: 50 paket × 100₺ = 5,000₺

const netPayable = statsData.net_payable
// Örnek: 12,500₺ - 1,250₺ - 5,000₺ = 6,250₺

// 3. Sipariş listesi (detay için ayrı sorgu)
const { data: orders } = await supabase
  .from('packages')
  .select('id, order_number, customer_name, amount, commission_amount, applied_commission_rate, delivered_at')
  .eq('restaurant_id', restaurantId)
  .eq('platform', 'web')
  .eq('status', 'delivered')
  .eq('is_paid_to_restaurant', false)
  .order('delivered_at', { ascending: false })
  .limit(100)
```

---

## 📊 ÖRNEK VAKA

### Başlangıç Durumu
- **Restoran**: İkramdöner
- **Komisyon Oranı**: %10
- **Paket Başı Ücret**: 120₺

### Gün 1: 10 Sipariş (Toplam 5,000₺)
```
Ciro: 5,000₺
Komisyon (%10): 500₺
Kurye Masrafı (10 × 120₺): 1,200₺
Net Ödenecek: 5,000₺ - 500₺ - 1,200₺ = 3,300₺
```

### Gün 2: Komisyon %15'e Çıkarıldı

**Geçmiş 10 sipariş:**
- Hala %10 komisyon (mühürlenmiş)
- Komisyon: 500₺

**Yeni 5 sipariş (Toplam 2,500₺):**
- %15 komisyon (yeni oran)
- Komisyon: 375₺

**Toplam:**
```
Ciro: 7,500₺ (15 sipariş)
Komisyon: 500₺ + 375₺ = 875₺
Kurye Masrafı (15 × 120₺): 1,800₺
Net Ödenecek: 7,500₺ - 875₺ - 1,800₺ = 4,825₺
```

---

## 🔒 GÜVENLİK VE PERFORMANS

### Güvenlik
- ✅ Trigger hem INSERT hem UPDATE'te çalışır (komisyon her zaman doğru)
- ✅ İptal edilen siparişlerden komisyon alınmaz (status = 'cancelled')
- ✅ Geçmiş veriler immutable (değiştirilemez)
- ✅ Admin yetkisi gerekli (komisyon değiştirme)
- ✅ Server-side hesaplama (RPC) - frontend manipülasyonu önlenir

### Performans
- ✅ Trigger hafif (sadece 1 SELECT + hesaplama + assignment)
- ✅ RPC kullanımı: Tek çağrı ile tüm hesaplamalar (egress koruması)
- ✅ Index: `packages(restaurant_id, platform, status, is_paid_to_restaurant)`
- ✅ ROUND() ile doğru yuvarlama (2 ondalık basamak)

---

## 🚀 KURULUM ADIMLARI

### 1. SQL Dosyasını Çalıştır
```bash
# Supabase SQL Editor'de çalıştır:
database/add_restaurant_commission_system.sql
```

### 2. Mevcut Verileri Mühürle
```sql
-- Geçmiş web siparişlerine komisyon uygula
UPDATE packages p
SET 
    applied_commission_rate = COALESCE(r.current_commission_rate, 10.00),
    commission_amount = (p.amount * COALESCE(r.current_commission_rate, 10.00) / 100)
FROM restaurants r
WHERE p.restaurant_id = r.id
  AND p.platform = 'web'
  AND (p.applied_commission_rate IS NULL OR p.applied_commission_rate = 0);
```

### 3. Frontend Sayfasını Test Et
```
http://localhost:3000/admin/restoranlar/uygulama-siparisleri
```

---

## 🧪 TEST SENARYOLARI

### Test 1: Yeni Sipariş Mühürleme
```sql
-- 1. Restoran komisyon oranını kontrol et
SELECT id, name, current_commission_rate FROM restaurants LIMIT 1;

-- 2. Test siparişi ekle
INSERT INTO packages (restaurant_id, platform, amount, status, ...)
VALUES ('[RESTORAN_ID]', 'web', 1000, 'delivered', ...);

-- 3. Mühürlemeyi kontrol et
SELECT 
    order_number,
    amount,
    applied_commission_rate,
    commission_amount
FROM packages
WHERE id = [YENİ_PAKET_ID];

-- Beklenen:
-- applied_commission_rate = restoranın current_commission_rate
-- commission_amount = amount × rate / 100
```

### Test 2: Komisyon Değiştirme
```sql
-- 1. Komisyon oranını değiştir
UPDATE restaurants 
SET current_commission_rate = 15.00 
WHERE id = '[RESTORAN_ID]';

-- 2. Yeni sipariş ekle
INSERT INTO packages (restaurant_id, platform, amount, status, ...)
VALUES ('[RESTORAN_ID]', 'web', 1000, 'delivered', ...);

-- 3. Yeni siparişin %15 ile mühürlendiğini kontrol et
SELECT applied_commission_rate FROM packages WHERE id = [YENİ_PAKET_ID];
-- Beklenen: 15.00

-- 4. Eski siparişlerin değişmediğini kontrol et
SELECT applied_commission_rate FROM packages WHERE id = [ESKİ_PAKET_ID];
-- Beklenen: 10.00 (eski oran)
```

---

## 📝 NOTLAR

### Önemli Kurallar
1. **Sadece web siparişleri** komisyona tabidir (`platform = 'web'`)
2. **İptal edilen siparişler** komisyonsuz (`status = 'cancelled'` → komisyon 0)
3. **Geçmiş siparişler değişmez** (immutable, snapshotting)
4. **Komisyon oranı 0-100 arası** olmalıdır
5. **Trigger otomatik çalışır** (INSERT + UPDATE), manuel müdahale gerekmez
6. **Frontend hesaplama yapmaz**, RPC kullanır (server-side)
7. **Tüm tutarlar ROUND()** ile 2 ondalık basamağa yuvarlanır

### Gelecek Geliştirmeler
- [ ] Restoran bazlı komisyon geçmişi raporu
- [ ] Komisyon oranı değişiklik logu
- [ ] Toplu komisyon güncelleme
- [ ] Excel/PDF export

---

**Oluşturulma Tarihi**: 20 Mayıs 2026  
**Versiyon**: 1.0.0  
**Durum**: ✅ Aktif
