/**
 * Kurye Atama + Push Notification Test
 * Gerçek bir paketi kuryeye atayıp bildirimin gittiğini test eder
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://otrjbpwirwgrxmezyuwg.supabase.co';
const supabaseKey = 'sb_publishable_ZCcSWwHpTLAH7-yDSh1dqA_1C2krw19';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAssignCourier() {
  console.log('🧪 Kurye Atama + Push Notification Test\n');

  try {
    // 1. Atanmamış bir paket bul
    const { data: packages, error: pkgError } = await supabase
      .from('packages')
      .select('id, order_number, customer_name, delivery_address, restaurant:restaurants(name)')
      .is('courier_id', null)
      .in('status', ['new_order', 'getting_ready', 'ready'])
      .limit(1);

    if (pkgError) throw pkgError;

    if (!packages || packages.length === 0) {
      console.log('❌ Atanmamış paket bulunamadı!');
      console.log('💡 Önce bir test paketi oluştur.');
      return;
    }

    const pkg = packages[0];
    console.log('📦 Test Paketi:');
    console.log(`   Sipariş No: ${pkg.order_number}`);
    console.log(`   Müşteri: ${pkg.customer_name}`);
    console.log(`   Adres: ${pkg.delivery_address}`);
    console.log(`   Restoran: ${pkg.restaurant?.name || 'Bilinmeyen'}`);
    console.log('');

    // 2. FCM token'ı olan bir kurye bul
    const { data: couriers, error: courierError } = await supabase
      .from('couriers')
      .select('id, full_name, fcm_token')
      .not('fcm_token', 'is', null)
      .limit(1);

    if (courierError) throw courierError;

    if (!couriers || couriers.length === 0) {
      console.log('❌ FCM token\'ı olan kurye bulunamadı!');
      return;
    }

    const courier = couriers[0];
    console.log('🚴 Test Kuryesi:');
    console.log(`   İsim: ${courier.full_name}`);
    console.log(`   Token: ${courier.fcm_token.substring(0, 50)}...`);
    console.log('');

    // 3. Kuryeyi ata
    console.log('⏳ Kurye atanıyor...\n');

    const { error: assignError } = await supabase
      .from('packages')
      .update({
        courier_id: courier.id,
        status: 'assigned',
        assigned_at: new Date().toISOString()
      })
      .eq('id', pkg.id);

    if (assignError) throw assignError;

    console.log('✅ Kurye atandı!\n');

    // 4. Push notification gönder
    console.log('📤 Push notification gönderiliyor...\n');

    const response = await fetch('http://localhost:3000/api/send-push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        courierId: courier.id,
        restaurantName: pkg.restaurant?.name || 'Restoran',
        deliveryAddress: pkg.delivery_address,
        customerName: pkg.customer_name
      })
    });

    const result = await response.json();

    if (response.ok) {
      console.log('✅ Push notification gönderildi!');
      console.log(`   Message ID: ${result.messageId}`);
      console.log(`   Başlık: ${result.title}`);
      console.log(`   Mesaj: ${result.body}`);
    } else {
      console.log('❌ Push notification hatası!');
      console.log(`   Error: ${result.error}`);
      console.log(`   Details: ${result.details}`);
    }

    console.log('\n📱 Android cihazı kontrol et!');
    console.log(`   Beklenen bildirim: "YENİ SİPARİŞ 🚀"`);
    console.log(`   Mesaj: "${pkg.restaurant?.name || 'Restoran'} - ${pkg.delivery_address}"`);

  } catch (error) {
    console.error('❌ Hata:', error);
  }
}

testAssignCourier();
