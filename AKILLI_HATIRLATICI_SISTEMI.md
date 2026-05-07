# 🔔 Akıllı Restoran Hatırlatıcı Sistemi

## 📋 Genel Bakış

Restoranların siparişleri "Hazır" olarak işaretlemeyi unutması operasyonu kilitliyordu. Bu sistem, geciken siparişler için otomatik hatırlatıcılar sağlar.

## ✨ Özellikler

### 1. **Zaman Takibi**
- Her 60 saniyede bir tüm aktif siparişleri kontrol eder
- `new_order` ve `getting_ready` statüsündeki siparişleri izler
- Sipariş oluşturulma zamanından itibaren geçen süreyi hesaplar

### 2. **Görsel Uyarılar**

#### Gecikmiş Sipariş Kartı
- **Kırmızı arka plan** (pulse animasyonu)
- **Kırmızı border** (ring efekti)
- **Uyarı banner'ı**:
  ```
  ⏰ 12 dakikadır bekliyor!
  Paket hazırsa gönderelim mi? Kuryeler sabırsız! 🚴💨
  ```

### 3. **Ses Uyarıları**
- **İlk uyarı**: 10 dakika sonra
- **Tekrar aralığı**: Her 2 dakikada bir
- **Ses dosyası**: `/public/reminder.mp3`
- **Ses seviyesi**: %70

### 4. **Otomatik Durdurma**
Sipariş "Hazır" statüsüne geçtiği an:
- ✅ Görsel uyarılar kaybolur
- ✅ Ses uyarıları durur
- ✅ Kart normal görünüme döner

## 🔧 Teknik Detaylar

### Hook: `useRestaurantReminder`

```typescript
const { 
  isPackageDelayed,      // Paket gecikmiş mi?
  getDelayedMinutes,     // Kaç dakika gecikmiş?
  hasDelayedPackages     // Herhangi bir gecikmiş paket var mı?
} = useRestaurantReminder(packages, {
  warningThresholdMinutes: 10,  // Uyarı eşiği
  soundIntervalMinutes: 2        // Ses aralığı
})
```

### Yapılandırma

```typescript
interface ReminderConfig {
  warningThresholdMinutes: number  // Varsayılan: 10 dakika
  soundIntervalMinutes: number     // Varsayılan: 2 dakika
}
```

### Kullanım

**RestaurantDashboard.tsx:**
```typescript
// Hook'u kullan
const { isPackageDelayed, getDelayedMinutes } = useRestaurantReminder(packages)

// KanbanBoard'a geç
<KanbanBoard 
  packages={packages}
  isPackageDelayed={isPackageDelayed}
  getDelayedMinutes={getDelayedMinutes}
/>
```

**KanbanBoard.tsx:**
```typescript
// Her paket için kontrol et
const isDelayed = isPackageDelayed(pkg.id)
const delayedMinutes = getDelayedMinutes(pkg)

// Görsel uyarı göster
{isDelayed && (
  <div className="bg-red-100 border border-red-300">
    ⏰ {delayedMinutes} dakikadır bekliyor!
  </div>
)}
```

## 📁 Dosya Yapısı

```
src/
├── hooks/
│   └── useRestaurantReminder.ts          # Hatırlatıcı hook
├── app/
│   └── restoran/
│       └── components/
│           ├── RestaurantDashboard.tsx   # Hook kullanımı
│           └── KanbanBoard.tsx           # Görsel uyarılar
public/
└── reminder.mp3                          # Hatırlatıcı sesi
```

## 🎵 Ses Dosyası Kurulumu

### 1. Ses Dosyası Hazırla

**Önerilen Özellikler:**
- Format: MP3
- Süre: 2-3 saniye
- Boyut: < 100KB
- Ton: Dikkat çekici ama rahatsız edici değil

