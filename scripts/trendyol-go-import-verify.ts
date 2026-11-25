/**
 * Geçmiş içe aktarma doğrulama: 01.11.2026–25.11.2026 × 2 geçiş.
 * npx tsx --env-file=.env.local scripts/trendyol-go-import-verify.ts
 */
import { getSupabaseAdmin } from '../src/lib/supabaseAdmin'
import { decryptSecret } from '../src/lib/trendyol-go/crypto'
import { TrendyolGoReadClient } from '../src/lib/trendyol-go/client'
import {
  createEmptyMappingReport,
  ingestTrendyolPackage,
  logIngestFailure,
} from '../src/lib/trendyol-go'
import { HISTORY_IMPORT_STATUSES } from '../src/lib/trendyol-go/types'

const RESTAURANT_ID = '06c2194e-64a1-47ca-9e5b-00ca19fb6429'
const START = Date.parse('2026-10-31T21:00:00.000Z') // 01.11.2026 00:00 Europe/Istanbul
const END = Date.parse('2026-11-25T20:59:59.999Z') // 25.11.2026 23:59:59.999 TR

async function runPass(
  label: string,
  packages: Parameters<typeof ingestTrendyolPackage>[1]['pkg'][],
  integ: { id: string },
  restaurantId: string
) {
  const supabase = getSupabaseAdmin()
  const report = createEmptyMappingReport()
  const summary = {
    inserted: 0,
    updated: 0,
    skipped: 0,
    cancelled: 0,
    errors: 0,
  }
  const sampleErrors: Array<{ id: string; error?: string }> = []

  for (const pkg of packages) {
    const r = await ingestTrendyolPackage(supabase, {
      restaurantId,
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
        restaurantId,
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
  if (sampleErrors.length) console.log('sampleErrors:', sampleErrors.slice(0, 10))
  return summary
}

async function main() {
  const supabase = getSupabaseAdmin()
  const { data: integ, error } = await supabase
    .from('trendyol_go_integrations')
    .select('*')
    .eq('restaurant_id', RESTAURANT_ID)
    .single()

  if (error || !integ) {
    console.error('Entegrasyon bulunamadı', error?.message)
    process.exit(1)
  }

  let apiSecret: string | undefined
  let basicToken: string | undefined
  const envSecret = process.env.TRENDYOL_GO_API_SECRET?.trim()
  const envToken = process.env.TRENDYOL_GO_BASIC_TOKEN?.trim()

  if (envSecret || envToken) {
    apiSecret = envSecret || undefined
    basicToken = envToken || undefined
    console.log('Auth: TRENDYOL_GO_API_SECRET / BASIC_TOKEN env override')
  } else {
    try {
      apiSecret = integ.api_secret_encrypted
        ? await decryptSecret(integ.api_secret_encrypted)
        : undefined
      basicToken = integ.basic_token_encrypted
        ? await decryptSecret(integ.basic_token_encrypted)
        : undefined
    } catch (e) {
      console.error(
        'DB secret çözülemedi. Panelden API Secret’ı yeniden kaydedin veya şunu kullanın:\n' +
          '  TRENDYOL_GO_API_SECRET=... npx tsx --env-file=.env.local scripts/trendyol-go-import-verify.ts'
      )
      throw e
    }
  }

  const client = new TrendyolGoReadClient({
    environment: integ.ortam === 'stage' ? 'stage' : 'prod',
    auth: {
      apiKey: integ.api_key,
      apiSecret,
      basicToken,
      agentName: integ.agent_name,
      executorEmail: integ.executor_email,
    },
  })

  console.log('Trendyol paketleri çekiliyor…', {
    supplierId: integ.supplier_id,
    storeId: integ.store_id,
    start: START,
    end: END,
  })

  const { packages, totalCount } = await client.listAllPackages({
    supplierId: integ.supplier_id,
    storeId: integ.store_id,
    packageStatuses: HISTORY_IMPORT_STATUSES,
    packageModificationStartDate: START,
    packageModificationEndDate: END,
    size: 50,
  })

  console.log('API totalCount:', totalCount, 'çekilen:', packages.length)

  const appNames: Record<string, number> = {}
  for (const p of packages) {
    const a = (p.userInformation?.appName as string) || '(yok)'
    appNames[a] = (appNames[a] || 0) + 1
  }
  console.log('appName dağılımı:', appNames)

  const pass1 = await runPass('PASS 1', packages, integ, RESTAURANT_ID)
  const pass2 = await runPass('PASS 2 (idempotent)', packages, integ, RESTAURANT_ID)

  const pass2Ok =
    pass2.errors === 0 &&
    pass2.inserted === 0 &&
    pass2.skipped + pass2.updated + pass2.cancelled === packages.length

  console.log('\n=== DOĞRULAMA ===')
  console.log(
    pass2Ok
      ? 'PASS 2 OK: hata yok, insert yok, hepsi atlandı/güncellendi'
      : 'PASS 2 BEKLENMEDİK'
  )
  console.log('PASS1 errors:', pass1.errors, 'PASS2 errors:', pass2.errors)
  process.exit(pass2Ok ? 0 : 2)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
