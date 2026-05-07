# Vercel Environment Variables Kurulum Rehberi

## Sorun
Vercel deployment'ı başarısız oluyor çünkü gerekli environment variables eksik.

## Çözüm Adımları

### 1. Vercel Dashboard'a Git
https://vercel.com/okans-projects-f29cee75/mergenkuryesistem

### 2. Settings → Environment Variables'a Git

### 3. Aşağıdaki Değişkenleri Ekle

Her değişken için:
- "Add New" butonuna tıkla
- Name ve Value gir
- Environment seç: **Production, Preview, Development** (hepsini seç)
- "Save" butonuna tıkla

#### Eklenecek Değişkenler:

```
Name: SERVICE_ROLE_KEY
Value: sb_secret_9CfOQBAR_eFgmjiGo46xVA_YxKXfD3_
Environments: Production, Preview, Development
```

```
Name: NEXT_PUBLIC_ADMIN_USERNAME
Value: admin
Environments: Production, Preview, Development
```

```
Name: NEXT_PUBLIC_ADMIN_PASSWORD
Value: admin123
Environments: Production, Preview, Development
```

```
Name: NEXT_PUBLIC_BASE_URL
Value: https://mergenkuryesistem.vercel.app
Environments: Production, Preview, Development
```

```
Name: NEXT_PUBLIC_FIREBASE_API_KEY
Value: AIzaSyBmOsnmV_WbYY-OziaOzbsuKxxuSSwSIuc
Environments: Production, Preview, Development
```

```
Name: NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
Value: alda-gel-kurye-d0537.firebaseapp.com
Environments: Production, Preview, Development
```

```
Name: NEXT_PUBLIC_FIREBASE_PROJECT_ID
Value: alda-gel-kurye-d0537
Environments: Production, Preview, Development
```

```
Name: NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
Value: alda-gel-kurye-d0537.firebasestorage.app
Environments: Production, Preview, Development
```

```
Name: NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
Value: 1009357218748
Environments: Production, Preview, Development
```

```
Name: NEXT_PUBLIC_FIREBASE_APP_ID
Value: 1:1009357218748:android:b010d01ec02fcc26fb01b9
Environments: Production, Preview, Development
```

```
Name: NEXT_PUBLIC_FIREBASE_VAPID_KEY
Value: BPEGxaVPJTLFzEGPRLPvdGVCMK_gD7pqRLmMqKpCRa-KmRKCFTHMXNGGCqGdLR_RJmyaM
Environments: Production, Preview, Development
```

### 4. Yeni Deployment Başlat

Değişkenleri ekledikten sonra:

**Seçenek 1: Git Push ile**
```bash
git add .
git commit -m "trigger redeploy"
git push
```

**Seçenek 2: Vercel Dashboard'dan**
- Deployments sekmesine git
- En son deployment'ın yanındaki "..." menüsüne tıkla
- "Redeploy" seç

**Seçenek 3: Vercel CLI ile**
```bash
vercel --prod
```

### 5. Deployment Loglarını Kontrol Et

Deployment başladıktan sonra:
- Vercel Dashboard → Deployments
- En son deployment'a tıkla
- "Building" loglarını kontrol et
- Hata varsa detayları oku

## Mevcut Durum

✅ Zaten eklenmiş:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- FIREBASE_SERVICE_ACCOUNT_KEY

❌ Eksik (yukarıdaki adımlarla eklenecek):
- SERVICE_ROLE_KEY
- NEXT_PUBLIC_ADMIN_USERNAME
- NEXT_PUBLIC_ADMIN_PASSWORD
- NEXT_PUBLIC_BASE_URL
- NEXT_PUBLIC_FIREBASE_API_KEY
- NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
- NEXT_PUBLIC_FIREBASE_PROJECT_ID
- NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
- NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
- NEXT_PUBLIC_FIREBASE_APP_ID
- NEXT_PUBLIC_FIREBASE_VAPID_KEY

## Notlar

- Environment variables ekledikten sonra otomatik olarak yeni deployment başlamaz
- Manuel olarak redeploy yapman gerekiyor
- Production URL'ini değiştirmek istersen NEXT_PUBLIC_BASE_URL'i güncelle
- Admin şifresini production'da mutlaka değiştir (güvenlik için)
