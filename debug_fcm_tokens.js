// FCM Token Debug Script
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://otrjbpwirwgrxmezyuwg.supabase.co'
const supabaseKey = 'sb_publishable_ZCcSWwHpTLAH7-yDSh1dqA_1C2krw19'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkFcmTokens() {
    console.log('🔍 FCM Token kontrolü başlıyor...\n')
    
    const { data: couriers, error } = await supabase
        .from('couriers')
        .select('id, username, full_name, fcm_token')
        .order('created_at', { ascending: false })
    
    if (error) {
        console.error('❌ Hata:', error)
        return
    }
    
    console.log('📊 Kurye FCM Token Durumu:')
    console.log('=' .repeat(50))
    
    couriers.forEach((courier, index) => {
        console.log(`${index + 1}. ${courier.full_name || courier.username}`)
        console.log(`   ID: ${courier.id}`)
        console.log(`   FCM Token: ${courier.fcm_token ? '✅ VAR' : '❌ YOK'}`)
        if (courier.fcm_token) {
            console.log(`   Token (ilk 20 karakter): ${courier.fcm_token.substring(0, 20)}...`)
        }
        console.log('')
    })
    
    const tokensWithToken = couriers.filter(c => c.fcm_token)
    const tokensWithoutToken = couriers.filter(c => !c.fcm_token)
    
    console.log('📈 ÖZET:')
    console.log(`✅ Token'ı olan kuryeler: ${tokensWithToken.length}`)
    console.log(`❌ Token'ı olmayan kuryeler: ${tokensWithoutToken.length}`)
    console.log(`📱 Toplam kurye: ${couriers.length}`)
}

checkFcmTokens()