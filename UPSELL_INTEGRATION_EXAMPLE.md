# 🔗 Yan Ürün Özelliği - Entegrasyon Örneği

## Müşteri Tarafında Kullanım

Yan ürün önerileri, müşteri bir ürünü sepete eklediğinde otomatik olarak gösterilir.

## Örnek Kullanım

### 1. UpsellSuggestions Komponenti Oluşturuldu

Dosya: `src/components/UpsellSuggestions.tsx`

Bu komponent:
- ✅ Ürünün yan ürünlerini otomatik olarak yükler
- ✅ Sadece stokta olan ürünleri gösterir
- ✅ Güzel bir modal ile önerileri sunar
- ✅ Tek tıkla sepete ekleme imkanı verir
- ✅ Responsive tasarım

### 2. Müşteri Menü Sayfasında Kullanım

Herhangi bir müşteri menü sayfasında şu şekilde kullanabilirsiniz:

```typescript
'use client'

import { useState } from 'react'
import { useCart } from '@/app/context/CartContext'
import { UpsellSuggestions } from '@/components/UpsellSuggestions'
import { Product } from '@/types/menu'

export default function MenuPage() {
  const { addToCart } = useCart()
  const [showUpsellModal, setShowUpsellModal] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)

  const handleAddToCart = (product: Product) => {
    // Ürünü sepete ekle
    addToCart(product, 1)
    
    // Yan ürün önerilerini göster
    setSelectedProduct(product)
    setShowUpsellModal(true)
  }

  return (
    <div>
      {/* Ürün listesi */}
      {products.map(product => (
        <div key={product.id}>
          <h3>{product.name}</h3>
          <p>{product.price} ₺</p>
          <button onClick={() => handleAddToCart(product)}>
            Sepete Ekle
          </button>
        </div>
      ))}

      {/* Yan ürün önerileri modal */}
      {showUpsellModal && selectedProduct && (
        <UpsellSuggestions
          product={selectedProduct}
          onClose={() => setShowUpsellModal(false)}
        />
      )}
    </div>
  )
}
```

### 3. Alternatif: Sepet Sayfasında Kullanım

Sepet sayfasında da yan ürün önerileri gösterilebilir:

```typescript
'use client'

import { useCart } from '@/app/context/CartContext'
import { UpsellSuggestions } from '@/components/UpsellSuggestions'

export default function CartPage() {
  const { cart } = useCart()
  const [showUpsellFor, setShowUpsellFor] = useState<Product | null>(null)

  return (
    <div>
      <h1>Sepetim</h1>
      
      {/* Sepetteki ürünler */}
      {cart.map(item => (
        <div key={item.product.id}>
          <h3>{item.product.name}</h3>
          <p>{item.quantity} x {item.product.price} ₺</p>
          
          {/* Yan ürün önerilerini göster butonu */}
          <button onClick={() => setShowUpsellFor(item.product)}>
            💡 Öneriler
          </button>
        </div>
      ))}

      {/* Yan ürün önerileri modal */}
      {showUpsellFor && (
        <UpsellSuggestions
          product={showUpsellFor}
          onClose={() => setShowUpsellFor(null)}
        />
      )}
    </div>
  )
}
```

## Özellikler

### Otomatik Yükleme
- Komponent mount olduğunda yan ürünler otomatik yüklenir
- Sadece stokta olan ürünler gösterilir
- Yan ürün yoksa modal gösterilmez

### Kullanıcı Deneyimi
- ✅ Animasyonlu modal açılışı
- ✅ Ürün görselleri ve açıklamaları
- ✅ Tek tıkla sepete ekleme
- ✅ Toast bildirimleri
- ✅ "Alışverişe Devam Et" butonu

### Responsive Tasarım
- Mobilde tek sütun
- Desktop'ta iki sütun grid
- Maksimum yükseklik ile scroll

## Veri Akışı

