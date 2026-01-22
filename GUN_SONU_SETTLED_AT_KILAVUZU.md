# 💰 GÜN SONU - SETTLED_AT SİSTEMİ

## 🎯 Mantık

Gün sonu alındığında:
- **Nakit Toplam**: Değişmez (tüm nakit siparişler, bilgi amaçlı)
- **Kart Toplam**: Değişmez (tüm kart siparişler, bilgi amaçlı)
- **Genel Toplam**: Sıfırlanır (sadece henüz kapatılmamış paketler)

## 🗄️ Veritabanı Değişikliği

### Adım 1: Supabase SQL Editor'e Git
Supabase Dashboard → SQL Editor

### Adım 2: SQL Komutunu Çalıştır
`database_migration_add_settled_at.sql` dosyasındaki SQL'i kopyala ve çalıştır:

```sql
-- Packages tablosuna settled_at sütunu ekle
ALTER TABLE packages ADD COLUMN IF NOT EXISTS settled_at TIMESTAMP WITH TIME ZONE;

-- İndeks ekle (performans için)
CREATE INDEX IF NOT EXISTS idx_packages_settled_at ON packages(settled_at);
```

## 📊 Nasıl Çalışır?

### 1. Gün Sonu Alınmadan Önce
```
Kurye: Ahmet Abi
Tarih: 20.01.2026 - 22.01.2026

Paketler:
- Paket 1: 100₺ (nakit) - settled_at: NULL
- Paket 2: 150₺ (nakit) - settled_at: NULL
- Paket 3: 200₺ (kart)  - settled_at: NULL

Nakit Toplam: 250₺
Kart Toplam: 200₺
Genel Toplam: 450₺ (sadece settled_at NULL olanlar)
```

### 2. Gün Sonu Alındıktan Sonra
```
Admin: 400₺ aldım

İşlem:
1. Paketlere settled_at damgası vuruldu (şu anki zaman)
2. Genel Toplam artık 0₺ (tüm paketler settled)

Paketler:
- Paket 1: 100₺ (nakit) - settled_at: 2026-01-22 18:30:00
- Paket 2: 150₺ (nakit) - settled_at: 2026-01-22 18:30:00
- Paket 3: 200₺ (kart)  - settled_at: 2026-01-22 18:30:00

Nakit Toplam: 250₺ (değişmedi, bilgi amaçlı)
Kart Toplam: 200₺ (değişmedi, bilgi amaçlı)
Genel Toplam: 0₺ (tüm paketler kapatıldı)
```

### 3. Yeni Paketler Geldiğinde
```
Yeni paketler:
- Paket 4: 120₺ (nakit) - settled_at: NULL
- Paket 5: 180₺ (nakit) - settled_at: NULL

Nakit Toplam: 550₺ (250₺ + 300₺, tüm paketler)
Kart Toplam: 200₺ (değişmedi)
Genel Toplam: 300₺ (sadece yeni paketler, settled_at NULL)
```

## 🔄 Tekrar Gün Sonu Alınırsa

Bir sonraki gün sonu alınırken:
- Sadece `settled_at IS NULL` olan paketler hesaplanır
- Eski paketler tekrar hesaplanmaz
- Aynı paketler için iki kez gün sonu alınamaz

## 💡 Avantajlar

1. **Çift Hesaplama Önlenir**: Aynı paketler tekrar hesaplanmaz
2. **Geçmiş Korunur**: Nakit/Kart toplam değişmez, raporlama için önemli
3. **Temiz Hesap**: Genel toplam her zaman güncel durumu gösterir
4. **Audit Trail**: settled_at ile hangi paketin ne zaman kapatıldığı görülür

## ⚠️ Önemli Notlar

1. **settled_at NULL**: Paket henüz kapatılmamış, genel toplama dahil
2. **settled_at DOLU**: Paket kapatılmış, sadece nakit/kart toplamda görünür
3. **Geri Alınamaz**: Gün sonu alındıktan sonra settled_at değiştirilemez
4. **Tarih Aralığı**: Sadece seçilen tarih aralığındaki paketler kapatılır

## 🔍 Veritabanı Sorguları

### Kapatılmamış Paketleri Gör
```sql
SELECT * FROM packages 
WHERE courier_id = 'KURYE_ID' 
AND status = 'delivered'
AND settled_at IS NULL;
```

### Kapatılmış Paketleri Gör
```sql
SELECT * FROM packages 
WHERE courier_id = 'KURYE_ID' 
AND status = 'delivered'
AND settled_at IS NOT NULL
ORDER BY settled_at DESC;
```

### Kurye Genel Toplam Hesapla
```sql
SELECT 
  SUM(CASE WHEN payment_method = 'cash' AND settled_at IS NULL THEN amount ELSE 0 END) as unsettled_cash,
  SUM(CASE WHEN payment_method = 'card' AND settled_at IS NULL THEN amount ELSE 0 END) as unsettled_card
FROM packages
WHERE courier_id = 'KURYE_ID' 
AND status = 'delivered';
```

## 🚀 Test Senaryosu

1. **Supabase'de SQL'i çalıştır**
2. **Admin panelinde kurye detayına git**
3. **Tarih aralığı seç** (örn: bugün)
4. **Genel Toplam'ı not et** (örn: 450₺)
5. **Gün Sonu Al** → 400₺ gir
6. **Modal'ı kapat ve tekrar aç**
7. **Genel Toplam artık 0₺ olmalı**
8. **Nakit/Kart Toplam değişmemeli**

---

**Geliştirici Notu**: Bu sistem, aynı paketlerin tekrar tekrar hesaplanmasını önler ve temiz bir muhasebe sağlar. settled_at sütunu, her paketin hangi gün sonu işleminde kapatıldığını gösterir.
