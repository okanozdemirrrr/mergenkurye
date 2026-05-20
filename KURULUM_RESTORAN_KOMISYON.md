# 🚀 RESTORAN KOMİSYON SİSTEMİ - HIZLI KURULUM

## ✅ Oluşturulan Dosyalar

### 1. Veritabanı
- `database/add_restaurant_commission_system.sql` - Şema, trigger ve mühürleme

### 2. Frontend
- `src/app/admin/restoranlar/uygulama-siparisleri/page.tsx` - Ana sayfa
- `src/app/admin/layout.tsx` - Sidebar güncellendi

### 3. Dokümantasyon
- `RESTORAN_KOMISYON_SISTEMI.md` - Detaylı sistem dokümantasyonu
- `KURULUM_RESTORAN_KOMISYON.md` - Bu dosya

---

## 📋 KURULUM ADIMLARI

### Adım 1: SQL Dosyasını Çalıştır

Supabase SQL Editor'e git ve şu dosyayı çalıştır:

```bash
database/add_restaurant_commission_system.sql
```

**Bu dosya şunları yapar:**
- ✅ `restaurants` tablosuna `current_commission_rate` kolonu ekler (default: 10.00)
- ✅ `packages` tablosuna `applied_commission_rate` ve `commission_amount` kolonları ekler
- ✅ Otomatik mühürleme trigger'ı oluşturur (INSERT + UPDATE için)
- ✅ İptal edilen siparişler için komisyon 0 yapar (status = 'cancelled')
- ✅ Tüm hesaplamalarda ROUND() kullanır (2 ondalık basamak)
- ✅ RPC fonksiyonu `get_restaurant_web_order_stats()` oluşturur (server-side hesaplama)
- ✅ Mevcut web siparişlerini mühürler

---

### Adım 2: Frontend'i Test Et

Dev server çalışıyorsa, şu sayfaya git:

```
http://localhost:3000/admin/restoranlar/uygulama-siparisleri
```

