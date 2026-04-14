# 🔧 Cari Hesap Mantığı Düzeltmesi (Global Running Balance Fix)

## ❌ Önceki Hatalı Mantık

Sistem, finansal hesaplamalarda `startDate` filtresi kullanıyordu. Bu, önceki ödemelerin "unutulmasına" neden oluyordu.

### Senaryo:
1. 10 Ocak'ta admin kurye ile mutabakat yapıyor → 5000₺ ödeme alıyor
2. 14 Ocak'ta admin tarih aralığını "14-31 Ocak" seçiyor
3. Sistem 10 Ocak'taki ödemeyi görmüyor (startDate=14 Ocak olduğu için)
4. Kurye aynı teslimatlar için tekrar ödeme yapmak zorunda kalıyor

## ✅ Yeni Doğru Mantık (Cari Hesap)

### 1. GÖRSEL FİLTRELEME (Nakit/Kart/IBAN Kutuları)
- Seçili tarih aralığındaki teslimatları gösterir
- `startDate` ve `endDate` kullanır
- Sadece bilgi amaçlıdır, finansal hesaplamada kullanılmaz

```typescript
// GÖRSEL - Tarih aralığına göre
const { data: packages } = await supabase
  .from('packages')
  .select('amount, payment_method')
  .eq('courier_id', courierId)
  .eq('status', 'delivered')
  .gte('delivered_at', `${startDate}T00:00:00`)  // ✅ startDate kullan
  .lte('delivered_at', `${endDate}T23:59:59`)    // ✅ endDate kullan
```

### 2. FİNANSAL HESAPLAMA (Kalan Borç)
- Kuryenin tüm geçmişini hesaplar
- SADECE `endDate` kullanır, `startDate` KULLANMAZ
- Cari hesap mantığı ile çalışır

```typescript
// FİNANSAL - Sadece endDate kullan!
// Toplam Borç
const { data: allPackages } = await supabase
  .from('packages')
  .select('amount')
  .eq('courier_id', courierId)
  .eq('status', 'delivered')
  .lte('delivered_at', `${endDate}T23:59:59`)  // ❌ startDate YOK!

// Toplam Ödeme
const { data: settlements } = await supabase
  .from('courier_settlements')
  .select('amount_paid')
  .eq('courier_id', courierId)
  .lte('created_at', `${endDate}T23:59:59`)    // ❌ startDate YOK!

// Kalan Borç
const remainingDebt = Math.max(0, totalOwed - totalPaid)
```

## 📊 Formül

```
Toplam Borç = SUM(packages.amount) WHERE delivered_at <= endDate
Toplam Ödeme = SUM(settlements.amount_paid) WHERE created_at <= endDate
Kalan Borç = MAX(0, Toplam Borç - Toplam Ödeme)
```

## 🎯 Neden Bu Çalışır?

### Senaryo Test:
1. **10 Ocak**: Kurye 5000₺'lik teslimat yapıyor
2. **10 Ocak**: Admin 5000₺ ödeme alıyor
3. **14 Ocak**: Admin "14-31 Ocak" aralığını seçiyor

### Hesaplama (endDate = 31 Ocak):
- Toplam Borç = 5000₺ (10 Ocak teslimatı dahil)
- Toplam Ödeme = 5000₺ (10 Ocak ödemesi dahil)
- Kalan Borç = MAX(0, 5000 - 5000) = 0₺ ✅

### Görsel Kutular (14-31 Ocak):
- Nakit: 0₺ (bu aralıkta teslimat yok)
- Kart: 0₺
- IBAN: 0₺
- Kalan Borç: 0₺ ✅ (Finansal hesaplama doğru!)

## 📁 Düzeltilen Dosyalar

### 1. `src/components/CourierEarningsStats.tsx`
- `calculateDeliveryTotals()`: Görsel değerler (tarih aralığı ile)
- `calculateLifetimeTotals()`: Finansal değerler (sadece endDate)
- `calculateRemainingDebt()`: İkisini birleştiren ana fonksiyon

### 2. `src/app/admin/components/modals/EndOfDayModalNew.tsx`
- `calculateTotals()`: Aynı mantık uygulandı
- Görsel kutular: Tarih aralığı ile
- Finansal hesaplama: Sadece endDate ile

## 🔄 Realtime Güncelleme

Her iki component de `courier_settlements` tablosunu dinliyor:

```typescript
supabase
  .channel('courier-settlements-changes')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'courier_settlements',
    filter: `courier_id=eq.${courierId}`
  }, (payload) => {
    // Kalan borcu yeniden hesapla
    calculateRemainingDebt()
  })
```

## ✅ Test Senaryoları

### Test 1: Tam Ödeme
- Kurye 5000₺ borçlu
- Admin 5000₺ alıyor
- Kalan Borç: 0₺ ✅

### Test 2: Eksik Ödeme
- Kurye 5000₺ borçlu
- Admin 3000₺ alıyor
- Kalan Borç: 2000₺ ✅

### Test 3: Fazla Ödeme (Bahşiş)
- Kurye 5000₺ borçlu
- Admin 5500₺ alıyor
- Kalan Borç: 0₺ (500₺ bahşiş) ✅

### Test 4: Önceki Ödeme Unutulmamalı
- 10 Ocak: 5000₺ teslimat + 5000₺ ödeme
- 14 Ocak: Admin "14-31 Ocak" seçiyor
- Kalan Borç: 0₺ (10 Ocak ödemesi sayılıyor) ✅

## 🎉 Sonuç

Artık sistem "Cari Hesap" mantığı ile çalışıyor. Kuryeler aynı teslimatlar için iki kez ödeme yapmak zorunda kalmayacak!
