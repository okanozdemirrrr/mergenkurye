# 📍 Paket Konum Takip Sistemi

## Genel Bakış
Müşterinin sipariş verirken seçtiği koordinatlar packages tablosuna kaydedilir ve admin haritasında nokta atışı olarak gösterilir.

## 1. Koordinat Mühürleme (Müşteri Paneli)

### Adres Seçimi
**Dosya:** `src/app/musteri/components/AddressModal.tsx`

Müşteri adres seçerken:
1. Hızlı konum seçimi veya haritadan manuel seçim
2. Haritayı hareket ettirerek tam konumu belirleme
3. Koordinatlar (latitude, longitude) customers tablosuna kaydedilir

```typescript
const { error: updateError } = await supabase
  .from('customers')
  .update({
    address: fullAddress,
    latitude: latitude,
    longitude: longitude
  })
  .eq('id', customerId)
```

### Sipariş Oluşturma
**Dosya:** `src/app/musteri/restoran/[id]/components/CartSidebar.tsx`

"Siparişi Tamamla" butonuna basıldığında:
1. Müşterinin customers tablosundan koordinatları çekilir
2. Koordinatlar parseFloat ile sayıya çevrilir
3. packages tablosuna latitude ve longitude olarak kaydedilir

```typescript
// Müşterinin koordinatlarını al
const { data: customerData } = await supabase
  .from('customers')
  .select('latitude, longitude')
  .eq('id', customerId)
  .single()

const customerLat = customerData?.latitude
const customerLng = customerData?.longitude

// Siparişi koordinatlarla birlikte kaydet
const { data, error } = await supabase
  .from('packages')
  .insert([{
    // ... diğer alanlar
    latitude: customerLat ? parseFloat(customerLat.toString()) : null,
    longitude: customerLng ? parseFloat(customerLng.toString()) : null,
  }])
```

## 2. Admin Haritasında Görselleştirme

### Paket İkonları
**Dosya:** `src/app/admin/components/LiveMapComponent.tsx`

İki tip paket ikonu:

#### Sahipsiz Paket (Kırmızı - Pulse Effect)
- Kurye atanmamış paketler
- Kırmızı gradient kutu ikonu
- Pulse animasyonu ile dikkat çeker
- Acil atama gerektiğini gösterir

#### Atanmış Paket (Turuncu)
- Kurye atanmış paketler
- Turuncu gradient kutu ikonu
- Sabit görünüm

### Koordinat İşleme
```typescript
// Koordinatları parseFloat ile sayıya çevir
const lat = parseFloat(pkg.latitude!.toString())
const lng = parseFloat(pkg.longitude!.toString())

// Geçersiz koordinat kontrolü
if (isNaN(lat) || isNaN(lng)) {
  console.log('❌ Geçersiz koordinat:', pkg.id, lat, lng)
  return null
}

// Marker oluştur
<Marker
  position={[lat, lng]}
  icon={getPackageIcon(pkg)}
>
```

### Popup Bilgileri
Paket marker'ına tıklandığında gösterilen bilgiler:
- 📦 Sipariş numarası
- 👤 Müşteri adı
- 📞 Müşteri telefonu
- 🍽️ Restoran adı
- 💰 Sipariş tutarı
- ⏰ Hazırlanma saati (varsa)
- 🔴/🟠 Durum (Sahipsiz/Atanmış)
- 📍 Koordinatlar (lat, lng)

## 3. Statü Kontrolü

### Haritada Gösterilecek Paketler
```typescript
const packagesWithCoords = (packages || []).filter(
  pkg => pkg.latitude && pkg.longitude && 
  pkg.status !== 'delivered' && pkg.status !== 'cancelled'
)
```

Şu statülerdeki paketler gösterilir:
- `new_order` - Yeni sipariş
- `ready` - Hazır (restoran hazırladı)
- `assigned` - Kuryeye atandı
- `picking_up` - Kurye alıyor
- `on_the_way` - Yolda

Gösterilmez:
- `delivered` - Teslim edildi
- `cancelled` - İptal edildi

## 4. Veritabanı Yapısı

### packages Tablosu
```sql
latitude DOUBLE PRECISION
longitude DOUBLE PRECISION
```

### customers Tablosu
```sql
latitude DOUBLE PRECISION
longitude DOUBLE PRECISION
address TEXT
```

## 5. Koordinat Formatı

- **Samsun 19 Mayıs İlçesi:** 41.493443, 36.078325
- **Format:** [latitude, longitude]
- **Hassasiyet:** 6 ondalık basamak
- **Tip:** DOUBLE PRECISION (PostgreSQL)
- **JavaScript:** parseFloat() ile sayıya çevrilir

## 6. Harita Merkezi

Admin haritası Samsun 19 Mayıs İlçesi'ne odaklanır:
```typescript
const [mapCenter] = useState<[number, number]>([41.493443, 36.078325])
```

## 7. Marker Renk Kodları

| Marker | Renk | Anlamı |
|--------|------|--------|
| 🍽️ | Turuncu | Restoran |
| 📦 (Kırmızı) | Kırmızı + Pulse | Sahipsiz Paket |
| 📦 (Turuncu) | Turuncu | Atanmış Paket |
| 🏍️ (Yeşil) | Yeşil | Boşta Kurye |
| 🏍️ (Sarı) | Sarı | Restoran Yolunda |
| 🏍️ (Kırmızı) | Kırmızı | Teslimat Yapıyor |

## 8. Kullanım Senaryosu

### Müşteri Tarafı:
1. Müşteri adres seçer (haritadan)
2. Koordinatlar customers tablosuna kaydedilir
3. Sipariş verir
4. Koordinatlar packages tablosuna kopyalanır

### Admin Tarafı:
1. Restoran siparişi hazırlar (status: ready)
2. Paket admin haritasında belirir
3. Admin pakete tıklar, detayları görür
4. En yakın kuryeyi görsel olarak analiz eder
5. Kuryeyi atar

### Kurye Tarafı:
1. Kurye paketi kabul eder
2. Paket ikonu turuncu olur
3. Kurye haritada paket konumunu görür
4. Teslimat yapar

## 9. Hata Kontrolü

### Koordinat Validasyonu
```typescript
// Geçersiz koordinat kontrolü
if (isNaN(lat) || isNaN(lng)) {
  console.log('❌ Geçersiz koordinat:', pkg.id, lat, lng)
  return null
}
```

### Null Kontrolü
```typescript
latitude: customerLat ? parseFloat(customerLat.toString()) : null
longitude: customerLng ? parseFloat(customerLng.toString()) : null
```

## 10. Performans

- Koordinatlar DOUBLE PRECISION olarak saklanır (8 byte)
- parseFloat ile JavaScript number'a çevrilir
- Leaflet marker'ları lazy render edilir
- Sadece aktif paketler gösterilir (delivered/cancelled hariç)

## Sonuç

Sistem müşterinin seçtiği koordinatları sipariş anında mühürler ve admin haritasında nokta atışı olarak gösterir. Bu sayede admin en yakın kuryeyi görsel olarak analiz edip atayabilir.

---
**Tarih:** 2026-03-12  
**Durum:** ✅ Tamamlandı  
**Test Edildi:** Kod derlendi, TypeScript hataları yok
