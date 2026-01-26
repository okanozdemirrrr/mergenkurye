# 🚨 SON ÇÖZÜM - KURYE ATAMA SORUNU

## SORUN
Kurye atandıktan 1 saniye sonra paket tekrar admin paneline geliyor.

## GERÇEK SEBEP
Supabase'de UNIQUE constraint yok! Ajan aynı siparişi tekrar INSERT ediyor ve yeni bir kayıt oluşturuyor.

## ÇÖZÜM - TEK ADIM

### ✅ SUPABASE'DE UNIQUE CONSTRAINT EKLE

**Bu işlem MUTLAKA yapılmalı!**

1. Supabase Dashboard'a git: https://supabase.com/dashboard
2. Projenizi seçin
3. Sol menüden **SQL Editor**'ü açın
4. Aşağıdaki SQL kodunu kopyalayıp yapıştırın:

```sql
-- UNIQUE constraint ekle
-- Bu constraint, aynı external_order_number + source kombinasyonunun tekrar eklenmesini engeller
ALTER TABLE packages
ADD CONSTRAINT unique_external_order_per_source
UNIQUE (external_order_number, source);
```

5. **"Run"** butonuna basın
6. Başarılı mesajı görmelisiniz: "Success. No rows returned"

### ✅ KONTROL

Constraint'in kurulu olduğunu kontrol edin:

```sql
SELECT 
  constraint_name,
  constraint_type,
  table_name
FROM information_schema.table_constraints
WHERE table_name = 'packages'
  AND constraint_name = 'unique_external_order_per_source';
```

**Beklenen Sonuç:** 1 satır döner (constraint aktif)

## NASIL ÇALIŞIR?

### Önceki Durum (YANLIŞ):
```
1. Ajan: INSERT INTO packages (external_order_number='TR-123', ...)
   → Yeni kayıt oluşturuldu (id=1)

2. Admin: UPDATE packages SET courier_id='abc' WHERE id=1
   → Kurye atandı

3. Ajan: INSERT INTO packages (external_order_number='TR-123', ...)
   → YENİ KAYIT oluşturuldu (id=2) ❌
   → Admin panelinde paket tekrar görünüyor ❌
```

### Şimdi (DOĞRU):
```
1. Ajan: INSERT INTO packages (external_order_number='TR-123', ...)
   → Yeni kayıt oluşturuldu (id=1)

2. Admin: UPDATE packages SET courier_id='abc' WHERE id=1
   → Kurye atandı

3. Ajan: INSERT INTO packages (external_order_number='TR-123', ...)
   → UNIQUE constraint hatası! ✅
   → 'ignore-duplicates' header sayesinde 200 OK döner ✅
   → Mevcut kayıt korunur (id=1, courier_id='abc') ✅
   → Admin panelinde paket görünmez ✅
```

## TEST

1. SQL constraint'i kurun (yukarıdaki SQL'i çalıştırın)
2. Admin panelini yenileyin: `Ctrl+F5`
3. Bir siparişe kurye atayın
4. 5 saniye bekleyin
5. Paket listede kalmamalı ✅

## EĞER HATA ALIRSAN

### Hata: "duplicate key value violates unique constraint"

**Sebep:** Veritabanında zaten aynı external_order_number + source kombinasyonuna sahip birden fazla kayıt var.

**Çözüm 1: Duplicate kayıtları temizle (ÖNERİLEN)**

```sql
-- Önce duplicate kayıtları kontrol et
SELECT 
  external_order_number,
  source,
  COUNT(*) as adet
FROM packages
WHERE external_order_number IS NOT NULL
GROUP BY external_order_number, source
HAVING COUNT(*) > 1
ORDER BY adet DESC;

-- Eğer duplicate varsa, en yeni olanı tut, eskilerini sil
DELETE FROM packages a
USING packages b
WHERE a.id < b.id
  AND a.external_order_number = b.external_order_number
  AND a.source = b.source;

-- Şimdi constraint'i tekrar ekle
ALTER TABLE packages
ADD CONSTRAINT unique_external_order_per_source
UNIQUE (external_order_number, source);
```

**Çözüm 2: external_order_number NULL olanları hariç tut**

```sql
-- NULL değerleri hariç tut
ALTER TABLE packages
ADD CONSTRAINT unique_external_order_per_source
UNIQUE NULLS NOT DISTINCT (external_order_number, source);
```

## ÖZET

| Özellik | Önceki | Şimdi |
|---------|--------|-------|
| Ajan INSERT | ✅ Yapabilir | ✅ Yapabilir |
| Duplicate INSERT | ✅ Yapabilir (SORUN!) | ❌ YAPAMAZ (CONSTRAINT) |
| Kurye Atama | ✅ Çalışıyor | ✅ Çalışıyor |
| Paket Geri Geliyor | ❌ Evet (SORUN!) | ✅ Hayır (ÇÖZÜLDÜ!) |

## NEDEN BU KADAR ÖNEMLİ?

UNIQUE constraint olmadan:
- ❌ Ajan aynı siparişi tekrar INSERT eder
- ❌ Yeni bir kayıt oluşturulur (farklı ID)
- ❌ Admin panelinde paket tekrar görünür
- ❌ Kurye ataması kaybolur

UNIQUE constraint ile:
- ✅ Ajan aynı siparişi tekrar INSERT edemez
- ✅ Mevcut kayıt korunur (aynı ID)
- ✅ Admin panelinde paket görünmez
- ✅ Kurye ataması korunur

**Bu constraint MUTLAKA kurulmalı!** 🔒
