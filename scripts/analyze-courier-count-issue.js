/**
 * @file scripts/analyze-courier-count-issue.js
 * @description Kurye paket sayılarının neden eksik göründüğünü analiz eder
 */

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://otrjbpwirwgrxmezyuwg.supabase.co',
  'sb_publishable_ZCcSWwHpTLAH7-yDSh1dqA_1C2krw19'
)

async function analyzeIssue() {
  console.log('🔍 Kurye paket sayısı analizi başlatılıyor...\n')

  try {
    // 1. Tüm delivered paketleri çek
    const { data: allDelivered, error: error1 } = await supabase
      .from('packages')
      .select('id, order_number, courier_id, delivered_by_courier_id, delivered_at')
      .eq('status', 'delivered')
      .order('delivered_at', { ascending: false })

    if (error1) throw error1

    console.log(`📦 Toplam teslim edilmiş paket: ${allDelivered.length}\n`)

    // 2. delivered_by_courier_id NULL olanları say
    const nullDeliveredBy = allDelivered.filter(pkg => !pkg.delivered_by_courier_id)
    const withDeliveredBy = allDelivered.filter(pkg => pkg.delivered_by_courier_id)

    console.log('📊 GENEL DURUM:')
    console.log(`   ✅ delivered_by_courier_id DOLU: ${withDeliveredBy.length} paket`)
    console.log(`   ⚠️  delivered_by_courier_id NULL: ${nullDeliveredBy.length} paket`)
    console.log(`   📈 Kayıp Oran: %${((nullDeliveredBy.length / allDelivered.length) * 100).toFixed(1)}\n`)

    if (nullDeliveredBy.length === 0) {
      console.log('✅ Tüm paketlerin delivered_by_courier_id değeri var!\n')
      return
    }

    // 3. NULL olanları detaylı analiz et
    console.log(`⚠️  ${nullDeliveredBy.length} PAKET KAYIP (delivered_by_courier_id NULL):\n`)

    // Tarih bazlı analiz
    const byDate = {}
    nullDeliveredBy.forEach(pkg => {
      const date = new Date(pkg.delivered_at).toLocaleDateString('tr-TR')
      byDate[date] = (byDate[date] || 0) + 1
    })

    console.log('📅 Tarih Bazlı Dağılım:')
    Object.entries(byDate)
      .sort((a, b) => new Date(a[0]) - new Date(b[0]))
      .forEach(([date, count]) => {
        console.log(`   ${date}: ${count} paket`)
      })
    console.log('')

    // 4. courier_id var mı kontrol et
    const hasCourer = nullDeliveredBy.filter(pkg => pkg.courier_id)
    const noCourer = nullDeliveredBy.filter(pkg => !pkg.courier_id)

    console.log('🔍 courier_id Durumu:')
    console.log(`   ✅ courier_id VAR (kopyalanabilir): ${hasCourer.length} paket`)
    console.log(`   ❌ courier_id YOK (kayıp): ${noCourer.length} paket\n`)

    if (hasCourer.length > 0) {
      console.log('💡 ÇÖZüM 1: courier_id\'si olan paketleri düzelt:')
      console.log('   UPDATE packages')
      console.log('   SET delivered_by_courier_id = courier_id')
      console.log('   WHERE status = \'delivered\'')
      console.log('     AND delivered_by_courier_id IS NULL')
      console.log('     AND courier_id IS NOT NULL;\n')
      console.log(`   Bu ${hasCourer.length} paketi düzeltecek.\n`)
    }

    if (noCourer.length > 0) {
      console.log(`⚠️  ${noCourer.length} paketin NE courier_id NE de delivered_by_courier_id var!`)
      console.log('   Bu paketler muhtemelen manuel oluşturulmuş veya eski sistemden.')
      console.log('   İlk 10 paket:\n')
      
      noCourer.slice(0, 10).forEach((pkg, index) => {
        console.log(`   ${index + 1}. #${pkg.order_number} - ${new Date(pkg.delivered_at).toLocaleString('tr-TR')}`)
      })
      console.log('')
    }

    // 5. Kurye bazlı kayıp analizi
    if (hasCourer.length > 0) {
      const { data: couriers, error: error2 } = await supabase
        .from('couriers')
        .select('id, full_name')

      if (error2) throw error2

      const courierMap = {}
      couriers.forEach(c => {
        courierMap[c.id] = c.full_name
      })

      const byCourier = {}
      hasCourer.forEach(pkg => {
        const courierName = courierMap[pkg.courier_id] || 'Bilinmiyor'
        byCourier[courierName] = (byCourier[courierName] || 0) + 1
      })

      console.log('👥 Kurye Bazlı Kayıp Paketler (courier_id var ama delivered_by yok):')
      Object.entries(byCourier)
        .sort((a, b) => b[1] - a[1])
        .forEach(([courier, count]) => {
          console.log(`   ${courier}: ${count} paket`)
        })
      console.log('')
    }

    // 6. Özet ve aksiyon planı
    console.log('🎯 AKSİYON PLANI:')
    console.log('   1. Yukarıdaki SQL\'i Supabase Dashboard\'da çalıştır')
    console.log(`   2. ${hasCourer.length} paket düzelecek`)
    console.log(`   3. Kurye sayıları doğru olacak`)
    console.log(`   4. ${noCourer.length} paket kalıcı olarak kayıp (eski sistem)\n`)

  } catch (error) {
    console.error('❌ Hata:', error.message)
  }
}

analyzeIssue()
