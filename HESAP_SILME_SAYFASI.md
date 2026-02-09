# 🗑️ Hesap Silme Sayfası - Google Play Console Gereksinimi

## ✅ Oluşturulan Sayfalar

### 1. Türkçe Sayfa
- **URL**: `/hesap-silme`
- **Başlık**: Hesap Silme Talebi
- **Dil**: Türkçe

### 2. İngilizce Sayfa
- **URL**: `/account-deletion`
- **Başlık**: Account Deletion Request
- **Dil**: English

## 📋 Sayfa İçeriği

### Bölümler

1. **Logo ve Başlık**
   - Mergen Kurye logosu
   - Sayfa başlığı
   - Alt başlık

2. **Hesap Silme Prosedürü** (📧)
   - E-posta adresi: `ozdemiribrahimokan@gmail.com`
   - Tıklanabilir mailto linki
   - Konu otomatik doldurulur: "Mergen Kurye - Hesap Silme Talebi"
   - Kullanıcıdan telefon/kullanıcı adı istenir

3. **Önemli Bilgilendirme** (⚠️)
   - **7 iş günü** içinde silme süresi
   - Geri alınamaz uyarısı
   - Bekleyen ödemeler hakkında bilgi

4. **Silinecek Veriler** (🔒)
   - Kişisel bilgiler
   - Sipariş geçmişi
   - Ödeme kayıtları
   - Konum geçmişi
   - Hesap ayarları

5. **Ana Sayfaya Dön Butonu**
   - Kullanıcı dostu navigasyon

6. **Footer**
   - Telif hakkı bilgisi
   - İletişim e-postası

## 🎨 Tasarım Özellikleri

### Renk Şeması
- **Arka Plan**: Gradient (slate-950 → slate-900)
- **Kart**: Slate-900 + border
- **Uyarı Kutusu**: Kırmızı tema (red-900/20)
- **Bilgi Kutuları**: Slate-800/50
- **Vurgular**: Turuncu (orange-400)

### Responsive Tasarım
- Mobil uyumlu
- Padding ayarları (p-4 → p-8 → p-12)
- Maksimum genişlik: 2xl (max-w-2xl)

### Erişilebilirlik
- Tıklanabilir e-posta linkleri
- Hover efektleri
- Okunabilir font boyutları
- Kontrast oranları

## 📱 Google Play Console Uyumluluğu

### Gereksinimler
✅ **Erişilebilir URL**: Hem Türkçe hem İngilizce
✅ **Açık Prosedür**: E-posta ile talep süreci
✅ **Zaman Çerçevesi**: 7 iş günü belirtildi
✅ **Veri Şeffaflığı**: Silinecek veriler listelendi
✅ **Geri Alınamaz Uyarısı**: Açıkça belirtildi
✅ **İletişim Bilgisi**: E-posta adresi verildi

### Google Play Politikası
Bu sayfa, Google Play Console'un "Veri Güvenliği" bölümünde istenen hesap silme prosedürü gereksinimini karşılar.

## 🔗 Kullanım

### Google Play Console'da
1. **App Content** → **Data Safety** bölümüne gidin
2. "Account deletion" seçeneğini işaretleyin
3. URL olarak şunlardan birini girin:
   - `https://yourdomain.com/hesap-silme` (Türkçe)
   - `https://yourdomain.com/account-deletion` (İngilizce)

### Uygulama İçinde
Ayarlar menüsüne "Hesabımı Sil" butonu ekleyebilirsiniz:
```typescript
<a href="/hesap-silme">Hesabımı Sil</a>
```

## 📧 E-posta Şablonu

Kullanıcılar şu formatta e-posta gönderecek:

```
Konu: Mergen Kurye - Hesap Silme Talebi

Merhaba,

Mergen Kurye sistemindeki hesabımın silinmesini talep ediyorum.

Kullanıcı Adı: [kullanıcı_adı]
Telefon: [telefon_numarası]

Saygılarımla,
[İsim Soyisim]
```

## 🔒 Veri Silme Prosedürü (Backend)

### Manuel Silme Adımları
1. E-posta geldiğinde kullanıcıyı doğrula
2. Bekleyen ödemeleri kontrol et
3. Aktif siparişleri kontrol et
4. Tüm verileri sil:
   ```sql
   -- Kullanıcı verilerini sil
   DELETE FROM couriers WHERE id = 'user_id';
   DELETE FROM restaurants WHERE id = 'user_id';
   
   -- İlişkili verileri sil
   DELETE FROM packages WHERE courier_id = 'user_id';
   DELETE FROM courier_debts WHERE courier_id = 'user_id';
   -- vb.
   ```
5. Kullanıcıya onay e-postası gönder

### Otomatik Silme (Gelecek)
Opsiyonel olarak otomatik silme sistemi kurulabilir:
- Kullanıcı talebini veritabanına kaydet
- 7 gün sonra otomatik sil
- Cron job ile kontrol et

## 📊 İstatistikler

Sayfa ziyaretlerini takip etmek için analytics eklenebilir:
```typescript
// Google Analytics event
gtag('event', 'page_view', {
  page_title: 'Account Deletion',
  page_location: '/hesap-silme'
})
```

## 🎉 Sistem Hazır!

Hesap silme sayfaları oluşturuldu ve Google Play Console gereksinimlerini karşılıyor.

**Test URL'leri:**
- Türkçe: `http://localhost:3000/hesap-silme`
- İngilizce: `http://localhost:3000/account-deletion`

---

**Geliştirme Tarihi**: 9 Şubat 2026
**Versiyon**: 1.0.0
**Google Play Uyumlu**: ✅
