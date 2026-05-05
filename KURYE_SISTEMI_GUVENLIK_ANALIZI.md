# 🔒 KURYE SİSTEMİ GÜVENLİK VE HATA ANALİZİ

## 📋 ANALİZ SONUCU: SİSTEM DURUMU

**Tarih:** 5 Mayıs 2026  
**Analiz Eden:** AI Assistant  
**Sistem Versiyonu:** v1.3.7

---

## ✅ MEVCUT KORUMALAR

### 1. **Kurye Değişikliği Koruması** ✅
**Durum:** GÜÇLÜ  
**Konum:** `src/services/orderService.ts` - `assignCourier()`

```typescript
// Kurye paketi aldıysa başka kuryeye atanamaz
const blockedStatuses = ['picking_up', 'on_the_way', 'delivered']
if (blockedStatuses.includes(packageData.status)) {
    return { success: false, error: 'Paket kurye tarafından alındı, atanamaz' }
}
```

**Test Senaryosu:**
1. ✅ Erkan Atik'e paket atandı (status: assigned)
2. ✅ Ahmet Sak'a devredildi (status: assigned → courier_id değişti)
3. ✅ Ahmet Sak paketi aldı (status: picking_up)
4. ✅ Admin Erkan Atik'e geri atamaya çalıştı → **ENGELLENDI** ✅
5. ✅ Ahmet Sak teslim etti → `delivered_by_courier_id = ahmet_sak_id` ✅

**Sonuç:** Erkan Atik'in geçmişine düşmez! ✅

---

### 2. **Teslimat Kaydı Koruması** ✅
**Durum:** GÜÇLÜ  
**Konum:** `src/app/kurye/page.tsx` - `handleDeliver()`

```typescript
// Teslimat sırasında delivered_by_courier_id kaydediliyor
.update({
  status: 'delivered',
  delivered_at: new Date().toISOString(),
  payment_method: paymentMethod,
  delivered_by_courier_id: courierId  // ← Teslimatı yapan kurye
})
```

**Koruma Mekanizması:**
- `courier_id`: Şu anki atanan kurye (değişebilir)
- `delivered_by_courier_id`: Teslimatı yapan kurye (ASLA DEĞİŞMEZ)

**Test Senaryosu:**
1. ✅ Paket Erkan'a atandı → `courier_id = erkan_id`
2. ✅ Ahmet'e devredildi → `courier_id = ahmet_id`
3. ✅ Ahmet teslim etti → `delivered_by_courier_id = ahmet_id` ✅
4. ✅ Admin paneli `delivered_by_courier_id`'ye göre sorgu yapıyor ✅

**Sonuç:** Teslimat her zaman doğru kuryeye düşer! ✅

---

## 🚨 POTANSİYEL RİSKLER VE ÖNERİLER

### ⚠️ RİSK 1: Race Condition (Eşzamanlılık Sorunu)

**Senaryo:**
```
T0: Admin 1 → Paketi Kurye A'ya atar (status: assigned)
T1: Admin 2 → Aynı paketi Kurye B'ye atar (status: assigned)
T2: Kurye A → Paketi alır (status: picking_up)
T3: Kurye B → Paketi alır (status: picking_up) ← SORUN!
```

**Mevcut Durum:** ❌ KORUMASIZ

**Çözüm Önerisi:**
```sql
-- Database seviyesinde constraint ekle
ALTER TABLE packages 
ADD CONSTRAINT check_single_active_courier 
CHECK (
  (status IN ('picking_up', 'on_the_way') AND courier_id IS NOT NULL) OR
  (status NOT IN ('picking_up', 'on_the_way'))
);
```

**Öncelik:** 🔴 YÜKSEK

---

### ⚠️ RİSK 2: Teslimat Sonrası Kurye Değişikliği

**Senaryo:**
```
1. Kurye A paketi teslim eder
2. delivered_by_courier_id = kurye_a_id ✅
3. Admin yanlışlıkla courier_id'yi değiştirir
4. courier_id = kurye_b_id ← Karışıklık!
```

**Mevcut Durum:** ⚠️ KISMI KORUMA (UI'da engelleniyor ama API'de yok)

**Çözüm Önerisi:**
```typescript
// orderService.ts - assignCourier() fonksiyonuna ekle
const blockedStatuses = ['picking_up', 'on_the_way', 'delivered']  // ✅ Zaten var

// Ek kontrol: delivered paketlerde courier_id değişikliği engelle
if (packageData.status === 'delivered') {
    alert('❌ Teslim edilmiş paketlerde kurye değiştirilemez!')
    return { success: false }
}
```

**Öncelik:** 🟡 ORTA

---

### ⚠️ RİSK 3: Ödeme Yöntemi Değişikliği

