# SİPARİŞ İPTAL (CANCELLATION) SİSTEMİ

## Özet
Admin ve Restoran panellerine sipariş iptal yeteneği eklendi. İptal edilen siparişler "hayalet mod"da geçmiş kayıtlarda görünüyor.

---

## AŞAMA 1: VERİTABANI & TİPLER ✅

### SQL Güncellemesi
**Dosya:** `database_add_cancellation.sql`

Eklenen kolonlar:
- `cancelled_at` (TIMESTAMP WITH TIME ZONE) - İptal zamanı
- `cancelled_by` (TEXT) - İptal eden ('admin' | 'restaurant')
- `cancellation_reason` (TEXT) - İptal nedeni

İndeksler:
- `idx_packages_cancelled_at` - İptal zamanı indeksi
- `idx_packages_status_cancelled` - İptal durumu indeksi

### TypeScript Interface Güncellemeleri
**Dosyalar:** `src/app/page.tsx`, `src/app/restoran/page.tsx`, `src/app/kurye/page.tsx`

```typescript
interface Package {
  // ... mevcut alanlar
  status: 'waiting' | 'assigned' | 'picking_up' | 'on_the_way' | 'delivered' | 'cancelled'
  cancelled_at?: string | null
  cancelled_by?: 'admin' | 'restaurant' | null
  cancellation_reason?: string | null
}
```

---

## AŞAMA 2: AKSİYON MEKANİZMASI ✅

### Admin Paneli (src/app/page.tsx)
**Fonksiyon:** `handleCancelOrder(packageId, packageInfo)`

Özellikler:
- `window.confirm` ile onay alır
- Status: 'cancelled'
- Cancelled_at: Şu anki zaman
- Cancelled_by: 'admin'
- Courier_id: NULL (Kuryeden düşürür)
- Paketi canlı listeden anında çıkarır
- Geçmiş siparişleri yeniler

### Restoran Paneli (src/app/restoran/page.tsx)
**Fonksiyon:** `handleCancelOrder(packageId, packageInfo)`

Özellikler:
- `window.confirm` ile onay alır
- Status: 'cancelled'
- Cancelled_at: Şu anki zaman
- Cancelled_by: 'restaurant'
- Courier_id: NULL (Kuryeden düşürür)
- Paketleri yeniler

---

## AŞAMA 3: GÖRSEL TEMSİL (Hayalet Modu) 🚧

### Canlı/Aktif Listeler
- ✅ İptal edilen siparişler ANINDA kaybolur
- ✅ `fetchPackages` iptal edilenleri hariç tutar: `.neq('status', 'cancelled')`

### Geçmiş Sekmesi
- ✅ `fetchDeliveredPackages` hem delivered hem cancelled çeker: `.in('status', ['delivered', 'cancelled'])`
- 🚧 UI'da hayalet görünüm henüz eklenmedi:
  - Opacity: 0.6
  - Arkaplan: bg-red-50 / dark:bg-red-900/10
  - Fiyat: line-through
  - Badge: 🚫 İPTAL EDİLDİ

**TODO:** Geçmiş siparişler tablosunda/kartlarında iptal edilenleri hayalet modda göster.

---

## AŞAMA 4: FİNANSAL GÜVENLİK ✅

### Kurye Kazançları
- ✅ Sadece `status === 'delivered'` olanlar hesaplanır
- ✅ İptal edilenler ASLA paraya dönüşmez

### Restoran/Genel Ciro
- ✅ Toplam tutar hesaplamalarında iptal edilenler hariç
- ✅ Borç hesaplamalarında sadece delivered paketler

---

## KULLANIM

### SQL Çalıştırma
```sql
-- database_add_cancellation.sql dosyasını Supabase'de çalıştır
```

### Admin Paneli - Sipariş İptal
1. Canlı Takip sekmesinde sipariş kartının SOL ÜST köşesine 3 nokta menüsü ekle
2. "🚫 Siparişi İptal Et" seçeneği
3. Onay sonrası sipariş iptal edilir

### Restoran Paneli - Sipariş İptal
1. Aktif Siparişler listesinde sipariş kartının SOL ÜST köşesine 3 nokta menüsü ekle
2. "🚫 Siparişi İptal Et" seçeneği
3. Onay sonrası sipariş iptal edilir

---

## KALAN İŞLER

### UI İyileştirmeleri
1. **3 Nokta Menüsü Ekle:**
   - Admin: Canlı sipariş kartlarına
   - Restoran: Aktif sipariş kartlarına
   - Icon: MoreVertical (⋮)
   - Dropdown: "🚫 Siparişi İptal Et"

2. **Hayalet Mod Görünümü:**
   - Geçmiş siparişlerde iptal edilenleri soluk göster
   - Opacity: 0.6
   - Arkaplan: Hafif kırmızı
   - Badge: "🚫 İPTAL EDİLDİ"
   - Fiyat: Üzeri çizili

3. **Kurye Paneli:**
   - İptal edilen siparişler kuryeden otomatik düşüyor
   - Geçmiş siparişlerde iptal edilenleri göster (hayalet mod)

---

## TEST SENARYOLARI

### Test 1: Admin İptal
1. Admin panelinde yeni sipariş oluştur
2. 3 nokta menüsünden "İptal Et"
3. Onay ver
4. Sipariş canlı listeden kaybolmalı
5. Geçmiş sekmesinde hayalet modda görünmeli

### Test 2: Restoran İptal
1. Restoran panelinde yeni sipariş oluştur
2. 3 nokta menüsünden "İptal Et"
3. Onay ver
4. Sipariş aktif listeden kaybolmalı

### Test 3: Finansal Güvenlik
1. Sipariş oluştur ve iptal et
2. Kurye kazanç raporunda görünmemeli
3. Restoran ciro hesabında olmamalı

### Test 4: Kuryeden Düşme
1. Kuryeye sipariş ata
2. Admin/Restoran iptal etsin
3. Kurye panelinde sipariş kaybolmalı
4. courier_id NULL olmalı

---

## DOSYA LİSTESİ

- ✅ `database_add_cancellation.sql` (Yeni)
- ✅ `src/app/page.tsx` (Güncellendi - Interface, handleCancelOrder, fetchPackages, fetchDeliveredPackages)
- ✅ `src/app/restoran/page.tsx` (Güncellendi - Interface, handleCancelOrder)
- ✅ `src/app/kurye/page.tsx` (Güncellendi - Interface)
- ✅ `SIPARIS_IPTAL_SISTEMI.md` (Bu dosya)

---

**Durum:** Altyapı tamamlandı, UI iyileştirmeleri bekleniyor
**Tarih:** 30 Ocak 2026
