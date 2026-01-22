# 💰 GÜN SONU KASASI - KULLANIM KILAVUZU

## 📋 Özellik Özeti

Kurye gün sonu kasası sistemi, kuryelerden günlük nakit tahsilatını yönetir ve tarihli borç takibi yapar.

## 🗄️ Veritabanı Kurulumu

### 1. Supabase SQL Editor'e Git
- Supabase Dashboard → SQL Editor

### 2. SQL Komutlarını Çalıştır
`database_migration_courier_debts.sql` dosyasındaki tüm SQL komutlarını kopyala ve çalıştır.

Bu işlem şu tabloları oluşturur:
- **courier_debts**: Kurye borçları (tarihli)
- **debt_transactions**: Gün sonu işlem kayıtları

## 🎯 Nasıl Kullanılır?

### Adım 1: Admin Paneli → Kurye Hesapları
1. Admin paneline giriş yap
2. Sol menüden "Kurye Hesapları" sekmesine tıkla
3. Bir kuryenin "📊 Detaylı Rapor Görüntüle" butonuna tıkla

### Adım 2: Bugün Filtresini Seç
1. Modal açıldığında üstteki tarih filtresinden "📅 Bugün" seçili olmalı
2. Sağ üstte "💰 Gün Sonu Al" butonu görünecek

### Adım 3: Gün Sonu Modal'ını Aç
1. "💰 Gün Sonu Al" butonuna tıkla
2. Modal açılır ve şunları gösterir:
   - **Bugünkü Nakit Toplam**: Kuryenin bugün topladığı nakit
   - **Geçmiş Borçlar**: Önceki günlerden kalan borçlar (tarihli liste)
   - **Genel Toplam**: Bugünkü nakit + Geçmiş borçlar

### Adım 4: Alınan Parayı Gir
1. "Kuryeden Alınan Para" alanına kuryenin getirdiği tutarı yaz
2. Sistem otomatik olarak farkı hesaplar:
   - **AÇIK** (Kırmızı): Kurye eksik para getirdi → Borca eklenir
   - **BAHŞİŞ** (Yeşil): Kurye fazla para getirdi → Borç kaydı oluşmaz
   - **TAM ÖDEME** (Mavi): Hesap tam kapandı

### Adım 5: İşlemi Onayla
1. "✓ Gün Sonu Kapat" butonuna tıkla
2. Sistem şunları yapar:
   - Eski borçları en eskiden başlayarak öder (kısmi ödeme destekli)
   - Yeni açık varsa tarihli borç kaydı oluşturur
   - İşlem kaydını `debt_transactions` tablosuna yazar

## 📊 Borç Takibi Mantığı

### Tarihli Borç Kaydı
Her açık, hangi günden kalandığı bilgisiyle kaydedilir:
```
📅 21.01.2026 tarihinden kalan 150.00 TL
📅 22.01.2026 tarihinden kalan 100.00 TL
```

### Kümülatif Gösterim
Bir sonraki gün sonu alındığında:
- Geçmiş tüm borçlar tarihli liste halinde gösterilir
- Genel Toplam = Bugünkü nakit + Tüm eski borçlar

### Kısmi Ödeme
Kurye borcun bir kısmını öderse:
- En eski tarihli borçtan başlayarak düşülür
- Tamamen ödenen borçlar `status = 'paid'` olarak işaretlenir
- Kısmi ödenen borçlarda `remaining_amount` güncellenir

## 💡 Örnek Senaryo

### Gün 1 (21.01.2026)
- Bugünkü nakit: 1000₺
- Kurye getirdi: 850₺
- **Sonuç**: 150₺ açık → "21.01.2026 tarihinden kalan 150₺" kaydedildi

### Gün 2 (22.01.2026)
- Bugünkü nakit: 800₺
- Geçmiş borç: 150₺ (21.01.2026'dan)
- Genel Toplam: 950₺
- Kurye getirdi: 900₺
- **Sonuç**: 
  - 150₺ eski borç ödendi (status = 'paid')
  - 50₺ yeni açık → "22.01.2026 tarihinden kalan 50₺" kaydedildi

### Gün 3 (23.01.2026)
- Bugünkü nakit: 1200₺
- Geçmiş borç: 50₺ (22.01.2026'dan)
- Genel Toplam: 1250₺
- Kurye getirdi: 1300₺
- **Sonuç**: 
  - 50₺ eski borç ödendi
  - 50₺ bahşiş (borç kaydı oluşmadı)

## 🔍 Veritabanı Sorguları

### Kuryenin Tüm Borçlarını Görüntüle
```sql
SELECT * FROM courier_debts 
WHERE courier_id = 'KURYE_ID' 
AND status = 'pending'
ORDER BY debt_date ASC;
```

### Kuryenin Gün Sonu Geçmişini Görüntüle
```sql
SELECT * FROM debt_transactions 
WHERE courier_id = 'KURYE_ID'
ORDER BY transaction_date DESC;
```

### Tüm Kuryelerin Toplam Borcunu Hesapla
```sql
SELECT 
  c.full_name,
  SUM(cd.remaining_amount) as total_debt
FROM couriers c
LEFT JOIN courier_debts cd ON c.id = cd.courier_id AND cd.status = 'pending'
GROUP BY c.id, c.full_name
ORDER BY total_debt DESC;
```

## ⚠️ Önemli Notlar

1. **Gün Sonu Al butonu sadece "Bugün" filtresinde görünür**
2. **İnternet hatalarında işlem sessizce geçilir** (state bozulmaz)
3. **Borç ödemeleri en eski tarihten başlar** (FIFO mantığı)
4. **Tüm tutarlar 2 ondalık basamak hassasiyetinde** (DECIMAL 10,2)
5. **İşlem kayıtları silinmez** (audit trail için)

## 🎨 UI Renk Kodları

- **Yeşil**: Bugünkü nakit, bahşiş
- **Kırmızı**: Geçmiş borçlar, açık
- **Mor/İndigo**: Genel toplam, gün sonu butonu
- **Mavi**: Tam ödeme

## 🚀 Sonraki Adımlar

1. SQL migration'ı Supabase'de çalıştır
2. Admin panelinde test et
3. Gerçek verilerle dene
4. Gerekirse borç raporlama ekranı ekle

---

**Geliştirici Notu**: Bu sistem, Ahmet Abi'nin her kuryenin hangi gün ne kadar açık verdiğini kronolojik olarak görmesini sağlar. Tüm işlemler tarihli ve izlenebilir şekilde kaydedilir.
