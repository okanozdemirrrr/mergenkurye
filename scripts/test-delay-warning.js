const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

function loadEnv() {
  const env = {}
  for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    if (!line || line.trim().startsWith('#')) continue
    const i = line.indexOf('=')
    if (i < 0) continue
    let k = line.slice(0, i).trim()
    let v = line.slice(i + 1).trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1)
    }
    env[k] = v
  }
  return env
}

async function main() {
  const env = loadEnv()
  const url = env.NEXT_PUBLIC_SUPABASE_URL
  const key = env.SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('URL/SERVICE_ROLE_KEY yok')

  const supabase = createClient(url, key)
  const courierId = '8a18f119-b81b-4992-9583-70fd3cd7d757'

  const { data: courier, error: cErr } = await supabase
    .from('couriers')
    .select('id, full_name, fcm_token')
    .eq('id', courierId)
    .single()

  if (cErr) throw cErr

  console.log('KURYE:', courier.full_name)
  console.log('TOKEN:', courier.fcm_token ? `VAR len=${courier.fcm_token.length}` : 'YOK')

  const { data: restaurant, error: rErr } = await supabase
    .from('restaurants')
    .select('id')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (rErr) throw rErr
  if (!restaurant?.id) throw new Error('restaurant yok')

  const assignedAt = new Date(Date.now() - 16 * 60 * 1000).toISOString()
  const orderNumber = `TEST-DELAY-${Date.now()}`

  const insertPayload = {
    customer_name: 'TEST Gecikme Bildirim',
    customer_phone: '05555555555',
    delivery_address: 'TEST ADRES - Silinecek',
    amount: 1,
    content: 'TEST PAKET delay warning',
    status: 'assigned',
    payment_method: 'cash',
    courier_id: courierId,
    restaurant_id: restaurant.id,
    order_number: orderNumber,
    assigned_at: assignedAt,
    created_at: new Date().toISOString(),
    applied_price: 100,
    is_delay_warning_sent: false,
    reminder_15min_sent: false,
  }

  const { data: pkg, error: pErr } = await supabase
    .from('packages')
    .insert([insertPayload])
    .select('id, status, assigned_at, courier_id, is_delay_warning_sent, reminder_15min_sent')
    .single()

  if (pErr) throw pErr
  console.log('PAKET:', JSON.stringify(pkg))

  const res = await fetch(`${url}/functions/v1/check-delayed-packages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  })
  const body = await res.text()
  console.log('HTTP:', res.status)
  console.log('BODY:', body)

  const { data: after } = await supabase
    .from('packages')
    .select('id, is_delay_warning_sent, reminder_15min_sent')
    .eq('id', pkg.id)
    .single()

  console.log('AFTER FLAGS:', JSON.stringify(after))
}

main().catch((e) => {
  console.error('ERR:', e.message || e)
  process.exit(1)
})
