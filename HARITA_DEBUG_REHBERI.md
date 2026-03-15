# 🗺️ Harita Restoran Marker Debug Rehberi

## Yapılan Değişiklikler

### 1. Type Tanımı Düzeltildi
- `Restaurant` interface'ine `latitude` ve `longitude` alanları eklendi
- Dosya: `src/types/index.ts`

### 2. Harita Komponenti Güncellendi
- Restoran filtreleme mantığı iyileştirildi (`!= null` kontrolü)
- Detaylı console.log debug mesajları eklendi
- Restoran sayacı badge eklendi (sol üst köşe)
- Marker oluşturma kodu basitleştirildi
- Dosya: `src/app/admin/components/LiveMapComponent.tsx`

### 3. Veritabanı Doğrulama Script'i
- Restoran koordinatlarını kontrol eden SQL oluşturuldu
- Dosya: `database/verify_restaurants_for_map.sql`

## Browser Console'da Kontrol Edilecekler

Admin panelini açtığınızda browser console'da (F12) şu mesajları göreceksiniz:

### ✅ Başarılı Durum:
```
🍽️ Toplam restoran sayısı: 3
🍽️ Koordinatlı restoran sayısı: 3
🍽️ Restoran verileri: [
  { name: "Öküz Burger", lat: 41.2867, lng: 36.3300, id: "..." },
  { name: "Pizza Palace", lat: 41.2900, lng: 36.3350, id: "..." },
  ...
]
🗺️ Restoran marker 1/3: { name: "Öküz Burger", position: [41.2867, 36.3300], id: "..." }
🗺️ Restoran marker 2/3: { name: "Pizza Palace", position: [41.2900, 36.3350], id: "..." }
```

### ❌ Sorunlu Durumlar:

#### Durum 1: Koordinat Yok
```
🍽️ Koordinatlı restoran sayısı: 0
```
**Çözüm:** Veritabanında restoranların latitude/longitude değerleri NULL. SQL script'i çalıştırın.

#### Durum 2: Veri Gelmiyor
```
🍽️ Toplam restoran sayısı: 0
```
**Çözüm:** `AdminDataProvider.tsx` içinde `fetchRestaurants()` fonksiyonu çalışmıyor. Network tab'ı kontrol edin.

#### Durum 3: Marker Oluşturulmuyor
```
🍽️ Koordinatlı restoran sayısı: 3
(Ama marker log'ları yok)
```
**Çözüm:** React render hatası. Browser console'da kırmızı hata mesajlarına bakın.

## Harita Üzerinde Görecekleriniz

### Sol Üst Köşe
```
🍽️ Restoranlar: 3
```
Bu badge kaç restoran marker'ının render edildiğini gösterir.

### Harita Üzerinde
- 🍽️ Turuncu gradient daire içinde çatal-bıçak emoji
- Marker'a tıklayınca popup açılır:
  - Restoran adı
  - Telefon
  - Adres
  - Aktif sipariş sayısı

## Test Adımları

1. **Admin panelini aç** (http://localhost:3000/admin)
2. **F12 ile console'u aç**
3. **Console'da ara:**
   - `🍽️ Toplam restoran` yazısını bul
   - Sayıları kontrol et
4. **Haritaya bak:**
   - Sol üstteki badge'i kontrol et
   - Samsun 19 Mayıs bölgesinde turuncu marker'lar görmeli
5. **Marker'a tıkla:**
   - Popup açılmalı
   - Restoran bilgileri görünmeli

## Veritabanı Kontrolü

Supabase SQL Editor'de çalıştır:

```sql
-- Hızlı kontrol
SELECT name, latitude, longitude 
FROM restaurants 
WHERE latitude IS NOT NULL;
```

Eğer sonuç boşsa:

```sql
-- Örnek veri ekle (Samsun 19 Mayıs)
UPDATE restaurants 
SET latitude = 41.2867, longitude = 36.3300 
WHERE name = 'Öküz Burger';
```

## Sorun Devam Ederse

1. **Hard refresh:** Ctrl + Shift + R (cache temizle)
2. **Leaflet CSS kontrolü:** Network tab'da leaflet.css yüklenmiş mi?
3. **React DevTools:** Component tree'de `LiveMapComponent` props'larını kontrol et
4. **Supabase RLS:** restaurants tablosunda SELECT izni var mı?

## Beklenen Sonuç

Haritada Samsun 19 Mayıs bölgesinde turuncu 🍽️ marker'lar görünmeli. Her marker tıklanabilir ve restoran bilgilerini göstermeli.
