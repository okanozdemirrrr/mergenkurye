import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function checkCourierLogin() {
  console.log('🔍 Kurye bilgilerini kontrol ediyorum...\n')

  // Kullanıcı adına benzer kuryeleri bul
  const { data: couriers, error } = await supabase
    .from('couriers')
    .select('id, full_name, username, is_active')
    .ilike('username', '%ozs%')

  if (error) {
    console.error('❌ Hata:', error)
    return
  }

  if (!couriers || couriers.length === 0) {
    console.log('❌ "ozs" ile başlayan kurye bulunamadı')
    
    // Tüm kuryeleri listele
    const { data: allCouriers } = await supabase
      .from('couriers')
      .select('id, full_name, username, is_active')
      .order('full_name')
    
    console.log('\n📋 Tüm Kuryeler:')
    allCouriers?.forEach(c => {
      console.log(`  - ${c.full_name} (${c.username}) - ${c.is_active ? '✅ Aktif' : '❌ Pasif'}`)
    })
    return
  }

  console.log('✅ Bulunan Kuryeler:\n')
  couriers.forEach(c => {
    console.log(`👤 ${c.full_name}`)
    console.log(`   Kullanıcı Adı: ${c.username}`)
    console.log(`   Durum: ${c.is_active ? '✅ Aktif' : '❌ Pasif'}`)
    console.log(`   ID: ${c.id}`)
    console.log('')
  })
}

checkCourierLogin()
