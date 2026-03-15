# 📞 MANUEL SİPARİŞ GİRİŞ SİSTEMİ

## ✅ Yapılan İşlemler

### 1. Header Güncellemesi

**Yeni Buton Eklendi:**
- Konum: Sağ üst köşe, "📦 Siparişler" başlığının yanı
- Renk: Mavi gradient (`from-blue-600 to-blue-700`)
- İkon: Plus (+) ikonu
- Metin: "Yeni Sipariş"
- Hover efekti: Scale 1.05, koyu mavi gradient
- Shadow: `shadow-lg`

```tsx
<button className="bg-gradient-to-r from-blue-600 to-blue-700">
  <Plus size={20} />
  Yeni Sipariş
</button>
```

### 2. Sipariş Giriş Modal Tasarımı

**Modal Özellikleri:**
- Tam ekran overlay (siyah/70 opacity)
- Ortalanmış kart (max-width: 2xl)
- Framer-motion animasyonları
- Scroll edilebilir içerik (max-height: 90vh)
- Koyu tema (slate-900 arka plan)

**Form Alanları:**

#### 1. Müşteri Adı
```tsx
<input 
  type="text"
  placeholder="Ahmet Yılmaz"
  required
/>
```

#### 2. Müşteri Numarası
- Type: `tel`
- inputMode: `numeric`
- maxLength: 10
- Placeholder: "5551234567"
- Validasyon:
  - ✅ Sadece rakam
  - ✅ Başında 0 yok
  - ✅ 10 hane
  - ✅ 5 ile başlar
- Gerçek zamanlı hata mesajları

#### 3. Paket İçeriği
```tsx
<textarea 
  rows={3}
  placeholder="1x Baböküz Burger, 1x Pepsi, 1x Patates"
  required
/>
```

#### 4. Teslimat Adresi
```tsx
<textarea 
  rows={2}
  placeholder="Atatürk Cad. No:123 Daire:5 İlkadım/Samsun"
  required
/>
```

#### 5. Paket Tutarı
```tsx
<input 
  type="number"
  min="0"
  step="0.01"
  placeholder="150.00"
  required
/>
```

#### 6. Ödeme Türü Seçimi
**3 Buton Yan Yana:**
- 💳 **Kart** (Mavi) → `payment_method: 'card'`
- 💵 **Nakit** (Yeşil) → `payment_method: 'cash'`
- 🏦 **İban** (Mor) → `payment_method: 'iban'`

**Seçili Durum:**
- Renkli arka plan
- Beyaz metin
- Shadow-lg
- Scale: 1.05

**Seçili Olmayan:**
- Gri arka plan (slate-800)
- Gri metin (slate-400)
- Hover: slate-700

### 3. Veritabanı Entegrasyonu

**Sipariş Kaydı:**
```javascript
await supabase
  .from('packages')
  .insert([{
    restaurant_id: selectedRestaurantId, // ✅ Otomatik
    customer_name: manualOrder.customer_name,
    customer_phone: manualOrder.customer_phone,
    content: manualOrder.content,
    delivery_address: manualOrder.delivery_address,
    amount: parseFloat(manualOrder.amount),
    payment_method: manualOrder.payment_method, // card/cash/iban
    status: 'new_order', // ✅ Kesinlikle new_order
    order_number: `MG${Date.now()}`, // Otomatik
    platform: 'phone' // ✅ Telefon siparişi işareti
  }])
```

**Realtime Güncelleme:**
- Sipariş kaydedilir kaydedilmez
- Modal kapanır
- Form temizlenir
- "Yeni Siparişler" listesi otomatik güncellenir
- Supabase realtime subscription sayesinde anında görünür

### 4. Validasyon Kuralları

