# ⚠️ İPTAL EDGE-CASE KURALI

## 🎯 OPERASYONELKural

**Kurye paketi restorandan teslim aldıktan sonra sipariş iptal edilirse, kurye o paketin parasını HAK EDER ve bu masraf restorana yansır.**

---

## 📊 FİNANSAL MANTIK

### 1. Brüt Ciro (Restoranın Kazancı)

```sql
Brüt Ciro = SUM(packages.amount WHERE status = 'delivered')
```

**KURAL:** Sadece başarıyla teslim edilen paketler ciroya dahildir.

❌ **İptal edilen paket → Ciro = 0** (Restoran para kazanmaz)

### 2. Toplam Masraf (Kurye / Restoran Borcu)

```sql
Toplam Masraf = SUM(restaurant_debts.amount WHERE status = 'pending')
```

**KURAL:** İki durumda masraf oluşur:

1. ✅ **status = 'delivered'** (Başarıyla teslim edilenler)
2. ✅ **status = 'cancelled' VE (picked_up_at IS NOT NULL VEYA courier_id IS NOT NULL)**

**Mantık:** Kurye paketi üstüne almış ve restorandan çıkmışsa, sipariş sonradan iptal edilse bile o paketin masrafı restoranın borcuna EKLENİR.

---

## 🔧 TEKNIK UYGULAMA

### 1. Database Trigger

```sql
CREATE OR REPLACE FUNCTION create_restaurant_debt_on_delivery()
RETURNS TRIGGER AS $$
DECLARE
    v_package_fee NUMERIC(10, 2);
    v_should_charge BOOLEAN := FALSE;
BEGIN
    -- Restoranın paket ücretini al
    SELECT COALESCE(package_fee, 100)
    INTO v_package_fee
    FROM restaurants
    WHERE id = NEW.restaurant_id;
    
    -- DURUM 1: Başarıyla teslim edildi
    IF NEW.status = 'delivered' AND (OLD.status IS NULL OR OLD.status != 'delivered') THEN
        v_should_charge := TRUE;
    END IF;
    
    -- DURUM 2: İptal edildi AMA kurye paketi almıştı (EDGE-CASE)
    IF NEW.status = 'cancelled' AND (OLD.status IS NULL OR OLD.status != 'cancelled') THEN
        IF NEW.picked_up_at IS NOT NULL OR NEW.courier_id IS NOT NULL THEN
            v_should_charge := TRUE;
            RAISE NOTICE 'İPTAL EDGE-CASE: Kurye paketi almıştı, masraf restorana yansıtılıyor';
        END IF;
    END IF;
    
    -- Masraf kaydı oluştur
    IF v_should_charge THEN
        INSERT INTO restaurant_debts (
            restaurant_id,
            debt_date,
            amount,
            package_count,
            package_fee,
            status,
            notes
        ) VALUES (
            NEW.restaurant_id,
            CURRENT_DATE,
            v_package_fee,
            1,
            v_package_fee,
            'pending',
            CASE 
                WHEN NEW.status = 'delivered' THEN 'Paket #' || NEW.order_number || ' teslim edildi'
                WHEN NEW.status = 'cancelled' THEN 'Paket #' || NEW.order_number || ' iptal edildi (Kurye paketi almıştı - Ücretli İptal)'
                ELSE 'Paket #' || NEW.order_number
            END
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 2. Trigger Tanımı

```sql
DROP TRIGGER IF EXISTS trigger_create_restaurant_debt ON packages;
CREATE TRIGGER trigger_create_restaurant_debt
    AFTER INSERT OR UPDATE OF status ON packages
    FOR EACH ROW
    EXECUTE FUNCTION create_restaurant_debt_on_delivery();
```

---

## 🧪 TEST SENARYOSU

### Senaryo: Kurye Paketi Aldı, Sonra İptal Edildi

**Başlangıç:**
1. Restoran sipariş oluşturur
2. Kurye atanır (`courier_id` set edilir)
3. Kurye restorana gider
4. Kurye "Restorandan Aldım" der (`picked_up_at` set edilir)
5. **Restoran siparişi iptal eder** (`status = 'cancelled'`)

**Beklenen Sonuç:**

```sql
-- Brüt Ciro
SELECT SUM(amount) FROM packages 
WHERE restaurant_id = 'uuid' AND status = 'delivered';
-- Sonuç: 0 TL (İptal edildi, teslim edilmedi)

-- Toplam Masraf
SELECT SUM(amount) FROM restaurant_debts 
WHERE restaurant_id = 'uuid' AND status = 'pending';
-- Sonuç: 40 TL (Kurye paketi almıştı, masraf yansıdı)

