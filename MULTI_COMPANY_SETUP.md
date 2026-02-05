# 🏢 Çok Şirketli Sistem Kurulum Rehberi

## 📋 Genel Bakış

Mergen Kurye Sistemi artık çok şirketli (multi-tenant) mimariye sahip. Her şirket kendi kullanıcıları, kuryeleri, restoranları ve paketleri ile izole bir şekilde çalışabilir.

## 🎯 Özellikler

- ✅ **Şirket Bazlı İzolasyon**: Her şirket sadece kendi verilerini görür
- ✅ **Benzersiz Kimlik**: Şirket kodu + kullanıcı adı kombinasyonu
- ✅ **Dinamik Tema**: Her şirket kendi renklerine sahip
- ✅ **Rol Bazlı Giriş**: Admin, Kurye, Restoran ayrı giriş ekranları
- ✅ **Güvenli**: Row Level Security (RLS) ile veri koruması

## 🚀 Kurulum Adımları

### 1. Veritabanı Migration

Supabase SQL Editor'de `database_multi_company_schema.sql` dosyasını çalıştırın:

```bash
# Dosya içeriğini kopyalayın ve Supabase SQL Editor'e yapıştırın
```

Bu işlem:
- `companies` tablosunu oluşturur
- `users` tablosunu oluşturur
- Mevcut tablolara `company_id` ekler
- Örnek şirket ve kullanıcılar oluşturur
- RLS politikalarını aktif eder

### 2. Test Kullanıcıları

Migration sonrası otomatik oluşturulan test kullanıcıları:

#### MERGEN001 Şirketi:
- **Admin**: 
  - Şirket Kodu: `MERGEN001`
  - Kullanıcı Adı: `admin`
  - Şifre: `admin123`

- **Kurye**:
  - Şirket Kodu: `MERGEN001`
  - Kullanıcı Adı: `kurye1`
  - Şifre: `kurye123`

- **Restoran**:
  - Şirket Kodu: `MERGEN001`
  - Kullanıcı Adı: `restoran1`
  - Şifre: `restoran123`

#### DEMO001 Şirketi:
- **Admin**:
  - Şirket Kodu: `DEMO001`
  - Kullanıcı Adı: `admin`
  - Şifre: `demo123`

- **Kurye**:
  - Şirket Kodu: `DEMO001`
  - Kullanıcı Adı: `kurye1`
  - Şifre: `demo123`

### 3. Giriş Sayfası

Yeni giriş sayfası: `/login`

Kullanıcılar önce rolünü seçer (Kurye/Restoran/Admin), sonra:
1. Şirket Kodu
2. Kullanıcı Adı
3. Şifre

girerek sisteme giriş yapar.

### 4. Mevcut Verileri Migration

Mevcut kurye, restoran ve paketleri yeni sisteme taşımak için:

```sql
-- Örnek: Mevcut kuryeleri MERGEN001 şirketine bağla
UPDATE couriers 
SET company_id = (SELECT id FROM companies WHERE company_code = 'MERGEN001')
WHERE company_id IS NULL;

-- Örnek: Mevcut restoranları MERGEN001 şirketine bağla
UPDATE restaurants 
SET company_id = (SELECT id FROM companies WHERE company_code = 'MERGEN001')
WHERE company_id IS NULL;

-- Örnek: Mevcut paketleri MERGEN001 şirketine bağla
UPDATE packages 
SET company_id = (SELECT id FROM companies WHERE company_code = 'MERGEN001')
WHERE company_id IS NULL;
```

## 🎨 Tema Özelleştirme

Her şirket kendi tema renklerine sahip olabilir:

```sql
UPDATE companies 
SET 
  theme_primary_color = '#3b82f6',  -- Mavi
  theme_secondary_color = '#2563eb',
  theme_accent_color = '#60a5fa'
WHERE company_code = 'DEMO001';
```

Renkler otomatik olarak CSS değişkenlerine uygulanır:
- `--color-primary`
- `--color-secondary`
- `--color-accent`

## 🔐 Güvenlik

### Row Level Security (RLS)

Tüm tablolarda RLS aktif. Kullanıcılar sadece kendi şirketlerinin verilerini görebilir.

### Şifre Güvenliği

⚠️ **ÖNEMLİ**: Şu anda şifreler düz metin olarak saklanıyor. Üretim ortamında mutlaka bcrypt kullanın:

```typescript
// Frontend'de şifre hash'leme
import bcrypt from 'bcryptjs'

const hashedPassword = await bcrypt.hash(password, 10)
```

## 📱 Kullanım

### Yeni Şirket Ekleme

```sql
INSERT INTO companies (company_code, company_name, logo_url, theme_primary_color)
VALUES ('ACME001', 'ACME Kurye', '/logos/acme.png', '#10b981');
```

### Yeni Kullanıcı Ekleme

```sql
INSERT INTO users (company_id, username, password, full_name, user_type, email)
VALUES (
  (SELECT id FROM companies WHERE company_code = 'ACME001'),
  'kurye2',
  'sifre123',
  'Mehmet Demir',
  'courier',
  'mehmet@acme.com'
);
```

### Kullanıcı Silme

```sql
-- Kullanıcıyı pasif yap (silme yerine)
UPDATE users 
SET is_active = false 
WHERE username = 'kurye2' AND company_id = (SELECT id FROM companies WHERE company_code = 'ACME001');
```

## 🔄 Eski Sistem ile Uyumluluk

Auth servisi eski localStorage anahtarlarını da destekler:
- `kurye_logged_in`
- `restoran_logged_in`
- `admin_logged_in`

Bu sayede mevcut sayfalar çalışmaya devam eder.

## 🐛 Sorun Giderme

### "Geçersiz şirket kodu" hatası
- Şirket kodunu büyük harfle girin (MERGEN001)
- Şirketin `is_active = true` olduğundan emin olun

### "Kullanıcı adı veya şifre hatalı"
- Kullanıcı adı ve şifrenin doğru olduğundan emin olun
- Kullanıcının `is_active = true` olduğundan emin olun
- Doğru rol seçildiğinden emin olun (Kurye/Restoran/Admin)

### Tema renkleri uygulanmıyor
- Tarayıcı cache'ini temizleyin
- `localStorage.getItem('auth_user')` kontrolü yapın
- CSS değişkenlerinin tanımlı olduğundan emin olun

## 📚 API Referansı

### authService.ts

```typescript
// Giriş yap
const response = await login({
  companyCode: 'MERGEN001',
  username: 'admin',
  password: 'admin123',
  userType: 'admin'
})

// Session al
const user = getSession()

// Çıkış yap
logout()

// Giriş kontrolü
if (isAuthenticated()) {
  // Kullanıcı giriş yapmış
}

// Rol kontrolü
if (hasRole('admin')) {
  // Kullanıcı admin
}
```

## 🎯 Sonraki Adımlar

1. ✅ Veritabanı migration'ı çalıştır
2. ✅ Test kullanıcıları ile giriş yap
3. ✅ Mevcut verileri migration et
4. ⏳ Şifreleri bcrypt ile hash'le
5. ⏳ RLS politikalarını Supabase Auth ile entegre et
6. ⏳ Logo upload sistemi ekle
7. ⏳ Şirket yönetim paneli oluştur

## 📞 Destek

Sorularınız için: [GitHub Issues](https://github.com/okanozdemirrrr/mergenkurye/issues)
