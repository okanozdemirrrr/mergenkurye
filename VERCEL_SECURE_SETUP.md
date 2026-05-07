# Vercel Güvenli Environment Variables Kurulumu

## ⚠️ Güvenlik Uyarısı
Vercel, hassas bilgileri (private keys, service account keys) environment variables olarak eklemeyi önermez. Bunun yerine:

1. **Hassas bilgiler için**: Vercel KV, Vercel Postgres, veya harici secret manager kullan
2. **Public bilgiler için**: Environment variables kullanabilirsin

## 🔐 Çözüm 1: Firebase Admin SDK'yı Sunucu Tarafında Kullan

Firebase Service Account Key'i environment variable olarak saklamak yerine, Vercel'in önerdiği yöntem:

### Adım 1: Firebase Service Account Key'i Base64'e Çevir

```bash
# PowerShell'de
$json = Get-Content firebase-service-account.json -Raw
$bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
$base64 = [Convert]::ToBase64String($bytes)
echo $base64
```

### Adım 2: Vercel'e Base64 String Olarak Ekle

Vercel Dashboard → Settings → Environment Variables:

```
Name: FIREBASE_SERVICE_ACCOUNT_BASE64
Value: <base64_string>
Environments: Production, Preview, Development
```

### Adım 3: Kodda Decode Et

```typescript
// src/lib/firebase-admin.ts
const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64
if (serviceAccountBase64) {
  const serviceAccount = JSON.parse(
    Buffer.from(serviceAccountBase64, 'base64').toString('utf-8')
  )
  // Firebase Admin SDK'yı başlat
}
```

## 🔐 Çözüm 2: Supabase Service Role Key İçin

Supabase Service Role Key zaten Vercel'de var ama güvenli değil. Alternatif:

### Seçenek A: Supabase RLS (Row Level Security) Kullan
- Service Role Key yerine Anon Key kullan
- RLS policy'leri ile güvenliği sağla
- Daha güvenli ve önerilen yöntem

### Seçenek B: Supabase Edge Functions
- Hassas işlemleri Supabase Edge Functions'da yap
- Next.js API'den Edge Function'ı çağır
- Service Role Key Supabase'de kalır

## 📋 Güvenli Environment Variables Listesi

### ✅ Güvenli (Public - Eklenebilir)

```
NEXT_PUBLIC_SUPABASE_URL=https://otrjbpwirwgrxmezyuwg.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_ZCcSWwHpTLAH7-yDSh1dqA_1C2krw19
NEXT_PUBLIC_BASE_URL=https://mergenkuryesistem.vercel.app
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyBmOsnmV_WbYY-OziaOzbsuKxxuSSwSIuc
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=alda-gel-kurye-d0537.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=alda-gel-kurye-d0537
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=alda-gel-kurye-d0537.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=1009357218748
NEXT_PUBLIC_FIREBASE_APP_ID=1:1009357218748:android:b010d01ec02fcc26fb01b9
NEXT_PUBLIC_FIREBASE_VAPID_KEY=BPEGxaVPJTLFzEGPRLPvdGVCMK_gD7pqRLmMqKpCRa-KmRKCFTHMXNGGCqGdLR_RJmyaM
```

### ⚠️ Hassas (Private - Özel Yöntem Gerekli)

```
SERVICE_ROLE_KEY → Supabase RLS kullan veya Edge Functions
FIREBASE_SERVICE_ACCOUNT_KEY → Base64 encode et veya Vercel KV kullan
```

### 🔓 Geçici Admin Credentials (Değiştirilmeli)

```
NEXT_PUBLIC_ADMIN_USERNAME=admin
NEXT_PUBLIC_ADMIN_PASSWORD=admin123
```

**ÖNEMLİ:** Production'da bu şifreleri mutlaka değiştir!

## 🚀 Hızlı Çözüm (Şimdilik)

Eğer hızlıca çalışır hale getirmek istiyorsan:

1. **Sadece public değişkenleri ekle** (yukarıdaki ✅ liste)
2. **Hassas değişkenleri şimdilik ekle** ama sonra güvenli yönteme geç
3. **Admin şifresini production'da değiştir**

## 🔒 Uzun Vadeli Çözüm (Önerilen)

1. **Supabase RLS Policy'leri Oluştur**
   - Service Role Key yerine Anon Key kullan
   - RLS ile güvenliği sağla

2. **Firebase Admin SDK'yı Vercel KV'de Sakla**
   - Vercel KV (Key-Value Store) kullan
   - Veya Vercel Blob Storage

3. **Admin Authentication'ı Güçlendir**
   - Supabase Auth kullan
   - JWT token ile oturum yönetimi

## 📚 Kaynaklar

- [Vercel Environment Variables Best Practices](https://vercel.com/docs/concepts/projects/environment-variables)
- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Firebase Admin SDK on Vercel](https://firebase.google.com/docs/admin/setup)
