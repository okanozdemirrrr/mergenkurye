/**
 * @file scripts/check-courier-delivery-mismatch.js
 * @description Kurye teslimat sayılarındaki tutarsızlığı kontrol eder
 */

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://otrjbpwirwgrxmezyuwg.supabase.co',
  'sb_publishable_ZCcSWwHpTLAH7-yDSh1dqA_1C2krw19'
)

async function checkDeliveryMismatch() {
  console.log('🔍 Kurye teslimat sayıları kontrol ediliyor...\n')

  try {
    // 1. Tüm kuryeleri çek
    const { data: couriers, error: couriersError } = await supabase
      .from('couriers')
      .select('id, full_name')
      .order('full_name')

    if (couriersError) throw couriersError

    console.log(`👥 Toplam ${couriers.length} kurye bulundu\n`)

    let totalByCourierId = 0
    let totalByDeliveredBy = 0
    let mismatchedPackages = []

    // 2. Her kurye için teslimat sayılarını kontrol et
    for (const courier of couriers) {
      // courier_id ile sayım
      const { data: byCourierId, error: error1 } = await supabase
        .from('packages')
        .select('id, order_number, customer_name, delivered_at')
        .eq('courier_id', courier.id)
        .eq('status', 'delivered')

      if (error1) throw error1

      // delivered_by_courier_id ile sayım
      const { data: byDeliveredBy, error: error2 } = await supabase
        .from('packages')
        .select('id, order_number, customer_name, delivered_at')
        .eq('delivered_by_courier_id', courier.id)
        .eq('status', 'delivered')

      if (error2) throw error2

      const countByCourierId = byCourierId?.length || 0
      const countByDeliveredBy = byDeliveredBy?.length || 0

      totalByCourierId += countByCourierId
      totalByDeliveredBy += countByDeliveredBy

      if (countByCourierId !== countByDeliveredBy) {
        console.log(`⚠️  ${courier.full_name}:`)
        console.log(`   courier_id ile: ${countByCourierId} paket`)
        console.log(`   delivered_by_courier_id ile: ${countByDeliveredBy} paket`)
        console.log(`   FARK: ${Math.abs(countByCourierId - countByDeliveredBy)} paket\n`)

        // Farkı yaratan paketleri bul
        const courierIdSet = new Set(byCourierId?.map(p => p.id) || [])
        const deliveredBySet = new Set(byDeliveredBy?.map(p => p.id) || [])

        // courier_id'de var ama delivered_by'da yok
        const onlyInCourierId = byCourierId?.filter(p => !deliveredBySet.has(p.id)) || []
        // delivered_by'da var ama courier_id'de yok
        const onlyInDeliveredBy = byDeliveredBy?.filter(p => !courierIdSet.has(p.id)) || []

        if (onlyInCourierId.length > 0) {
          console.log(`   📦 Sadece courier_id'de olan paketler:`)
          onlyInCourierId.forEach(pkg => {
            console.log(`      - #${pkg.order_number} (${pkg.customer_name}) - ${new Date(pkg.delivered_at).toLocaleString('tr-TR')}`)
            mismatchedPackages.push({
              packageId: pkg.id,
              orderNumber: pkg.order_number,
              issue: 'delivered_by_courier_id NULL',
              courier: courier.full_name
            })
          })
        }

        if (onlyInDeliveredBy.length > 0) {
          console.log(`   📦 Sadece delivered_by_courier_id'de olan paketler:`)
          onlyInDeliveredBy.forEach(pkg => {
            console.log(`      - #${pkg.order_number} (${pkg.customer_name}) - ${new Date(pkg.delivered_at).toLocaleString('tr-TR')}`)
            mismatchedPackages.push({
              packageId: pkg.id,
              orderNumber: pkg.order_number,
              issue: 'courier_id farklı',
              courier: courier.full_name
            })
          })
        }
        console.log('')
      }
    }

    console.log('\n📊 ÖZET:')
    console.log(`   courier_id ile toplam: ${totalByCourierId}`)
    console.log(`   delivered_by_courier_id ile toplam: ${totalByDeliveredBy}`)
    console.log(`   FARK: ${Math.abs(totalByCourierId - totalByDeliveredBy)} paket\n`)

    // 3. delivered_by_courier_id NULL olan paketleri bul
    const { data: nullDeliveredBy, error: error3 } = await supabase
      .from('packages')
      .select('id, order_number, customer_name, courier_id, delivered_at, couriers(full_name)')
      .eq('status', 'delivered')
      .is('delivered_by_courier_id', null)

    if (error3) throw error3

    if (nullDeliveredBy && nullDeliveredBy.length > 0) {
      console.log(`\n⚠️  ${nullDeliveredBy.length} adet delivered_by_courier_id NULL paket bulundu:\n`)
      nullDeliveredBy.forEach((pkg, index) => {
        console.log(`${index + 1}. Paket #${pkg.order_number}`)
        console.log(`   Müşteri: ${pkg.customer_name}`)
        console.log(`   Mevcut courier_id: ${pkg.courier_id}`)
        console.log(`   Kurye: ${pkg.couriers?.full_name || 'Bilinmiyor'}`)
        console.log(`   Teslim: ${new Date(pkg.delivered_at).toLocaleString('tr-TR')}`)
        console.log('')
      })

      console.log('\n💡 ÇÖZüM: Bu paketleri düzeltmek için şu SQL\'i çalıştırın:')
      console.log('   UPDATE packages')
      console.log('   SET delivered_by_courier_id = courier_id')
      console.log('   WHERE status = \'delivered\'')
      console.log('     AND delivered_by_courier_id IS NULL')
      console.log('     AND courier_id IS NOT NULL;\n')
    } else {
      console.log('✅ Tüm delivered paketlerin delivered_by_courier_id değeri var!\n')
    }

  } catch (error) {
    console.error('❌ Hata:', error.message)
  }
}

checkDeliveryMismatch()
