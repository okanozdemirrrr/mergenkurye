/**
 * @file scripts/test-business-day-logic.js
 * @description Business Day mantığını test eder
 */

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://otrjbpwirwgrxmezyuwg.supabase.co',
  'sb_publishable_ZCcSWwHpTLAH7-yDSh1dqA_1C2krw19'
)

async function testBusinessDay() {
  console.log('🔍 Business Day Logic Test\n')

  // 1. Şu anki saat
  const now = new Date()
  console.log('⏰ Şu anki saat:', now.toLocaleString('tr-TR'))
  console.log('   Saat:', now.getHours())
  console.log('')

  // 2. Business Day başlangıcı hesapla
  const currentHour = now.getHours()
  const todayStart = new Date(now)
  
  if (currentHour < 5) {
    todayStart.setDate(todayStart.getDate() - 1)
    console.log('⚠️  Saat 05:00\'dan önce, dün sabah 05:00 kullanılıyor')
  } else {
    console.log('✅ Saat 05:00\'dan sonra, bugün sabah 05:00 kullanılıyor')
  }
  
  todayStart.setHours(5, 0, 0, 0)
  
  console.log('📅 Business Day Start:', todayStart.toLocaleString('tr-TR'))
  console.log('   ISO:', todayStart.toISOString())
  console.log('')

  // 3. Bu tarihten sonra teslim edilen paketleri say
  const { count: totalCount, error: error1 } = await supabase
    .from('packages')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'delivered')
    .gte('delivered_at', todayStart.toISOString())

  if (error1) throw error1

  console.log('📦 Toplam teslim edilen (Business Day):', totalCount)
  console.log('')

  // 4. Kurye bazlı sayım
  const { data: couriers, error: error2 } = await supabase
    .from('couriers')
    .select('id, full_name')
    .order('full_name')

  if (error2) throw error2

  console.log('👥 Kurye Bazlı Teslimatlar:\n')

  for (const courier of couriers) {
    const { count, error } = await supabase
      .from('packages')
      .select('*', { count: 'exact', head: true })
      .eq('delivered_by_courier_id', courier.id)
      .eq('status', 'delivered')
      .gte('delivered_at', todayStart.toISOString())

    if (error) throw error

    if (count > 0) {
      console.log(`   ${courier.full_name}: ${count} paket`)
    }
  }

  console.log('')

  // 5. Son 5 teslimatı göster
  const { data: recentDeliveries, error: error3 } = await supabase
    .from('packages')
    .select('id, order_number, delivered_at, delivered_by_courier_id')
    .eq('status', 'delivered')
    .gte('delivered_at', todayStart.toISOString())
    .order('delivered_at', { ascending: false })
    .limit(5)

  if (error3) throw error3

  console.log('📋 Son 5 Teslimat:\n')
  recentDeliveries.forEach((pkg, index) => {
    console.log(`   ${index + 1}. #${pkg.order_number}`)
    console.log(`      Teslim: ${new Date(pkg.delivered_at).toLocaleString('tr-TR')}`)
    console.log(`      Kurye ID: ${pkg.delivered_by_courier_id}`)
    console.log('')
  })
}

testBusinessDay().catch(console.error)
