# 🔗 Yan Ürün (Cross-Sell) Özelliği Kullanım Kılavuzu

## ✅ Özellik Durumu: HAZIR

Yan ürün özelliği tamamen uygulanmış ve kullanıma hazır durumda!

## 📋 Özellik Özeti

Restoran sahipleri, ürünlerinin yanında "iyi gider" dedikleri diğer ürünleri (içecekler, mezeler, tatlılar vb.) tanımlayabilirler. Müşteri bir ürünü sepete eklediğinde, bu yan ürünler öneri olarak gösterilir.

## 🗄️ Veritabanı Kurulumu

### Adım 1: Migration'ı Çalıştırın

Supabase Dashboard'a gidin ve SQL Editor'de şu dosyayı çalıştırın:

```sql
-- database/add_product_upsells.sql içeriği

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS upsell_product_ids TEXT[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_products_upsell_ids ON products USING GIN (upsell_product_ids);
```

**Alternatif:** Supabase CLI kullanarak:
```bash
# Eğer Supabase CLI kuruluysa
supabase db push
```

### Adım 2: Kontrol Edin

SQL Editor'de şu sorguyu çalıştırarak sütunun eklendiğini doğrulayın:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'products' 
AND column_name = 'upsell_product_ids';
```

Sonuç:
```
column_name         | data_type
--------------------+-----------
upsell_product_ids  | ARRAY
```

## 🎨 Kullanıcı Arayüzü

### Restoran Paneli (Restoranım Sekmesi)

1. **Menü & Stok** sekmesine gidin
2. Her ürün kartında **"🔗 Yan Ürünler"** butonu görünür
3. Butona tıklayarak yan ürün yönetim modalını açın

### Yan Ürün Yönetim Modalı

Modal içinde:
- ✅ Restoranın tüm diğer ürünleri listelenir
- ✅ Checkbox ile çoklu seçim yapılabilir
- ✅ Seçilen ürün sayısı gösterilir
- ✅ "Tümünü Temizle" butonu ile hızlı temizleme
- ✅ Ürün görselleri, isimleri ve fiyatları görünür
- ✅ Seçili ürünler mor renkte vurgulanır

## 🔧 Teknik Detaylar

### Veritabanı Yapısı

```typescript
interface Product {
  id: string
  name: string
  description?: string
  price: number
  category_id: string
  image_url?: string
  is_available: boolean
  display_order: number
  upsell_product_ids?: string[]  // 👈 Yan ürün ID'leri
}
```

### Örnek Veri

```sql
-- Burger için içecek ve patates öner
UPDATE products 
SET upsell_product_ids = ARRAY['cola-id', 'fanta-id', 'patates-id'] 
WHERE id = 'burger-id';

-- Sorgu
SELECT name, upsell_product_ids 
FROM products 
WHERE id = 'burger-id';
```

Sonuç:
```
name          | upsell_product_ids
--------------+-------------------
Öküz Burger   | {cola-id, fanta-id, patates-id}
```

## 🚀 Kullanım Senaryosu

### Restoran Sahibi Perspektifi

1. **Burger ürününü düzenle**
   - "🔗 Yan Ürünler" butonuna tıkla

2. **Yan ürünleri seç**
   - ✅ Kola (5₺)
   - ✅ Fanta (5₺)
   - ✅ Patates Kızartması (15₺)
   - ✅ Soğan Halkası (12₺)

3. **Kaydet**
   - "Kaydet" butonuna tıkla
   - "✅ Başarıyla güncellendi!" mesajı görünür

### Müşteri Perspektifi (Gelecek Özellik)

Müşteri "Öküz Burger"i sepete eklediğinde:

```
🍔 Öküz Burger sepete eklendi!