-- restaurant_debts kaydı
{
  restaurant_id: 'uuid',
  amount: 40,
  package_count: 1,
  package_fee: 40,
  status: 'pending',
  notes: 'Paket #12345 iptal edildi (Kurye paketi almıştı - Ücretli İptal)'
}
```

**Finansal Durum:**
- Brüt Ciro: 0 TL (Restoran para kazanmadı)
- Toplam Masraf: 40 TL (Kurye hak etti)
- Net Hakediş: -40 TL (Restoran borçlu)

---

## 📋 KONTROL LİSTESİ

### İptal Öncesi Kontroller

```typescript
// packages tablosunda kontrol edilecek alanlar:
- picked_up_at: TIMESTAMPTZ | NULL
- courier_id: UUID | NULL
- status: PackageStatus
```

### İptal Sonrası Kontroller

```sql
-- 1. Trigger çalıştı mı?
SELECT * FROM restaurant_debts 
WHERE restaurant_id = 'uuid' 
ORDER BY created_at DESC LIMIT 1;

-- 2. Masraf doğru mu?
SELECT 
  rd.amount,
  rd.package_fee,
  rd.notes,
  p.status,
  p.picked_up_at,
  p.courier_id
FROM restaurant_debts rd
JOIN packages p ON p.restaurant_id = rd.restaurant_id
WHERE rd.restaurant_id = 'uuid'
ORDER BY rd.created_at DESC;
```

---

## 🎨 UI/UX GÖSTERİMİ

### Admin Paneli - Restoran Detay

**Paket Masrafları Listesi:**
```
📦 Paket Masrafları (restaurant_debts)
┌─────────────────────────────────────────────────┐
│ 📅 2024-01-15 - 1 paket                         │
│ Paket #12345 iptal edildi                       │
│ (Kurye paketi almıştı - Ücretli İptal)         │
│                                        40.00 ₺  │
└─────────────────────────────────────────────────┘
```

### Restoran Paneli - İptal Uyarısı

```
⚠️ DİKKAT!

Kurye paketi zaten aldı. 

Bu siparişi iptal ederseniz:
- Müşteri siparişini alamayacak
- Kurye boşa çalışmış olacak
- Paket ücreti (40₺) size yansıyacak

Yine de iptal etmek istiyor musunuz?

[Hayır, İptal Etme]  [Evet, İptal Et]
```

---

## 🔒 GÜVENLİK KURALLARI

### 1. İptal Yetkisi
- Sadece restoran kendi siparişlerini iptal edebilir
- Admin her siparişi iptal edebilir

### 2. İptal Zamanlaması
- `on_the_way` durumunda iptal EDİLEMEZ
- `delivered` durumunda iptal EDİLEMEZ
- `cancelled` durumunda zaten iptal edilmiş

### 3. Masraf Yansıtma
- Trigger otomatik çalışır
- Manuel müdahale GEREKMEZİ
- Audit log tutulur

---

## 📊 RAPORLAMA

### Ücretli İptaller Raporu

```sql
SELECT 
  r.name as restoran_adi,
  COUNT(*) as ucretli_iptal_sayisi,
  SUM(rd.amount) as toplam_masraf
FROM restaurant_debts rd
JOIN restaurants r ON r.id = rd.restaurant_id
WHERE rd.notes LIKE '%Ücretli İptal%'
  AND rd.debt_date >= '2024-01-01'
GROUP BY r.id, r.name
ORDER BY toplam_masraf DESC;
```

### Kurye Bazlı İptal Analizi

```sql
SELECT 
  c.full_name as kurye_adi,
  COUNT(*) as iptal_sayisi,
  SUM(p.amount) as kayip_ciro
FROM packages p
JOIN couriers c ON c.id = p.courier_id
WHERE p.status = 'cancelled'
  AND p.picked_up_at IS NOT NULL
  AND p.delivered_at >= '2024-01-01'
GROUP BY c.id, c.full_name
ORDER BY iptal_sayisi DESC;
```

---

## 🎯 SONUÇ

✅ **Kurye paketi aldıysa, iptal edilse bile masraf restorana yansır**
✅ **Trigger otomatik çalışır**
✅ **Brüt ciro sadece delivered paketlerden hesaplanır**
✅ **Toplam masraf hem delivered hem ücretli iptalleri içerir**
✅ **Audit log tutulur**
✅ **UI'da açık uyarı gösterilir**

**Bu kural operasyonel adaleti sağlar ve kuryeleri korur!** 🚀

---

## ⚠️ ÖNEMLİ NOTLAR

1. **Test Etmeden Deploy Etme!**
2. **Trigger'ı mutlaka test et**
3. **Restoran paneline uyarı ekle**
4. **Admin panelinde ücretli iptalleri göster**
5. **Raporlamada ayrı kategori oluştur**

**Kurye hakları korunmalı!** 💪
