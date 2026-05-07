# 🚨 Kritik: SERVICE_ROLE_KEY Eksik!

## Sorun
Restoran panelinde sipariş iptal ederken **"Invalid API key"** hatası alınıyor.

**Neden:** Vercel'de `SERVICE_ROLE_KEY` environment variable'ı eksik.

## ✅ Çözüm (2 Dakika)

### 1. Vercel Dashboard'a Git
https://vercel.com/okans-projects-f29cee75/mergenkuryesistem/settings/environment-variables

### 2. "Add New" Butonuna Tıkla

### 3. Şu Bilgileri Gir:

```
Name: SERVICE_ROLE_KEY
Value: sb_secret_9CfOQBAR_eFgmjiGo46xVA_YxKXfD3_
Environments: ✅ Production ✅ Preview ✅ Development
```

### 4. "Save" Butonuna Tıkla

### 5. Redeploy Yap

**Seçenek A:** Vercel Dashboard'dan
- Deployments sekmesine git
- En son deployment'ın yanındaki "..." menüsüne tıkla
- "Redeploy" seç

**Seçenek B:** Git Push ile
```bash
git commit --allow-empty -m "trigger redeploy"
git push
```

## 🎯 Yapılan İyileştirmeler

### 1. ✅ Hata Maskeleme Kaldırıldı
**Önce:**
```
❌ Paket bulunamadı
```

**Şimdi:**
```
🔧 Sistem Yapılandırma Hatası

Sunucu API anahtarı geçersiz veya eksik. 
Lütfen sistem yöneticisine bildirin.

📋 Teknik Detay: Supabase SERVICE_ROLE_KEY environment variable eksik veya hatalı

💡 Çözüm: Vercel Dashboard → Settings → Environment Variables → SERVICE_ROLE_KEY kontrol edin
```

### 2. ✅ Environment Variables Kontrolü
```typescript
// Artık eksik API key'leri tespit ediyoruz
if (!supabaseServiceKey) {
  console.error('❌ SERVICE_ROLE_KEY eksik!')
  console.warn('⚠️ Production ortamında SERVICE_ROLE_KEY mutlaka tanımlanmalı!')
}
```

### 3. ✅ Detaylı Error Handling
- **500 Errors:** Sistem yapılandırma hataları (API key eksik)
- **404 Errors:** Paket bulunamadı (gerçek 404)
- **403 Errors:** Yetkilendirme hataları (RLS, yetki)
- **Network Errors:** Bağlantı sorunları

### 4. ✅ Debug Bilgileri
Her hata mesajında:
- Teknik detaylar
- Hata kodu ve mesajı
- Çözüm önerileri
- Debug bilgileri

## 🔍 Test Adımları

SERVICE_ROLE_KEY ekledikten ve redeploy yaptıktan sonra:

1. **Restoran paneline giriş yap**
2. **Bir siparişi iptal etmeyi dene**
3. **Beklenen sonuç:**
   - ✅ Sipariş başarıyla iptal edildi
   - 📱 Kurye bilgilendirildi (eğer atanmışsa)
   - 📊 Admin log kaydedildi

4. **Eğer hala hata alırsan:**
   - Console'u aç (F12)
   - Hata mesajını oku
   - Teknik detayları kontrol et
   - Bana ekran görüntüsü at

## 📋 Diğer Eksik Environment Variables

SERVICE_ROLE_KEY'den sonra bunları da ekle (opsiyonel ama önerilen):

```
NEXT_PUBLIC_BASE_URL=https://mergenkuryesistem.vercel.app
NEXT_PUBLIC_ADMIN_USERNAME=admin
NEXT_PUBLIC_ADMIN_PASSWORD=admin123
```

**Not:** Admin şifresini production'da mutlaka değiştir!

## 🔒 Güvenlik Notu

SERVICE_ROLE_KEY çok güçlü bir anahtar - tüm RLS policy'lerini bypass eder. 

**Önerilen:**
- Sadece server-side (API routes) kullan ✅
- Client-side'da asla kullanma ❌
- Production'da farklı key kullan
- Düzenli olarak rotate et

## 📚 Kaynaklar

- [Supabase Service Role Key](https://supabase.com/docs/guides/api/api-keys)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)
