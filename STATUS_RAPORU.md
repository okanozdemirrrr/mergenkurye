# 📊 Packages Tablosu Status Değerleri Raporu

## 🎯 Veritabanı Constraint'inde Tanımlı Status Değerleri

Packages tablosundaki `packages_status_check` constraint'ine göre izin verilen status değerleri:

```sql
CHECK (status IN ('new_order', 'assigned', 'picking_up', 'on_the_way', 'delivered', 'cancelled'))
```

### ✅ Geçerli Status Değerleri:

1. **new_order** - Yeni sipariş (restoran tarafından oluşturuldu)
2. **assigned** - Kuryeye atandı
3. **picking_up** - Kurye restorandan alıyor
4. **on_the_way** - Kurye müşteriye gidiyor
5. **delivered** - Teslim edildi
6. **cancelled** - İptal edildi

---

## ⚠️ Kodda Kullanılan Ancak Constraint'te OLMAYAN Status Değerleri

### 🔴 SORUNLU: "waiting"

Aşağıdaki dosyalarda **"waiting"** status değeri kullanılıyor ancak bu değer veritabanı constraint'inde YOK:

#### 1. Type Tanımlarında:
- `src/app/restoran/RestoranProvider.tsx:16`
- `src/app/restoran/page_OLD_STATE_BASED.tsx:33`
- `src/app/restoran/page_FULL_OLD.tsx:34`
- `src/app/kurye/page.tsx:24`

```typescript
status: 'waiting' | 'assigned' | 'picking_up' | 'on_the_way' | 'delivered' | 'cancelled'
```

#### 2. Sipariş Oluşturma:
- `src/app/restoran/page_OLD_STATE_BASED.tsx:177` - `status: 'waiting'`
- `src/app/restoran/page_OLD_STATE_BASED.tsx:693` - `status: 'waiting'`

#### 3. UI Gösterimlerinde:
- `src/app/restoran/page_FULL_OLD.tsx:1059` - Status kontrolü
- `src/app/restoran/page_FULL_OLD.tsx:1066` - Status gösterimi
- `src/app/restoran/page_OLD_STATE_BASED.tsx:1590` - Status kontrolü
- `src/app/restoran/page_OLD_STATE_BASED.tsx:1597` - Status gösterimi

---

## 🔧 Düzeltme Önerileri

### Seçenek 1: "waiting" → "new_order" Değişikliği (ÖNERİLEN)

Tüm "waiting" kullanımlarını "new_order" ile değiştirin:

```typescript
// ÖNCE
status: 'waiting'

// SONRA
status: 'new_order'
```

**Değiştirilmesi Gereken Dosyalar:**
1. `src/app/restoran/page_OLD_STATE_BASED.tsx` (3 yer)
2. `src/app/restoran/RestoranProvider.tsx` (1 yer - type tanımı)
3. `src/app/kurye/page.tsx` (1 yer - type tanımı)

### Seçenek 2: Constraint'e "waiting" Ekle (ÖNERİLMEZ)

Eğer "waiting" kullanmaya devam etmek isterseniz:

```sql
ALTER TABLE packages DROP CONSTRAINT IF EXISTS packages_status_check;

ALTER TABLE packages 
ADD CONSTRAINT packages_status_check 
CHECK (status IN ('waiting', 'new_order', 'assigned', 'picking_up', 'on_the_way', 'delivered', 'cancelled'));
```

---

## 📝 Notlar

1. **page_FULL_OLD.tsx** dosyası zaten "new_order" kullanıyor (doğru) ✅
2. **page_OLD_STATE_BASED.tsx** dosyası "waiting" kullanıyor (yanlış) ❌
3. Kurye panelinde "waiting" veya "new_order" kontrolü yapılıyor
4. Admin panelinde her iki değer de destekleniyor

---

## 🎯 Sonuç

**Toplam 6 geçerli status değeri var:**
- new_order
- assigned  
- picking_up
- on_the_way
- delivered
- cancelled

**"waiting" değeri constraint'te YOK ve kullanılmamalı!**
