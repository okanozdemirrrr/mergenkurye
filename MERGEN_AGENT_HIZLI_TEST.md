# ⚡ Mergen Agent - Hızlı Test

## 🎯 3 Dakikada Test Et

### 1️⃣ Projeyi Çalıştır (30 saniye)
```bash
npm run dev
```

### 2️⃣ İki Sekme Aç (30 saniye)

**Sekme 1 - Restoran Paneli:**
```
http://localhost:3000/restoran
```
- Giriş yap (restoran kullanıcı adı + şifre)
- Console'u aç (F12)
- Şu mesajı göreceksin: `🔌 Mergen Agent listener aktif`

**Sekme 2 - Test Paneli:**
```
http://localhost:3000/test-mergen-agent.html
```

### 3️⃣ Test Et (1 dakika)

**Test panelinde:**
1. Form alanlarını doldur (veya varsayılan değerleri kullan)
2. **"📤 Mesaj Gönder"** butonuna tıkla
3. "✅ Mesaj gönderildi!" mesajını gör

**Restoran panelinde:**
1. Form otomatik doldurulacak ✅
2. "✅ Eklentiden Veri Çekildi" mesajı görünecek ✅
3. Console'da loglar görünecek:
   ```
   📨 Mergen Agent'tan veri alındı: {...}
   📍 Koordinatlar alındı: {lat: 40.9887, lng: 29.0258}
   ✅ Form otomatik dolduruldu
   ```

### 4️⃣ Siparişi Kaydet (30 saniye)

Restoran panelinde:
1. Ödeme yöntemi seç (Nakit/Kart)
2. **"Kaydet"** butonuna tıkla
3. Console'da: `📍 Koordinatlar veritabanına kaydediliyor`
4. Sipariş kaydedildi! ✅

---

## 🔥 Gerçek Mergen Agent Eklentisi İçin

Eklentinin yapması gereken tek şey:

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
    latitude: 40.988700,  // Google Maps API'den
    longitude: 29.025800, // Google Maps API'den
    paymentMethod: 'cash' // veya 'card'
  }
}, '*')
```

---

## 🎬 Demo Video Senaryosu

1. **Restoran panelini aç** → Giriş yap
2. **Test panelini aç** → Form dolu
3. **"Mesaj Gönder"** → Restoran panelinde form otomatik doldu
4. **"Kaydet"** → Sipariş veritabanına kaydedildi
5. **Admin panelini aç** → Yeni sipariş görünüyor
6. **Kuryeye ata** → Kurye panelinde görünüyor
7. **Kurye "Navigasyon"** → Koordinatlarla nokta atışı yönlendirme

---

## 🔍 Sorun Giderme

### Form doldurulmuyor?
```javascript
// Console'da kontrol et:
// 1. Listener aktif mi?
🔌 Mergen Agent listener aktif - Eklentiden veri bekleniyor...

// 2. Mesaj geldi mi?
📨 Mergen Agent'tan veri alındı: {...}

// Yoksa:
// - Restoran panelinde giriş yaptın mı?
// - Test paneli aynı origin'de mi? (localhost:3000)
```

### Koordinatlar kaydedilmiyor?
```javascript
// Console'da kontrol et:
📍 Koordinatlar alındı: {lat: 40.9887, lng: 29.0258}
📍 Koordinatlar veritabanına kaydediliyor: {...}

// Yoksa:
// - latitude ve longitude null değil mi?
// - Sayısal değer mi? (string değil)
```

---

## 📊 Veri Akışı

```
Test Paneli / Mergen Agent
        ↓
  window.postMessage
        ↓
Restoran Paneli Listener
        ↓
  setFormData() + setCoordinates()
        ↓
  Kullanıcı "Kaydet"
        ↓
   Supabase INSERT (koordinatlarla)
        ↓
  Admin Panelinde Görünür
        ↓
  Kuryeye Atanır
        ↓
Kurye Koordinatlarla Navigasyon
```

---

## ✅ Checklist

- [ ] Proje çalışıyor (`npm run dev`)
- [ ] Restoran paneli açık ve giriş yapıldı
- [ ] Console açık (F12)
- [ ] Test paneli açık
- [ ] "Mesaj Gönder" tıklandı
- [ ] Form otomatik doldu
- [ ] "✅ Eklentiden Veri Çekildi" mesajı görüldü
- [ ] Console'da loglar görüldü
- [ ] Sipariş kaydedildi
- [ ] Koordinatlar veritabanına kaydedildi

---

**Terminale:** sinyal alındı, formlar doluyor ✅
