# ✅ Minimum Sepet Tutarı Özelliği - Tamamlandı

## 🎯 Özellik Özeti

Restoran sahipleri artık "Restoranım" sekmesinden minimum sepet tutarını belirleyebilir. Bu tutar müşteri panelinde sipariş verirken kontrol edilir.

---

## 📋 Yapılan Değişiklikler

### 1. Veritabanı ✅
- `restaurants` tablosunda `minimum_order_value` sütunu zaten mevcut
- Tip: `DECIMAL(10, 2)`
- Varsayılan: `0` veya `300.00` (migration'a göre)

### 2. Restoran Paneli UI ✅
**Dosya:** `src/app/restoran/restoranim/page.tsx`

**Eklenen Özellikler:**
- ✅ "Minimum Sepet Tutarı (₺)" input alanı
- ✅ Sayısal input (step: 0.01, min: 0)
- ✅ Placeholder: "Örn: 50.00"
- ✅ Açıklama metni: "Müşterinin sipariş verebilmesi için gereken minimum tutar"
- ✅ Mevcut tasarım diliyle uyumlu
- ✅ Validasyon (negatif değer kontrolü)
- ✅ Veritabanına kaydetme

### 3. Interface Güncellemeleri ✅
```typescript
interface Restaurant {
  id: string
  name: string
  description?: string
  working_hours?: string
  cover_image_url?: string
  logo_url?: string
  minimum_order_value?: number  // 👈 Eklendi
}
```

---

## 🎨 UI Yerleşimi

```
┌─────────────────────────────────────────────────────────┐
│  🏪 Restoranım                                          │
│  Dijital varlıklarınızı tek yerden yönetin             │
├─────────────────────────────────────────────────────────┤
│  [🎨 Mağaza Kimliği] [🍽️ Menü & Stok] [⭐ Yorumlar]   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Restoran Durumu                                        │
│  🟢 Restoran Şuan Siparişe Açık        [AÇIK/KAPALI]  │
│                                                         │
│  Kapak Fotoğrafı (1200x400 önerilir)                  │
│  [Yükleme alanı]                                       │
│                                                         │
│  Logo (400x400 önerilir)                               │
│  [Yükleme alanı]                                       │
│                                                         │
│  Restoran Adı                                          │
│  [Öküz Burger                                    ]     │
│                                                         │
│  Açıklama                                              │
│  [Restoranınızı tanıtın...                      ]     │
│                                                         │
│  Çalışma Saatleri                                      │
│  [09:00 - 23:00                                  ]     │
│                                                         │
│  Minimum Sepet Tutarı (₺)                    👈 YENİ   │
│  [50.00                                          ]     │
│  Müşterinin sipariş verebilmesi için gereken           │
│  minimum tutar                                         │
│                                                         │
│  [💾 Değişiklikleri Kaydet]                           │
└─────────────────────────────────────────────────────────┘
```

---

## 🔧 Teknik Detaylar

### Kaydetme Fonksiyonu

```typescript
const saveBranding = async () => {
  // Validasyon
  const minimumOrderValue = parseFloat(brandingForm.minimum_order_value)
  if (isNaN(minimumOrderValue) || minimumOrderValue < 0) {
    setErrorMessage('❌ Geçerli bir minimum sepet tutarı girin')
    return
  }

  // Veritabanına kaydet
  const { error } = await supabase
    .from('restaurants')
    .update({
      name: brandingForm.name,
      description: brandingForm.description,
      working_hours: brandingForm.working_hours,
      minimum_order_value: minimumOrderValue,  // 👈 Kaydediliyor
      cover_image_url: coverUrl,
      logo_url: logoUrl
    })
    .eq('id', restaurantId)
}
```

### Veri Yükleme

```typescript
const loadRestaurantData = async () => {
  const { data: restaurantData } = await supabase
    .from('restaurants')
    .select('*')
    .eq('id', restaurantId)
    .single()

  setBrandingForm({
    name: restaurantData.name || '',
    description: restaurantData.description || '',
    working_hours: restaurantData.working_hours || '',
    minimum_order_value: restaurantData.minimum_order_value?.toString() || '0'
  })
}
```

---

## 🧪 Test Senaryoları

### Test 1: Minimum Sepet Tutarı Güncelleme
1. Restoran paneline giriş yap (`/restoran`)
2. "Restoranım" sekmesine git
3. "Minimum Sepet Tutarı" alanına `50` yaz
4. "Değişiklikleri Kaydet" butonuna tıkla
5. ✅ Başarı mesajını doğrula
6. Sayfayı yenile
7. ✅ Değerin `50` olarak kaldığını kontrol et

### Test 2: Negatif Değer Kontrolü
1. "Minimum Sepet Tutarı" alanına `-10` yaz
2. "Değişiklikleri Kaydet" butonuna tıkla
3. ✅ Hata mesajı gösterilmeli: "❌ Geçerli bir minimum sepet tutarı girin"

### Test 3: Ondalıklı Değer
1. "Minimum Sepet Tutarı" alanına `49.99` yaz
2. "Değişiklikleri Kaydet" butonuna tıkla
3. ✅ Başarıyla kaydedilmeli
4. Veritabanında `49.99` olarak görünmeli

### Test 4: Sıfır Değer
1. "Minimum Sepet Tutarı" alanına `0` yaz
2. "Değişiklikleri Kaydet" butonuna tıkla
3. ✅ Başarıyla kaydedilmeli (minimum yok demek)

---

## 📊 Veritabanı Kontrolü

### Mevcut Değeri Görüntüleme

```sql
SELECT id, name, minimum_order_value 
FROM restaurants 
WHERE id = 'your-restaurant-id';
```

### Manuel Güncelleme (Gerekirse)

```sql
UPDATE restaurants 
SET minimum_order_value = 50.00 
WHERE id = 'your-restaurant-id';
```

### Tüm Restoranların Minimum Tutarları

```sql
SELECT name, minimum_order_value 
FROM restaurants 
ORDER BY minimum_order_value DESC;
```

---

## 🎯 Müşteri Panelinde Kullanım

Müşteri panelinde sipariş verirken bu değer kontrol edilmelidir:

```typescript
// Müşteri panelinde sepet kontrolü
const checkMinimumOrder = (cartTotal: number, restaurantId: string) => {
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('minimum_order_value')
    .eq('id', restaurantId)
    .single()

  if (cartTotal < restaurant.minimum_order_value) {
    alert(`Minimum sepet tutarı: ${restaurant.minimum_order_value} ₺`)
    return false
  }
  
  return true
}
```

---

## 💡 Kullanım Örnekleri

### Örnek 1: Fast Food Restoranı
- Minimum Sepet Tutarı: `30 ₺`
- Mantık: Küçük siparişlerde kar marjı düşük

### Örnek 2: Premium Restoran
- Minimum Sepet Tutarı: `100 ₺`
- Mantık: Kaliteli hizmet, yüksek maliyet

### Örnek 3: Minimum Yok
- Minimum Sepet Tutarı: `0 ₺`
- Mantık: Her sipariş kabul edilir

---

## ✅ Tamamlanan Özellikler

- [x] Veritabanı sütunu mevcut
- [x] Restoran paneli UI eklendi
- [x] Input validasyonu
- [x] Veritabanına kaydetme
- [x] Veri yükleme
- [x] Hata mesajları
- [x] Başarı mesajları
- [x] Tasarım uyumu
- [x] TypeScript tipleri
- [ ] Müşteri paneli entegrasyonu (Ayrı proje)

---

## 🚀 Sonraki Adımlar

### Müşteri Panelinde (Ayrı Proje)
1. Sepet toplamını hesapla
2. Restoran minimum tutarını çek
3. Sipariş vermeden önce kontrol et
4. Yetersiz tutar uyarısı göster
5. "Sipariş Ver" butonunu devre dışı bırak

### Örnek Uyarı Mesajı
```
⚠️ Minimum Sepet Tutarı: 50.00 ₺
Sepetiniz: 35.00 ₺
Eksik: 15.00 ₺

Sipariş verebilmek için sepetinize 
daha fazla ürün eklemelisiniz.
```

---

## 📝 Notlar

- Minimum sepet tutarı **sadece ürün toplamını** içerir (teslimat ücreti hariç)
- Restoran istediği zaman bu değeri değiştirebilir
- Değişiklik anında müşteri paneline yansır
- Negatif değer kabul edilmez
- Ondalıklı değerler desteklenir (örn: 49.99)
- Sıfır değer = minimum yok

---

**Hazırlayan:** Kiro AI Assistant  
**Tarih:** 2024  
**Durum:** ✅ Tamamlandı ve Test Edilmeye Hazır
