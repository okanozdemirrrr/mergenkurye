/**
 * @file scripts/test-admin-courier-stats.js
 * @description Admin panelinin gösterdiği kurye istatistiklerini test eder
 */

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://otrjbpwirwgrxmezyuwg.supabase.co',
  'sb_publishable_ZCcSWwHpTLAH7-yDSh1dqA_1C2krw19'
)

async function testAdminStats() {
  console.log('🔍 Admin paneli kurye istatistikleri testi...\n')

  try {
    // 1. Tüm kuryeleri çek
    const { data: couriers, error: couriersError } = await supabase
      .from('couriers')
      .select('id, full_name')
      .order('full_name')

    if (couriersError) throw couriersError

    console.log(`👥 Toplam ${couriers.length} kurye\n`)

    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    let totalToday = 0
    let totalAll = 0

    // 2. Her kurye için istatistikleri hesapla (Admin paneli mantığı)
    for (const courier of couriers) {
      // Bugün teslim edilen paketler
      const { data: todayDeliveries, error: error1 } = await supabase
        .from('packages')
        .select('id')
        .eq('delivered_by_courier_id', courier.id)
        .eq('status', 'delivered')
        .gte('delivered_at', todayStart.toISOString())

      if (error1) throw error1

      const todayCount = (todayDeliveries || []).length

      // Toplam teslimat
      const { data: allDeliveries, error: error2 } = await supabase
        .from('packages')
        .select('id')
        .eq('delivered_by_courier_id', courier.id)
        .eq('status', 'delivered')

      if (error2) throw error2

      const allCount = (allDeliveries || []).length

      totalToday += todayCount
      totalAll += allCount

      if (allCount > 0) {
        console.log(`📦 ${courier.full_name}:`)
        console.log(`   Bugün: ${todayCount} paket`)
        console.log(`   Toplam: ${allCount} paket\n`)
      }
    }

    console.log('📊 GENEL TOPLAM:')
    console.log(`   Bugün: ${totalToday} paket`)
    console.log(`   Toplam: ${totalAll} paket\n`)

    // 3. Gerçek delivered paket sayısını kontrol et
    const { data: realDelivered, error: error3 } = await supabase
      .from('packages')
      .select('id')
      .eq('status', 'delivered')

    if (error3) throw error3

    const realCount = (realDelivered || []).length

    console.log('🔍 DOĞRULAMA:')
    console.log(`   Veritabanında toplam delivered: ${realCount} paket`)
    console.log(`   Kuryelere atfedilen toplam: ${totalAll} paket`)
    console.log(`   FARK: ${realCount - totalAll} paket\n`)

    if (realCount !== totalAll) {
      console.log('⚠️  UYUMSUZLUK VAR!')
      console.log('   Bazı paketlerin delivered_by_courier_id değeri NULL olabilir.\n')

      // NULL olanları kontrol et
      const { data: nullPackages, error: error4 } = await supabase
        .from('packages')
        .select('id, order_number, customer_name, delivered_at')
        .eq('status', 'delivered')
        .is('delivered_by_courier_id', null)

      if (error4) throw error4

      if (nullPackages && nullPackages.length > 0) {
        console.log(`   ${nullPackages.length} paketin delivered_by_courier_id değeri NULL:\n`)
        nullPackages.forEach((pkg, index) => {
          console.log(`   ${index + 1}. #${pkg.order_number} - ${pkg.customer_name} - ${new Date(pkg.delivered_at).toLocaleString('tr-TR')}`)
        })
        console.log('\n   💡 ÇÖZüM: Şu SQL\'i çalıştır:')
        console.log('      UPDATE packages')
        console.log('      SET delivered_by_courier_id = courier_id')
        console.log('      WHERE status = \'delivered\'')
        console.log('        AND delivered_by_courier_id IS NULL')
        console.log('        AND courier_id IS NOT NULL;\n')
      }
    } else {
      console.log('✅ Sayılar tutarlı! Admin paneli doğru gösteriyor.\n')
    }

  } catch (error) {
    console.error('❌ Hata:', error.message)
  }
}

testAdminStats()
