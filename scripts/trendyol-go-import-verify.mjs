/**
 * Geçmiş içe aktarma doğrulama: 01.11.2026–25.11.2026, sonra ikinci geçiş.
 * Kullanım: node --env-file=.env.local scripts/trendyol-go-import-verify.mjs
 * Yazma servisi YOK — sadece GET packages.
 */
import { createClient } from '@supabase/supabase-js'
import { createDecipheriv, pbkdf2Sync } from 'crypto'

const RESTAURANT_ID = '06c2194e-64a1-47ca-9e5b-00ca19fb6429'
const START = Date.parse('2026-10-31T21:00:00.000Z') // 01.11.2026 00:00 TR
const END = Date.parse('2026-11-25T20:59:59.999Z') // 25.11.2026 23:59:59.999 TR

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
const secretsKey = process.env.INTEGRATION_SECRETS_KEY

if (!url || !key) {
  console.error('NEXT_PUBLIC_SUPABASE_URL / SERVICE_ROLE_KEY eksik')
  process.exit(1)
}
if (!secretsKey || secretsKey.length < 32) {
  console.error('INTEGRATION_SECRETS_KEY eksik veya kısa')
  process.exit(1)
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
})

function deriveKey(raw, version) {
  return pbkdf2Sync(raw, `trendyol-go-v${version}`, 100000, 32, 'sha256')
}

function decryptSecret(ciphertext) {
  if (!ciphertext) return ''
  const parts = ciphertext.split(':')
  if (parts.length !== 3 || !parts[0].startsWith('v')) {
    throw new Error('Geçersiz secret formatı')
  }
  const version = Number(parts[0].slice(1))
  const iv = Buffer.from(parts[1], 'base64')
  const data = Buffer.from(parts[2], 'base64')
  const aesKey = deriveKey(secretsKey, version)
  const decipher = createDecipheriv('aes-256-gcm', aesKey, iv)
  const tag = data.subarray(data.length - 16)
  const enc = data.subarray(0, data.length - 16)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8')
}

function buildAuthHeader(apiKey, apiSecret, basicToken) {
  if (basicToken) {
    const t = basicToken.replace(/^Basic\s+/i, '')
    return `Basic ${t}`
  }
  return `Basic ${Buffer.from(`${apiKey}:${apiSecret}`, 'utf8').toString('base64')}`
}

async function listAllPackages(integ, authHeader) {
  const base =
    integ.ortam === 'stage'
      ? 'https://stageapi.tgoapis.com/integrator/order/meal'
      : 'https://api.tgoapis.com/integrator/order/meal'
  const all = []
  let page = 0
  let totalPages = 1
  let totalCount = 0

  while (page < totalPages) {
    const qs = new URLSearchParams({
      storeId: String(integ.store_id),
      packageStatuses: 'Delivered,Cancelled',
      packageModificationStartDate: String(START),
      packageModificationEndDate: String(END),
      page: String(page),
      size: '50',
    })
    const res = await fetch(`${base}/suppliers/${integ.supplier_id}/packages?${qs}`, {
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
        'x-agentname': integ.agent_name,
        'x-executor-user': integ.executor_email,
      },
    })
    const text = await res.text()
    if (!res.ok) {
      throw new Error(`Trendyol ${res.status}: ${text.slice(0, 300)}`)
    }
    const json = JSON.parse(text)
    totalCount = json.totalCount ?? all.length
    totalPages = Math.max(1, json.totalPages ?? 1)
    all.push(...(json.content || []))
    page += 1
    if (!(json.content || []).length) break
  }
  return { packages: all, totalCount }
}

// Dynamic import of compiled TS via tsx register — run with: npx tsx scripts/...
async function runPass(label, packages, integ) {
  const { ingestTrendyolPackage, logIngestFailure, createEmptyMappingReport } =
    await import('../src/lib/trendyol-go/index.ts')

  const report = createEmptyMappingReport()
  const summary = {
    inserted: 0,
    updated: 0,
    skipped: 0,
    cancelled: 0,
    errors: 0,
  }
  const sampleErrors = []

  for (const pkg of packages) {
    const r = await ingestTrendyolPackage(supabase, {
      restaurantId: RESTAURANT_ID,
      pkg,
      gecmisVeri: true,
      report,
    })
    if (r.action === 'inserted') summary.inserted++
    else if (r.action === 'updated') summary.updated++
    else if (r.action === 'skipped_idempotent') summary.skipped++
    else if (r.action === 'cancelled') summary.cancelled++
    else if (r.action === 'error') {
      summary.errors++
      sampleErrors.push({ id: r.trendyolPackageId, error: r.error })
      await logIngestFailure(supabase, {
        integrationId: integ.id,
        restaurantId: RESTAURANT_ID,
        trendyolPackageId: r.trendyolPackageId,
        packageStatus: r.packageStatus,
        error: r.error || 'error',
      })
    }
  }

  console.log(`\n=== ${label} ===`)
  console.log('fetched:', packages.length)
  console.log('summary:', summary)
  console.log('report:', {
    packagesRead: report.packagesRead,
    maskedAddressCount: report.maskedAddressCount,
    courierNoteCount: report.courierNoteCount,
    phoneFromDescriptionCount: report.phoneFromDescriptionCount,
    unmatchedProductCount: report.unmatchedProductCount,
    paymentTypesSeen: report.paymentTypesSeen,
    unexpectedFields: report.unexpectedFields,
    cancelledCount: report.cancelledCount,
    testPackageCount: report.testPackageCount,
  })
  if (sampleErrors.length) {
    console.log('sampleErrors:', sampleErrors.slice(0, 10))
  }
  return summary
}

async function main() {
  const { data: integ, error } = await supabase
    .from('trendyol_go_integrations')
    .select('*')
    .eq('restaurant_id', RESTAURANT_ID)
    .single()

  if (error || !integ) {
    console.error('Entegrasyon bulunamadı', error?.message)
    process.exit(1)
  }

  const apiSecret = integ.api_secret_encrypted
    ? decryptSecret(integ.api_secret_encrypted)
    : ''
  const basicToken = integ.basic_token_encrypted
    ? decryptSecret(integ.basic_token_encrypted)
    : ''
  const authHeader = buildAuthHeader(integ.api_key, apiSecret, basicToken)

  console.log('Trendyol paketleri çekiliyor…', {
    supplierId: integ.supplier_id,
    storeId: integ.store_id,
    start: START,
    end: END,
  })

  const { packages, totalCount } = await listAllPackages(integ, authHeader)
  console.log('API totalCount:', totalCount, 'çekilen:', packages.length)

  const appNames = {}
  for (const p of packages) {
    const a = p.userInformation?.appName || '(yok)'
    appNames[a] = (appNames[a] || 0) + 1
  }
  console.log('appName dağılımı:', appNames)

  const pass1 = await runPass('PASS 1', packages, integ)
  const pass2 = await runPass('PASS 2 (idempotent)', packages, integ)

  const pass2Ok =
    pass2.errors === 0 &&
    pass2.inserted === 0 &&
    pass2.skipped + pass2.updated + pass2.cancelled === packages.length

  console.log('\n=== DOĞRULAMA ===')
  console.log(
    pass2Ok
      ? 'PASS 2 OK: hata yok, insert yok, hepsi atlandı/güncellendi/iptal'
      : 'PASS 2 BEKLENMEDİK — yukarıdaki summary’ye bak'
  )
  process.exit(pass2Ok ? 0 : 2)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