**Zorunlu Alanlar:**
- ✅ Müşteri Adı (boş olamaz)
- ✅ Müşteri Numarası (10 hane, 5 ile başlar, başında 0 yok)
- ✅ Paket İçeriği (boş olamaz)
- ✅ Teslimat Adresi (boş olamaz)
- ✅ Paket Tutarı (0'dan büyük olmalı)
- ✅ Ödeme Türü (varsayılan: nakit)

**Telefon Validasyonu:**
```javascript
const validatePhone = (phone: string): boolean => {
  if (!/^\d+$/.test(phone)) return false // Sadece rakam
  if (phone.startsWith('0')) return false // Başında 0 yok
  if (phone.length !== 10) return false // 10 hane
  if (!phone.startsWith('5')) return false // 5 ile başlar
  return true
}
```

**Tutar Validasyonu:**
```javascript
if (!amount || parseFloat(amount) <= 0) {
  alert('Geçerli bir tutar girin')
  return
}
```

### 5. Kullanıcı Deneyimi

**Loading Durumu:**
- Form submit edilirken tüm inputlar disabled
- "Siparişi Kaydet" butonu → "Kaydediliyor..." (spinner ile)
- Modal kapatma butonu disabled

**Başarı Akışı:**
```
Form Doldurulur
  ↓
"Siparişi Kaydet" Tıklanır
  ↓
Validasyon Geçer
  ↓
Supabase'e Kayıt
  ↓
Modal Kapanır
  ↓
Form Temizlenir
  ↓
Liste Otomatik Güncellenir (Realtime)
  ↓
Yeni Sipariş "Yeni Siparişler (1)" Bölümünde Görünür
```

**Hata Durumu:**
- Validasyon hatası → Alert mesajı
- Telefon hatası → Input altında kırmızı mesaj
- Supabase hatası → Alert ile detaylı hata

### 6. Sipariş Akış Entegrasyonu

**Manuel Siparişler:**
- ✅ `status: 'new_order'` ile başlar
- ✅ "Teslimata Hazır" butonuyla `ready` olur
- ✅ Kurye atandığında `assigned` olur
- ✅ `picking_up` → `on_the_way` → `delivered` aşamalarından geçer
- ✅ İptal edilebilir (`cancelled`)

**Platform Ayırımı:**
- Web siparişleri: `platform: 'web'`
- Telefon siparişleri: `platform: 'phone'` ✅

**İptal Edilen Siparişler:**
- ✅ `status: 'cancelled'` olanlar ciro hesaplarına dahil edilmez
- ✅ `cancelled_at` timestamp kaydedilir
- ✅ `cancelled_by: 'restaurant'` işaretlenir
- ✅ `cancellation_reason` kaydedilir

## 🎨 Tasarım Detayları

### Modal Animasyonları
```javascript
// Giriş
initial={{ opacity: 0, scale: 0.9 }}
animate={{ opacity: 1, scale: 1 }}

// Çıkış
exit={{ opacity: 0, scale: 0.9 }}
```

### Renk Paleti
- **Arka Plan:** slate-900
- **Input:** slate-800
- **Border:** slate-700
- **Focus:** blue-500
- **Hata:** red-500
- **Başarı:** green-600
- **Buton:** blue-600 gradient

### Responsive
- Modal: `max-w-2xl` (tablet/desktop)
- Mobil: `w-full p-4`
- Scroll: `max-h-[90vh] overflow-y-auto`

## 📋 Veritabanı Şeması

**packages Tablosu (Gerekli Sütunlar):**
```sql
restaurant_id UUID
customer_name TEXT
customer_phone TEXT
content TEXT
delivery_address TEXT
amount DECIMAL(10,2)
payment_method ENUM('cash', 'card', 'iban')
status ENUM('new_order', 'ready', 'assigned', ...)
order_number TEXT
platform TEXT
created_at TIMESTAMPTZ
```

## 🚀 Test Senaryosu

1. ✅ Restoran paneline gir
2. ✅ "Yeni Sipariş" butonuna tıkla
3. ✅ Formu doldur:
   - Müşteri Adı: "Ahmet Yılmaz"
   - Telefon: "5551234567"
   - İçerik: "1x Burger, 1x Kola"
   - Adres: "Test Mahallesi No:1"
   - Tutar: "150"
   - Ödeme: Nakit
4. ✅ "Siparişi Kaydet" tıkla
5. ✅ Modal kapansın
6. ✅ "Yeni Siparişler" listesinde görünsün
7. ✅ "Teslimata Hazır" butonuyla ilerlet
8. ✅ Kurye atasın
9. ✅ Teslim et

## 🎯 Sonuç

Manuel sipariş giriş sistemi tamamen operasyonel! Restoran artık:
- ✅ Telefonla aldığı siparişleri sisteme girebilir
- ✅ Hızlı ve kolay form (mutfağa hemen dönebilir)
- ✅ Tüm validasyonlar aktif
- ✅ Realtime güncelleme
- ✅ Kurye sistemiyle tam entegre
- ✅ İptal edilen siparişler cirodan hariç

Sistem sağlam, UX mükemmel, restoran mutlu! 📞✅