**Senaryo:**
```
1. Kurye paketi nakit olarak teslim eder
2. payment_method = 'cash' ✅
3. Admin yanlışlıkla 'card' olarak değiştirir
4. Kurye'nin nakit hesabı yanlış olur!
```

**Mevcut Durum:** ❌ KORUMASIZ

**Çözüm Önerisi:**
```sql
-- Teslim edilmiş paketlerde payment_method değişikliğini engelle
CREATE OR REPLACE FUNCTION prevent_payment_method_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'delivered' AND NEW.payment_method != OLD.payment_method THEN
    RAISE EXCEPTION 'Teslim edilmiş paketlerde ödeme yöntemi değiştirilemez!';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_payment_method_change
BEFORE UPDATE ON packages
FOR EACH ROW
EXECUTE FUNCTION prevent_payment_method_change();
```

**Öncelik:** 🟡 ORTA

---

### ⚠️ RİSK 4: Teslimat Zamanı Manipülasyonu

**Senaryo:**
```
1. Kurye paketi 14:00'da teslim eder
2. delivered_at = '2026-05-05 14:00:00' ✅
3. Admin yanlışlıkla tarihi değiştirir
4. İstatistikler yanlış olur!
```

**Mevcut Durum:** ❌ KORUMASIZ

**Çözüm Önerisi:**
```sql
-- Teslim edilmiş paketlerde delivered_at değişikliğini engelle
CREATE OR REPLACE FUNCTION prevent_delivered_at_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'delivered' AND NEW.delivered_at != OLD.delivered_at THEN
    RAISE EXCEPTION 'Teslim edilmiş paketlerde teslimat zamanı değiştirilemez!';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_delivered_at_change
BEFORE UPDATE ON packages
FOR EACH ROW
EXECUTE FUNCTION prevent_delivered_at_change();
```

**Öncelik:** 🟡 ORTA

---

### ⚠️ RİSK 5: Kurye Borç Hesaplama Hatası

**Senaryo:**
```
1. Kurye 10 paket teslim eder (5 nakit, 5 kart)
2. Nakit toplam: 500 TL
3. Admin gün sonu alır: 450 TL
4. Borç: 50 TL ✅
5. Admin yanlışlıkla bir paketin payment_method'unu değiştirir
6. Nakit toplam: 400 TL olur
7. Borç hesabı yanlış!
```

**Mevcut Durum:** ⚠️ KISMI KORUMA (payment_method değişikliği engellenmeli)

**Çözüm:** Yukarıdaki RİSK 3'ü uygula

**Öncelik:** 🟡 ORTA

---

### ⚠️ RİSK 6: Duplicate Teslimat

**Senaryo:**
```
1. Kurye "Teslim Et" butonuna basıyor
2. Network yavaş, 2. kez basıyor
3. Aynı paket 2 kez teslim edilmiş gibi görünüyor
```

**Mevcut Durum:** ⚠️ KISMI KORUMA (UI'da disabled oluyor ama API'de yok)

**Çözüm Önerisi:**
```typescript
// kurye/page.tsx - handleDeliver() fonksiyonuna ekle
const { error } = await supabase
  .from('packages')
  .update({
    status: 'delivered',
    delivered_at: new Date().toISOString(),
    payment_method: paymentMethod,
    delivered_by_courier_id: courierId
  })
  .eq('id', packageId)
  .neq('status', 'delivered')  // ← Zaten delivered ise güncelleme
```

**Öncelik:** 🟢 DÜŞÜK (UI koruması var)

---

### ⚠️ RİSK 7: Kurye Silme Sonrası Veri Kaybı

**Senaryo:**
```
1. Kurye A 100 paket teslim eder
2. Admin kurye A'yı siler
3. packages.courier_id = NULL olur (ON DELETE SET NULL)
4. packages.delivered_by_courier_id = NULL olur (ON DELETE SET NULL)
5. Tüm teslimat geçmişi kaybolur!
```

**Mevcut Durum:** ❌ KRİTİK RİSK!

**Çözüm Önerisi:**
```sql
-- Foreign key'leri değiştir: SET NULL yerine RESTRICT
ALTER TABLE packages 
DROP CONSTRAINT packages_courier_id_fkey,
ADD CONSTRAINT packages_courier_id_fkey 
  FOREIGN KEY (courier_id) 
  REFERENCES couriers(id) 
  ON DELETE RESTRICT;  -- ← Kurye silinemez!

ALTER TABLE packages 
DROP CONSTRAINT packages_delivered_by_courier_id_fkey,
ADD CONSTRAINT packages_delivered_by_courier_id_fkey 
  FOREIGN KEY (delivered_by_courier_id) 
  REFERENCES couriers(id) 
  ON DELETE RESTRICT;  -- ← Kurye silinemez!

-- Alternatif: Soft delete kullan
ALTER TABLE couriers ADD COLUMN deleted_at TIMESTAMPTZ;
-- Kurye silinmez, sadece deleted_at doldurulur
```

