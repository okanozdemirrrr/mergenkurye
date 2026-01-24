# 🚀 MERGEN AGENT V2.0 - HIZLI BAŞLANGIÇ

## ⚡ 3 ADIMDA BAŞLA

### 1. SUPABASE AYARLARI (2 dakika)

**Dosya:** `C:\Users\90505\Desktop\mergen_agent_chrome_extension\background.js`

```javascript
// Satır 8-11'i düzenle:
const SUPABASE_CONFIG = {
  url: 'https://xxxxx.supabase.co',  // ← Buraya Supabase URL
  anonKey: 'eyJhbGc...'  // ← Buraya anon key
}
```

**Nereden:** Supabase Dashboard → Settings → API

---

### 2. VERİTABANI GÜNCELLEMESİ (1 dakika)

**Dosya:** `database_migration_add_coordinates.sql` (proje klasöründe)

1. Supabase Dashboard → SQL Editor
2. Dosya içeriğini yapıştır
3. "Run" butonuna tıkla
4. ✅ Koordinat alanları eklendi!

---

### 3. CHROME'A YÜKLE (1 dakika)

1. `chrome://extensions/` aç
2. "Geliştirici modu" aktif et
3. "Paketlenmemiş öğe yükle"
4. `C:\Users\90505\Desktop\mergen_agent_chrome_extension\` seç
5. Extension ikonuna tıkla → Restoran ID gir → Kaydet
6. ✅ Hazır!

---

## 🎯 ÖZELLİKLER

✅ **3 Platform Desteği**
- 🟠 Trendyol Partner
- 🔴 Yemeksepeti Portal
- 🟣 Getir Restaurant

✅ **Hassas Koordinatlar**
- GPS latitude/longitude
- Kurye navigasyonu için

✅ **Duplicate Check**
- Aynı sipariş 2 kez gönderilmez
- Cache + Database kontrolü

✅ **Platform İstatistikleri**
- Popup'ta canlı sayaçlar
- Platform bazlı raporlama

---

## 🧪 TEST

1. Platform paneline git (Trendyol/Yemeksepeti/Getir)
2. F12 → Console aç
3. Sipariş listesine git
4. Console'da şunu gör: `✅ Sipariş başarıyla gönderildi`
5. Sağ üstte bildirim: "✅ Sipariş Aktarıldı"

---

## ⚠️ ÖNEMLİ NOT

**SELECTOR'LARI GÜNCELLE!**

`content.js` dosyasındaki SELECTORS objelerini gerçek platform yapısına göre güncellemelisin:

- Trendyol: Satır ~100
- Yemeksepeti: Satır ~200
- Getir: Satır ~300

Platform panelinde F12 ile DOM'u incele, class isimlerini bul, güncelle.

---

## 📁 DOSYALAR

- **Extension**: `C:\Users\90505\Desktop\mergen_agent_chrome_extension\`
- **Migration**: `kurye_projesi/database_migration_add_coordinates.sql`
- **Detaylı Checklist**: `kurye_projesi/MERGEN_AGENT_V2_SETUP_CHECKLIST.md`

---

## 🐛 SORUN?

**Sipariş yakalanmıyor:**
→ SELECTORS'ı güncelle (content.js)

**Koordinat null:**
→ Platform harita gösteriyor mu kontrol et

**Supabase hatası:**
→ URL ve anon key doğru mu kontrol et

**Console'da hata:**
→ F12 → Console → Hata mesajını oku

---

## ✅ BAŞARILI KURULUM KONTROL

- [ ] background.js → Supabase bilgileri girildi
- [ ] Migration SQL çalıştırıldı
- [ ] Chrome'a yüklendi
- [ ] Restoran ID ayarlandı
- [ ] Badge "ON" gösteriyor
- [ ] Test edildi ve çalışıyor

---

Başarılar! 🎉