**Göreceğin Ekran:**
- Restoran kartları (3'lü grid)
- Her kartta komisyon oranı rozeti
- "Komisyon Düzenle" ve "Detaylar" butonları

---

### Adım 3: Sidebar'ı Kontrol Et

Admin panelinde sol menüyü aç:

```
Yemek & Sanal Market
  ├─ 📢 Duyurular
  ├─ 🛒 Market Yönetimi
  └─ 📱 Restoranların Uygulama Siparişleri  ← YENİ
```

**Eski "Web Platform Komisyonu" kaldırıldı.**

---

## 🧪 TEST SENARYOSU

### 1. Komisyon Oranını Değiştir

1. Bir restoran kartında **"Komisyon Düzenle"** butonuna bas
2. Yeni oran gir (örn: **15**)
3. **"Güncelle"** butonuna bas
4. ✅ Başarı mesajı göreceksin

### 2. Yeni Sipariş Oluştur

```sql
-- Supabase SQL Editor'de test siparişi oluştur
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
    '[RESTORAN_ID]',  -- Bir restoran ID'si
    'web',            -- Platform: web
    500,              -- Tutar: 500₺
    'delivered',      -- Durum: teslim edildi
    'Test Müşteri',
    'Test Adres',
    'cash'
);
```

### 3. Mühürlemeyi Kontrol Et

```sql
-- Yeni eklenen siparişi kontrol et
SELECT 
    order_number,
    amount,
    applied_commission_rate,  -- Restoranın güncel oranı
    commission_amount         -- Hesaplanmış komisyon
FROM packages
WHERE restaurant_id = '[RESTORAN_ID]'
  AND platform = 'web'
ORDER BY created_at DESC
LIMIT 1;
```

**Beklenen Sonuç:**
```
amount: 500.00
applied_commission_rate: 15.00  (yeni oran)
commission_amount: 75.00        (500 × 15 / 100)
```

### 4. Detaylar Panelini Aç

1. Restoran kartında **"Detaylar"** butonuna bas
2. Finansal özet kartlarını gör:
   - 💰 Toplam Ciro
   - 💜 Komisyon Tutarı
   - 🔴 Kurye Masrafı
   - 💚 Net Ödenecek
3. Sipariş listesini incele

---

## 🔍 DOĞRULAMA

### Trigger Çalışıyor mu?

```sql
-- Trigger'ı kontrol et
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers
WHERE trigger_name = 'trigger_seal_commission';
```

**Beklenen:** 1 satır döner (trigger var)

### Mevcut Siparişler Mühürlendi mi?

```sql
-- Web siparişlerinin mühürlenme durumu
SELECT 
    COUNT(*) as toplam_web_siparis,
    COUNT(CASE WHEN applied_commission_rate > 0 THEN 1 END) as muhurlenmi_siparis,
    COUNT(CASE WHEN applied_commission_rate = 0 OR applied_commission_rate IS NULL THEN 1 END) as muhurlenme_siparis
FROM packages
WHERE platform = 'web';
```

**Beklenen:** Tüm web siparişleri mühürlenmiş olmalı

---

## ⚠️ SORUN GİDERME

### Hata: "column current_commission_rate does not exist"

**Çözüm:** SQL dosyasını tekrar çalıştır:
```sql
ALTER TABLE restaurants 
ADD COLUMN IF NOT EXISTS current_commission_rate NUMERIC(5, 2) DEFAULT 10.00;
```

### Hata: "trigger_seal_commission does not exist"

**Çözüm:** Trigger'ı yeniden oluştur:
```sql
-- Önce fonksiyonu oluştur
CREATE OR REPLACE FUNCTION seal_commission_on_web_order() ...

-- Sonra trigger'ı oluştur
CREATE TRIGGER trigger_seal_commission ...
```

### Komisyon 0 Olarak Görünüyor

**Kontrol Et:**
1. Sipariş `platform = 'web'` mi?
2. Restoran `current_commission_rate` değeri var mı?
3. Trigger çalışıyor mu?

```sql
-- Restoran komisyon oranını kontrol et
SELECT id, name, current_commission_rate 
FROM restaurants 
WHERE id = '[RESTORAN_ID]';
```

---

## 📊 ÖRNEK ÇIKTI

### Restoran Kartı
```
┌─────────────────────────────────┐
│ İkramdöner                      │
│ 📞 0505 123 45 67               │
│                                 │
│ ┌─────────────────────────┐    │
│ │ Komisyon: %15.00        │    │
│ └─────────────────────────┘    │
│                                 │
│ [✏️ Komisyon Düzenle] [📊 Detaylar] │
└─────────────────────────────────┘
```

### Detaylar Paneli
```
┌─────────────────────────────────────────────────────┐
│ 📊 İkramdöner - Uygulama Siparişleri Detayı        │
├─────────────────────────────────────────────────────┤
│                                                     │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│ │ Toplam   │ │ Komisyon │ │ Kurye    │ │ Net      │ │
│ │ Ciro     │ │ Tutarı   │ │ Masrafı  │ │ Ödenecek │ │
│ │ 12,500₺  │ │ 1,250₺   │ │ 4,500₺   │ │ 6,750₺   │ │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘ │
│                                                     │
│ Formül: 12,500₺ - 1,250₺ - 4,500₺ = 6,750₺        │
│                                                     │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Sipariş Listesi (45)                            │ │
│ ├─────────────────────────────────────────────────┤ │
│ │ #12345 | Ahmet | 250₺ | %10 | 25₺ | 20 May     │ │
│ │ #12346 | Mehmet| 300₺ | %15 | 45₺ | 20 May     │ │
│ │ ...                                             │ │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

---

## 🎯 ÖNEMLİ NOTLAR

1. **Geçmiş Siparişler Değişmez**
   - Komisyon oranı değiştirildiğinde sadece gelecekteki siparişler etkilenir
   - Mühürlenmiş veriler immutable (değiştirilemez)

2. **Sadece Web Siparişleri**
   - `platform = 'web'` olan siparişlere komisyon uygulanır
   - Diğer platformlar (telefon, restoran paneli) için komisyon 0

3. **Otomatik Hesaplama**
   - Trigger otomatik çalışır, manuel müdahale gerekmez
   - Komisyon tutarı sipariş oluşturulduğunda hesaplanır

4. **Finansal Şeffaflık**
   - Her paketin kendi komisyon oranı ve tutarı görünür
   - Detaylı raporlama ve audit trail

---

## 📞 DESTEK

Herhangi bir sorun için:
1. Console loglarını kontrol et
2. Supabase logs'u incele
3. SQL fonksiyonunu test et
4. Dokümantasyonu oku: `RESTORAN_KOMISYON_SISTEMI.md`

---

**Kurulum Tamamlandı!** 🎉

Artık restoran bazlı dinamik komisyon sistemi aktif. Geçmiş siparişler mühürlendi, yeni siparişler güncel komisyon oranıyla işlenecek.
