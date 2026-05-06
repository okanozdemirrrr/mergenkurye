/**
 * @file scripts/fix-delivered-by-courier-id.js
 * @description delivered_by_courier_id NULL olan paketleri düzeltir
 */

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://otrjbpwirwgrxmezyuwg.supabase.co',
  'sb_publishable_ZCcSWwHpTLAH7-yDSh1dqA_1C2krw19'
)

async function fixDeliveredByCourierId() {
  console.log('🔧 delivered_by_courier_id düzeltme başlatılıyor...\n')

  try {
    // 1. Önce etkilenecek paketleri göster
    const { data: beforeFix, error: error1 } = await supabase
      .from('packages')
      .select('id, order_number, customer_name, courier_id, delivered_at')
      .eq('status', 'delivered')
      .is('delivered_by_courier_id', null)
      .not('courier_id', 'is', null)

    if (error1) throw error1

    if (!beforeFix || beforeFix.length === 0) {
      console.log('✅ Düzeltilecek paket yok!\n')
      return
    }

    console.log(`⚠️  ${beforeFix.length} paket düzeltilecek:\n`)
    beforeFix.forEach((pkg, index) => {
      console.log(`${index + 1}. #${pkg.order_number} - ${pkg.customer_name}`)
      console.log(`   courier_id: ${pkg.courier_id}`)
      console.log(`   Teslim: ${new Date(pkg.delivered_at).toLocaleString('tr-TR')}\n`)
    })

    // 2. Düzeltme yap
    console.log('🔄 Düzeltme yapılıyor...\n')

    const { data: updated, error: error2 } = await supabase
      .from('packages')
      .update({ delivered_by_courier_id: supabase.raw('courier_id') })
      .eq('status', 'delivered')
      .is('delivered_by_courier_id', null)
      .not('courier_id', 'is', null)
      .select()

    if (error2) {
      console.error('❌ Supabase client ile güncelleme yapılamadı:', error2.message)
      console.log('\n💡 Manuel SQL çalıştırmanız gerekiyor:')
      console.log('   Supabase Dashboard → SQL Editor → Şu SQL\'i çalıştırın:\n')
      console.log('   UPDATE packages')
      console.log('   SET delivered_by_courier_id = courier_id')
      console.log('   WHERE status = \'delivered\'')
      console.log('     AND delivered_by_courier_id IS NULL')
      console.log('     AND courier_id IS NOT NULL;\n')
      return
    }

    console.log(`✅ ${updated?.length || 0} paket başarıyla düzeltildi!\n`)

    // 3. Kontrol et
    const { data: afterFix, error: error3 } = await supabase
      .from('packages')
      .select('id')
      .eq('status', 'delivered')
      .is('delivered_by_courier_id', null)

    if (error3) throw error3

    if (afterFix && afterFix.length === 0) {
      console.log('✅ Tüm paketler düzeltildi! Artık NULL delivered_by_courier_id yok.\n')
    } else {
      console.log(`⚠️  Hala ${afterFix?.length || 0} paket NULL.\n`)
    }

  } catch (error) {
    console.error('❌ Hata:', error.message)
  }
}

fixDeliveredByCourierId()
