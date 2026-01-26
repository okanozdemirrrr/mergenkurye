rt 2z6s# 🔒 ÇELİK KİLİT SİSTEMİ KURULUM KILAVUZU

## SORUN

Ajan (Agent), veritabanındaki paketleri sürekli kontrol ediyor ve eğer aynı `external_order_number` bulursa, o paketi güncelliyor (UPSERT). Bu, kurye atanmış paketlerin bile ezilmesine neden oluyor.

**Örnek Senaryo:**
1. Ajan sipariş oluşturur → `status: 'pending'`, `courier_id: NULL`
2. Admin kurye atar → `status: 'assigned'`, `courier_id: 'abc123'`
3. Ajan tekrar aynı siparişi görür → UPSERT yapar → `courier_id: NULL` (EZİLDİ!)

## ÇÖZÜM: ÇELİK KİLİT SİSTEMİ

### 1. AJAN TARAFI (background.js)

**Değişiklik:** UPSERT kaldırıldı, sadece INSERT yapılıyor.

```javascript
// ÖNCEKİ (YANLIŞ):
// - Paket varsa UPDATE yap
// - Paket yoksa INSERT yap

// ŞİMDİ (DOĞRU):
// - Paket varsa IGNORE et (hiçbir şey yapma)
// - Paket yoksa INSERT yap

const response = await fetch(fullUrl, {
  method: 'POST',
  headers: {
    'Prefer': 'resolution=ignore-duplicates,return=minimal'  // ✅ ÇELİK KİLİT
  },
  body: JSON.stringify(packageData)
});
```

**Mantık:**
- Ajan sadece YENİ siparişleri ekleyebilir
- Mevcut siparişlere ASLA dokunamaz
- Duplicate kontrolü Supabase tarafında yapılır

### 2. VERİTABANI TARAFI (SQL Trigger)

**Dosya:** `database_migration_steel_lock_protection.sql`

**Kurulum:**
1. Supabase Dashboard → SQL Editor
2. Dosya içeriğini kopyala
3. "Run" butonuna bas

**Trigger Mantığı:**
```sql
-- Eğer courier_id dolu ise → UPDATE ENGELLENİR
-- Eğer status 'assigned' veya daha ileri ise → UPDATE ENGELLENİR
-- Eğer locked_by 'courier' ise → UPDATE ENGELLENİR
```

**Koruma Seviyeleri:**

| Durum | Ajan | Admin | Kurye |
|-------|------|-------|-------|
| `status='pending'`, `courier_id=NULL` | ❌ Dokunamaz | ✅ Atayabilir | ❌ Göremez |
| `status='assigned'`, `courier_id='abc'` | ❌ Dokunamaz | ❌ Dokunamaz | ✅ Güncelleyebilir |
| `status='delivered'` | ❌ Dokunamaz | ❌ Dokunamaz | ❌ Dokunamaz |

### 3. ADMİN PANELİ (page.tsx)

**Zaten Doğru Çalışıyor:**
```typescript
// Kurye atama
const { data, error } = await supabase
  .from('packages')
  .update({
    courier_id: courierId,
    status: 'assigned',      // ✅ Status güncelleniyor
    locked_by: 'courier',    // ✅ Çelik kilit aktif
    assigned_at: new Date().toISOString()
  })
  .eq('id', packageId)
  .in('status', ['pending', 'waiting'])  // ✅ Sadece atanmamış paketler
```

## TEST SENARYOLARI

### Test 1: Ajan Yeni Sipariş Ekler (BAŞARILI)

```javascript
// Ajan
POST /packages
{
  "external_order_number": "TR-12345",
  "status": "pending",
  "courier_id": null
}
// Sonuç: 201 Created ✅
```

### Test 2: Ajan Aynı Siparişi Tekrar Ekler (IGNORE)

```javascript
// Ajan
POST /packages
{
  "external_order_number": "TR-12345",  // Aynı sipariş
  "status": "pending",
  "courier_id": null
}
// Sonuç: 200 OK (Duplicate ignored) ✅
// Mevcut kayıt korundu ✅
```

### Test 3: Admin Kurye Atar (BAŞARILI)

```typescript
// Admin
UPDATE packages
SET courier_id = 'abc123', status = 'assigned', locked_by = 'courier'
WHERE id = 123 AND status IN ('pending', 'waiting')
// Sonuç: 1 row updated ✅
```

### Test 4: Ajan Atanmış Paketi Güncellemeye Çalışır (ENGELLENİR)

```javascript
// Ajan
POST /packages
{
  "external_order_number": "TR-12345",  // Kurye atanmış paket
  "status": "pending",
  "courier_id": null
}
// Sonuç: 200 OK (Duplicate ignored) ✅
// Trigger devreye girmeden önce ignore edildi ✅
```

### Test 5: Manuel UPDATE Denemesi (ENGELLENİR)

```sql
-- SQL Editor'de
UPDATE packages
SET customer_name = 'Test'
WHERE courier_id IS NOT NULL
LIMIT 1;

-- Sonuç: ERROR ❌
-- 🔒 ÇELİK KİLİT: Bu paket kurye atanmış, güncellenemez!
```

## AVANTAJLAR

✅ **Ajan Yetkisi Kısıtlandı:** Sadece INSERT yapabilir, UPDATE yapamaz
✅ **Veritabanı Koruması:** Trigger seviyesinde koruma (API bypass edilemez)
✅ **Duplicate Kontrolü:** Supabase tarafında otomatik
✅ **Performans:** Gereksiz UPDATE sorguları yok
✅ **Güvenlik:** Kurye atanmış paketler asla ezilmez

## SORUN GİDERME

### Sorun 1: Trigger Çalışmıyor

**Kontrol:**
```sql
SELECT trigger_name FROM information_schema.triggers 
WHERE event_object_table = 'packages';
```

**Çözüm:** Trigger'ı tekrar oluştur (migration dosyasını çalıştır)

### Sorun 2: Ajan Hala UPDATE Yapıyor

**Kontrol:** Ajan loglarına bak
```javascript
console.log('🚀 === ÇELİK KİLİT: SADECE INSERT - ASLA UPDATE YOK ===');
```

**Çözüm:** background.js dosyasını güncelle ve extension'ı yeniden yükle

### Sorun 3: Admin Kurye Atayamıyor

**Kontrol:** Admin paneli loglarına bak
```typescript
console.log('🔒 Kurye atama başlıyor:', { packageId, courierId })
```

**Çözüm:** Paketin status'ünün 'pending' veya 'waiting' olduğundan emin ol

## ROLLBACK (GERİ ALMA)

Eğer sistemi eski haline döndürmek isterseniz:

```sql
-- Trigger'ı kaldır
DROP TRIGGER IF EXISTS trigger_protect_assigned_packages ON packages;
DROP FUNCTION IF EXISTS protect_assigned_packages();
```

## ÖZET

| Özellik | Önceki | Şimdi |
|---------|--------|-------|
| Ajan INSERT | ✅ | ✅ |
| Ajan UPDATE | ✅ (SORUN!) | ❌ (ENGELLENDİ) |
| Admin Atama | ✅ | ✅ |
| Trigger Koruması | ❌ | ✅ |
| Duplicate Kontrolü | ❌ | ✅ |

**Sonuç:** Ajan artık sadece yeni siparişleri ekleyebilir, mevcut siparişlere dokunamaz. Kurye atanmış paketler çelik kilit altında korunuyor. 🔒