**Ücretsiz Ses Kaynakları:**
- [Freesound.org](https://freesound.org/)
- [Mixkit.co](https://mixkit.co/free-sound-effects/)
- [Zapsplat.com](https://www.zapsplat.com/)

**Arama Terimleri:**
- "notification bell"
- "reminder chime"
- "alert sound"
- "ding"

### 2. Dosyayı Ekle

```bash
# Ses dosyasını public klasörüne kopyala
cp reminder.mp3 public/reminder.mp3
```

### 3. Test Et

```bash
# Development server'ı başlat
npm run dev

# Tarayıcıda aç
http://localhost:3000/restoran

# 10 dakikadan eski bir sipariş oluştur (veritabanından)
# Ses çalacak mı kontrol et
```

## 🧪 Test Senaryoları

### Senaryo 1: Normal Sipariş
1. Yeni sipariş oluştur
2. 5 dakika bekle
3. ❌ Uyarı yok (henüz 10 dakika olmadı)

### Senaryo 2: Gecikmiş Sipariş
1. Yeni sipariş oluştur
2. 10 dakika bekle
3. ✅ Kart kırmızı yanıp sönüyor
4. ✅ Uyarı banner'ı görünüyor
5. ✅ Ses çalıyor

### Senaryo 3: Sipariş Hazır
1. Gecikmiş sipariş var
2. "Hazır" butonuna tıkla
3. ✅ Uyarılar anında duruyor
4. ✅ Kart normal görünüme dönüyor

### Senaryo 4: Çoklu Gecikmiş Sipariş
1. 3 sipariş oluştur
2. Hepsi 10 dakika beklesin
3. ✅ Hepsi kırmızı yanıp sönüyor
4. ✅ Her 2 dakikada bir ses çalıyor
5. Birini "Hazır" yap
6. ✅ O sipariş normal, diğerleri hala uyarıda

## 🎨 Görsel Örnekler

### Normal Sipariş Kartı
```
┌─────────────────────────────┐
│ Ahmet Yılmaz        [Yeni]  │
│ 0555 123 4567               │
│                             │
│ 📦 2x Hamburger             │
│ 📍 Atatürk Cad. No:123      │
│                             │
│ ₺150        [Hazırlanıyor]  │
└─────────────────────────────┘
```

### Gecikmiş Sipariş Kartı (Pulse Animasyonu)
```
┌═════════════════════════════┐ ← Kırmızı border
║ ⏰ 12 dakikadır bekliyor!   ║ ← Uyarı banner
║ Paket hazırsa gönderelim    ║
║ mi? Kuryeler sabırsız! 🚴💨 ║
╠─────────────────────────────╣
║ Ahmet Yılmaz        [Yeni]  ║
║ 0555 123 4567               ║
║                             ║
║ 📦 2x Hamburger             ║
║ 📍 Atatürk Cad. No:123      ║
║                             ║
║ ₺150        [Hazırlanıyor]  ║
└═════════════════════════════┘
  ↑ Kırmızı arka plan (pulse)
```

## 📊 Performans

### Optimizasyonlar
- ✅ 60 saniye interval (gereksiz kontrol yok)
- ✅ Sadece aktif siparişler kontrol ediliyor
- ✅ Ses her 2 dakikada bir (spam yok)
- ✅ Cleanup fonksiyonları (memory leak yok)

### Kaynak Kullanımı
- **CPU**: Minimal (60s interval)
- **Memory**: ~1KB (delayed packages Set)
- **Network**: Yok (local kontrol)

## 🔒 Güvenlik

- ✅ Client-side kontrol (hassas veri yok)
- ✅ Ses dosyası public (herkes erişebilir)
- ✅ Sadece görsel uyarı (veri değişikliği yok)

## 🚀 Deployment

### 1. Kod Deploy
```bash
git add -A
git commit -m "feat: Add smart restaurant reminder system"
git push
```

### 2. Ses Dosyası Ekle
```bash
# Vercel'e ses dosyasını ekle
vercel --prod
```

### 3. Test Et
```bash
# Production'da test et
https://mergenkuryesistem.vercel.app/restoran
```

## 📝 Notlar

### Önemli
- Ses dosyası (`reminder.mp3`) **mutlaka** `public/` klasörüne eklenmeli
- Tarayıcı ses izni gerekebilir (ilk tıklamada)
- Ses çalmıyorsa console'da hata kontrol et

### Gelecek İyileştirmeler
- [ ] Ses seviyesi ayarı (kullanıcı tercihi)
- [ ] Farklı uyarı seviyeleri (5dk, 10dk, 15dk)
- [ ] Uyarı geçmişi (hangi siparişler ne kadar gecikti)
- [ ] SMS/Push notification entegrasyonu
- [ ] Gecikme istatistikleri (dashboard)

## 🐛 Sorun Giderme

### Ses Çalmıyor
1. `public/reminder.mp3` dosyası var mı?
2. Tarayıcı ses izni verildi mi?
3. Console'da hata var mı?
4. Ses seviyesi açık mı?

### Uyarı Görünmüyor
1. Sipariş 10 dakikadan eski mi?
2. Sipariş `new_order` veya `getting_ready` statüsünde mi?
3. `isPackageDelayed` prop'u KanbanBoard'a geçiyor mu?

### Animasyon Çalışmıyor
1. Tailwind CSS `animate-pulse` class'ı var mı?
2. Dark mode doğru çalışıyor mu?
3. Browser CSS animasyonları destekliyor mu?

## 📚 Kaynaklar

- [React useEffect Hook](https://react.dev/reference/react/useEffect)
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [Tailwind CSS Animations](https://tailwindcss.com/docs/animation)
- [TypeScript Generics](https://www.typescriptlang.org/docs/handbook/2/generics.html)
