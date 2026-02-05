# 🚀 Çok Şirketli Sistem - Hızlı Başlangıç

## ✅ Oluşturulan Dosyalar

1. **`src/app/login/page.tsx`** - Yeni giriş sayfası (3 rol seçimi)
2. **`src/services/authService.ts`** - Auth servisi (giriş/çıkış/session)
3. **`database_multi_company_schema.sql`** - Veritabanı migration
4. **`MULTI_COMPANY_SETUP.md`** - Detaylı kurulum rehberi

## 🎯 Hızlı Test

### 1. Veritabanını Güncelle
```bash
# Supabase SQL Editor'de database_multi_company_schema.sql dosyasını çalıştır
```

### 2. Giriş Yap
```
URL: http://localhost:3000/login

Test Kullanıcısı:
- Şirket Kodu: MERGEN001
- Kullanıcı Adı: admin
- Şifre: admin123
```

### 3. Sistem Özellikleri

✅ **Şirket Bazlı İzolasyon**
- Her şirket kendi verilerini görür
- Aynı kullanıcı adı farklı şirketlerde olabilir

✅ **Dinamik Tema**
- Her şirket kendi renklerine sahip
- Giriş yapınca otomatik uygulanır

✅ **3 Rol Tipi**
- 🏍️ Kurye Girişi → `/kurye`
- 🍽️ Restoran Girişi → `/restoran`
- 👨‍💼 Admin Girişi → `/`

## 📊 Veritabanı Yapısı

```
companies (Şirketler)
├── company_code (MERGEN001, DEMO001)
├── company_name
├── theme_primary_color
└── logo_url

users (Tüm Kullanıcılar)
├── company_id → companies
├── username
├── password
├── user_type (admin/courier/restaurant)
└── UNIQUE(company_id, username)

couriers → company_id eklendi
restaurants → company_id eklendi
packages → company_id eklendi
```

## 🔐 Güvenlik

- ✅ Row Level Security (RLS) aktif
- ⚠️ Şifreler şu anda düz metin (bcrypt eklenecek)
- ✅ Şirketler arası veri izolasyonu

## 🎨 Tema Sistemi

Giriş yapınca otomatik uygulanır:
```css
--color-primary: #f97316
--color-secondary: #ea580c
--color-accent: #fb923c
```

## 📝 Sonraki Adımlar

1. ✅ Migration'ı çalıştır
2. ✅ Test kullanıcısı ile giriş yap
3. ⏳ Mevcut verileri migration et
4. ⏳ Bcrypt şifreleme ekle
5. ⏳ Logo upload sistemi
6. ⏳ Şirket yönetim paneli

## 🐛 Bilinen Sorunlar

- Şifreler düz metin (üretim için bcrypt gerekli)
- Eski sayfalar hala eski auth sistemini kullanıyor (uyumlu)
- Logo upload sistemi yok (manuel URL girişi)

## 📚 Detaylı Dokümantasyon

Tüm detaylar için: `MULTI_COMPANY_SETUP.md`
