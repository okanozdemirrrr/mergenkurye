# 🌐 Web Platform Komisyon Raporu Sistemi

## 📋 Genel Bakış

Admin paneline **Web Platform Komisyon Raporu** modülü eklendi. Bu modül, restoranların sadece Alda Gel web platformundan (`platform = 'web'`) aldıkları siparişleri analiz edip %10 komisyon hesabı yapar.

## 🎯 Özellikler

### ✅ Supabase RPC Fonksiyonu
- **Fonksiyon Adı**: `get_platform_commissions`
- **Parametreler**: 
  - `p_start_date` (timestamp, opsiyonel)
  - `p_end_date` (timestamp, opsiyonel)
- **Filtreleme Kuralları**:
  - ✅ Sadece `platform = 'web'` olan siparişler
  - ✅ Sadece `status = 'delivered'` olan siparişler
  - ✅ Tarih aralığına göre filtreleme (opsiyonel)
- **Çıktı**:
  - `restaurant_id`: Restoran ID
  - `restaurant_name`: Restoran adı
  - `total_web_orders`: Web sipariş sayısı
  - `total_web_amount`: Web cirosu (₺)

### 📊 Frontend Özellikleri

#### Tarih Filtreleri
- 📅 **Bugün**: Günlük rapor
- 📊 **Son 7 Gün**: Haftalık rapor
- 📈 **Son 30 Gün**: Aylık rapor
- 🌍 **Tüm Zamanlar**: Tüm geçmiş
- 🗓️ **Özel Tarih**: Başlangıç-bitiş tarihi seçimi

#### Özet Kartlar
1. **Toplam Sipariş** (📦): Web platformundan gelen toplam sipariş sayısı
2. **Toplam Ciro** (💰): Teslim edilen siparişlerin toplam tutarı
3. **Toplam Komisyon** (🎯): %10 komisyon hesabı

#### Detaylı Tablo
| Restoran Adı | Web Sipariş Sayısı | Web Cirosu | Komisyon (%10) |
|--------------|-------------------|------------|----------------|
| Restoran 1   | 45                | 12,500₺    | 1,250₺         |
| Restoran 2   | 32                | 8,900₺     | 890₺           |
| **TOPLAM**   | **77**            | **21,400₺**| **2,140₺**     |

## 📁 Dosya Yapısı

```
database/
└── create_platform_commission_rpc.sql    # Supabase RPC fonksiyonu

src/app/admin/
├── layout.tsx                            # Menüye link eklendi
└── restoranlar/
    └── komisyon/
        └── page.tsx                      # Komisyon raporu sayfası
```

## 🚀 Kurulum Adımları

### 1. SQL Fonksiyonunu Çalıştır

Supabase SQL Editor'de şu dosyayı çalıştır:

```bash
database/create_platform_commission_rpc.sql
```

### 2. Test Et

```sql
-- Tüm zamanlar
SELECT * FROM get_platform_commissions(NULL, NULL);

-- Bugün
SELECT * FROM get_platform_commissions(
  CURRENT_DATE::TIMESTAMP,
  (CURRENT_DATE + INTERVAL '1 day')::TIMESTAMP
);

-- Son 30 gün
SELECT * FROM get_platform_commissions(
  (CURRENT_DATE - INTERVAL '30 days')::TIMESTAMP,
  CURRENT_TIMESTAMP
);
```

### 3. Sayfaya Eriş

Admin panelinde:
```
Restoranlar → 🌐 Web Platform Komisyonu
```

veya direkt URL:
```
http://localhost:3000/admin/restoranlar/komisyon
```

## 🎨 UI/UX Özellikleri

- ✅ **Responsive Tasarım**: Mobil ve desktop uyumlu
- ✅ **Gradient Kartlar**: Modern B2B görünümü
- ✅ **Hover Efektleri**: İnteraktif tablo satırları
- ✅ **Loading State**: Yükleme animasyonu
- ✅ **Empty State**: Veri yoksa bilgilendirme
- ✅ **Bilgi Notu**: Komisyon hesaplama kuralları

## 💡 Performans Optimizasyonu

### Egress Koruması
- ❌ **YAPMA**: Frontend'de tüm paketleri çekip filtreleme
- ✅ **YAP**: Supabase RPC ile sadece özet veriyi çek

```typescript
// ❌ YANLIŞ (Egress tüketir)
const { data: packages } = await supabase
  .from('packages')
  .select('*')
  .eq('platform', 'web')
  .eq('status', 'delivered')

const summary = packages.reduce(...)  // Frontend'de hesaplama

// ✅ DOĞRU (Egress tasarrufu)
const { data } = await supabase.rpc('get_platform_commissions', {
  p_start_date: startDate,
  p_end_date: endDate
})
```

## 📊 Komisyon Hesaplama Kuralları

1. **Platform Filtresi**: Sadece `platform = 'web'`
2. **Durum Filtresi**: Sadece `status = 'delivered'`
3. **Komisyon Oranı**: %10 (0.10)
4. **Hesaplama**: `komisyon = web_cirosu * 0.10`

## 🔒 Güvenlik

- ✅ Admin paneli auth kontrolü
- ✅ RPC fonksiyonu Supabase tarafında çalışır
- ✅ SQL injection koruması (parameterized queries)
- ✅ Client-side hesaplama yok (sadece görüntüleme)

## 📝 Örnek Kullanım Senaryoları

### Senaryo 1: Günlük Rapor
```
1. Admin paneline gir
2. Restoranlar → Web Platform Komisyonu
3. "Bugün" filtresini seç
4. Günlük komisyon raporunu gör
```

### Senaryo 2: Aylık Muhasebe
```
1. "Özel Tarih" seç
2. Başlangıç: 01.05.2026
3. Bitiş: 31.05.2026
4. Mayıs ayı komisyon raporunu indir/yazdır
```

### Senaryo 3: Restoran Performansı
```
1. "Son 30 Gün" seç
2. Tabloyu "Web Cirosu" kolonuna göre sırala
3. En çok sipariş alan restoranları gör
4. Komisyon gelirlerini analiz et
```

## 🎯 Gelecek Geliştirmeler (Opsiyonel)

- [ ] Excel/PDF export özelliği
- [ ] Grafik görünümü (Chart.js)
- [ ] Restoran bazlı detay sayfası
- [ ] Email ile otomatik rapor gönderimi
- [ ] Komisyon oranı değiştirme (dinamik)
- [ ] Ödeme durumu takibi

## 🐛 Sorun Giderme

### RPC Fonksiyonu Bulunamadı
```sql
-- Fonksiyonun var olduğunu kontrol et
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name = 'get_platform_commissions';
```

### Veri Gelmiyor
```sql
-- Web platformundan sipariş var mı kontrol et
SELECT COUNT(*) 
FROM packages 
WHERE platform = 'web' AND status = 'delivered';
```

### Tarih Filtresi Çalışmıyor
- Tarayıcı console'unu kontrol et
- Tarih formatının doğru olduğundan emin ol (ISO 8601)
- Timezone ayarlarını kontrol et

## 📞 Destek

Herhangi bir sorun için:
1. Console loglarını kontrol et
2. Supabase logs'u incele
3. SQL fonksiyonunu test et

---

**Oluşturulma Tarihi**: 20 Mayıs 2026  
**Versiyon**: 1.0.0  
**Durum**: ✅ Aktif
