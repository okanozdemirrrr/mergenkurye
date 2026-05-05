/**
 * Push Notification Test Script
 * Android cihazlara test bildirimi gönderir
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://otrjbpwirwgrxmezyuwg.supabase.co';
const supabaseKey = 'sb_publishable_ZCcSWwHpTLAH7-yDSh1dqA_1C2krw19';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testPushNotification() {
  console.log('🔔 Push Notification Test Başlıyor...\n');

  try {
    // 1. FCM token'ı olan kuryeyi bul
    const { data: couriers, error: courierError } = await supabase
      .from('couriers')
      .select('id, full_name, fcm_token')
      .not('fcm_token', 'is', null)
      .limit(5);

    if (courierError) throw courierError;

    if (!couriers || couriers.length === 0) {
      console.log('❌ FCM token\'ı olan kurye bulunamadı!');
      console.log('📱 Lütfen bir Android cihazda uygulamayı açın ve giriş yapın.');
      return;
    }

    console.log(`✅ ${couriers.length} kurye bulundu:\n`);
    couriers.forEach((c, i) => {
      console.log(`${i + 1}. ${c.full_name}`);
      console.log(`   Token: ${c.fcm_token.substring(0, 50)}...`);
      console.log('');
    });

    // 2. Her kuryeye test bildirimi gönder
    console.log('📤 Test bildirimleri gönderiliyor...\n');

    for (const courier of couriers) {
      try {
        const response = await fetch('http://localhost:3000/api/send-push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            courierId: courier.id,
            token: courier.fcm_token,
            title: '🧪 Test Bildirimi',
            body: `Merhaba ${courier.full_name}! Bu bir test bildirimidir. Sistem çalışıyor! 🚀`,
            data: {
              type: 'test',
              timestamp: new Date().toISOString()
            }
          })
        });

        const result = await response.json();

        if (response.ok) {
          console.log(`✅ ${courier.full_name}: Bildirim gönderildi!`);
          console.log(`   Message ID: ${result.messageId}`);
        } else {
          console.log(`❌ ${courier.full_name}: Hata!`);
          console.log(`   Error: ${result.error}`);
        }
      } catch (error) {
        console.log(`❌ ${courier.full_name}: İstek hatası!`);
        console.log(`   ${error.message}`);
      }
      console.log('');
    }

    console.log('✅ Test tamamlandı!');
    console.log('📱 Android cihazınızı kontrol edin.');

  } catch (error) {
    console.error('❌ Hata:', error);
  }
}

// Scripti çalıştır
testPushNotification();