💡 Bunları da denemek ister misiniz?
┌─────────────────────────────┐
│ 🥤 Kola              5.00 ₺ │ [Ekle]
│ 🥤 Fanta             5.00 ₺ │ [Ekle]
│ 🍟 Patates Kızartması 15.00 ₺│ [Ekle]
│ 🧅 Soğan Halkası     12.00 ₺ │ [Ekle]
└─────────────────────────────┘
```

## 📊 Avantajlar

### İş Açısından
- 📈 Ortalama sepet değerini artırır
- 💰 Ek satış fırsatları yaratır
- 🎯 Müşteri deneyimini iyileştirir
- 🔄 Stok devir hızını artırır

### Teknik Açısından
- ⚡ Performanslı (GIN index ile)
- 🔒 Güvenli (CASCADE delete)
- 🎨 Kullanıcı dostu arayüz
- 📱 Responsive tasarım

## 🧪 Test Senaryoları

### Test 1: Yan Ürün Ekleme
1. Restoran paneline giriş yap
2. "Menü & Stok" sekmesine git
3. Bir ürünün "🔗 Yan Ürünler" butonuna tıkla
4. 2-3 ürün seç
5. "Kaydet" butonuna tıkla
6. Başarı mesajını doğrula

### Test 2: Yan Ürün Güncelleme
1. Daha önce yan ürün eklenmiş bir ürünü aç
2. Modalda seçili ürünlerin işaretli olduğunu doğrula
3. Yeni ürünler ekle veya mevcut seçimleri kaldır
4. Kaydet ve değişiklikleri doğrula

### Test 3: Yan Ürün Temizleme
1. Yan ürünleri olan bir ürünü aç
2. "Tümünü Temizle" butonuna tıkla
3. Tüm seçimlerin kaldırıldığını doğrula
4. Kaydet

## 🐛 Sorun Giderme

### Sorun: "upsell_product_ids" sütunu bulunamadı

**Çözüm:** Migration dosyasını çalıştırın:
```sql
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS upsell_product_ids TEXT[] DEFAULT '{}';
```

### Sorun: Yan ürünler kaydedilmiyor

**Kontrol Listesi:**
1. ✅ Migration çalıştırıldı mı?
2. ✅ Restoran ID doğru mu?
3. ✅ Ürün ID'leri geçerli mi?
4. ✅ Browser console'da hata var mı?

### Sorun: Modal açılmıyor

**Çözüm:** Browser console'u kontrol edin:
```javascript
// Console'da şunu deneyin
console.log('UpsellModal loaded:', typeof UpsellModal)
```

## 📝 Kod Örnekleri

### Yan Ürünleri Kaydetme

```typescript
const handleSave = async () => {
  const { error } = await supabase
    .from('products')
    .update({ upsell_product_ids: selectedUpsells })
    .eq('id', product.id)

  if (error) throw error
  
  // Başarı mesajı göster
  onSuccess()
}
```

### Yan Ürünleri Getirme

```typescript
const { data: product } = await supabase
  .from('products')
  .select('*, upsell_product_ids')
  .eq('id', productId)
  .single()

// Yan ürün detaylarını getir
if (product.upsell_product_ids?.length > 0) {
  const { data: upsellProducts } = await supabase
    .from('products')
    .select('*')
    .in('id', product.upsell_product_ids)
}
```

## 🎯 Gelecek İyileştirmeler

- [ ] Müşteri sepet sayfasında yan ürün önerileri gösterme
- [ ] Yan ürün sıralama (display_order)
- [ ] Yan ürün istatistikleri (kaç kez önerildi, kaç kez eklendi)
- [ ] Otomatik yan ürün önerileri (AI tabanlı)
- [ ] Yan ürün grupları (combo menüler)

## 📞 Destek

Herhangi bir sorun yaşarsanız:
1. Bu dokümandaki sorun giderme bölümünü kontrol edin
2. Browser console'daki hataları inceleyin
3. Supabase Dashboard'da SQL sorgularını test edin

---

**Son Güncelleme:** 2024
**Versiyon:** 1.0.0
**Durum:** ✅ Üretim Hazır
