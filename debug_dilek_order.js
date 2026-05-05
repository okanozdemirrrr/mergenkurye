// Dilek Akyüz siparişini kontrol et
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://otrjbpwirwgrxmezyuwg.supabase.co'
const supabaseKey = 'sb_publishable_ZCcSWwHpTLAH7-yDSh1dqA_1C2krw19'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkDilekOrder() {
    console.log('🔍 Dilek Akyüz siparişini kontrol ediyorum...\n')
    
    // Dilek Akyüz'ün siparişlerini bul
    const { data: orders, error } = await supabase
        .from('packages')
        .select(`
            id,
            customer_name,
            status,
            created_at,
            assigned_at,
            picked_up_at,
            delivered_at,
            courier_id,
            restaurant_id,
            restaurants(name),
            couriers(full_name)
        `)
        .ilike('customer_name', '%dilek%akyüz%')
        .order('created_at', { ascending: false })
    
    if (error) {
        console.error('❌ Hata:', error)
        return
    }
    
    console.log(`📦 Dilek Akyüz'ün toplam siparişi: ${orders.length}`)
    console.log('=' .repeat(60))
    
    orders.forEach((order, index) => {
        console.log(`${index + 1}. SİPARİŞ:`)
        console.log(`   ID: ${order.id}`)
        console.log(`   Müşteri: ${order.customer_name}`)
        console.log(`   Durum: ${order.status}`)
        console.log(`   Restoran: ${order.restaurants?.name || 'Bilinmiyor'}`)
        console.log(`   Kurye: ${order.couriers?.full_name || 'Atanmamış'}`)
        console.log(`   Oluşturulma: ${order.created_at}`)
        console.log(`   Atanma: ${order.assigned_at || 'Atanmamış'}`)
        console.log(`   Alınma: ${order.picked_up_at || 'Alınmamış'}`)
        console.log(`   Teslim: ${order.delivered_at || 'Teslim edilmemiş'}`)
        
        // Durum analizi
        if (order.status === 'delivered' && order.delivered_at) {
            console.log(`   ✅ DURUM: Teslim edilmiş (${order.delivered_at})`)
        } else if (order.status === 'ready') {
            console.log(`   ⚠️ SORUN: Hazır durumunda ama teslim edilmemiş`)
        } else {
            console.log(`   📊 DURUM: ${order.status}`)
        }
        
        console.log('')
    })
    
    // Sorunlu siparişleri filtrele
    const problematicOrders = orders.filter(order => 
        (order.delivered_at && order.status !== 'delivered') ||
        (order.status === 'ready' && order.delivered_at)
    )
    
    if (problematicOrders.length > 0) {
        console.log('🚨 SORUNLU SİPARİŞLER:')
        console.log('=' .repeat(60))
        problematicOrders.forEach(order => {
            console.log(`ID: ${order.id} - Durum: ${order.status} - Teslim: ${order.delivered_at}`)
        })
    }
}

checkDilekOrder()