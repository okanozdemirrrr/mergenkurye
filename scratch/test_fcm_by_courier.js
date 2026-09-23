/**
 * Kurye ID'si ile FCM token'ı DB'den çeker ve test bildirimi gönderir.
 * Kullanım: node scratch/test_fcm_by_courier.js <COURIER_UUID>
 */

const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// .env.local oku
const env = fs.readFileSync('.env.local', 'utf8');
const getEnv = (key) => {
  const line = env.split('\n').find(l => l.startsWith(key + '='));
  if (!line) return null;
  let val = line.slice(key.length + 1);
  if (val.startsWith('"')) val = val.slice(1);
  if (val.endsWith('"')) val = val.slice(0, -1);
  return val.trim();
};

const supabaseUrl    = getEnv('NEXT_PUBLIC_SUPABASE_URL');
const serviceRoleKey = getEnv('SERVICE_ROLE_KEY');
const firebaseKey    = getEnv('FIREBASE_SERVICE_ACCOUNT_KEY');
const courierId      = process.argv[2];

if (!courierId) {
  console.error('Kullanım: node scratch/test_fcm_by_courier.js <COURIER_UUID>');
  process.exit(1);
}

console.log('🔍 Kurye ID:', courierId);
console.log('🔑 Service Role Key var:', !!serviceRoleKey);
console.log('🔥 Firebase Key var:', !!firebaseKey);

// Supabase — service role key ile (RLS bypass)
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// Firebase Admin
const admin = require('firebase-admin');
if (!admin.apps.length) {
  const sa = JSON.parse(firebaseKey);
  admin.initializeApp({ credential: admin.credential.cert(sa), projectId: sa.project_id });
  console.log('✅ Firebase Admin başlatıldı:', sa.project_id);
}

async function main() {
  // 1. Kurye ve FCM token'ı çek
  const { data: courier, error } = await supabase
    .from('couriers')
    .select('id, full_name, fcm_token')
    .eq('id', courierId)
    .single();

  if (error) {
    console.error('❌ Supabase hatası:', error.message);
    process.exit(1);
  }

  if (!courier) {
    console.error('❌ Kurye bulunamadı:', courierId);
    process.exit(1);
  }

  console.log('\n👤 Kurye:', courier.full_name);
  console.log('🔐 FCM Token var:', !!courier.fcm_token);

  if (!courier.fcm_token) {
    console.error('❌ Bu kurye için FCM token yok! Kurye uygulamaya giriş yapmamış.');
    process.exit(1);
  }

  const token = courier.fcm_token;
  console.log('🔐 Token (ilk 40):', token.substring(0, 40) + '...');
  console.log('📏 Token uzunluğu:', token.length);

  // APNs device token mi kontrol et (64 hex karakter)
  if (/^[0-9a-fA-F]{64}$/.test(token.trim())) {
    console.error('❌ Bu bir iOS APNs device token! FCM token değil.');
    console.error('   AppDelegate Firebase Messaging düzeltmesi gerekli.');
    process.exit(1);
  }

  // 2. Test bildirimi gönder
  console.log('\n📤 Test bildirimi gönderiliyor...');
  try {
    const msgId = await admin.messaging().send({
      token,
      notification: {
        title: '🔔 Test Bildirimi',
        body: `${courier.full_name} - ${new Date().toLocaleTimeString('tr-TR')}`,
      },
      android: {
        priority: 'high',
        notification: { channelId: 'mergen_high_priority', sound: 'default' },
      },
      apns: {
        headers: { 'apns-priority': '10', 'apns-push-type': 'alert' },
        payload: { aps: { alert: { title: '🔔 Test', body: 'Test bildirimi' }, sound: 'default', badge: 1 } },
      },
    });
    console.log('\n✅ BİLDİRİM GÖNDERİLDİ!');
    console.log('📨 Message ID:', msgId);
  } catch (err) {
    console.error('\n❌ FCM HATASI:');
    console.error('Code:', err.code);
    console.error('Message:', err.message);

    if (err.code === 'messaging/invalid-registration-token' ||
        err.code === 'messaging/registration-token-not-registered') {
      console.log('\n→ Token geçersiz/süresi dolmuş. Kurye uygulamadan çıkıp tekrar giriş yapmalı.');
      console.log('→ Bu token DB\'den temizlenebilir.');
    } else if (err.code === 'messaging/mismatched-credential') {
      console.log('\n→ Firebase project ID token ile eşleşmiyor!');
      console.log('→ Token başka bir Firebase projesine ait olabilir.');
    }
  }
}

main();
