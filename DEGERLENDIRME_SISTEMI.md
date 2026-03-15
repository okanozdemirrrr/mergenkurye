# ⭐ Değerlendirme ve Yorum Sistemi

Mergen Go'nun sosyal kanıt ve güven katmanı sistemi - Müşteriler deneyimlerini paylaşır, restoranlar yanıt verir!

## ✅ Tamamlanan Özellikler

### 1. Veritabanı Mimarisi

#### Reviews Tablosu
```sql
CREATE TABLE reviews (
  id UUID PRIMARY KEY,
  order_id INTEGER UNIQUE,           -- Bir sipariş için bir yorum
  customer_id UUID,                  -- Yorumu yapan müşteri
  restaurant_id UUID,                -- Yorumlanan restoran
  rating_taste INTEGER (1-5),        -- Lezzet puanı
  rating_delivery INTEGER (1-5),     -- Teslimat puanı
  comment TEXT,                      -- Müşteri yorumu
  reply TEXT,                        -- Restoran cevabı
  created_at TIMESTAMP,              -- Yorum tarihi
  replied_at TIMESTAMP               -- Cevap tarihi
);
```

#### Güvenlik Özellikleri
- ✅ UNIQUE constraint (order_id) - Bir sipariş için sadece bir yorum
- ✅ CHECK constraint - Rating 1-5 arası
- ✅ Foreign key ilişkileri (customers, restaurants, packages)
- ✅ Index'ler (performans optimizasyonu)
- ✅ RLS (Row Level Security) policies

### 2. Müşteri Paneli

#### Değerlendirme Butonu
- **Konum**: Siparişlerim sayfası
- **Görünürlük**: Sadece `status='delivered'` siparişler için
- **Zaman Kısıtı**: Teslimattan sonraki ilk 48 saat
- **Durum**: Zaten değerlendirilmişse "✓ Değerlendirildi" badge'i

#### Değerlendirme Modalı
- **Lezzet Puanı**: 5 yıldızlı interaktif puanlama (🍔)
- **Teslimat Puanı**: 5 yıldızlı interaktif puanlama (🛵)
- **Yorum Alanı**: 500 karakter limit (opsiyonel)
- **Animasyon**: Framer-motion ile smooth açılış/kapanış
- **Validasyon**: Her iki puan da zorunlu

#### Yanıt Bildirimi 🎉
- **Görünüm**: Yeşil gradient kutu
- **İçerik**: "{Restoran Adı} yorumunuza yanıt verdi!"
- **Detay**: Restoran cevabı ve tarih
- **Konum**: Siparişlerim sayfasında ilgili sipariş kartında

### 3. Restoran Paneli

#### Yorumlar Sekmesi
- **Menü**: Sidebar'da "⭐ Yorumlar" linki
- **Sıralama**: En yeni yorumlar en üstte
- **Görünüm**: Kart bazlı liste

#### Yorum Kartı İçeriği
- Müşteri bilgileri (isim, telefon, sipariş no)
- Lezzet ve Teslimat puanları (yıldızlarla)
- Ortalama puan (büyük font)
- Müşteri yorumu (varsa)
- Yorum tarihi

#### Cevaplama Sistemi
- **Durum 1**: Cevap verilmemiş → "Cevap Ver" butonu
- **Durum 2**: Cevap veriliyor → Textarea (500 karakter)
- **Durum 3**: Cevap verilmiş → "✅ Cevabınız" gösterimi
- **Özellik**: Bir yoruma sadece bir kez cevap verilebilir

### 4. Restoran Vitrini

#### Yorumlar Sekmesi
- **Konum**: Restoran detay sayfası
- **Navigasyon**: "🍽️ Menü" ve "⭐ Yorumlar" sekmeleri
- **Geçiş**: Smooth tab switching

#### Genel Puan Gösterimi
- **Hesaplama**: (Lezzet + Teslimat) / 2 ortalaması
- **Görünüm**: Büyük font, gradient kutu
- **Konum**: 
  - Restoran ismi yanında (detay sayfası)
  - Yorumlar sekmesi üstünde (büyük gösterim)

#### Yorum Listesi
- **Sıralama**: En yeni en üstte
- **Avatar**: Müşteri isminin ilk harfi (gradient)
- **Puanlar**: Lezzet ve Teslimat ayrı gösterilir
- **Restoran Cevabı**: Turuncu arka plan ile vurgulanır
- **Animasyon**: Staggered fade-in (her yorum 50ms gecikmeli)
- **Boş Durum**: "Henüz Değerlendirme Yok" mesajı

## 📁 Dosya Yapısı

### Database
```
database/
└── create_reviews_table.sql          # Reviews tablosu ve policies
```

### Müşteri Paneli
```
src/app/musteri/
├── siparislerim/page.tsx             # Değerlendirme butonu ve modal
└── restoran/[id]/
    ├── page.tsx                      # Yorumlar sekmesi
    └── components/
        └── ReviewsSection.tsx        # Yorumlar listesi component
```

