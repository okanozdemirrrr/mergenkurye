# 🗺️ Harita Restoran Marker - Hızlı Kontrol Kartı

## 1️⃣ Admin Panelini Aç
```
http://localhost:3000/admin
```

## 2️⃣ Haritada Göreceksin

### Sol Üst Köşe:
```
🍽️ Restoranlar: 3
```
↑ Bu sayı 0'dan büyük olmalı

### Harita Üzerinde:
- 🔴 **Kırmızı test marker** (Samsun merkez) - Haritanın çalıştığını gösterir
- 🍽️ **Turuncu restoran marker'ları** - Restoranların konumları

## 3️⃣ Console Kontrolü (F12)

### Başarılı:
```
✅ 🍽️ Toplam restoran sayısı: 3
✅ 🍽️ Koordinatlı restoran sayısı: 3
✅ 🗺️ Restoran marker 1/3: { name: "Öküz Burger", ... }
```

### Sorunlu:
```
❌ 🍽️ Koordinatlı restoran sayısı: 0
```

## 4️⃣ Sorun Varsa

### Marker'lar Görünmüyor:
1. **Ctrl + Shift + R** (hard refresh)
2. Console'da kırmızı hata var mı?
3. Kırmızı test marker görünüyor mu?

### Koordinat Yok:
```sql
-- Supabase SQL Editor'de çalıştır
SELECT name, latitude, longitude FROM restaurants;

-- Eğer NULL ise:
UPDATE restaurants 
SET latitude = 41.2867, longitude = 36.3300 
WHERE name = 'Öküz Burger';
```

## 5️⃣ Marker'a Tıkla

Popup açılmalı ve göstermeli:
- 🍽️ Restoran adı
- 📞 Telefon
- 📍 Adres
- 📦 Aktif sipariş sayısı

## ✅ Başarı Kriterleri

- [ ] Sol üstte "🍽️ Restoranlar: X" badge'i var (X > 0)
- [ ] Haritada kırmızı test marker görünüyor
- [ ] Haritada turuncu restoran marker'ları görünüyor
- [ ] Console'da "🗺️ Restoran marker" logları var
- [ ] Marker'a tıklayınca popup açılıyor

## 📞 Yardım

Detaylı bilgi için:
- `HARITA_DEBUG_REHBERI.md` - Kapsamlı debug rehberi
- `RESTORAN_MARKER_COZUM.md` - Teknik detaylar ve çözüm raporu
