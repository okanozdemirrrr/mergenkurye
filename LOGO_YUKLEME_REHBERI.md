# 🎨 Restoran Logosu Yükleme Rehberi

## Yöntem 1: Public Klasörü (Basit)

### Adımlar:
1. Logoyu hazırla (PNG/JPG, şeffaf arka plan için PNG öner)
2. Dosya adını düzenle (Türkçe karakter kullanma: `egodoner.png`)
3. Kopyala:
   ```bash
   copy "C:\path\to\logo.png" "public\restaurant-logos\restoran-adi.png"
   ```
4. Supabase SQL Editor'de çalıştır:
   ```sql
   UPDATE restaurants 
   SET logo_url = '/restaurant-logos/restoran-adi.png'
   WHERE name = 'Restoran Adı';
   ```
5. Sayfayı yenile ve test et

### Önemli Notlar:
- Dosya adında Türkçe karakter kullanma (ö → o, ü → u, ş → s)
- Dosya adında boşluk kullanma (tire kullan: `yeni-restoran.png`)
- Logo boyutu: Maksimum 500KB (optimize et)
- Önerilen boyut: 400x400px veya 800x800px (kare)

---

## Yöntem 2: Supabase Storage (Profesyonel)

### İlk Kurulum (Bir Kere):

1. **Bucket Oluştur:**
   - Supabase Dashboard > Storage > Create Bucket
   - Name: `restaurant-logos`
   - Public: ✅
   - Create

2. **Politikaları Ayarla:**
   ```sql
   -- Herkes görebilsin
   CREATE POLICY "Public Access"
   ON storage.objects FOR SELECT
   USING ( bucket_id = 'restaurant-logos' );

   -- Authenticated kullanıcılar yükleyebilsin
   CREATE POLICY "Authenticated users can upload"
   ON storage.objects FOR INSERT
   WITH CHECK ( bucket_id = 'restaurant-logos' AND auth.role() = 'authenticated' );
   ```

### Logo Yükleme (Her Seferinde):

1. **Dashboard'dan Yükle:**
   - Storage > restaurant-logos > Upload File
   - Dosya seç
   - Upload

2. **URL'i Kopyala:**
   - Dosyaya sağ tık > Copy URL
   - Örnek: `https://abc123.supabase.co/storage/v1/object/public/restaurant-logos/egodoner.png`

3. **Veritabanına Kaydet:**
   ```sql
   UPDATE restaurants 
   SET logo_url = 'KOPYALADIĞIN_URL'
   WHERE name = 'egodöner';
   ```

4. **Kontrol Et:**
   ```sql
   SELECT id, name, logo_url FROM restaurants WHERE name = 'egodöner';
   ```

---

## 🎯 Hangi Yöntemi Seçmeliyim?

| Özellik | Public Klasörü | Supabase Storage |
|---------|---------------|------------------|
| Basitlik | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| Hız | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Esneklik | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| Deploy Gereksinimi | ✅ Evet | ❌ Hayır |
| Önerilen | Geliştirme | Production |

**Önerim:** 
- Şimdilik **Public Klasörü** kullan (hızlı başlangıç)
- Canlıya çıkmadan önce **Supabase Storage**'a geç

---

## 🔧 Sorun Giderme

### Logo Görünmüyor?

1. **URL'i kontrol et:**
   ```sql
   SELECT logo_url FROM restaurants WHERE name = 'egodöner';
   ```

2. **Tarayıcı konsolunu aç (F12):**
   - Network sekmesine bak
   - 404 hatası varsa dosya yolu yanlış
   - CORS hatası varsa Supabase politikalarını kontrol et

3. **Cache temizle:**
   - Ctrl + Shift + R (Hard Refresh)
   - Veya gizli pencerede aç

4. **Fallback çalışıyor mu?**
   - Mergen logosu görünüyorsa URL yanlış
   - Hiçbir logo görünmüyorsa kod hatası var

### Dosya Adı Sorunları:

❌ Yanlış:
- `egodöner.png` (Türkçe karakter)
- `yeni restoran.png` (boşluk)
- `Logo-2024 (1).png` (parantez)

✅ Doğru:
- `egodoner.png`
- `yeni-restoran.png`
- `logo-2024-1.png`

---

## 📝 Örnek Kullanım

### Örnek 1: Egodöner
```bash
copy "C:\Users\90505\Downloads\egodöner.png" "public\restaurant-logos\egodoner.png"
```
```sql
UPDATE restaurants SET logo_url = '/restaurant-logos/egodoner.png' WHERE name = 'egodöner';
```

### Örnek 2: Pizza Palace
```bash
copy "C:\logos\pizza-palace.png" "public\restaurant-logos\pizza-palace.png"
```
```sql
UPDATE restaurants SET logo_url = '/restaurant-logos/pizza-palace.png' WHERE name = 'Pizza Palace';
```

### Örnek 3: Supabase Storage
```sql
-- Dashboard'dan yükledikten sonra:
UPDATE restaurants 
SET logo_url = 'https://abc123.supabase.co/storage/v1/object/public/restaurant-logos/sushi-bar.png' 
WHERE name = 'Sushi Bar';
```

---

## 🎨 Logo Tasarım Önerileri

- **Format:** PNG (şeffaf arka plan için)
- **Boyut:** 800x800px (kare, responsive)
- **Dosya Boyutu:** Maksimum 500KB
- **Arka Plan:** Şeffaf veya beyaz
- **Renk:** Marka renklerinizi kullanın
- **Optimize:** TinyPNG.com ile sıkıştırın

---

## 🚀 Hızlı Komutlar

```bash
# Logo kopyala
copy "kaynak.png" "public\restaurant-logos\hedef.png"

# Klasör oluştur (ilk seferde)
mkdir public\restaurant-logos

# Tüm logoları listele
dir public\restaurant-logos
```

```sql
-- Logo güncelle
UPDATE restaurants SET logo_url = '/restaurant-logos/logo.png' WHERE name = 'Restoran';

-- Tüm logoları listele
SELECT name, logo_url FROM restaurants ORDER BY name;

-- Logo sil
UPDATE restaurants SET logo_url = NULL WHERE name = 'Restoran';
```