### Restoran Paneli
```
src/app/restoran/
├── layout.tsx                        # Yorumlar linki
└── yorumlar/page.tsx                 # Yorumlar yönetimi
```

## 🎯 Kullanım Senaryoları

### Müşteri Akışı

1. **Sipariş Teslim Edilir**
   - Sipariş durumu `delivered` olur
   - 48 saatlik değerlendirme penceresi başlar

2. **Değerlendirme Yapar**
   - Siparişlerim sayfasında "Değerlendir" butonuna tıklar
   - Modal açılır
   - Lezzet ve Teslimat puanı verir
   - İsteğe bağlı yorum yazar
   - Gönderir

3. **Restoran Cevap Verir**
   - Müşteri siparişlerim sayfasında yeşil bildirim görür
   - "🎉 {Restoran} yorumunuza yanıt verdi!"
   - Restoran cevabını okur

4. **Diğer Müşteriler Görür**
   - Restoran detay sayfasında Yorumlar sekmesine gider
   - Tüm yorumları ve cevapları görür
   - Karar verirken referans alır

### Restoran Akışı

1. **Yorum Gelir**
   - Restoran panelinde "⭐ Yorumlar" sekmesine gider
   - Yeni yorumu görür
   - Müşteri bilgilerini ve puanları inceler

2. **Cevap Verir**
   - "Cevap Ver" butonuna tıklar
   - Teşekkür mesajı veya geri bildirim yazar
   - Gönderir

3. **Müşteri Bilgilendirilir**
   - Müşteri siparişlerim sayfasında bildirimi görür
   - Restoran-müşteri etkileşimi tamamlanır

## 🔒 Güvenlik Kuralları

### Veritabanı Seviyesi
- ✅ `order_id UNIQUE` - Bir sipariş için bir yorum
- ✅ `rating CHECK (1-5)` - Geçersiz puanlar engellenir
- ✅ Foreign key constraints - Veri bütünlüğü

### Uygulama Seviyesi
- ✅ 48 saat kontrolü - Eski siparişler değerlendirilemez
- ✅ `status='delivered'` kontrolü - Sadece teslim edilenler
- ✅ `has_review` kontrolü - Tekrar değerlendirme engellenir
- ✅ Customer ID kontrolü - Sadece sipariş sahibi değerlendirir

## 🎨 Tasarım Detayları

### Renk Paleti
- **Primary**: `#f59e0b` (Orange 500) - Yıldızlar, butonlar
- **Success**: `#10b981` (Green 500) - Bildirimler, onay
- **Background**: `#f7f7f7` (Light Gray) - Müşteri paneli
- **Dark**: `#0f172a` (Slate 950) - Restoran paneli

### Animasyonlar
- **Modal**: Scale + fade (0.95 → 1.0)
- **Yıldızlar**: Hover scale (1.0 → 1.1)
- **Yorumlar**: Staggered fade-in (50ms delay)
- **Butonlar**: Smooth color transitions

### Typography
- **Başlıklar**: 20-28px, bold
- **Puanlar**: 14-16px, Star icons
- **Yorumlar**: 13-14px, regular
- **Tarihler**: 10-12px, muted

## 📊 İstatistikler

### Kod Metrikleri
- **Toplam Dosya**: 5 yeni/güncellenmiş dosya
- **Kod Satırı**: ~800 satır
- **Component**: 3 yeni component
- **Database Tablo**: 1 yeni tablo
- **SQL Satır**: ~60 satır

### Özellik Sayısı
- **Müşteri Özellikleri**: 6 özellik
- **Restoran Özellikleri**: 5 özellik
- **Vitrin Özellikleri**: 4 özellik
- **Güvenlik Özellikleri**: 4 kontrol

## 🚀 Kurulum

### 1. Veritabanı
```bash
# Supabase SQL Editor'de çalıştır
database/create_reviews_table.sql
```

### 2. Test Senaryosu
1. Müşteri olarak giriş yap
2. Sipariş ver
3. Restoran panelinde siparişi `delivered` yap
4. Müşteri panelinde "Değerlendir" butonunu gör
5. Değerlendirme yap
6. Restoran panelinde yorumu gör
7. Cevap ver
8. Müşteri panelinde bildirimi gör

## 🎉 Sonuç

Mergen Go artık tam kapsamlı bir değerlendirme sistemine sahip!

- ✅ Müşteriler deneyimlerini paylaşabiliyor
- ✅ Restoranlar geri bildirim alabiliyor ve cevap verebiliyor
- ✅ Yeni müşteriler sosyal kanıt görebiliyor
- ✅ Şeffaflık ve güven artıyor
- ✅ Restoran kalitesi ölçülebiliyor

**Samsun 19 Mayıs'ın en güvenilir sipariş platformu! 🌟**
