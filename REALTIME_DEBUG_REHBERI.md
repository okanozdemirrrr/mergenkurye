# 🔍 Realtime Debug Rehberi

## ✅ İyi Haber!

**Hata Mesajı:**
```
ERROR: relation "packages" is already member of publication "supabase_realtime"
```

Bu **iyi bir haber**! `packages` tablosu zaten Realtime'da kayıtlı. Sorun başka yerde.

---

## 🔍 Sorun Tespiti

### 1️⃣ Kontrol Sorguları

Supabase SQL Editor'de çalıştır:

```sql
-- A. packages tablosu Realtime'da mı?
SELECT 
  schemaname,
  tablename,
  pubname
FROM pg_publication_tables 
WHERE tablename = 'packages';
```

**Beklenen Sonuç:**
```
schemaname | tablename | pubname
-----------+-----------+--------------------
public     | packages  | supabase_realtime
```
✅ Eğer bu sonucu görüyorsan, tablo Realtime'da kayıtlı.

---

```sql
-- B. RLS (Row Level Security) politikalarını kontrol et
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename = 'packages';
```

**Olası Sonuçlar:**

**Senaryo 1: Politika Yok**
```
(0 rows)
```
→ RLS aktif ama politika yok, Realtime çalışmaz!

**Senaryo 2: Politika Var**
```
policyname              | cmd
------------------------+--------
Herkes okuyabilir       | SELECT
Sadece authenticated    | SELECT
```
→ Politika var, Realtime çalışmalı.

---

```sql
-- C. RLS aktif mi?
SELECT 
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'packages';
```

**Sonuç:**
```
tablename | rowsecurity
----------+-------------
packages  | t           -- true = RLS aktif
packages  | f           -- false = RLS kapalı
```

---

## 🔧 Çözümler

### Çözüm 1: RLS Politikası Ekle (ÖNERİLEN)

Eğer RLS aktifse ve politika yoksa:

```sql
-- SELECT politikası ekle
CREATE POLICY "Herkes packages okuyabilir" 
ON packages FOR SELECT 
USING (true);
```

**Veya daha güvenli:**
```sql
-- Sadece authenticated kullanıcılar
CREATE POLICY "Authenticated packages okuyabilir" 
ON packages FOR SELECT 
TO authenticated
USING (true);
```

---

### Çözüm 2: RLS'yi Kapat (GEÇİCİ TEST İÇİN)

```sql
-- RLS'yi kapat
ALTER TABLE packages DISABLE ROW LEVEL SECURITY;
```

**⚠️ Uyarı:** Bu güvenlik riskidir! Sadece test için kullanın.

**Üretimde tekrar aç:**
```sql
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;
```

---

### Çözüm 3: Mevcut Politikayı Güncelle

Eğer politika var ama çalışmıyorsa:

```sql
-- Mevcut politikayı sil
DROP POLICY IF EXISTS "eski_politika_adi" ON packages;

-- Yeni politika ekle
CREATE POLICY "Herkes packages okuyabilir" 
ON packages FOR SELECT 
USING (true);
```

---

## 🧪 Test Adımları

### 1. RLS Durumunu Kontrol Et

```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'packages';
```

**Eğer `rowsecurity = t` (true):**
→ RLS aktif, politika gerekli

**Eğer `rowsecurity = f` (false):**
→ RLS kapalı, politika gereksiz

---

### 2. Politika Kontrol Et

```sql
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'packages';
```

**Eğer sonuç boş:**
→ Politika yok, ekle (Çözüm 1)

**Eğer politika var:**
→ Politika çalışıyor olmalı

---

### 3. Realtime Test Et

**Console'da (F12):**
```javascript
// Restoran panelini aç
http://localhost:3000/restoran

// Console'da göreceksin:
✅ Restoran Realtime bağlantısı kuruldu
📡 Kanal: packages-follow-123-1706543210000
```

**Eğer hata görüyorsan:**
```
❌ Realtime bağlantı hatası: ...
💡 Çözüm: RLS politikası ekle
```

---

### 4. Yeni Sipariş Ekle

Eklentiden sipariş gönder

**Console'da göreceksin:**
```
📦 Paket değişikliği algılandı: INSERT ID: 456
✅ Restoran state güncellendi (packages)
```

**Eğer görmüyorsan:**
→ RLS politikası sorunu

---

## 🔍 Yaygın Sorunlar

### Sorun 1: "CHANNEL_ERROR" hatası

**Sebep:** RLS aktif ama politika yok

**Çözüm:**
```sql
CREATE POLICY "Herkes packages okuyabilir" 
ON packages FOR SELECT 
USING (true);
```

---

### Sorun 2: "Realtime bağlantısı kuruldu ama değişiklik gelmiyor"

**Sebep:** Filtreleme sorunu veya RLS

**Kontrol:**
```sql
-- Politika var mı?
SELECT * FROM pg_policies WHERE tablename = 'packages';

-- RLS aktif mi?
SELECT rowsecurity FROM pg_tables WHERE tablename = 'packages';
```

**Çözüm:**
1. RLS politikası ekle
2. Veya RLS'yi kapat (test için)

---

### Sorun 3: "Başka restoranın siparişleri görünüyor"

**Sebep:** Filtreleme çalışmıyor

**Kontrol:**
Console'da:
```
⚠️ Başka restoranın paketi, atlanıyor: 456
```

**Çözüm:**
Kod seviyesi kontrol zaten var, sorun yok.

---

## 📊 Dashboard Kontrolleri

### Supabase Dashboard

**1. Database > Replication**
- ✅ `packages` tablosu işaretli olmalı

**2. Authentication > Policies**
- ✅ `packages` tablosu için SELECT politikası olmalı
- Veya RLS kapalı olmalı

**3. Table Editor > packages**
- RLS durumunu kontrol et
- Politikaları kontrol et

---

## 🚀 Hızlı Çözüm (Test İçin)

Eğer hızlıca test etmek istiyorsan:

```sql
-- 1. RLS'yi kapat
ALTER TABLE packages DISABLE ROW LEVEL SECURITY;

-- 2. Test et
-- Restoran panelini aç, sipariş ekle

-- 3. Çalışıyorsa, RLS'yi tekrar aç ve politika ekle
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Herkes packages okuyabilir" 
ON packages FOR SELECT 
USING (true);
```

---

## ✅ Kontrol Listesi

- [ ] `packages` tablosu Realtime'da kayıtlı (✅ Zaten kayıtlı)
- [ ] RLS durumu kontrol edildi
- [ ] Politikalar kontrol edildi
- [ ] Politika eklendi (gerekirse)
- [ ] Restoran paneli test edildi
- [ ] Console'da "✅ Realtime bağlantısı kuruldu" görünüyor
- [ ] Yeni sipariş eklendiğinde liste yenileniyor

---

## 🎯 Özet

**Sorun:** `packages` zaten Realtime'da, ama bağlantı çalışmıyor

**Muhtemel Sebep:** RLS politikası eksik

**Çözüm:**
```sql
CREATE POLICY "Herkes packages okuyabilir" 
ON packages FOR SELECT 
USING (true);
```

**Test:**
```
http://localhost:3000/restoran
```

Console'da:
```
✅ Restoran Realtime bağlantısı kuruldu
```

**Terminale:** realtime sorunu rls politikasıydı ✅
