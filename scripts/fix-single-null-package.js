/**
 * @file scripts/fix-single-null-package.js
 * @description Tek bir NULL paketi düzeltir
 */

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://otrjbpwirwgrxmezyuwg.supabase.co',
  'sb_publishable_ZCcSWwHpTLAH7-yDSh1dqA_1C2krw19'
)

async function fixSinglePackage() {
  console.log('🔧 #005978 paketi düzeltiliyor...\n')

  try {
    // 1. Paketi kontrol et
    const { data: pkg, error: error1 } = await supabase
      .from('packages')
      .select('id, order_number, courier_id, delivered_by_courier_id')
      .eq('order_number', '005978')
      .single()

    if (error1) throw error1

    console.log('📦 Paket Bilgileri:')
    console.log('   ID:', pkg.id)
    console.log('   Order Number:', pkg.order_number)
    console.log('   courier_id:', pkg.courier_id)
    console.log('   delivered_by_courier_id:', pkg.delivered_by_courier_id)
    console.log('')

    if (pkg.delivered_by_courier_id) {
      console.log('✅ Paket zaten düzeltilmiş!')
      return
    }

    if (!pkg.courier_id) {
      console.log('❌ courier_id NULL, düzeltilemiyor!')
      return
    }

    // 2. Düzelt
    const { error: error2 } = await supabase
      .from('packages')
      .update({ delivered_by_courier_id: pkg.courier_id })
      .eq('id', pkg.id)

    if (error2) throw error2

    console.log('✅ Paket başarıyla düzeltildi!')
    console.log('   delivered_by_courier_id:', pkg.courier_id)

  } catch (error) {
    console.error('❌ Hata:', error.message)
  }
}

fixSinglePackage()
