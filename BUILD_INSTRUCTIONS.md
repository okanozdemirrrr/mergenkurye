# 🚀 Yeni Bildirim Sistemi - Build ve Test Talimatları

## ✅ Yapılan Değişiklikler

### 1. Merkezi Bildirim Servisi Oluşturuldu
- **Dosya**: `src/utils/notificationService.ts`
- **Özellikler**:
  - Platform tespiti (Native Capacitor vs Web PWA)
  - Native: `@capacitor/push-notifications` kullanımı
  - Web: `firebase/messaging` kullanımı
  - Tek token kayıt fonksiyonu
  - Foreground notification listener'lar (UI + Audio)
  - Idempotency (tekrar çalışma koruması)

### 2. Kurye Sayfası Entegrasyonu
- **Dosya**: `src/app/kurye/page.tsx`
- Giriş yapıldığında `notificationService.initialize(courierId, 'courier')` çağrılıyor
- Çıkış yapıldığında `notificationService.cleanup()` çağrılıyor
- Eski dağınık bildirim kodları temizlendi

### 3. Eski Hook Silindi
- **Silinen**: `src/hooks/usePushNotifications.ts`
- Artık merkezi servis kullanılıyor

### 4. Firebase Service Worker Oluşturuldu
- **Dosya**: `public/firebase-messaging-sw.js`
- Web/PWA için background notification desteği
- Gerçek Firebase config değerleri eklendi

### 5. Environment Variables Güncellendi
- **Dosya**: `.env.local`
- Firebase Web SDK config eklendi (gerçek değerlerle)
- VAPID key hariç tüm değerler dolu

### 6. Android Version Artırıldı
- **versionCode**: 13 → 14
- **versionName**: 1.1.2 → 1.2.0

## 🔧 Eksik Adımlar (Manuel Yapılmalı)

### 1. Firebase VAPID Key Eklenmeli
Firebase Console'a gidip VAPID key alınmalı:

1. Firebase Console → Project Settings → Cloud Messaging
2. "Web Push certificates" bölümünde "Generate key pair" butonuna tıkla
3. Oluşan key'i kopyala
4. `.env.local` dosyasında `NEXT_PUBLIC_FIREBASE_VAPID_KEY` değerini güncelle

```bash
NEXT_PUBLIC_FIREBASE_VAPID_KEY="BPxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

### 2. Firebase Cloud Messaging API Etkinleştirilmeli
Firebase Console'da Cloud Messaging API'nin etkin olduğundan emin olun:

1. Firebase Console → Project Settings → Cloud Messaging
2. "Cloud Messaging API (Legacy)" DISABLED olmalı
3. "Firebase Cloud Messaging API (V1)" ENABLED olmalı

## 📦 Build Komutları

### 1. Next.js Build
```powershell
npm run build
```

### 2. Capacitor Sync (Android'e kopyala)
```powershell
npx cap sync android
```

### 3. Android AAB Build
```powershell
cd android
./gradlew bundleRelease
```

### 4. AAB Dosyası Konumu
```
android/app/build/outputs/bundle/release/app-release.aab
```

## 🧪 Test Adımları

### Native (Android APK/AAB) Test:

1. **APK/AAB Yükle**: Gerçek Android cihaza yükle (emulator'de FCM çalışmaz)

2. **Giriş Yap**: Kurye olarak giriş yap

3. **Logları Kontrol Et**:
   - Chrome DevTools → `chrome://inspect` → Cihazı seç
   - Console'da şu logları ara:
     ```
     🚀 Notification Service başlatılıyor...
     📱 Platform: Native (Capacitor)
     🔊 Audio dosyası yüklendi
     📱 Native push notifications başlatılıyor...
     🎉 FCM Token alındı: ...
     ✅ FCM Token başarıyla kaydedildi
     ✅ Notification Service başarıyla başlatıldı
     ```

4. **Admin'den Test Bildirimi Gönder**:
   - Admin panelinden kuryeye paket ata
   - API `/api/send-push` çağrılacak
   - Kurye cihazında bildirim gelmeli

5. **Foreground Notification Test**:
   - Uygulama AÇIKKEN bildirim geldiğinde:
     - Ses çalmalı (`/notification.mp3`)
     - Ekranda mor gradient toast görünmeli
     - Toast 5 saniye sonra kaybolmalı

### Web (PWA) Test:

1. **Localhost'ta Çalıştır**:
   ```powershell
   npm run dev
   ```

2. **HTTPS Gerekli**: PWA için HTTPS şart (localhost hariç)

3. **Service Worker Kaydı**:
   - DevTools → Application → Service Workers
   - `firebase-messaging-sw.js` kaydedilmiş olmalı

4. **Notification Permission**:
   - Tarayıcı bildirim izni isteyecek
   - "Allow" seçilmeli

5. **Token Kontrolü**:
   - Console'da şu logları ara:
     ```
     🌐 Platform: Web (PWA)
     🎉 FCM Token alındı (Web): ...
     ✅ Web push notifications başarıyla başlatıldı
     ```

## 🐛 Sorun Giderme

### Problem: "FCM Token alınamadı"
**Çözüm**: 
- VAPID key'in doğru olduğundan emin ol
- Firebase Cloud Messaging API'nin etkin olduğunu kontrol et
- Service Worker'ın doğru kaydedildiğini kontrol et

### Problem: "Audio çalmıyor"
**Çözüm**:
- İlk tıklamadan sonra audio unlock edilmeli
- Console'da "🔓 Audio unlocked!" logunu ara
- `/notification.mp3` dosyasının `public/` klasöründe olduğunu kontrol et

### Problem: "Bildirim gelmiyor (Native)"
**Çözüm**:
- Gerçek cihazda test et (emulator'de FCM çalışmaz)
- `google-services.json` dosyasının doğru olduğunu kontrol et
- Firebase Console'da cihazın token'ının kayıtlı olduğunu kontrol et
- Supabase'de `couriers` tablosunda `fcm_token` kolonunun dolu olduğunu kontrol et

### Problem: "Bildirim gelmiyor (Web)"
**Çözüm**:
- HTTPS kullanıldığından emin ol (localhost hariç)
- Service Worker'ın kaydedildiğini kontrol et
- Tarayıcı bildirim izninin verildiğini kontrol et
- Firebase config'in doğru olduğunu kontrol et

## 📝 Notlar

- **Supabase Realtime**: Hala çalışıyor, sadece push notification sistemi yenilendi
- **Eski Hook'lar**: `useCourierNotifications`, `useAdminNotifications`, `useRestaurantNotifications` hala Supabase Realtime için kullanılıyor
- **Merkezi Servis**: Sadece FCM push notification'ları yönetiyor
- **Idempotency**: Servis zaten başlatılmışsa tekrar başlatılmaz
- **Cleanup**: Çıkış yapıldığında tüm listener'lar temizleniyor

## 🎯 Sonraki Adımlar

1. VAPID key ekle
2. Build yap
3. Gerçek cihazda test et
4. Logları kontrol et
5. Admin'den test bildirimi gönder
6. Foreground notification'ı test et
7. Background notification'ı test et (uygulama kapalıyken)

## 🚨 Kritik Uyarılar

- **Emulator'de test etme**: FCM emulator'de düzgün çalışmaz
- **HTTPS gerekli**: Web/PWA için HTTPS şart
- **VAPID key**: Mutlaka eklenmeliş
- **Service Worker**: Cache'lenebilir, hard refresh gerekebilir (Ctrl+Shift+R)
