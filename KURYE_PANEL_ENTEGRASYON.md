# 🔧 Kurye Paneli Entegrasyonu

## Mevcut Stats Kutularını Değiştir

### Önceki Kod (YANLIŞ - Ham Toplam)

```typescript
{/* Özet Bilgiler - Kompakt Grid */}
{filteredPackages.length > 0 && (
  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
    <div className="grid grid-cols-3 gap-2">
      {/* Nakit */}
      <div className="bg-slate-800/50 px-2 py-2 rounded-lg">
        <p className="text-[10px] text-slate-400 mb-1">💵 Nakit</p>
        <p className="text-base font-bold text-green-400">
          {filteredPackages.filter(p => p.payment_method === 'cash').reduce((sum, pkg) => sum + (pkg.amount || 0), 0).toFixed(0)}₺
        </p>
      </div>

      {/* Kart */}
      <div className="bg-slate-800/50 px-2 py-2 rounded-lg">
        <p className="text-[10px] text-slate-400 mb-1">💳 Kart</p>
        <p className="text-base font-bold text-blue-400">
          {filteredPackages.filter(p => p.payment_method === 'card').reduce((sum, pkg) => sum + (pkg.amount || 0), 0).toFixed(0)}₺
        </p>
      </div>

      {/* IBAN */}
      <div className="bg-slate-800/50 px-2 py-2 rounded-lg">
        <p className="text-[10px] text-slate-400 mb-1">🏦 IBAN</p>
        <p className="text-base font-bold text-orange-400">
          {filteredPackages.filter(p => p.payment_method === 'iban').reduce((sum, pkg) => sum + (pkg.amount || 0), 0).toFixed(0)}₺
        </p>
      </div>

      {/* Seçili Aralık - 2 kolon */}
      <div className="bg-slate-800/50 px-2 py-2 rounded-lg col-span-2">
        <p className="text-[10px] text-slate-400 mb-1">Seçili Aralık Toplam</p>
        <p className="text-base font-bold text-purple-400">
          {filteredPackages.reduce((sum, pkg) => sum + (pkg.amount || 0), 0).toFixed(2)}₺
        </p>
      </div>
    </div>
  </div>
)}
```

### Yeni Kod (DOĞRU - Kalan Borç ile)

```typescript
import { CourierEarningsStats } from '@/components/CourierEarningsStats'

{/* Özet Bilgiler - Realtime Kalan Borç ile */}
{selectedCourierId && startDate && endDate && (
  <CourierEarningsStats
    courierId={selectedCourierId}
    startDate={startDate}
    endDate={endDate}
  />
)}
```

## Tam Entegrasyon Örneği

### src/app/kurye/page.tsx

```typescript
'use client'

import { useState, useEffect } from 'react'
import { CourierEarningsStats } from '@/components/CourierEarningsStats'

export default function KuryePage() {
  const [selectedCourierId, setSelectedCourierId] = useState<string | null>(null)
  const [startDate, setStartDate] = useState(() => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(() => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  })

  useEffect(() => {
    // Giriş yapan kuryenin ID'sini al
    const courierId = localStorage.getItem('kurye_logged_courier_id')
    setSelectedCourierId(courierId)
  }, [])

  return (
    <div>
      {/* Kazançlar Sekmesi */}
      {activeTab === 'earnings' && (
        <div className="space-y-2 sm:space-y-3">
          {/* Tarih Seçici */}
          <div className="bg-slate-900 p-3 sm:p-4 rounded-xl border border-slate-800">
            <h3 className="text-sm font-bold text-white mb-3 text-center">Tarih Aralığı Seçin</h3>
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="text-xs text-slate-400 mb-1 block">Başlangıç</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-2 py-1.5 bg-slate-800 border border-slate-700 rounded text-xs text-white focus:border-blue-500 outline-none"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-slate-400 mb-1 block">Bitiş</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-2 py-1.5 bg-slate-800 border border-slate-700 rounded text-xs text-white focus:border-blue-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* YENİ: Realtime Stats Komponenti */}
          {selectedCourierId && (
            <CourierEarningsStats
              courierId={selectedCourierId}
              startDate={startDate}
              endDate={endDate}
            />
          )}

          {/* Paket Listesi devam eder... */}
        </div>
      )}
    </div>
  )
}
```

