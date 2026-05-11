# 🎯 RESTORAN ÖDEME MODALINDA NET HAKEDİŞ FIX'İ

## 📋 PROBLEM
Restoran ödeme modalı **YANLIŞ MATEMATİK** kullanıyordu:
- ❌ Restorana **brüt ciro** (29.550 TL) ödemeye çalışıyordu
- ❌ Kurye masrafı düşülmüyordu
- ❌ "Yapılan Ödemeler" kutusu gereksiz kalabalık yaratıyordu
- ❌ Modal kendi verisini çekmeye çalışıyordu (TÜM ZAMANLAR mantığı)

**DOĞRU MANTIK:** Trendyol/Yemeksepeti gibi:
```
NET HAKEDİŞ = Toplam Ciro - Kurye Paket Masrafı
```

## ✅ ÇÖZÜM

### 1. VERİ AKIŞI DEĞİŞTİRİLDİ
**Detaylı Rapor → Ödeme Modalı** prop akışı kuruldu:

```typescript
// RestaurantDetailModal.tsx
const netPayment = totalRevenue - totalDebt  // NET hesaplama
onPaymentClick(netPayment)  // NET tutarı gönder

// AdminModals.tsx
onPaymentClick={(netAmount) => {
  restaurantModal.setNetAmountToPay(netAmount)  // State'e kaydet
  restaurantModal.setShowRestaurantPaymentModal(true)
}}

// RestaurantPaymentModal.tsx
netAmountToPay: number  // Prop olarak al
```

### 2. MODAL SADELEŞTİRİLDİ
**Öncesi:** 3'lü kart sistemi (Toplam Hakediş, Yapılan Ödemeler, Güncel Bakiye)
**Sonrası:** TEK DEVASA KART

```tsx
{/* 🎯 TEK DEVASA KART: RESTORANA ÖDENECEK NET TUTAR */}
<div className="bg-gradient-to-br from-emerald-900/40 to-emerald-950/40 p-8 rounded-2xl border-2 border-emerald-500/30">
  <div className="text-6xl font-black text-emerald-300">
    {grandTotal.toFixed(2)}₺
  </div>
  <div className="text-emerald-400/60 text-xs">
    Kurye paket masrafları düşüldükten sonra kalan net hakediş
  </div>
</div>
```

### 3. GEREKSIZ VERİ ÇEKİMİ KALDIRILDI
**Öncesi:**
- Modal açıldığında Supabase'den TÜM ZAMANLAR verisi çekiyordu
- `useEffect` ile `fetchAllTimeData()` çağrılıyordu
- Loading state gösteriyordu

**Sonrası:**
- Modal sadece prop'tan gelen `netAmountToPay` değerini kullanır
- Veri çekimi YOK
- Anında açılır

### 4. INPUT ÖZGÜRLÜĞÜ KORUNDU
```typescript
// Boş string'e izin ver
const inputValue = restaurantPaymentAmount

// MAX butonu NET tutarı yazar
const handleMaxClick = () => {
  setRestaurantPaymentAmount(grandTotal.toFixed(2))
}

// Validation sadece buton seviyesinde
const isValidAmount = restaurantPaymentAmount && 
                      restaurantPaymentAmount.trim() !== '' && 
                      parseFloat(restaurantPaymentAmount) > 0
```

## 📊 MATEMATİK AKIŞI

### Detaylı Rapor Ekranı (RestaurantDetailModal)
```typescript
const totalRevenue = orders.reduce((sum, o) => sum + (o.amount || 0), 0)  // 29.550 TL
const packageFee = restaurant.package_fee || 100  // 100 TL
const totalDebt = orders.reduce((sum, pkg) => {
  const price = pkg.applied_price ?? packageFee
  return sum + price
}, 0)  // 9.790 TL (97 paket × 100₺)
const netPayment = totalRevenue - totalDebt  // 19.760 TL ✅
```

### Ödeme Modalı (RestaurantPaymentModal)
```typescript
const netAmountToPay = 19.760  // Prop'tan gelir
const totalOldDebt = restaurantDebts.reduce(...)  // Eski borçlar
const grandTotal = netAmountToPay + totalOldDebt  // Toplam ödenecek
```

## 🎨 UI DEĞİŞİKLİKLERİ

### Öncesi (3'lü Kart)
```
┌─────────────────┬─────────────────┬─────────────────┐
│ TOPLAM HAKEDİŞ  │ YAPILAN ÖDEMELER│ GÜNCEL BAKİYE   │
│   29.550₺       │     0.00₺       │   29.550₺       │
└─────────────────┴─────────────────┴─────────────────┘
```

### Sonrası (Tek Devasa Kart)
```
┌───────────────────────────────────────────────────┐
│                                                   │
│     RESTORANA ÖDENECEK NET TUTAR                  │
│                                                   │
│              19.760₺                              │
│                                                   │
│  Kurye paket masrafları düşüldükten sonra         │
│  kalan net hakediş                                │
│                                                   │
└───────────────────────────────────────────────────┘
```

## 📁 DEĞİŞEN DOSYALAR

1. **src/app/admin/components/modals/RestaurantDetailModal.tsx**
   - `onPaymentClick` prop'u `(netAmount: number) => void` olarak güncellendi
   - Butona tıklandığında `netPayment` değeri gönderiliyor

2. **src/app/admin/hooks/useAdminRestaurantModal.ts**
   - `netAmountToPay` state'i eklendi
   - `setNetAmountToPay` fonksiyonu export edildi

3. **src/app/admin/AdminModals.tsx**
   - `onPaymentClick` callback'i güncellendi (net tutarı state'e kaydediyor)
   - `RestaurantPaymentModal`'a `netAmountToPay` prop'u eklendi
   - Gereksiz prop'lar kaldırıldı (`selectedRestaurantOrders`, `restaurantStartDate`, `restaurantEndDate`)

4. **src/app/admin/components/modals/RestaurantPaymentModal.tsx**
   - TAMAMEN YENİDEN YAZILDI
   - 3'lü kart → Tek devasa kart
   - Supabase veri çekimi KALDIRILDI
   - `netAmountToPay` prop'u eklendi
   - Loading state sadece `loadingDebts` için

## ✅ TEST SENARYOSU

1. Admin paneline gir
2. Bir restoranın "Detaylı Rapor"unu aç
3. Ekranda şunları gör:
   - **Toplam Ciro:** 29.550₺
   - **Paket Masrafı:** 9.790₺ (97 paket × 100₺)
   - **Restorana Ödenecek Net:** 19.760₺ ✅
4. "💰 Hesap Öde" butonuna bas
5. Modal açılır, ekranda:
   - **TEK DEVASA KART:** 19.760₺ (NET TUTAR) ✅
   - "Kurye paket masrafları düşüldükten sonra..." notu
6. Input boş, MAX butonuna bas → 19.760 yazar
7. Kısmi ödeme (örn: 5000) gir → "EKSİK ÖDEME 14.760₺" uyarısı
8. Tam ödeme (19.760) gir → "✓ TAM ÖDEME" onayı

## 🚀 DEPLOY DURUMU
- ✅ Build başarılı
- ⏳ Test bekliyor
- ⏳ Kullanıcı onayı bekliyor

## 🔴 KIRMIZI ÇİZGİ
**Detaylı Rapor'da NET TUTAR 19.760₺ ise, Ödeme Modalı'nda da 19.760₺ göreceksin.**
**Brüt ciro (29.550₺) asla gösterilmeyecek!**
