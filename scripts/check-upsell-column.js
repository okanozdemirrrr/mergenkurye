/**
 * Upsell sütununun varlığını kontrol eden script
 */
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// .env.local dosyasını manuel olarak oku
const envPath = path.join(__dirname, '..', '.env.local')
const envContent = fs.readFileSync(envPath, 'utf8')

const env = {}
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/)
  if (match) {
    const key = match[1].trim()
    let value = match[2].trim()
    // Tırnak işaretlerini kaldır
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1)
    }
    env[key] = value
  }
})

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = env.SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase bilgileri bulunamadı!')
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl)
  console.error('SERVICE_ROLE_KEY:', supabaseKey ? 'Mevcut' : 'Yok')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkUpsellColumn() {
  try {
    console.log('🔍 Upsell sütunu kontrol ediliyor...\n')

    // Bir ürün çek ve upsell_product_ids sütununu kontrol et
    const { data, error } = await supabase
      .from('products')
      .select('id, name, upsell_product_ids')
      .limit(5)

    if (error) {
      console.error('❌ Hata:', error.message)
      
      if (error.message.includes('upsell_product_ids')) {
        console.log('\n⚠️  upsell_product_ids sütunu bulunamadı!')
        console.log('📝 Migration dosyasını çalıştırmanız gerekiyor:')
        console.log('   database/add_product_upsells.sql')
        return false
      }
      
      return false
    }

    console.log('✅ upsell_product_ids sütunu mevcut!')
    console.log('\n📊 Örnek ürünler:')
    data.forEach(product => {
      console.log(`  - ${product.name}`)
      console.log(`    ID: ${product.id}`)
      console.log(`    Yan Ürünler: ${product.upsell_product_ids?.length || 0} adet`)
      if (product.upsell_product_ids?.length > 0) {
        console.log(`    IDs: ${product.upsell_product_ids.join(', ')}`)
      }
      console.log('')
    })

    return true
  } catch (error) {
    console.error('❌ Beklenmeyen hata:', error)
    return false
  }
}

checkUpsellColumn()
  .then(success => {
    process.exit(success ? 0 : 1)
  })