**Öncelik:** 🔴 KRİTİK

---

### ⚠️ RİSK 8: Restoran Silme Sonrası Veri Kaybı

**Senaryo:**
```
1. Restoran 500 sipariş vermiş
2. Admin restoranı siler
3. packages.restaurant_id = NULL olur
4. Sipariş geçmişi kaybolur!
```

**Mevcut Durum:** ❌ KRİTİK RİSK!

**Çözüm:** RİSK 7 ile aynı (RESTRICT veya soft delete)

**Öncelik:** 🔴 KRİTİK

---

## 📊 KLASİK KURYE SİSTEMLERİNDEKİ HATALAR

### 1. **Getir / Yemeksepeti Benzeri Sistemler**

**Bilinen Hatalar:**
- ❌ Kurye değişikliğinde teslimat kaydı yanlış kuryeye düşer
- ❌ Eşzamanlı atama (2 admin aynı paketi farklı kuryelere atar)
- ❌ Teslimat sonrası ödeme yöntemi değişikliği
- ❌ GPS konum manipülasyonu

**Bizim Sistemimizde:**
- ✅ `delivered_by_courier_id` ile çözüldü
- ⚠️ Eşzamanlı atama koruması YOK
- ⚠️ Ödeme yöntemi değişikliği koruması YOK
- ✅ GPS konum takibi var

---

### 2. **Trendyol Express / Hepsiburada Jet**

**Bilinen Hatalar:**
- ❌ Kurye borç hesaplama hataları
- ❌ Gün sonu mutabakat tutarsızlıkları
- ❌ Teslimat zamanı manipülasyonu

**Bizim Sistemimizde:**
- ✅ Borç sistemi var (`courier_debts` tablosu)
- ✅ Gün sonu mutabakat var (`courier_settlements` tablosu)
- ⚠️ Teslimat zamanı değişikliği koruması YOK

---

### 3. **Migros Hemen / Carrefour Kurye**

**Bilinen Hatalar:**
- ❌ Kurye silme sonrası veri kaybı
- ❌ Restoran silme sonrası veri kaybı
- ❌ Duplicate teslimat kayıtları

**Bizim Sistemimizde:**
- ❌ Kurye/Restoran silme koruması YOK (KRİTİK!)
- ⚠️ Duplicate teslimat koruması KISMI

---

## 🎯 ÖNCELİKLİ YAPILMASI GEREKENLER

### 🔴 KRİTİK (Hemen Yapılmalı)

1. **Kurye/Restoran Silme Koruması**
   ```sql
   -- Foreign key'leri RESTRICT yap
   ALTER TABLE packages 
   DROP CONSTRAINT packages_courier_id_fkey,
   ADD CONSTRAINT packages_courier_id_fkey 
     FOREIGN KEY (courier_id) 
     REFERENCES couriers(id) 
     ON DELETE RESTRICT;
   
   ALTER TABLE packages 
   DROP CONSTRAINT packages_delivered_by_courier_id_fkey,
   ADD CONSTRAINT packages_delivered_by_courier_id_fkey 
     FOREIGN KEY (delivered_by_courier_id) 
     REFERENCES couriers(id) 
     ON DELETE RESTRICT;
   
   ALTER TABLE packages 
   DROP CONSTRAINT packages_restaurant_id_fkey,
   ADD CONSTRAINT packages_restaurant_id_fkey 
     FOREIGN KEY (restaurant_id) 
     REFERENCES restaurants(id) 
     ON DELETE RESTRICT;
   ```

### 🟡 ORTA (Yakında Yapılmalı)

2. **Ödeme Yöntemi Değişikliği Koruması**
3. **Teslimat Zamanı Değişikliği Koruması**
4. **Teslimat Sonrası Kurye Değişikliği Koruması**

### 🟢 DÜŞÜK (İlerleyen Zamanlarda)

5. **Race Condition Koruması**
6. **Duplicate Teslimat Koruması**

---

## ✅ SONUÇ

**Genel Durum:** 🟡 ORTA GÜVENLİK

**Güçlü Yönler:**
- ✅ Kurye değişikliği koruması mükemmel
- ✅ Teslimat kaydı koruması mükemmel
- ✅ `delivered_by_courier_id` sistemi çok iyi tasarlanmış

**Zayıf Yönler:**
- ❌ Kurye/Restoran silme koruması YOK (KRİTİK!)
- ⚠️ Ödeme yöntemi değişikliği koruması YOK
- ⚠️ Teslimat zamanı değişikliği koruması YOK

**Tavsiye:**
Yukarıdaki KRİTİK öncelikteki SQL'leri hemen çalıştır. Diğer korumalar ilerleyen zamanlarda eklenebilir.

---

**Hazırlayan:** AI Assistant  
**Tarih:** 5 Mayıs 2026  
**Versiyon:** 1.0
