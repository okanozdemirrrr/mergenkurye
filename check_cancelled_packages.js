const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://otrjbpwirwgrxmezyuwg.supabase.co';
const serviceRoleKey = 'YOUR_SECRET_KEY';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkPackages() {
  const restaurantId = '504feb78-276a-4618-81d1-547c79550a89';
  try {
    console.log(`Restoran ${restaurantId} için detaylı paket analizi yapılıyor...\n`);

    // 1. delivered & unpaid
    const { data: deliveredUnpaid, error: err1 } = await supabase
      .from('packages')
      .select('id, amount, status')
      .eq('restaurant_id', restaurantId)
      .eq('is_paid_to_restaurant', false)
      .eq('status', 'delivered');

    if (err1) throw err1;
    const deliveredCount = deliveredUnpaid.length;
    const deliveredSum = deliveredUnpaid.reduce((sum, p) => sum + Number(p.amount), 0);
    console.log(`🟢 Teslim Edilmiş & Ödenmemiş Paket Sayısı: ${deliveredCount} | Toplam Tutar: ${deliveredSum}₺`);

    // 2. cancelled & unpaid & chargeable
    const { data: cancelledChargeable, error: err2 } = await supabase
      .from('packages')
      .select('id, amount, status')
      .eq('restaurant_id', restaurantId)
      .eq('is_paid_to_restaurant', false)
      .eq('status', 'cancelled')
      .eq('is_chargeable_cancellation', true);

    if (err2) throw err2;
    const chargeableCount = cancelledChargeable.length;
    const chargeableSum = cancelledChargeable.reduce((sum, p) => sum + Number(p.amount), 0);
    console.log(`🔴 Ücretli İptal & Ödenmemiş Paket Sayısı: ${chargeableCount} | Toplam Tutar: ${chargeableSum}₺`);

    // 3. cancelled & unpaid & NON-chargeable (ücretsiz iptaller)
    const { data: cancelledFree, error: err3 } = await supabase
      .from('packages')
      .select('id, amount, status')
      .eq('restaurant_id', restaurantId)
      .eq('is_paid_to_restaurant', false)
      .eq('status', 'cancelled')
      .eq('is_chargeable_cancellation', false);

    if (err3) throw err3;
    const freeCount = cancelledFree.length;
    const freeSum = cancelledFree.reduce((sum, p) => sum + Number(p.amount), 0);
    console.log(`⚪ Ücretsiz İptal & Ödenmemiş Paket Sayısı: ${freeCount} | Toplam Tutar: ${freeSum}₺`);

    // 4. RPC değerleri ile karşılaştır
    const { data: finData, error: finError } = await supabase.rpc('get_restaurant_period_financials', {
      p_restaurant_id: restaurantId,
      p_start_date: '2020-01-01T00:00:00Z',
      p_end_date: '2030-01-01T00:00:00Z'
    });
    if (finError) throw finError;

    console.log('\n--- RPC SONUÇLARI ---');
    console.log(`unpaid_package_count (RPC): ${finData.unpaid_package_count}`);
    console.log(`unpaid_revenue (RPC): ${finData.unpaid_revenue}₺`);

    console.log('\n--- MATEMATİK KONTROLÜ ---');
    console.log(`Beklenen Tutar (Sadece Delivered + Ücretli İptal): ${deliveredSum + chargeableSum}₺`);
    console.log(`Beklenen Paket Sayısı (Sadece Delivered + Ücretli İptal): ${deliveredCount + chargeableCount}`);
    
  } catch (err) {
    console.error('Hata:', err);
  }
}

checkPackages();
