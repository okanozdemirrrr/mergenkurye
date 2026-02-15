# 🏢 White-Label Kurye Sistemi - Yol Haritası

## 📋 İçindekiler
1. [Temel Değişiklikler (Zorunlu)](#temel-değişiklikler)
2. [Veritabanı Yapılandırması](#veritabanı)
3. [Branding ve Görsel Kimlik](#branding)
4. [Konum ve Harita Ayarları](#konum)
5. [Deployment ve Domain](#deployment)
6. [Ödeme ve Fiyatlandırma](#ödeme)
7. [Destek ve Bakım](#destek)

---

## 1️⃣ Temel Değişiklikler (Zorunlu)

### A. Şirket Bilgileri

#### 1. Uygulama İsmi
**Dosya:** `android/app/src/main/res/values/strings.xml`
```xml
<resources>
    <string name="app_name">YeniKuryeŞirketi</string>
    <string name="title_activity_main">YeniKuryeŞirketi</string>
</resources>
```

**Dosya:** `capacitor.config.ts`
```typescript
const config: CapacitorConfig = {
  appId: 'com.yenikuryesirketi.app',
  appName: 'YeniKuryeŞirketi',
  webDir: 'out'
};
```

**Dosya:** `package.json`
```json
{
  "name": "yenikuryesirketi",
  "version": "1.0.0"
}
```

---

#### 2. Package Name / Bundle ID
**Dosya:** `android/app/build.gradle`
```gradle
defaultConfig {
    applicationId "com.yenikuryesirketi.app"
    versionCode 1
    versionName "1.0.0"
}
```

**Komut:**
```bash
# Tüm dosyalarda package name değiştir
find . -type f -name "*.java" -o -name "*.kt" | xargs sed -i 's/com.mergen.kurye/com.yenikuryesirketi.app/g'
```

---

#### 3. Uygulama İkonları
**Konum:** `android/app/src/main/res/mipmap-*/`

**Gerekli Boyutlar:**
- mdpi: 48x48
- hdpi: 72x72
- xhdpi: 96x96
- xxhdpi: 144x144
- xxxhdpi: 192x192

**Dosyalar:**
- `ic_launcher.png` (kare ikon)
- `ic_launcher_round.png` (yuvarlak ikon)
- `ic_launcher_foreground.png` (adaptive icon ön plan)

**Araç:** [Android Asset Studio](https://romannurik.github.io/AndroidAssetStudio/icons-launcher.html)

---

#### 4. Splash Screen
**Dosya:** `android/app/src/main/res/values/colors.xml`
```xml
<resources>
    <color name="splash_background">#YeniRenk</color>
</resources>
```

**Dosya:** `android/app/src/main/res/drawable/splash_background.xml`
```xml
<?xml version="1.0" encoding="utf-8"?>
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
    <item android:drawable="@color/splash_background"/>
    <item>
        <bitmap
            android:gravity="center"
            android:src="@mipmap/ic_launcher"/>
    </item>
</layer-list>
```

---

### B. Branding (Marka Kimliği)

#### 1. Renkler
**Dosya:** `src/app/globals.css` veya `tailwind.config.ts`

**Değiştirilecek Renkler:**
- Primary: `#f97316` (turuncu) → Yeni marka rengi
- Secondary: `#1e293b` (koyu gri) → Yeni ikincil renk
- Accent: `#22c55e` (yeşil) → Yeni vurgu rengi

**Örnek:**
```css
:root {
  --primary: #3b82f6; /* Mavi */
  --secondary: #1e40af;
  --accent: #10b981;
}
```

---

#### 2. Logo ve Görseller
**Değiştirilecek Dosyalar:**
- `public/logo.png` (web logo)
- `public/favicon.ico` (tarayıcı ikonu)
- `android/app/src/main/res/mipmap-*/ic_launcher.png`

**Kullanılan Yerler:**
- Giriş ekranı
- Müşteri takip sayfası
- Admin paneli
- E-postalar (gelecekte)

---

#### 3. Metin ve Sloganlar
**Dosya:** `src/app/page.tsx` (Ana sayfa)
```typescript
<h1>YeniKuryeŞirketi</h1>
<p>Hızlı ve Güvenilir Teslimat</p>
```

**Dosya:** `src/app/takip/page.tsx` (Müşteri takip)
```typescript
<h1>YeniKuryeŞirketi</h1>
<p>Siparişinizi Takip Edin</p>
```

**Aranacak Kelimeler:**
- "Mergen Kurye"
- "Mergen"
- "mergen"

**Komut:**
```bash
grep -r "Mergen" src/
```

---

## 2️⃣ Veritabanı Yapılandırması

### A. Yeni Supabase Projesi

#### 1. Proje Oluştur
1. [Supabase Dashboard](https://supabase.com/dashboard) → New Project
2. Proje adı: `yenikuryesirketi-prod`
3. Database password: Güçlü şifre oluştur
4. Region: Europe (Frankfurt) veya en yakın

---

#### 2. Veritabanı Şeması
**SQL Script Çalıştır:**

```sql
-- Kuryeler tablosu
CREATE TABLE couriers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  is_active BOOLEAN DEFAULT false,
  last_location JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Restoranlar tablosu
CREATE TABLE restaurants (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Paketler tablosu
CREATE TABLE packages (
  id SERIAL PRIMARY KEY,
  order_number TEXT UNIQUE,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  delivery_address TEXT NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  amount DECIMAL(10, 2) NOT NULL,
  status TEXT DEFAULT 'waiting',
  payment_method TEXT,
  platform TEXT,
  courier_id UUID REFERENCES couriers(id),
  restaurant_id INTEGER REFERENCES restaurants(id),
  created_at TIMESTAMP DEFAULT NOW(),
  assigned_at TIMESTAMP,
  picked_up_at TIMESTAMP,
  delivered_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  cancelled_by TEXT,
  cancellation_reason TEXT
);

-- Admin kullanıcıları
CREATE TABLE admin_users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Realtime için
ALTER PUBLICATION supabase_realtime ADD TABLE packages;
ALTER PUBLICATION supabase_realtime ADD TABLE couriers;
```

---

#### 3. Environment Variables
**Dosya:** `.env.local`
```env
NEXT_PUBLIC_SUPABASE_URL=https://yeniproje.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=yeni_anon_key_buraya
```

**Güvenlik:**
- `.env.local` dosyasını asla Git'e commit etme
- Her müşteri için farklı Supabase projesi
- Production ve Development ortamları ayır

---

### B. İlk Veriler (Seed Data)

#### 1. Admin Kullanıcısı
```sql
INSERT INTO admin_users (username, password_hash)
VALUES ('admin', '$2a$10$...');  -- bcrypt hash
```

**Not:** Şifre hash'i oluşturmak için:
```bash
npm install bcryptjs
node -e "console.log(require('bcryptjs').hashSync('admin123', 10))"
```

---

#### 2. Test Restoranı
```sql
INSERT INTO restaurants (name, phone, address, latitude, longitude)
VALUES (
  'Test Restoran',
  '05001234567',
  'Test Mahallesi, Test Sokak No:1',
  38.3552,
  38.3095
);
```

---

## 3️⃣ Konum ve Harita Ayarları

### A. Şehir Koordinatları

**Dosya:** `src/app/admin/components/LiveMapComponent.tsx`
```typescript
const [mapCenter] = useState<[number, number]>([
  YeniSehirLatitude,  // Örn: 41.0082 (İstanbul)
  YeniSehirLongitude  // Örn: 28.9784
])
```

**Dosya:** `src/app/kurye/page.tsx`
```typescript
// Malatya sınırları kontrolü → Yeni şehir sınırları
const isInCity = 
  latitude >= MinLatitude && latitude <= MaxLatitude && 
  longitude >= MinLongitude && longitude <= MaxLongitude
```

**Şehir Sınırları Bulma:**
1. [BoundingBox](http://boundingbox.klokantech.com/) sitesine git
2. Şehri seç
3. CSV formatında koordinatları al

**Örnek (İstanbul):**
```typescript
const isInIstanbul = 
  latitude >= 40.8 && latitude <= 41.3 && 
  longitude >= 28.5 && longitude <= 29.5
```

---

### B. Müşteri Takip Sayfası

**Dosya:** `src/app/takip/components/CustomerTrackingMap.tsx`
```typescript
// Fallback koordinatları
: [YeniSehirLatitude, YeniSehirLongitude] // Yeni şehir merkezi
```

---

## 4️⃣ Deployment ve Domain

### A. Domain Ayarları

#### 1. Domain Satın Al
- Namecheap, GoDaddy, veya Türk sağlayıcı
- Örnek: `yenikuryesirketi.com.tr`

---

#### 2. Vercel Deployment
```bash
# Vercel CLI kur
npm i -g vercel

# Deploy et
vercel --prod

# Custom domain ekle
vercel domains add yenikuryesirketi.com.tr
```

**DNS Ayarları:**
```
A Record: @ → 76.76.21.21
CNAME: www → cname.vercel-dns.com
```

---

#### 3. SSL Sertifikası
- Vercel otomatik Let's Encrypt sertifikası sağlar
- Hiçbir şey yapman gerekmez

---

### B. Environment Variables (Production)

**Vercel Dashboard:**
1. Project Settings → Environment Variables
2. Ekle:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Production, Preview, Development için ayrı değerler

---

### C. Android App Signing

#### 1. Yeni Keystore Oluştur
```bash
keytool -genkey -v -keystore yenikuryesirketi.keystore -alias yenikuryesirketi -keyalg RSA -keysize 2048 -validity 10000
```

**Sorular:**
- İsim: YeniKuryeŞirketi Ltd.
- Şehir: İstanbul
- Ülke: TR

---

#### 2. Key Properties
**Dosya:** `android/key.properties`
```properties
storePassword=güçlü_şifre
keyPassword=güçlü_şifre
keyAlias=yenikuryesirketi
storeFile=../yenikuryesirketi.keystore
```

**Güvenlik:** Bu dosyayı asla Git'e commit etme!

---

## 5️⃣ Ödeme ve Fiyatlandırma

### A. Fiyatlandırma Modelleri

#### Model 1: Tek Seferlik Satış
```
Lisans Ücreti: 50,000 - 150,000 TL
+ Kurulum: 10,000 TL
+ Eğitim: 5,000 TL
---
Toplam: 65,000 - 165,000 TL
```

**Avantajlar:**
- Tek ödeme
- Müşteri kodu sahiplenir

**Dezavantajlar:**
- Bakım ve güncelleme ayrı ücret
- Sürekli gelir yok

---

#### Model 2: Aylık Abonelik (SaaS)
```
Kurulum: 20,000 TL (bir kez)
Aylık: 2,000 - 5,000 TL/ay
+ Kurye başına: 50 TL/ay
+ Restoran başına: 100 TL/ay
```

**Avantajlar:**
- Sürekli gelir
- Bakım ve güncelleme dahil
- Müşteri bağlılığı

**Dezavantajlar:**
- Müşteri kodu sahiplenmiyor
- Sunucu maliyetleri senin

---

#### Model 3: Hibrit (Önerilen)
```
Lisans: 80,000 TL (bir kez)
+ Kurulum: 15,000 TL
+ Eğitim: 5,000 TL
+ Bakım: 1,500 TL/ay (opsiyonel)
+ Güncelleme: 500 TL/güncelleme
```

**Avantajlar:**
- İlk ödeme yüksek
- Sürekli gelir (bakım)
- Müşteri kodu sahiplenir

---

### B. Neleri Dahil Et

#### Temel Paket
- ✅ Kaynak kod
- ✅ Veritabanı şeması
- ✅ Kurulum dokümanı
- ✅ 1 ay teknik destek
- ✅ Branding değişiklikleri

#### Premium Paket
- ✅ Temel paket +
- ✅ Custom özellikler (3 adet)
- ✅ 6 ay teknik destek
- ✅ Aylık güncelleme
- ✅ Öncelikli destek

#### Enterprise Paket
- ✅ Premium paket +
- ✅ Sınırsız özellik
- ✅ 1 yıl teknik destek
- ✅ Haftalık güncelleme
- ✅ 7/24 destek
- ✅ Özel eğitim

---

## 6️⃣ Destek ve Bakım

### A. Dokümantasyon

#### 1. Kullanıcı Kılavuzu
**İçerik:**
- Admin paneli kullanımı
- Kurye uygulaması kullanımı
- Restoran paneli kullanımı
- Sık sorulan sorular
- Sorun giderme

**Format:** PDF + Video

---

#### 2. Teknik Dokümantasyon
**İçerik:**
- Kurulum adımları
- Veritabanı şeması
- API referansı
- Deployment rehberi
- Güvenlik best practices

**Format:** Markdown + GitHub Wiki

---

### B. Eğitim

#### 1. Admin Eğitimi (2 saat)
- Sistem genel bakış
- Kurye yönetimi
- Restoran yönetimi
- Sipariş takibi
- Raporlar ve istatistikler

---

#### 2. Kurye Eğitimi (1 saat)
- Uygulama kurulumu
- Giriş yapma
- Sipariş kabul etme
- Teslimat süreci
- Sesli komutlar

---

#### 3. Restoran Eğitimi (1 saat)
- Panel kullanımı
- Sipariş oluşturma
- Kurye atama
- Borç takibi

---

### C. Destek Kanalları

#### 1. Ticket Sistemi
- Zendesk, Freshdesk, veya custom
- Öncelik seviyeleri: Düşük, Orta, Yüksek, Kritik
- SLA: 24 saat (normal), 4 saat (kritik)

---

#### 2. WhatsApp Business
- Hızlı sorular için
- Sadece çalışma saatleri
- Otomatik yanıtlar

---

#### 3. E-posta
- destek@seninfirman.com
- Detaylı sorular için
- Ekran görüntüleri ve loglar

---

## 7️⃣ Checklist (Satış Öncesi)

### Teknik Hazırlık
- [ ] Tüm "Mergen" referansları değiştirildi
- [ ] Yeni şirket bilgileri eklendi
- [ ] Yeni logo ve ikonlar hazırlandı
- [ ] Renkler değiştirildi
- [ ] Konum sınırları güncellendi
- [ ] Yeni Supabase projesi oluşturuldu
- [ ] Environment variables ayarlandı
- [ ] Keystore oluşturuldu
- [ ] AAB dosyası build alındı
- [ ] Domain satın alındı
- [ ] SSL sertifikası aktif
- [ ] Production deploy edildi

### Dokümantasyon
- [ ] Kullanıcı kılavuzu hazırlandı
- [ ] Teknik dokümantasyon tamamlandı
- [ ] Video eğitimler çekildi
- [ ] FAQ hazırlandı
- [ ] Sorun giderme rehberi yazıldı

### Yasal
- [ ] Lisans sözleşmesi hazırlandı
- [ ] Gizlilik politikası eklendi
- [ ] Kullanım şartları eklendi
- [ ] KVKK uyumluluğu sağlandı
- [ ] Fatura kesildi

### Eğitim ve Teslimat
- [ ] Admin eğitimi verildi
- [ ] Kurye eğitimi verildi
- [ ] Restoran eğitimi verildi
- [ ] Test verileri eklendi
- [ ] Canlı test yapıldı
- [ ] Kaynak kod teslim edildi
- [ ] Veritabanı erişimi verildi
- [ ] Destek kanalları aktif

---

## 8️⃣ Otomasyon Scripti

### White-Label Script
**Dosya:** `whitelabel.sh`

```bash
#!/bin/bash

# Kullanım: ./whitelabel.sh "YeniŞirket" "com.yenisirket.app" "41.0082" "28.9784"

COMPANY_NAME=$1
PACKAGE_NAME=$2
LATITUDE=$3
LONGITUDE=$4

echo "🔄 White-label işlemi başlatılıyor..."

# 1. Uygulama ismi değiştir
find . -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.json" -o -name "*.xml" \) \
  -exec sed -i "s/Mergen Kurye/$COMPANY_NAME/g" {} +

# 2. Package name değiştir
find . -type f \( -name "*.gradle" -o -name "*.ts" -o -name "*.json" \) \
  -exec sed -i "s/com.mergen.kurye/$PACKAGE_NAME/g" {} +

# 3. Koordinatları değiştir
sed -i "s/38.3552/$LATITUDE/g" src/app/admin/components/LiveMapComponent.tsx
sed -i "s/38.3095/$LONGITUDE/g" src/app/admin/components/LiveMapComponent.tsx

echo "✅ White-label işlemi tamamlandı!"
echo "📝 Şimdi yapman gerekenler:"
echo "  1. Logo ve ikonları değiştir"
echo "  2. Renkleri güncelle (tailwind.config.ts)"
echo "  3. .env.local dosyasını düzenle"
echo "  4. Keystore oluştur"
echo "  5. Build al: npm run build && npx cap sync android"
```

**Kullanım:**
```bash
chmod +x whitelabel.sh
./whitelabel.sh "Hızlı Kurye" "com.hizlikurye.app" "41.0082" "28.9784"
```

---

## 9️⃣ Fiyatlandırma Önerisi (Türkiye)

### Küçük İşletme (1-5 kurye)
```
Lisans: 50,000 TL
Kurulum: 10,000 TL
Eğitim: 5,000 TL
---
Toplam: 65,000 TL

Aylık Bakım (opsiyonel): 1,000 TL/ay
```

### Orta İşletme (6-20 kurye)
```
Lisans: 100,000 TL
Kurulum: 15,000 TL
Eğitim: 7,500 TL
Custom Özellik (3 adet): 15,000 TL
---
Toplam: 137,500 TL

Aylık Bakım: 2,000 TL/ay
```

### Büyük İşletme (20+ kurye)
```
Lisans: 200,000 TL
Kurulum: 25,000 TL
Eğitim: 10,000 TL
Custom Özellik (sınırsız): 50,000 TL
Özel Entegrasyonlar: 30,000 TL
---
Toplam: 315,000 TL

Aylık Bakım: 5,000 TL/ay
```

---

## 🎯 Özet

**Minimum Süre:** 2-3 gün (temel değişiklikler)
**Önerilen Süre:** 1-2 hafta (test ve eğitim dahil)

**Kritik Noktalar:**
1. Her müşteri için ayrı Supabase projesi
2. Her müşteri için ayrı keystore
3. Her müşteri için ayrı domain
4. Kaynak kodu Git'te sakla (private repo)
5. Lisans sözleşmesi imzalat
6. Destek süresi belirt
7. Güncelleme politikası belirle

**Başarı İçin:**
- Detaylı dokümantasyon
- Kapsamlı eğitim
- Hızlı destek
- Düzenli güncellemeler
- Müşteri memnuniyeti

---

**Hazırlayan:** Kiro AI
**Proje:** Mergen Kurye Sistemi
**Tarih:** 11.02.2026
