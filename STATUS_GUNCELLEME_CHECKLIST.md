# ✅ Status Güncelleme Checklist

## 📋 Yapılması Gerekenler

### 1. Veritabanı (Supabase)
- [ ] SQL migration scriptini çalıştır (`database/migrations/001_update_status_system.sql`)
- [ ] Status dağılımını kontrol et
- [ ] Index'lerin oluştuğunu doğrula
- [ ] Default status'un `new_order` olduğunu kontrol et

### 2. Frontend Güncellemeleri

#### A. Admin Paneli
- [ ] `src/app/admin/` - Status badge'lerini güncelle
- [ ] `src/app/admin/components/LiveTrackingTab.tsx` - Yeni status'leri ekle
- [ ] `src/hooks/useAdminData.ts` - `waiting` → `new_order` değiştir
- [ ] Kurye atama sonrası status `assigned` olsun

#### B. Restoran Paneli
- [ ] `src/app/restoran/` - Status badge'lerini güncelle
- [ ] Yeni siparişler en üstte görünsün (status: `new_order`)
- [ ] Renk kodlarını uygula (mavi, mor, yeşil)

#### C. Kurye Uygulaması
- [ ] `src/app/kurye/page.tsx` - Status kontrollerini güncelle
- [ ] `waiting` referanslarını `new_order` yap
- [ ] Badge renklerini güncelle

#### D. Müşteri Takip
- [ ] `src/app/takip/` - Status gösterimini güncelle
- [ ] Renk kodlarını uygula

### 3. Helper Fonksiyonlar
- [x] `src/utils/statusHelpers.ts` oluşturuldu ✅
- [ ] Tüm dosyalarda import et ve kullan
- [ ] Eski status fonksiyonlarını kaldır

### 4. Types
- [x] `src/types/index.ts` güncellendi ✅
- [x] `src/utils/validation.ts` güncellendi ✅

### 5. Test
- [ ] Yeni sipariş oluştur → `new_order` olmalı
- [ ] Kurye ata → `assigned` olmalı
- [ ] Kurye kabul et → `picking_up` olmalı
- [ ] Teslim et → `delivered` olmalı
- [ ] Renk kodları doğru mu kontrol et

### 6. Build ve Deploy
- [ ] `npm run build` çalıştır
- [ ] Hata kontrolü yap
- [ ] `npx cap sync android` çalıştır
- [ ] AAB oluştur
- [ ] Deploy et

---

## 🔍 Aranacak ve Değiştirilecek Kelimeler

### Find & Replace

```bash
# 1. 'waiting' → 'new_order'
grep -r "status.*waiting" src/
grep -r "'waiting'" src/
grep -r '"waiting"' src/

# 2. 'pending' → 'new_order' (veya kaldır)
grep -r "status.*pending" src/
grep -r "'pending'" src/
grep -r '"pending"' src/

# 3. Status label'ları
grep -r "Beklemede" src/
grep -r "Bekliyor" src/
```

---

## 📊 Doğrulama Sorguları

### SQL
```sql
-- 1. Status dağılımı
SELECT status, COUNT(*) as count
FROM packages
GROUP BY status
ORDER BY count DESC;

-- 2. Null status kontrolü
SELECT COUNT(*) FROM packages WHERE status IS NULL;

-- 3. Geçersiz status kontrolü
SELECT COUNT(*) FROM packages 
WHERE status NOT IN ('new_order', 'assigned', 'picking_up', 'on_the_way', 'delivered', 'cancelled');

-- 4. Default status kontrolü
SELECT column_default 
FROM information_schema.columns 
WHERE table_name = 'packages' AND column_name = 'status';
```

---

## 🎨 Renk Kodları Referansı

```typescript
new_order:   bg-blue-900/50 text-blue-300      // 🔵 Mavi
assigned:    bg-purple-900/50 text-purple-300  // 🟣 Mor
picking_up:  bg-orange-900/50 text-orange-300  // 🟠 Turuncu
on_the_way:  bg-yellow-900/50 text-yellow-300  // 🟡 Sarı
delivered:   bg-green-900/50 text-green-300    // 🟢 Yeşil
cancelled:   bg-red-900/50 text-red-300        // 🔴 Kırmızı
```

---

## 🚨 Kritik Noktalar

### ⚠️ Dikkat Edilmesi Gerekenler

1. **Veritabanı Migration**
   - Önce backup al!
   - Migration'ı test ortamında dene
   - Production'da çalıştır

2. **Realtime Subscriptions**
   - Status değişikliklerini dinle
   - Eski status'ları normalize et

3. **Cache Temizleme**
   - Browser cache
   - Service Worker cache
   - Next.js cache

4. **Geriye Dönük Uyumluluk**
   - `normalizeStatus()` fonksiyonu kullan
   - Eski `waiting` değerlerini otomatik çevir

---

## 📝 Notlar

- Migration sonrası tüm `waiting` değerleri `new_order` olacak
- Frontend'de `normalizeStatus()` kullanarak eski değerleri handle et
- Status geçişlerini `canTransitionTo()` ile kontrol et
- Badge'ler için `getStatusBadgeClass()` kullan

---

**Tahmini Süre:** 2-3 saat
**Öncelik:** Yüksek
**Risk:** Orta (veritabanı değişikliği var)
