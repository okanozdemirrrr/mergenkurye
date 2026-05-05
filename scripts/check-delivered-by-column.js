/**
 * delivered_by_courier_id kolonunun var olup olmadığını kontrol et
 */
const { createClient } = require('@supabase/supabase-js')

// .env.local'den manuel oku
const fs = require('fs')
const envContent = fs.readFileSync('.env.local', 'utf8')
const envVars = {}
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=')
  if (key && valueParts.length) {
    envVars[key.trim()] = valueParts.join('=').trim()
  }
})

const supabase = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function checkColumn() {
  console.log('🔍 delivered_by_courier_id kolonu kontrol ediliyor...\n')

  try {
    // 1. Kolon var mı kontrol et
    const { data: testData, error: testError } = await supabase
      .from('packages')
      .select('id, courier_id, delivered_by_courier_id, status')
      .eq('status', 'delivered')
      .limit(5)

    if (testError) {
      console.error('❌ HATA:', testError.message)
      if (testError.message.includes('delivered_by_courier_id')) {
        console.log('\n⚠️  SORUN: delivered_by_courier_id kolonu YOK!')
        console.log('\n📋 ÇÖZ�M: Supabase SQL Editor\'de şu SQL\'i çalıştır:\n')
        console.log('ALTER TABLE packages ADD COLUMN IF NOT EXISTS delivered_by_courier_id UUID REFERENCES couriers(id);')
        console.log('CREATE INDEX IF NOT EXISTS idx_packages_delivered_by_courier ON packages(delivered_by_courier_id);')
        console.log('UPDATE packages SET delivered_by_courier_id = courier_id WHERE status = \'delivered\' AND delivered_by_courier_id IS NULL AND courier_id IS NOT NULL;')
      }
      return
    }

    console.log('✅ Kolon mevcut!\n')
    console.log('📊 İlk 5 teslim edilmiş paket:\n')
    
    testData.forEach((pkg, i) => {
      console.log(`${i + 1}. Paket ID: ${pkg.id}`)
      console.log(`   courier_id: ${pkg.courier_id || 'NULL'}`)
      console.log(`   delivered_by_courier_id: ${pkg.delivered_by_courier_id || 'NULL ⚠️'}`)
      console.log('')
    })

    // 2. Kaç pakette delivered_by_courier_id NULL?
    const { count: nullCount } = await supabase
      .from('packages')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'delivered')
      .is('delivered_by_courier_id', null)

    const { count: totalCount } = await supabase
      .from('packages')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'delivered')

    console.log(`\n📈 İstatistikler:`)
    console.log(`   Toplam teslim edilmiş: ${totalCount}`)
    console.log(`   delivered_by_courier_id NULL: ${nullCount}`)
    console.log(`   delivered_by_courier_id DOLU: ${totalCount - nullCount}`)

    if (nullCount > 0) {
      console.log('\n⚠️  SORUN: Bazı paketlerde delivered_by_courier_id NULL!')
      console.log('\n📋 ÇÖZÜM: Supabase SQL Editor\'de şu SQL\'i çalıştır:\n')
      console.log('UPDATE packages SET delivered_by_courier_id = courier_id WHERE status = \'delivered\' AND delivered_by_courier_id IS NULL AND courier_id IS NOT NULL;')
    } else {
      console.log('\n✅ Tüm paketlerde delivered_by_courier_id dolu!')
    }

  } catch (error) {
    console.error('❌ Beklenmeyen hata:', error)
  }
}

checkColumn()
