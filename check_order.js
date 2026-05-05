const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://otrjbpwirwgrxmezyuwg.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im90cmpicHdpcndncnhtZXp5dXdnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNDM1NTU5NywiZXhwIjoyMDQ5OTMxNTk3fQ.9CfOQBAR_eFgmjiGo46xVA_YxKXfD3_hLqKJYqLqxqI';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkOrder() {
  console.log('🔍 Sipariş 5819 kontrol ediliyor...\n');
  
  // 1. Order 5819'u ara
  const { data: order5819, error: error1 } = await supabase
    .from('packages')
    .select('*')
    .or('order_number.eq.5819,order_number.eq.005819')
    .single();
  
  if (error1) {
    console.log('❌ Sipariş 5819 bulunamadı:', error1.message);
  } else {
    console.log('✅ Sipariş 5819 bulundu:');
    console.log(JSON.stringify(order5819, null, 2));
  }
  
  console.log('\n---\n');
  
  // 2. Son 5 siparişi getir
  const { data: lastOrders, error: error2 } = await supabase
    .from('packages')
    .select('order_number, customer_name, status, created_at')
    .order('created_at', { ascending: false })
    .limit(5);
  
  if (error2) {
    console.log('❌ Son siparişler getirilemedi:', error2.message);
  } else {
    console.log('📦 Son 5 sipariş:');
    lastOrders.forEach(order => {
      console.log(`  - ${order.order_number} | ${order.customer_name} | ${order.status} | ${order.created_at}`);
    });
  }
  
  console.log('\n---\n');
  
  // 3. Sequence durumunu kontrol et
  const { data: seqData, error: error3 } = await supabase.rpc('get_sequence_value', {
    seq_name: 'order_number_seq'
  });
  
  if (error3) {
    console.log('⚠️ Sequence değeri alınamadı (RPC fonksiyonu yok olabilir)');
  } else {
    console.log('🔢 Sequence mevcut değeri:', seqData);
  }
  
  console.log('\n---\n');
  
  // 4. En yüksek sipariş numarasını bul
  const { data: maxOrder, error: error4 } = await supabase
    .from('packages')
    .select('order_number')
    .order('order_number', { ascending: false })
    .limit(1)
    .single();
  
  if (error4) {
    console.log('❌ En yüksek sipariş numarası bulunamadı:', error4.message);
  } else {
    console.log('🔝 En yüksek sipariş numarası:', maxOrder.order_number);
  }
}

checkOrder().catch(console.error);
