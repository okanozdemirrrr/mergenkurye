/**
 * @file src/app/admin/restoranlar/mutabakatlar/page.tsx
 * @description Restoran mutabakat geçmişi (restaurant_settlements)
 *
 * Veri çekimi kuralları:
 * 1) Supabase varsayılan satır limitini aşmak için sayfalı (range) fetch
 * 2) Tarih filtreleri Europe/Istanbul duvar saati ile (gece yarısı kayması yok)
 * 3) Restoran soft-delete / pasif olsa bile fişler gelsin → restaurants!left + ayrı isim yükleme
 */
'use client'

import { useEffect, useState, useCallback, useMemo, Fragment } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { supabase } from '@/app/lib/supabase'
import { parseFilterInputToUtcIso } from '@/utils/calculations'

type SettlementPackage = {
  order_number: string | null
  delivered_at: string | null
  amount?: number | null
}

type SettlementRow = {
  id: string
  created_at: string
  restaurant_id: string
  start_date: string
  end_date: string
  total_revenue: number | null
  courier_cost: number | null
  commission_amount: number | null
  net_paid: number | null
  package_count: number | null
  restaurants: { name: string } | { name: string }[] | null
  packages?: SettlementPackage[] | null
}

const COL_SPAN = 8
/** PostgREST / Supabase varsayılan üst sınırı; sayfalama ile aşılır */
const PAGE_SIZE = 1000
const ISTANBUL_TZ = 'Europe/Istanbul'

/**
 * Sadece UI gizleme — DB/RPC/paket bağları dokunulmaz.
 * Mayıs ücretli-iptal orphan catch-up fişleri (katıkdöner -90, ikramdöner -95).
 */
const HIDDEN_SETTLEMENT_IDS = new Set([
  'a1442255-d9bd-4905-b972-fbf2db22c3d4',
  'd287dc53-a30f-4847-8a63-4531e4e511cc',
])

/** Left join — pasif/silinmiş restoran fişlerini düşürmez */
const SETTLEMENT_SELECT = `
  id,
  created_at,
  restaurant_id,
  start_date,
  end_date,
  total_revenue,
  courier_cost,
  commission_amount,
  net_paid,
  package_count,
  restaurants!left ( name )
`

const SETTLEMENT_SELECT_PLAIN = `
  id,
  created_at,
  restaurant_id,
  start_date,
  end_date,
  total_revenue,
  courier_cost,
  commission_amount,
  net_paid,
  package_count
`

function formatMoney(value: number | null | undefined): string {
  const n = Number(value)
  if (!Number.isFinite(n)) return '0,00 ₺'
  return `${n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺`
}

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: ISTANBUL_TZ,
  })
}

function formatPeriodDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: ISTANBUL_TZ,
  })
}

function formatDeliveredAt(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: ISTANBUL_TZ,
  })
}

/** YYYY-MM-DD in Europe/Istanbul — tarayıcı TZ'sinden bağımsız */
function istanbulDateKey(iso: string): string | null {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: ISTANBUL_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
}

function restaurantNameFromRow(row: SettlementRow, nameById: Map<string, string>): string {
  const joined = row.restaurants
  if (joined && !Array.isArray(joined) && joined.name) {
    return joined.name
  }
  if (Array.isArray(joined) && joined[0]?.name) {
    return joined[0].name
  }
  return nameById.get(row.restaurant_id) ?? 'Bilinmeyen Restoran'
}

function packagesFromRow(row: SettlementRow): SettlementPackage[] {
  const raw = row.packages
  if (!raw) return []
  return [...raw].sort((a, b) => {
    const ta = a.delivered_at ? new Date(a.delivered_at).getTime() : 0
    const tb = b.delivered_at ? new Date(b.delivered_at).getTime() : 0
    return tb - ta
  })
}

