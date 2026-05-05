// Push Notification API Test Script
const fetch = require('node-fetch')

async function testPushAPI() {
    console.log('🧪 Push Notification API Test başlıyor...\n')
    
    // Test verisi - Taha yasir Yarım kuryesine test bildirimi
    const testData = {
        courierId: '2f7b94a2-0246-40fb-9551-4a7f7f3e7b13', // Taha yasir Yarım
        restaurantName: 'Test Restoran',
        deliveryAddress: 'Test Teslimat Adresi, Ankara',
        customerName: 'Test Müşteri'
    }
    
    console.log('📤 Test verisi:', testData)
    console.log('')
    
    try {
        const response = await fetch('http://localhost:3000/api/send-push', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(testData)
        })
        
        const result = await response.json()
        
        console.log('📊 API Response Status:', response.status)
        console.log('📊 API Response:', JSON.stringify(result, null, 2))
        
        if (response.ok) {
            console.log('\n✅ Push notification başarıyla gönderildi!')
            console.log(`📱 Kurye: ${result.courierName}`)
            console.log(`📝 Başlık: ${result.title}`)
            console.log(`📝 İçerik: ${result.body}`)
            console.log(`🆔 Message ID: ${result.messageId}`)
        } else {
            console.log('\n❌ Push notification gönderilemedi!')
            console.log('Hata:', result.error)
            if (result.details) {
                console.log('Detay:', result.details)
            }
        }
        
    } catch (error) {
        console.error('❌ API Test hatası:', error.message)
        
        if (error.code === 'ECONNREFUSED') {
            console.log('\n💡 Çözüm: Next.js dev server\'ı çalıştırın:')
            console.log('   npm run dev')
        }
    }
}

testPushAPI()