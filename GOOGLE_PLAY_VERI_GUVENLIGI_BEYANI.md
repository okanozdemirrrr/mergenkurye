# 🔒 Google Play Console - Veri Güvenliği Beyanı

## 📋 Mergen Kurye Uygulaması - Veri Toplama ve Kullanım Beyanı

---

## 1️⃣ FİNANSAL BİLGİLER (Financial Info)

### Toplanan Veriler

#### ✅ Ödeme Bilgileri (Payment Info)
**Toplanan:**
- Ödeme yöntemi (Nakit, Kart, IBAN)
- Sipariş tutarları
- Ödeme tarihleri
- İşlem geçmişi

**Toplanmayan:**
- Kredi kartı numaraları
- CVV kodları
- Banka hesap şifreleri
- Kart son kullanma tarihleri

### Kullanım Amacı
- ✅ **App functionality** (Uygulama işlevselliği)
  - Sipariş ödemelerini takip etmek
  - Kurye kazançlarını hesaplamak
  - Restoran ödemelerini yönetmek
  - Finansal raporlama

- ✅ **Analytics** (Analitik)
  - Ödeme yöntemi tercihlerini analiz etmek
  - Gelir istatistiklerini oluşturmak

### Veri Paylaşımı
- ❌ **Üçüncü taraflarla paylaşılmaz**
- ✅ **Şifreleme**: Tüm finansal veriler şifrelenmiş olarak saklanır (Supabase SSL/TLS)
- ✅ **Kullanıcı kontrolü**: Kullanıcılar kendi finansal geçmişlerini görebilir

### Silme Politikası
- Hesap silindiğinde tüm finansal veriler **7 iş günü içinde** kalıcı olarak silinir
- Kullanıcı `/hesap-silme` sayfasından talep edebilir

---

## 2️⃣ KONUM BİLGİLERİ (Location)

### Toplanan Veriler

#### ✅ Kesin Konum (Precise Location)
**Toplanan:**
- GPS koordinatları (latitude, longitude)
- Konum güncellemeleri (kurye hareketleri)
- Teslimat adresleri
- Restoran konumları

**Kullanım:**
- Gerçek zamanlı kurye takibi
- Teslimat rotası optimizasyonu
- Harita üzerinde gösterim

#### ✅ Yaklaşık Konum (Approximate Location)
**Toplanan:**
- Şehir/İlçe bilgisi
- Bölge bazlı istatistikler

### Arka Plan Konum İzni (Background Location)

#### 🔴 EVET, Arka Plan Konum Kullanılıyor

**Neden Gerekli:**
- Kurye uygulaması kapalıyken bile konum güncellemesi
- Teslimat sırasında sürekli takip
- Güvenlik ve şeffaflık için

**Kullanım Senaryosu:**
1. Kurye bir paketi teslim etmek için yola çıkar
2. Uygulama arka planda çalışır
3. Admin panelinde gerçek zamanlı konum görünür
4. Müşteri paketinin nerede olduğunu görebilir

**Kullanıcı Kontrolü:**
- Kurye "Aktif/Pasif" durumunu değiştirebilir
- Pasif modda konum takibi durur
- Kullanıcı istediği zaman konum iznini iptal edebilir

### Kullanım Amacı
- ✅ **App functionality** (Uygulama işlevselliği)
  - Kurye takibi
  - Teslimat yönetimi
  - Rota optimizasyonu

- ✅ **Analytics** (Analitik)
  - Teslimat sürelerini analiz etmek
  - Yoğunluk haritası oluşturmak
  - Bölgesel istatistikler

### Veri Paylaşımı
- ❌ **Üçüncü taraflarla paylaşılmaz**
- ✅ **Şifreleme**: Konum verileri şifrelenmiş olarak saklanır
- ✅ **Geçici Saklama**: Konum geçmişi sadece aktif teslimatlar için saklanır

### Silme Politikası
- Teslimat tamamlandıktan sonra konum geçmişi **30 gün** sonra silinir
- Hesap silindiğinde tüm konum verileri **7 iş günü içinde** kalıcı olarak silinir

---

## 3️⃣ KİŞİSEL BİLGİLER (Personal Info)

### Toplanan Veriler
- ✅ İsim, Soyisim
- ✅ E-posta adresi
- ✅ Telefon numarası
- ✅ Yaş
- ✅ İkamet şehri

### Kullanım Amacı
- ✅ **App functionality** (Hesap yönetimi)
- ✅ **Account management** (Kimlik doğrulama)

### Veri Paylaşımı
- ❌ **Üçüncü taraflarla paylaşılmaz**

---

## 4️⃣ FOTOĞRAFLAR VE VİDEOLAR (Photos and Videos)

### Toplanan Veriler
- ✅ Profil fotoğrafı (opsiyonel)
- ✅ Teslimat kanıt fotoğrafları (opsiyonel)

### Kullanım Amacı
- ✅ **App functionality** (Teslimat doğrulama)