/**
 * Tüm mutabakat fişlerini sayfalayarak çeker.
 * Tarih boşsa filtre yok → DB'deki tüm kayıtlar.
 * Paket embed yok (parent satır truncate riski); paketler satır açılınca yüklenir.
 */
async function fetchAllSettlements(
  startDate: string,
  endDate: string
): Promise<{ rows: SettlementRow[]; usedPlainSelect: boolean }> {
  const all: SettlementRow[] = []
  let offset = 0
  let usedPlainSelect = false

  const startIso = startDate ? parseFilterInputToUtcIso(startDate, 'start') : null
  const endIso = endDate ? parseFilterInputToUtcIso(endDate, 'end') : null

  const runPage = async (select: string, from: number, to: number) => {
    let q = supabase
      .from('restaurant_settlements')
      .select(select)
      .order('created_at', { ascending: false })
      .range(from, to)

    if (startIso) q = q.gte('created_at', startIso)
    if (endIso) q = q.lte('created_at', endIso)

    return q
  }

  while (true) {
    const to = offset + PAGE_SIZE - 1
    let result = await runPage(SETTLEMENT_SELECT, offset, to)

    if (result.error) {
      result = await runPage(SETTLEMENT_SELECT_PLAIN, offset, to)
      if (result.error) throw result.error
      usedPlainSelect = true
    }

    const chunk = (result.data || []) as SettlementRow[]
    all.push(...chunk)

    if (chunk.length < PAGE_SIZE) break
    offset += PAGE_SIZE
  }

  return { rows: all, usedPlainSelect }
}

