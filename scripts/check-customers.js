/**
 * Öküzburger'in kayıtlı müşterilerini kontrol et
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://otrjbpwirwgrxmezyuwg.supabase.co';
const supabaseKey = 'sb_publishable_ZCcSWwHpTLAH7-yDSh1dqA_1C2krw19';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCustomers() {
  console.log('🔍 Öküzburger müşterileri kontrol ediliyor...\n');

  try {
    // 1. Öküzburger'in ID'sini bul
    const { data: restaurant, error: restError } = await supabase
      .from('restaurants')
      .select('id, name')
      .ilike('name', '%öküz%')
      .single();

    if (restError) throw restError;

    console.log(`✅ Restoran bulundu: ${restaurant.name} (${restaurant.id})\n`);

    // 2. Bu restorana ait tüm müşterileri çek
    const { data: customers, error: custError } = await supabase
      .from('customers')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .order('created_at', { ascending: false });

    if (custError) throw custError;

    console.log(`📊 Toplam müşteri sayısı: ${customers.length}\n`);

    if (customers.length === 0) {
      console.log('❌ Hiç müşteri bulunamadı!');
      return;
    }

    // 3. Müşterileri listele
    console.log('📋 Müşteri Listesi:\n');
    customers.forEach((c, i) => {
      const date = new Date(c.created_at).toLocaleString('tr-TR');
      console.log(`${i + 1}. ${c.name}`);
      console.log(`   Telefon: ${c.phone}`);
      console.log(`   Adres: ${c.address}`);
      console.log(`   Oluşturulma: ${date}`);
      console.log('');
    });

    // 4. Bugün eklenen müşteriler
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCustomers = customers.filter(c => new Date(c.created_at) >= today);
    
    console.log(`📅 Bugün eklenen: ${todayCustomers.length}`);
    
    // 5. Dün eklenen müşteriler
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayCustomers = customers.filter(c => {
      const date = new Date(c.created_at);
      return date >= yesterday && date < today;
    });
    
    console.log(`📅 Dün eklenen: ${yesterdayCustomers.length}`);

  } catch (error) {
    console.error('❌ Hata:', error);
  }
}

checkCustomers();
