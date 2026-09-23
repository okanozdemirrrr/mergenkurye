/**
 * FCM Token'ı doğrudan test eder.
 * Kullanım: node scratch/test_fcm_send.js <FCM_TOKEN>
 * 
 * Önce: node scratch/test_fcm_send.js
 */

const fs = require('fs');
const https = require('https');

// .env.local'dan FIREBASE_SERVICE_ACCOUNT_KEY oku
const env = fs.readFileSync('.env.local', 'utf8');
const lines = env.split('\n');
const line = lines.find(l => l.startsWith('FIREBASE_SERVICE_ACCOUNT_KEY='));

if (!line) {
  console.error('FIREBASE_SERVICE_ACCOUNT_KEY bulunamadi');
  process.exit(1);
}

let val = line.slice('FIREBASE_SERVICE_ACCOUNT_KEY='.length);
if (val.startsWith('"')) val = val.slice(1);
if (val.endsWith('"')) val = val.slice(0, -1);

const serviceAccount = JSON.parse(val);
console.log('✅ Service account yüklendi:', serviceAccount.project_id);

// firebase-admin modülü ile test et
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id,
  });
  console.log('✅ Firebase Admin başlatıldı');
}

// Komut satırından token al ya da veritabanından ilk token'ı çek
const testToken = process.argv[2];

if (!testToken) {
  console.log('\n⚠️  Token belirtilmedi!');
  console.log('Kullanım: node scratch/test_fcm_send.js <FCM_TOKEN>');
  console.log('\nSupabase SQL editöründe şunu çalıştır:');
  console.log("SELECT id, full_name, fcm_token FROM couriers WHERE fcm_token IS NOT NULL LIMIT 5;");
  process.exit(0);
}

console.log('\n📤 Test bildirimi gönderiliyor...');
console.log('Token (ilk 30):', testToken.substring(0, 30) + '...');

admin.messaging().send({
  token: testToken,
  notification: {
    title: '🔔 Test Bildirimi',
    body: 'FCM bildirim testi — ' + new Date().toLocaleTimeString('tr-TR'),
  },
  android: {
    priority: 'high',
    notification: {
      channelId: 'mergen_high_priority',
      sound: 'default',
    },
  },
  apns: {
    headers: { 'apns-priority': '10', 'apns-push-type': 'alert' },
    payload: {
      aps: {
        alert: { title: '🔔 Test Bildirimi', body: 'FCM bildirim testi' },
        sound: 'default',
        badge: 1,
      },
    },
  },
}).then(messageId => {
  console.log('\n✅ BİLDİRİM GÖNDERİLDİ!');
  console.log('Message ID:', messageId);
}).catch(err => {
  console.error('\n❌ BİLDİRİM GÖNDERMEDE HATA:');
  console.error('Error code:', err.code);
  console.error('Error message:', err.message);
  
  if (err.code === 'messaging/invalid-registration-token') {
    console.log('\n→ Token geçersiz! Kurye uygulamadan çıkıp tekrar giriş yapmalı.');
  } else if (err.code === 'messaging/registration-token-not-registered') {
    console.log('\n→ Token kayıtsız (uygulama silinmiş/yeniden yüklenmiş).');
  } else if (err.code === 'messaging/invalid-argument') {
    console.log('\n→ Geçersiz argüman — token formatı hatalı olabilir.');
  }
});
