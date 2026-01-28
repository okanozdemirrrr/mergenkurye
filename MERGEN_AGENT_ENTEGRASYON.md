# 🔌 Mergen Agent Eklenti Entegrasyonu

## ✅ Yapılan Değişiklikler

### 1. Restoran Paneli (`src/app/restoran/page.tsx`)

#### Yeni State Eklendi:
```typescript
const [coordinates, setCoordinates] = useState<{ 
  latitude: number | null; 
  longitude: number | null 
}>({
  latitude: null,
  longitude: null
})
```

#### Mergen Agent Listener Eklendi:
```typescript
useEffect(() => {
  if (typeof window === 'undefined' || !isLoggedIn) return

  console.log('🔌 Mergen Agent listener aktif - Eklentiden veri bekleniyor...')

  const handleMergenMessage = (event: MessageEvent) => {
    // Güvenlik kontrolü
    if (!event.data || 
        event.data.source !== 'mergen-extension' || 
        event.data.type !== 'MERGEN_ORDER_DATA') {
      return
    }

    // Form otomatik doldurma
    setFormData({
      customerName: orderData.customer || '',
      customerPhone: orderData.phone || '',
      deliveryAddress: orderData.address || '',
      packageAmount: orderData.amount ? String(orderData.amount) : '',
      content: orderData.content || ''
    })

    // Koordinatları kaydet
    if (orderData.latitude && orderData.longitude) {
      setCoordinates({
        latitude: orderData.latitude,
        longitude: orderData.longitude
      })
    }

    // Ödeme yöntemi
    if (orderData.paymentMethod === 'cash' || orderData.paymentMethod === 'card') {
      setPaymentMethod(orderData.paymentMethod)
    }

    // Başarı mesajı
    setSuccessMessage('✅ Eklentiden Veri Çekildi')
  }

  window.addEventListener('message', handleMergenMessage)

  return () => {
    window.removeEventListener('message', handleMergenMessage)
  }
}, [isLoggedIn])
```

#### Form Submit Güncellendi:
```typescript
// Koordinatlar varsa veritabanına kaydet
if (coordinates.latitude !== null && coordinates.longitude !== null) {
  packageData.latitude = coordinates.latitude
  packageData.longitude = coordinates.longitude
  console.log('📍 Koordinatlar veritabanına kaydediliyor:', coordinates)
}
```

## 🎯 Mergen Agent Mesaj Formatı

Eklentinin göndermesi gereken mesaj formatı:

```javascript
window.postMessage({
  source: 'mergen-extension',
  type: 'MERGEN_ORDER_DATA',
  payload: {
    customer: 'Ahmet Yılmaz',
    phone: '05551234567',
    address: 'Atatürk Cad. No:123 Kadıköy/İstanbul',
    amount: 150,
    content: 'Pizza + Kola',
    latitude: 40.9887,
    longitude: 29.0258,
    paymentMethod: 'cash' // veya 'card'
  }
}, '*')
```

## 🔒 Güvenlik Kontrolleri

1. **Source Kontrolü:** Sadece `source: 'mergen-extension'` kabul edilir
2. **Type Kontrolü:** Sadece `type: 'MERGEN_ORDER_DATA'` kabul edilir
3. **Login Kontrolü:** Listener sadece kullanıcı giriş yaptığında aktif

## 📍 Koordinat Sistemi

- Koordinatlar `latitude` ve `longitude` olarak kaydedilir
- Kurye panelinde bu koordinatlar kullanılarak **nokta atışı navigasyon** sağlanır
- Koordinat yoksa adres bazlı navigasyon kullanılır (fallback)

## 🧪 Test Adımları

### 1. Restoran Panelini Aç
```
http://localhost:3000/restoran
```

### 2. Giriş Yap
Restoran kullanıcı adı ve şifresiyle giriş yap

### 3. Console'u Aç (F12)
Şu mesajı göreceksin:
```
🔌 Mergen Agent listener aktif - Eklentiden veri bekleniyor...
```

