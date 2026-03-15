const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://otrjbpwirwgrxmezyuwg.supabase.co'
const supabaseKey = 'sb_secret_9CfOQBAR_eFgmjiGo46xVA_YxKXfD3_'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkStatuses() {
  console.log('🔍 Packages tablosundaki tüm status değerleri kontrol ediliyor...\n')
  
  // Tüm benzersiz status değerlerini al
  const { data, error } = await supabase
    .from('packages')
    .select('status')
  
  if (error) {
    console.error('❌ Hata:', error)
    return
  }
  
  // Status değerlerini say
  const statusCounts = {}
  data.forEach(pkg => {
    const status = pkg.status
    statusCounts[status] = (statusCounts[status] || 0) + 1
  })
  
  console.log('📊 Kullanılan Status Değerleri:\n')
  console.log('Status'.padEnd(20), 'Adet')
  console.log('-'.repeat(30))
  
  Object.entries(statusCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([status, count]) => {
      console.log(status.padEnd(20), count)
    })
  
  console.log('\n' + '='.repeat(30))
  console.log('Toplam Paket:', data.length)
  console.log('Benzersiz Status:', Object.keys(statusCounts).length)
  console.log('\n📋 Status Listesi:')
  console.log(Object.keys(statusCounts).sort().join(', '))
}

checkStatuses()
