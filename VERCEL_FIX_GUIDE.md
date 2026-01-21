# 🔧 VERCEL DEPLOYMENT FIX - ADIM ADIM

## SORUN
Vercel build sırasında "Missing Supabase environment variables" hatası alıyorsun.

## ÇÖZÜM - ADIM ADIM

### 1️⃣ Vercel Dashboard'a Git
- https://vercel.com/dashboard adresine git
- "mergenkurye" projesini bul ve tıkla

### 2️⃣ Settings > Environment Variables
- Sol menüden **Settings** sekmesine tıkla
- **Environment Variables** bölümüne git

### 3️⃣ Environment Variables Ekle

**İlk Değişken:**
- Key: `NEXT_PUBLIC_SUPABASE_URL`
- Value: `https://otrjbpwirwgrxmezyuwg.supabase.co`
- Environments: ✅ Production ✅ Preview ✅ Development (HEPSİNİ İŞARETLE!)
- **Add** butonuna bas

**İkinci Değişken:**
- Key: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Value: `sb_publishable_ZCcSWwHpTLAH7-yDSh1dqA_1C2krw19`
- Environments: ✅ Production ✅ Preview ✅ Development (HEPSİNİ İŞARETLE!)
- **Add** butonuna bas

### 4️⃣ Redeploy
- **Deployments** sekmesine git
- En son deployment'ın sağındaki **3 nokta (...)** menüsüne tıkla
- **Redeploy** seçeneğine tıkla
- **Use existing Build Cache** seçeneğini KAPAT (unchecked)
- **Redeploy** butonuna bas

### 5️⃣ Build Logs'u İzle
- Deployment açılacak, **Building** aşamasını izle
- Yeşil ✅ görene kadar bekle

## ⚠️ HALA HATA ALIRSAN

Eğer hala hata alıyorsan, şu komutu çalıştır ve çıktıyı bana gönder:

```bash
npm run build
```

Yerel build başarılıysa sorun %100 Vercel environment variables'da.

## 📸 EKRAN GÖRÜNTÜLERİ GEREKİYORSA

1. Vercel Settings > Environment Variables sayfasının ekran görüntüsü
2. Build logs'un tamamının ekran görüntüsü (scroll yaparak tüm hatayı göster)