### Veri Paylaşımı
- ❌ **Üçüncü taraflarla paylaşılmaz**

---

## 5️⃣ UYGULAMA ETKİNLİĞİ (App Activity)

### Toplanan Veriler
- ✅ Uygulama etkileşimleri
- ✅ Sipariş geçmişi
- ✅ Teslimat istatistikleri
- ✅ Oturum süreleri

### Kullanım Amacı
- ✅ **App functionality**
- ✅ **Analytics**
- ✅ **Performance monitoring**

### Veri Paylaşımı
- ❌ **Üçüncü taraflarla paylaşılmaz**

---

## 📱 GOOGLE PLAY CONSOLE FORM CEVAPLARI

### Data Collection and Security

#### Does your app collect or share any of the required user data types?
**✅ YES**

---

### Data Types

#### 1. Location
**✅ Collected**

**Precise location:**
- ✅ Is this data collected, shared, or both?
  - **Collected**
  
- ✅ Is this data processed ephemerally?
  - **NO** (Veritabanında saklanıyor)
  
- ✅ Is this data required for your app, or can users choose whether it's collected?
  - **Required** (Kurye takibi için zorunlu)
  
- ✅ Why is this user data collected? Select all that apply.
  - **App functionality** (Kurye takibi, teslimat yönetimi)
  - **Analytics** (Yoğunluk haritası, istatistikler)

**Approximate location:**
- ✅ Is this data collected, shared, or both?
  - **Collected**
  
- ✅ Why is this user data collected?
  - **App functionality**
  - **Analytics**

---

#### 2. Financial Info
**✅ Collected**

**Payment info:**
- ✅ Is this data collected, shared, or both?
  - **Collected**
  
- ✅ Is this data processed ephemerally?
  - **NO**
  
- ✅ Is this data required for your app, or can users choose whether it's collected?
  - **Required** (Ödeme takibi için zorunlu)
  
- ✅ Why is this user data collected?
  - **App functionality** (Ödeme yönetimi)
  - **Analytics** (Finansal raporlama)

---

#### 3. Personal Info
**✅ Collected**

**Name, Email address, Phone number:**
- ✅ Collected
- ✅ Required
- ✅ App functionality
- ✅ Account management

---

#### 4. Photos and Videos
**✅ Collected (Optional)**

**Photos:**
- ✅ Collected
- ✅ Optional (Kullanıcı seçimi)
- ✅ App functionality (Teslimat kanıtı)

---

#### 5. App Activity
**✅ Collected**

**App interactions, In-app search history:**
- ✅ Collected
- ✅ Required
- ✅ App functionality
- ✅ Analytics

---

### Data Security

#### Is all of the user data collected by your app encrypted in transit?
**✅ YES** (Supabase SSL/TLS şifreleme)

#### Do you provide a way for users to request that their data is deleted?
**✅ YES**
- URL: `https://yourdomain.com/hesap-silme`
- URL: `https://yourdomain.com/account-deletion`

---

## 🔐 GÜVENLİK ÖNLEMLERİ

### Şifreleme
- ✅ **Transit**: SSL/TLS (HTTPS)
- ✅ **Rest**: Supabase şifreli veritabanı
- ✅ **Şifreler**: Bcrypt hash

### Erişim Kontrolü
- ✅ Row Level Security (RLS) - Supabase
- ✅ Kullanıcı bazlı yetkilendirme
- ✅ Admin/Kurye/Restoran rolleri

### Veri Minimizasyonu
- ✅ Sadece gerekli veriler toplanır
- ✅ Kredi kartı bilgileri saklanmaz
- ✅ Hassas veriler şifrelenir

### Saklama Süresi
- **Aktif Hesaplar**: Süresiz (kullanıcı aktif olduğu sürece)
- **Konum Geçmişi**: 30 gün
- **Finansal Kayıtlar**: Yasal zorunluluk (vergi) için 5 yıl
- **Hesap Silme**: 7 iş günü içinde tüm veriler silinir

---

## 📞 İLETİŞİM

**Veri Sorumlusu:**
- İsim: İbrahim Okan Özdemir
- E-posta: ozdemiribrahimokan@gmail.com
- Şirket: Mergen Teknoloji

**Hesap Silme Talebi:**
- Web: https://yourdomain.com/hesap-silme
- E-posta: ozdemiribrahimokan@gmail.com

---

## ✅ KONTROL LİSTESİ

- [x] Finansal bilgiler beyan edildi
- [x] Arka plan konum izni açıklandı
- [x] Konum kullanım amacı belirtildi
- [x] Veri şifreleme onaylandı
- [x] Hesap silme URL'si eklendi
- [x] Veri saklama süreleri belirtildi
- [x] Üçüncü taraf paylaşımı yok
- [x] Kullanıcı kontrolü açıklandı
- [x] Gizlilik politikası hazır
- [x] İletişim bilgileri eklendi

---

**Son Güncelleme**: 9 Şubat 2026
**Versiyon**: 1.0.0
**Google Play Uyumlu**: ✅
