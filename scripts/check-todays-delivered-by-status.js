import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function checkTodaysDeliveredByStatus() {
  console.log('🔍 Bugünkü teslimatları kontrol ediyorum...\n')

  // İş Günü: 05:00 - 04:59 (ertesi gün)
  const now = new Date()
  const todayStart = new Date(now)
  todayStart.setHours(5, 0, 0, 0)
  
  // Eğer şu an saat 05:00'den önceyse, dün sabah 05:00'i al
  if (now.getHours() < 5) {
    todayStart.setDate(todayStart.getDate() - 1)
  }

  const todayEnd = new Date(todayStart)
  todayEnd.setDate(todayEnd.getDate() + 1)
  todayEnd.setHours(4, 59, 59, 999)

  console.log('📅 İş Günü Aralığı:')
  console.log(`   Başlangıç: ${todayStart.toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })}`)
  console.log(`   Bitiş: ${todayEnd.toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })}\n`)

  // Bugün teslim edilen tüm paketler
  const { data: allDelivered, error: allError } = await supabase
    .from('packages')
    .select('id, order_number, courier_id, delivered_by_courier_id, delivered_at')
    .eq('status', 'delivered')
    .gte('delivered_at', todayStart.toISOString())
    .lte('delivered_at', todayEnd.toISOString())
    .order('delivered_at', { ascending: false })

  if (allError) {
    console.error('❌ Hata:', allError)
    return
  }

  console.log(`📦 Bugün Teslim Edilen Toplam Paket: ${allDelivered.length}\n`)

  // NULL olanları say
  const nullDeliveredBy = allDelivered.filter(p => !p.delivered_by_courier_id)
  const withDeliveredBy = allDelivered.filter(p => p.delivered_by_courier_id)

  console.log(`✅ delivered_by_courier_id DOLU: ${withDeliveredBy.length}`)
  console.log(`❌ delivered_by_courier_id NULL: ${nullDeliveredBy.length}\n`)

  if (nullDeliveredBy.length > 0) {
    console.log('⚠️  NULL olan paketler:\n')
    nullDeliveredBy.forEach(p => {
      console.log(`   #${p.order_number}`)
      console.log(`      Paket ID: ${p.id}`)
      console.log(`      courier_id: ${p.courier_id || 'NULL'}`)
      console.log(`      delivered_by_courier_id: NULL`)
      console.log(`      Teslim: ${new Date(p.delivered_at).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })}`)
      console.log('')
    })
  }

  // Kurye bazında grupla
  const courierGroups = {}
  withDeliveredBy.forEach(p => {
    const courierId = p.delivered_by_courier_id
    if (!courierGroups[courierId]) {
      courierGroups[courierId] = []
    }
    courierGroups[courierId].push(p)
  })

  // Kurye isimlerini çek
  const courierIds = Object.keys(courierGroups)
  if (courierIds.length > 0) {
    const { data: couriers } = await supabase
      .from('couriers')
      .select('id, full_name')
      .in('id', courierIds)

    console.log('👥 Kurye Bazında Teslimatlar:\n')
    couriers?.forEach(courier => {
      const count = courierGroups[courier.id]?.length || 0
      console.log(`   ${courier.full_name}: ${count} paket`)
    })
  }

  console.log('\n' + '='.repeat(50))
  console.log('📊 ÖZET:')
  console.log(`   Toplam: ${allDelivered.length}`)
  console.log(`   Kuryelere atanmış: ${withDeliveredBy.length}`)
  console.log(`   Kurye bilgisi eksik: ${nullDeliveredBy.length}`)
  console.log('='.repeat(50))
}

checkTodaysDeliveredByStatus()