## Admin Paneli Entegrasyonu

### Eski Modal Yerine Yeni Modal Kullan

```typescript
import { EndOfDayModalNew } from '@/app/admin/components/modals/EndOfDayModalNew'

// State
const [showEndOfDayModal, setShowEndOfDayModal] = useState(false)
const [selectedCourier, setSelectedCourier] = useState<Courier | null>(null)
const [courierStartDate, setCourierStartDate] = useState('')
const [courierEndDate, setCourierEndDate] = useState('')

// Modal'ı aç
const handleOpenEndOfDay = (courier: Courier) => {
  setSelectedCourier(courier)
  setShowEndOfDayModal(true)
}

// Render
{showEndOfDayModal && selectedCourier && (
  <EndOfDayModalNew
    show={showEndOfDayModal}
    onClose={() => setShowEndOfDayModal(false)}
    courier={selectedCourier}
    startDate={courierStartDate}
    endDate={courierEndDate}
    onSuccess={() => {
      // Kurye listesini yenile
      fetchCouriers()
      // veya
      fetchCourierOrders(selectedCourier.id)
    }}
  />
)}
```

## Test Adımları

### 1. Kurye Panelinde Test

1. Kurye paneline giriş yap
2. "Kazançlar" sekmesine git
3. Tarih aralığı seç
4. Stats kutularını gör:
   - ✅ Nakit: 7475₺ (değişmez)
   - ✅ Kart: 1879₺ (değişmez)
   - ✅ IBAN: 0₺ (değişmez)
   - ✅ Kalan Borç: 15379₺ (başlangıç)

### 2. Admin Panelinde Ödeme Yap

1. Admin paneline giriş yap
2. Kurye detayına git
3. "Gün Sonu Al" butonuna tıkla
4. Tutar gir: 10000₺
5. "Mutabakatı Kaydet" butonuna bas
6. ✅ Modal'daki "Kalan Borç" anında 5379₺'ye düşmeli

### 3. Kurye Panelinde Realtime Kontrol

1. Kurye paneline dön (sayfa yenileme YOK!)
2. ✅ "Kalan Borç" otomatik olarak 5379₺'ye düşmeli
3. ✅ Nakit/Kart/IBAN değerleri değişmemeli

### 4. İkinci Ödeme

1. Admin tekrar "Gün Sonu Al" yap
2. Tutar gir: 5379₺
3. Kaydet
4. ✅ Kurye panelinde "Kalan Borç: 0₺" görünmeli
5. ✅ "✅ Hesap kapatıldı" mesajı görünmeli

## Sorun Giderme

### Realtime Çalışmıyor

Browser console'da kontrol et:

```javascript
// Realtime bağlantı durumu
console.log('📡 Realtime subscription status:', status)

// Eğer "SUBSCRIPTION_ERROR" görüyorsan:
// 1. Supabase Dashboard > Database > Replication kontrol et
// 2. courier_settlements tablosu realtime için aktif mi?
```

SQL ile kontrol:

```sql
SELECT * FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename = 'courier_settlements';
```

Yoksa ekle:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE courier_settlements;
```

### Polling Fallback Aktif mi?

Console'da şunu görmelisin:

```
⚠️ Realtime çalışmıyor, polling fallback aktif
🔄 Polling: Kalan borç kontrol ediliyor...
```

Bu durumda her 5 saniyede bir otomatik güncelleme yapılır.

### State Güncellenmiyor

Admin modal'ında `onSuccess` callback'inin çağrıldığından emin ol:

```typescript
onSuccess={() => {
  console.log('✅ Gün sonu kaydedildi, liste yenileniyor...')
  fetchCourierOrders(selectedCourier.id)
}}
```

---

**Hazırlayan:** Kiro AI Assistant  
**Tarih:** 2024  
**Durum:** ✅ Entegrasyon Hazır
