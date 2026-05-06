/**
 * @file scripts/check-null-order-numbers.js
 * @description Veritabanında order_number'ı NULL olan paketleri kontrol eder
 */

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://otrjbpwirwgrxmezyuwg.supabase.co',
  'sb_publishable_ZCcSWwHpTLAH7-yDSh1dqA_1C2krw19'
)

async function checkNullOrderNumbers() {
  console.log('🔍 NULL order_number kontrolü başlatılıyor...\n')

  try {
    // 1. Tüm paketleri kontrol et
    const { data: allPackages, error: allError } = await supabase
      .from('packages')
      .select('id, order_number, status, created_at, customer_name')
      .order('created_at', { ascending: false })

    if (allError) throw allError

    console.log(`📦 Toplam paket sayısı: ${allPackages.length}`)

    // 2. NULL order_number'ları filtrele
    const nullOrderNumbers = allPackages.filter(pkg => !pkg.order_number)

    if (nullOrderNumbers.length === 0) {
      console.log('✅ Tüm paketlerin order_number değeri var!\n')
      return
    }

    console.log(`\n⚠️  ${nullOrderNumbers.length} adet NULL order_number bulundu:\n`)

    // 3. NULL olanları detaylı göster
    nullOrderNumbers.forEach((pkg, index) => {
      console.log(`${index + 1}. Paket ID: ${pkg.id}`)
      console.log(`   Müşteri: ${pkg.customer_name}`)
      console.log(`   Durum: ${pkg.status}`)
      console.log(`   Oluşturulma: ${new Date(pkg.created_at).toLocaleString('tr-TR')}`)
      console.log(`   order_number: ${pkg.order_number === null ? 'NULL' : 'undefined'}`)
      console.log('')
    })

    // 4. Durum bazlı analiz
    const byStatus = {}
    nullOrderNumbers.forEach(pkg => {
      byStatus[pkg.status] = (byStatus[pkg.status] || 0) + 1
    })

    console.log('📊 Durum Bazlı Dağılım:')
    Object.entries(byStatus).forEach(([status, count]) => {
      console.log(`   ${status}: ${count} adet`)
    })

    console.log('\n💡 ÖNERİ: Bu paketlere order_number atamak için şu SQL\'i çalıştırın:')
    console.log('   UPDATE packages SET order_number = nextval(\'order_number_seq\') WHERE order_number IS NULL;')

  } catch (error) {
    console.error('❌ Hata:', error.message)
  }
}

checkNullOrderNumbers()
