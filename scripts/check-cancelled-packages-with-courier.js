/**
 * @file scripts/check-cancelled-packages-with-courier.js
 * @description İptal edilen paketlerde kurye ataması olup olmadığını kontrol eder
 */

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://otrjbpwirwgrxmezyuwg.supabase.co',
  'sb_publishable_ZCcSWwHpTLAH7-yDSh1dqA_1C2krw19'
)

async function checkCancelledPackages() {
  console.log('🔍 İptal edilen paketlerde kurye ataması kontrolü...\n')

  try {
    // 1. İptal edilen paketleri çek
    const { data: cancelledPackages, error } = await supabase
      .from('packages')
      .select('id, order_number, customer_name, courier_id, cancelled_at, cancelled_by, cancellation_reason')
      .eq('status', 'cancelled')
      .order('cancelled_at', { ascending: false })

    if (error) throw error

    console.log(`📦 Toplam iptal edilen paket: ${cancelledPackages.length}\n`)

    // 2. Kurye atanmış iptal paketlerini filtrele
    const withCourier = cancelledPackages.filter(pkg => pkg.courier_id !== null)

    if (withCourier.length === 0) {
      console.log('✅ İptal edilen paketlerin hiçbirinde kurye ataması yok!\n')
      return
    }

    console.log(`⚠️  ${withCourier.length} iptal paket KURYE ATANMIŞ durumda:\n`)

    // 3. Kurye bilgilerini çek
    const courierIds = [...new Set(withCourier.map(pkg => pkg.courier_id))]
    const { data: couriers, error: courierError } = await supabase
      .from('couriers')
      .select('id, full_name')
      .in('id', courierIds)

    if (courierError) throw courierError

    const courierMap = {}
    couriers.forEach(c => {
      courierMap[c.id] = c.full_name
    })

    // 4. Detaylı listele
    withCourier.forEach((pkg, index) => {
      console.log(`${index + 1}. Paket #${pkg.order_number}`)
      console.log(`   Müşteri: ${pkg.customer_name}`)
      console.log(`   Atanan Kurye: ${courierMap[pkg.courier_id] || 'Bilinmiyor'}`)
      console.log(`   İptal Eden: ${pkg.cancelled_by || 'Bilinmiyor'}`)
      console.log(`   İptal Nedeni: ${pkg.cancellation_reason || 'Belirtilmemiş'}`)
      console.log(`   İptal Tarihi: ${new Date(pkg.cancelled_at).toLocaleString('tr-TR')}`)
      console.log('')
    })

    // 5. Kurye bazlı analiz
    const byCourier = {}
    withCourier.forEach(pkg => {
      const courierName = courierMap[pkg.courier_id] || 'Bilinmiyor'
      byCourier[courierName] = (byCourier[courierName] || 0) + 1
    })

    console.log('📊 Kurye Bazlı Dağılım:')
    Object.entries(byCourier).forEach(([courier, count]) => {
      console.log(`   ${courier}: ${count} iptal paket`)
    })

    console.log('\n💡 ÖNERİ: İptal edilen paketlerin courier_id değerini NULL yapmak için:')
    console.log('   UPDATE packages')
    console.log('   SET courier_id = NULL')
    console.log('   WHERE status = \'cancelled\'')
    console.log('     AND courier_id IS NOT NULL;\n')

    // 6. İptal eden kişi analizi
    const byCancelledBy = {}
    withCourier.forEach(pkg => {
      const cancelledBy = pkg.cancelled_by || 'Bilinmiyor'
      byCancelledBy[cancelledBy] = (byCancelledBy[cancelledBy] || 0) + 1
    })

    console.log('📊 İptal Eden Kişi Dağılımı:')
    Object.entries(byCancelledBy).forEach(([person, count]) => {
      console.log(`   ${person}: ${count} paket`)
    })
    console.log('')

  } catch (error) {
    console.error('❌ Hata:', error.message)
  }
}

checkCancelledPackages()