```
1. Müşteri ürünü sepete ekler
   ↓
2. addToCart() çağrılır
   ↓
3. UpsellSuggestions modal açılır
   ↓
4. product.upsell_product_ids kontrol edilir
   ↓
5. Yan ürünler Supabase'den çekilir
   ↓
6. Sadece is_available=true olanlar gösterilir
   ↓
7. Müşteri yan ürünleri sepete ekleyebilir
   ↓
8. Modal kapatılır
```

## Veritabanı Sorgusu

Komponent içinde kullanılan sorgu:

```typescript
const { data, error } = await supabase
  .from('products')
  .select('*')
  .in('id', product.upsell_product_ids)
  .eq('is_available', true)
```

Bu sorgu:
- Yan ürün ID'lerine göre ürünleri getirir
- Sadece stokta olanları filtreler
- Tüm ürün bilgilerini döndürür

## Performans Optimizasyonu

### 1. Lazy Loading
Modal sadece gerektiğinde açılır ve veri çekilir.

### 2. Caching
Aynı ürün için tekrar modal açılırsa, veriler cache'den gelir (React state).

### 3. Index Kullanımı
Veritabanında GIN index sayesinde hızlı sorgulama:

```sql
CREATE INDEX idx_products_upsell_ids 
ON products USING GIN (upsell_product_ids);
```

## Toast Bildirimleri

Komponent, ürün sepete eklendiğinde toast bildirimi gösterir:

```typescript
const event = new CustomEvent('show-toast', {
  detail: { 
    message: `✅ ${product.name} sepete eklendi!`, 
    type: 'success' 
  }
})
window.dispatchEvent(event)
```

Bu bildirimleri dinlemek için global bir toast handler ekleyebilirsiniz.

## Stil Özellikleri

- Dark mode uyumlu (slate renk paleti)
- Orange accent rengi (marka rengi)
- Purple vurgu (yan ürünler için)
- Framer Motion animasyonları
- Tailwind CSS utility classes

## Gelecek İyileştirmeler

- [ ] Yan ürün sıralama (popülerlik, fiyat)
- [ ] Yan ürün grupları (combo menüler)
- [ ] "Hepsini Ekle" butonu
- [ ] Yan ürün istatistikleri (kaç kez tıklandı)
- [ ] A/B testing için farklı gösterim stilleri
- [ ] Kişiselleştirilmiş öneriler (geçmiş siparişlere göre)

## Test Senaryoları

### Test 1: Yan Ürünlü Ürün
1. Yan ürünleri olan bir ürünü sepete ekle
2. Modal'ın açıldığını doğrula
3. Yan ürünlerin listelendiğini kontrol et
4. Bir yan ürünü sepete ekle
5. Toast bildirimini doğrula

### Test 2: Yan Ürünsüz Ürün
1. Yan ürünü olmayan bir ürünü sepete ekle
2. Modal'ın açılmadığını doğrula
3. Ürünün sepete eklendiğini kontrol et

### Test 3: Stokta Olmayan Yan Ürün
1. Yan ürünlerinden biri stokta olmayan bir ürünü sepete ekle
2. Modal'da sadece stokta olan yan ürünlerin gösterildiğini doğrula

### Test 4: Responsive Tasarım
1. Mobil cihazda modal'ı aç
2. Tek sütun grid'in gösterildiğini doğrula
3. Desktop'ta iki sütun grid'e geçişi kontrol et

## Sorun Giderme

### Modal açılmıyor
- Browser console'u kontrol edin
- `showUpsellModal` state'inin true olduğunu doğrulayın
- `selectedProduct` değerinin null olmadığını kontrol edin

### Yan ürünler yüklenmiyor
- Network tab'de Supabase sorgusunu kontrol edin
- `upsell_product_ids` sütununun dolu olduğunu doğrulayın
- Yan ürünlerin `is_available=true` olduğunu kontrol edin

### Sepete ekleme çalışmıyor
- `useCart` hook'unun doğru import edildiğini kontrol edin
- `CartProvider`'ın layout'ta tanımlı olduğunu doğrulayın
- Browser console'da hata mesajlarını inceleyin

---

**Hazırlayan:** Kiro AI Assistant
**Tarih:** 2024
**Versiyon:** 1.0.0