### 4. Test Mesajı Gönder
Console'da şunu çalıştır:
```javascript
window.postMessage({
  source: 'mergen-extension',
  type: 'MERGEN_ORDER_DATA',
  payload: {
    customer: 'Test Müşteri',
    phone: '05551234567',
    address: 'Test Adres, Kadıköy/İstanbul',
    amount: 100,
    content: 'Test Sipariş',
    latitude: 40.9887,
    longitude: 29.0258,
    paymentMethod: 'cash'
  }
}, '*')
```

### 5. Sonuç
- ✅ Form otomatik doldurulacak
- ✅ Koordinatlar kaydedilecek
- ✅ "✅ Eklentiden Veri Çekildi" mesajı görünecek
- ✅ Console'da loglar görünecek:
  ```
  📨 Mergen Agent'tan veri alındı: {...}
  📍 Koordinatlar alındı: {lat: 40.9887, lng: 29.0258}
  ✅ Form otomatik dolduruldu
  ```

### 6. Siparişi Kaydet
"Kaydet" butonuna tıkla:
- ✅ Sipariş veritabanına kaydedilecek
- ✅ Koordinatlar da kaydedilecek
- ✅ Console'da: `📍 Koordinatlar veritabanına kaydediliyor: {...}`

## 🚀 Mergen Agent Eklentisi Geliştirme Notları

### Eklentinin Yapması Gerekenler:

1. **Veri Toplama:**
   - Müşteri adı
   - Telefon numarası
   - Teslimat adresi
   - Paket tutarı
   - İçerik
   - Koordinatlar (Google Maps API'den)
   - Ödeme yöntemi

2. **Mesaj Gönderme:**
   ```javascript
   // Restoran paneli açıkken
   window.postMessage({
     source: 'mergen-extension',
     type: 'MERGEN_ORDER_DATA',
     payload: { /* veriler */ }
   }, '*')
   ```

3. **Koordinat Alma (Google Maps API):**
   ```javascript
   // Geocoding API ile adres -> koordinat
   const geocoder = new google.maps.Geocoder()
   geocoder.geocode({ address: deliveryAddress }, (results, status) => {
     if (status === 'OK') {
       const lat = results[0].geometry.location.lat()
       const lng = results[0].geometry.location.lng()
       // Mesajda gönder
     }
   })
   ```

## 📊 Veri Akışı

```
Mergen Agent Eklentisi
        ↓
  window.postMessage
        ↓
Restoran Paneli Listener
        ↓
  Form State Güncelleme
        ↓
  Kullanıcı "Kaydet"
        ↓
   Supabase INSERT
        ↓
  Koordinatlar Kaydedildi
        ↓
  Kurye Panelinde Görünür
        ↓
Kurye Koordinatlarla Navigasyon
```

## 🔍 Debug

### Console Logları:
```javascript
// Listener aktif mi?
🔌 Mergen Agent listener aktif - Eklentiden veri bekleniyor...

// Mesaj alındı mı?
📨 Mergen Agent'tan veri alındı: {...}

// Koordinatlar var mı?
📍 Koordinatlar alındı: {lat: 40.9887, lng: 29.0258}

// Form dolduruldu mu?
✅ Form otomatik dolduruldu

// Veritabanına kaydedildi mi?
📍 Koordinatlar veritabanına kaydediliyor: {...}
```

### Sorun Giderme:

**Mesaj gelmiyor:**
- Console'da listener aktif mi kontrol et
- Mesaj formatı doğru mu kontrol et
- `source` ve `type` doğru mu kontrol et

**Form doldurulmuyor:**
- Payload içinde veriler var mı kontrol et
- Console'da hata var mı kontrol et

**Koordinatlar kaydedilmiyor:**
- `latitude` ve `longitude` null değil mi kontrol et
- Console'da "📍 Koordinatlar veritabanına kaydediliyor" mesajı var mı kontrol et

## ✅ Sonuç

Restoran paneli artık Mergen Agent eklentisinden gelen verileri otomatik olarak yakalayıp formu dolduruyor. Koordinatlar da kaydediliyor ve kurye panelinde nokta atışı navigasyon için kullanılıyor.

**Terminale:** sinyal alındı, formlar doluyor
