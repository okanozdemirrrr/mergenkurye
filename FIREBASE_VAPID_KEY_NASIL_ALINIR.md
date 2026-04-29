# 🔑 Firebase VAPID Key Nasıl Alınır?

## Adım 1: Firebase Console'a Git
https://console.firebase.google.com/

## Adım 2: Projeyi Seç
- "alda-gel-kurye-d0537" projesini seç

## Adım 3: Project Settings'e Git
- Sol üstteki ⚙️ (dişli) ikonuna tıkla
- "Project Settings" seçeneğine tıkla

## Adım 4: Cloud Messaging Sekmesine Git
- Üstteki sekmelerden "Cloud Messaging" sekmesine tıkla

## Adım 5: Web Push Certificates Bölümünü Bul
- Sayfayı aşağı kaydır
- "Web Push certificates" bölümünü bul

## Adım 6: Key Pair Oluştur (Eğer Yoksa)
- Eğer key pair yoksa "Generate key pair" butonuna tıkla
- Key pair otomatik oluşturulacak

## Adım 7: Key'i Kopyala
- Oluşan key'i kopyala (örnek: `BPxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`)
- Bu key 88 karakter uzunluğunda olmalı ve `BP` ile başlamalı

## Adım 8: .env.local Dosyasına Ekle
`.env.local` dosyasını aç ve şu satırı güncelle:

```bash
NEXT_PUBLIC_FIREBASE_VAPID_KEY="BPxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

## Adım 9: Service Worker'ı Güncelle (Opsiyonel)
`public/firebase-messaging-sw.js` dosyasında VAPID key kullanılmıyor, sadece `.env.local`'de yeterli.

## ✅ Tamamlandı!
Artık Web/PWA push notification'ları çalışacak.

## 🔍 Kontrol
Tarayıcı console'unda şu logları göreceksin:
```
🌐 Platform: Web (PWA)
🎉 FCM Token alındı (Web): ...
✅ Web push notifications başarıyla başlatıldı
```

## ⚠️ Önemli Notlar
- VAPID key sadece Web/PWA için gerekli
- Native (Android APK/AAB) için VAPID key gerekmez
- VAPID key public bir key'dir, güvenlik riski oluşturmaz
- Her Firebase projesi için farklı bir VAPID key vardır
