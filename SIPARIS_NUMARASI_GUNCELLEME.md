# 📋 SİPARİŞ NUMARASI GÜNCELLEMESİ

## 🔄 DEĞİŞİKLİK

Veritabanına otomatik sipariş numarası üreten SQL Trigger eklendi.
Format: `000067` (6 haneli, sıfır ile doldurulmuş)

## ✅ YAPILAN GÜNCELLEMELER

### 1. Admin Panel (src/app/page.tsx)

**Sipariş Numarası Gösterimi:**
```typescript
// ÖNCEKI: #{pkg.order_number || '------'}
// YENİ: {pkg.order_number || '......'}
```

**Değişiklikler:**
- ✅ `#` işareti kaldırıldı (veritabanından zaten formatlı geliyor)
- ✅ Boş durumda `------` yerine `......` gösteriliyor (daha estetik)
- ✅ 4 yerde güncellendi:
  - Canlı Siparişler kartı
  - Geçmiş Siparişler tablosu (2 yer)
  - Restoran detay tablosu

**Realtime Güncelleme:**
- Yeni sipariş düştüğünde Realtime listener otomatik olarak `order_number` alanını alıyor
- `fetchPackages()` fonksiyonu tüm alanları çekiyor (order_number dahil)
- UI anında güncelleniyor

### 2. Kurye Panel (src/app/kurye/page.tsx)

**Sipariş Numarası Gösterimi:**
```typescript
// ÖNCEKI: #{pkg.order_number || '------'}
// YENİ: {pkg.order_number || '......'}
```

**Değişiklikler:**
- ✅ `#` işareti kaldırıldı (veritabanından zaten formatlı geliyor)
- ✅ Boş durumda `------` yerine `......` gösteriliyor
- ✅ 3 yerde güncellendi:
  - Aktif paketler listesi
  - Geçmiş paketler listesi
  - Kazanç detay tablosu

**Realtime Güncelleme:**
- Kurye panelinde de Realtime listener aktif
- Yeni paket atandığında `order_number` otomatik geliyor
- UI anında güncelleniyor

## 📊 ÖNCEKI vs YENİ

| Özellik | Önceki | Yeni |
|---------|--------|------|
| Format | `#000067` | `000067` |
| Boş Durum | `#------` | `......` |
| Kaynak | Manuel/Ajan | Veritabanı Trigger |
| Güncelleme | Manuel | Otomatik |

## 🎯 AVANTAJLAR

1. **Tutarlılık:** Tüm siparişler aynı formatta (000067)
2. **Otomatik:** Manuel numara girişi gerekmiyor
3. **Sıralı:** Veritabanı sıralı numara üretiyor
4. **Temiz UI:** Ekstra `#` işareti yok
5. **Realtime:** Yeni siparişlerde numara anında görünüyor

## 🔍 NASIL ÇALIŞIR?

### Veritabanı Trigger (SQL)
```sql
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.order_number IS NULL THEN
    NEW.order_number := LPAD(
      (SELECT COALESCE(MAX(CAST(order_number AS INTEGER)), 0) + 1 
       FROM packages 
       WHERE order_number ~ '^\d+$')::TEXT, 
      6, 
      '0'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_order_number
  BEFORE INSERT ON packages
  FOR EACH ROW
  EXECUTE FUNCTION generate_order_number();
```

### Uygulama Akışı

1. **Yeni Sipariş Oluşturulur:**
   - Admin paneli veya ajan INSERT yapar
   - `order_number` alanı boş gönderilir (veya hiç gönderilmez)

2. **Trigger Devreye Girer:**
   - Veritabanı otomatik olarak sıradaki numarayı üretir
   - Format: `000067` (6 haneli, sıfır ile doldurulmuş)

3. **Realtime Güncelleme:**
   - Yeni sipariş Realtime üzerinden gelir
   - `order_number` alanı dolu gelir
   - UI anında güncellenir

4. **Geçici Durum:**
   - Eğer Realtime gecikmesi varsa
   - UI'da `......` gösterilir
   - Birkaç saniye içinde gerçek numara gelir

## 🧪 TEST

### Admin Panel
1. Yeni sipariş oluştur (order_number boş bırak)
2. Sipariş listesinde `......` göreceksin
3. 1-2 saniye içinde `000067` formatında numara gelecek

### Kurye Panel
1. Kuryeye paket ata
2. Kurye panelinde paket görünecek
3. Sipariş numarası `000067` formatında olacak

## ✅ SONUÇ

✅ Admin panelinde `#` işareti kaldırıldı
✅ Kurye panelinde `#` işareti kaldırıldı
✅ Boş durumda `......` gösteriliyor
✅ Veritabanı otomatik numara üretiyor
✅ Realtime güncelleme çalışıyor
✅ UI temiz ve tutarlı

**Sipariş numaraları artık nizamî!** 📋