export default function RestoranMutabakatlarPage() {
  const [rows, setRows] = useState<SettlementRow[]>([])
  const [restaurantNames, setRestaurantNames] = useState<Map<string, string>>(new Map())
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [joinWarning, setJoinWarning] = useState<string | null>(null)
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null)
  const [packagesLoadingId, setPackagesLoadingId] = useState<string | null>(null)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const filteredSettlements = useMemo(() => {
    return rows.filter((row) => {
      if (HIDDEN_SETTLEMENT_IDS.has(row.id)) return false

      if (!startDate && !endDate) return true

      const rowDate = istanbulDateKey(row.created_at)
      if (!rowDate) return false
      if (startDate && rowDate < startDate) return false
      if (endDate && rowDate > endDate) return false
      return true
    })
  }, [rows, startDate, endDate])

  const loadRestaurantNames = useCallback(async (ids: string[]) => {
    const unique = [...new Set(ids.filter(Boolean))]
    if (unique.length === 0) return new Map<string, string>()

    const map = new Map<string, string>()
    // is_active filtresi YOK — pasif restoran isimleri de gelsin
    for (let i = 0; i < unique.length; i += PAGE_SIZE) {
      const slice = unique.slice(i, i + PAGE_SIZE)
      const { data, error } = await supabase
        .from('restaurants')
        .select('id, name')
        .in('id', slice)

      if (error) throw error
      for (const r of data || []) {
        if (r.id && r.name) map.set(r.id, r.name)
      }
    }
    return map
  }, [])

  const loadPackagesForSettlement = useCallback(async (settlementId: string) => {
    setPackagesLoadingId(settlementId)
    try {
      const pkgs: SettlementPackage[] = []
      let offset = 0

      while (true) {
        const { data, error } = await supabase
          .from('packages')
          .select('order_number, delivered_at, amount')
          .eq('restaurant_settlement_id', settlementId)
          .order('delivered_at', { ascending: false })
          .range(offset, offset + PAGE_SIZE - 1)

        if (error) throw error
        const chunk = (data || []) as SettlementPackage[]
        pkgs.push(...chunk)
        if (chunk.length < PAGE_SIZE) break
        offset += PAGE_SIZE
      }

      setRows((prev) =>
        prev.map((r) => (r.id === settlementId ? { ...r, packages: pkgs } : r))
      )
    } catch (err: unknown) {
      console.error('Paket detayı yüklenemedi:', err)
      setRows((prev) =>
        prev.map((r) => (r.id === settlementId ? { ...r, packages: [] } : r))
      )
    } finally {
      setPackagesLoadingId(null)
    }
  }, [])

  const fetchSettlements = useCallback(async () => {
    setLoading(true)
    setFetchError(null)
    setJoinWarning(null)
    setExpandedRowId(null)

    try {
      // Tarih filtresi boş → tüm fişler (sayfalı, limit yok)
      const { rows: list, usedPlainSelect } = await fetchAllSettlements('', '')

      const warnings: string[] = []
      if (usedPlainSelect) {
        warnings.push(
          'Restoran adı left-join kullanılamadı; isimler restaurants tablosundan (aktif/pasif ayrımı olmadan) yüklendi.'
        )
      }

      const missingJoin = list.some((r) => {
        const j = r.restaurants
        if (!j) return true
        if (Array.isArray(j)) return !j[0]?.name
        return !j.name
      })

      if (list.length > 0) {
        const names = await loadRestaurantNames(list.map((r) => r.restaurant_id))
        setRestaurantNames(names)
        if (missingJoin && !usedPlainSelect) {
          warnings.push(
            'Bazı kayıtlarda join ile restoran adı gelmedi (pasif/silinmiş olabilir); isimler tamamlandı.'
          )
        }
      } else {
        setRestaurantNames(new Map())
      }

      setRows(list)
      setJoinWarning(warnings.length ? warnings.join(' ') : null)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setFetchError(msg)
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [loadRestaurantNames])

  useEffect(() => {
    fetchSettlements()
  }, [fetchSettlements])

  const toggleRow = (id: string) => {
    setExpandedRowId((prev) => {
      const next = prev === id ? null : id
      if (next) {
        const row = rows.find((r) => r.id === next)
        if (row && row.packages === undefined) {
          void loadPackagesForSettlement(next)
        }
      }
      return next
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Restoran Mutabakatları
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Hesap öde mutabakat fişleri — en yeni kayıtlar üstte
            {!loading && filteredSettlements.length > 0 && (
              <span className="ml-2 text-slate-500">({filteredSettlements.length} kayıt)</span>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 shadow-sm transition-colors hover:border-slate-600 focus:border-orange-500/60 focus:outline-none focus:ring-1 focus:ring-orange-500/40 [color-scheme:dark]"
            aria-label="Başlangıç tarihi"
          />
          <span className="text-slate-500 text-sm font-medium select-none">ile</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 shadow-sm transition-colors hover:border-slate-600 focus:border-orange-500/60 focus:outline-none focus:ring-1 focus:ring-orange-500/40 [color-scheme:dark]"
            aria-label="Bitiş tarihi"
          />
          {(startDate || endDate) && (
            <button
              type="button"
              onClick={() => {
                setStartDate('')
                setEndDate('')
              }}
              className="rounded-md border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs font-medium text-slate-400 transition-colors hover:border-slate-600 hover:text-slate-200"
            >
              Temizle
            </button>
          )}
        </div>
      </div>

      {joinWarning && (
        <p className="text-amber-400/90 text-xs border border-amber-800/40 bg-amber-950/30 rounded-md px-4 py-2">
          {joinWarning}
        </p>
      )}

      {fetchError && (
        <p className="text-red-400 text-sm border border-red-900/50 bg-red-950/30 rounded-md px-4 py-3">
          Veriler yüklenemedi: {fetchError}
        </p>
      )}

      <div className="rounded-md border border-slate-700/80 bg-slate-900/60 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-600 border-t-orange-500" />
          </div>
        ) : rows.length === 0 && !fetchError ? (
          <div className="py-24 text-center">
            <p className="text-slate-500 text-base">
              Henüz restoran mutabakat kaydı bulunmuyor.
            </p>
          </div>
        ) : filteredSettlements.length === 0 ? (
          <div className="py-24 text-center">
            <p className="text-slate-500 text-base">
              Seçilen tarih aralığında mutabakat kaydı yok.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto admin-scrollbar">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-800/80 border-b border-slate-700">
                  <th className="w-10 py-3.5 px-2" aria-label="Detay" />
                  <th className="text-left py-3.5 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Tarih/Saat
                  </th>
                  <th className="text-left py-3.5 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Restoran Adı
                  </th>
                  <th className="text-left py-3.5 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Dönem Aralığı
                  </th>
                  <th className="text-right py-3.5 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Toplam Ciro
                  </th>
                  <th className="text-right py-3.5 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Kurye Masrafı
                  </th>
                  <th className="text-right py-3.5 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Kesinti
                  </th>
                  <th className="text-right py-3.5 px-4 text-xs font-semibold text-orange-400 uppercase tracking-wider">
                    Net Ödenen Tutar
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredSettlements.map((row) => {
                  const isExpanded = expandedRowId === row.id
                  const pkgs = packagesFromRow(row)
                  const pkgsLoading = packagesLoadingId === row.id

                  return (
                    <Fragment key={row.id}>
                      <tr
                        role="button"
                        tabIndex={0}
                        onClick={() => toggleRow(row.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            toggleRow(row.id)
                          }
                        }}
                        className={`transition-colors cursor-pointer ${
                          isExpanded
                            ? 'bg-slate-800/70'
                            : 'hover:bg-slate-800/50'
                        }`}
                      >
                        <td className="py-3.5 px-2 text-slate-400">
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 mx-auto" aria-hidden />
                          ) : (
                            <ChevronDown className="h-4 w-4 mx-auto" aria-hidden />
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-slate-300 whitespace-nowrap">
                          {formatDateTime(row.created_at)}
                        </td>
                        <td className="py-3.5 px-4 text-white font-medium">
                          {restaurantNameFromRow(row, restaurantNames)}
                          {(row.package_count ?? 0) > 0 && (
                            <span className="ml-2 text-xs font-normal text-slate-500">
                              ({row.package_count} paket)
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap">
                          {formatPeriodDate(row.start_date)} — {formatPeriodDate(row.end_date)}
                        </td>
                        <td className="py-3.5 px-4 text-right text-slate-300 tabular-nums">
                          {formatMoney(row.total_revenue)}
                        </td>
                        <td className="py-3.5 px-4 text-right text-rose-300/90 tabular-nums">
                          {formatMoney(row.courier_cost)}
                        </td>
                        <td className="py-3.5 px-4 text-right text-rose-300/90 tabular-nums">
                          {formatMoney(row.commission_amount)}
                        </td>
                        <td className="py-3.5 px-4 text-right text-orange-500 font-bold tabular-nums">
                          {formatMoney(row.net_paid)}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-slate-950/60">
                          <td colSpan={COL_SPAN} className="px-4 py-4">
                            {pkgsLoading ? (
                              <p className="text-sm text-slate-500">Paketler yükleniyor…</p>
                            ) : pkgs.length === 0 ? (
                              <p className="text-sm text-slate-500">
                                Bu mutabakata ait paket detayı bulunamadı.
                              </p>
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                {pkgs.map((pkg, idx) => (
                                  <span
                                    key={`${row.id}-${pkg.order_number ?? idx}-${pkg.delivered_at ?? idx}`}
                                    className="inline-flex items-center gap-2 rounded-full border border-slate-600/80 bg-slate-800/80 px-3 py-1.5 text-xs text-slate-200"
                                  >
                                    <span className="font-semibold text-white">
                                      {pkg.order_number?.trim() || '—'}
                                    </span>
                                    <span className="text-slate-400">
                                      {formatDeliveredAt(pkg.delivered_at)}
                                    </span>
                                    {pkg.amount != null && (
                                      <span className="text-emerald-400 font-medium">
                                        {formatMoney(pkg.amount)}
                                      </span>
                                    )}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
