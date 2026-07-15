/**
 * @file src/app/admin/restoranlar/mutabakatlar/page.tsx
 * @description Restoran mutabakat geçmişi (restaurant_settlements)
 */
'use client'

import { useEffect, useState, useCallback, useMemo, Fragment } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { supabase } from '@/app/lib/supabase'

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
  packages?: SettlementPackage | SettlementPackage[] | null
}

const COL_SPAN = 8

const SETTLEMENT_SELECT_WITH_PACKAGES_FKEY = `
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
  restaurants ( name ),
  packages!packages_restaurant_settlement_id_fkey ( order_number, delivered_at, amount )
`

const SETTLEMENT_SELECT_WITH_PACKAGES = `
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
  restaurants ( name ),
  packages ( order_number, delivered_at, amount )
`

const SETTLEMENT_SELECT_BASE = `
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
  restaurants ( name )
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
  })
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
  const list = Array.isArray(raw) ? raw : [raw]
  return [...list].sort((a, b) => {
    const ta = a.delivered_at ? new Date(a.delivered_at).getTime() : 0
    const tb = b.delivered_at ? new Date(b.delivered_at).getTime() : 0
    return tb - ta
  })
}

export default function RestoranMutabakatlarPage() {
  const [rows, setRows] = useState<SettlementRow[]>([])
  const [restaurantNames, setRestaurantNames] = useState<Map<string, string>>(new Map())
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [joinWarning, setJoinWarning] = useState<string | null>(null)
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const filteredSettlements = useMemo(() => {
    if (!startDate && !endDate) return rows

    return rows.filter((row) => {
      const d = new Date(row.created_at)
      if (Number.isNaN(d.getTime())) return false

      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      const rowDate = `${y}-${m}-${day}`

      if (startDate && rowDate < startDate) return false
      if (endDate && rowDate > endDate) return false
      return true
    })
  }, [rows, startDate, endDate])

  const loadRestaurantNames = useCallback(async (ids: string[]) => {
    const unique = [...new Set(ids.filter(Boolean))]
    if (unique.length === 0) return new Map<string, string>()

    const { data, error } = await supabase
      .from('restaurants')
      .select('id, name')
      .in('id', unique)

    if (error) throw error
    const map = new Map<string, string>()
    for (const r of data || []) {
      if (r.id && r.name) map.set(r.id, r.name)
    }
    return map
  }, [])

  const fetchSettlements = useCallback(async () => {
    setLoading(true)
    setFetchError(null)
    setJoinWarning(null)
    setExpandedRowId(null)

    const warnings: string[] = []

    const trySelect = async (select: string) => {
      return supabase
        .from('restaurant_settlements')
        .select(select)
        .order('created_at', { ascending: false })
    }

    try {
      let result = await trySelect(SETTLEMENT_SELECT_WITH_PACKAGES_FKEY)

      if (result.error) {
        result = await trySelect(SETTLEMENT_SELECT_WITH_PACKAGES)
        if (!result.error) {
          warnings.push(
            'Paket join: fkey adı kullanılamadı; varsayılan packages ilişkisi kullanıldı.'
          )
        }
      }

      if (result.error) {
        result = await trySelect(SETTLEMENT_SELECT_BASE)
        if (!result.error) {
          warnings.push(
            'Paket detayları join ile gelmedi; satır genişletmede liste boş görünebilir.'
          )
        }
      }

      if (result.error) {
        const fallback = await supabase
          .from('restaurant_settlements')
          .select(
            `
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
          )
          .order('created_at', { ascending: false })

        if (fallback.error) throw fallback.error

        warnings.push(
          'Restoran adı join sorgusu başarısız; isimler restaurants tablosundan ayrı yüklendi.'
        )
        const list = (fallback.data || []) as SettlementRow[]
        const names = await loadRestaurantNames(list.map((r) => r.restaurant_id))
        setRestaurantNames(names)
        setRows(list)
        setJoinWarning(warnings.length ? warnings.join(' ') : null)
        return
      }

      const list = (result.data || []) as SettlementRow[]
      const missingJoin = list.some((r) => {
        const j = r.restaurants
        if (!j) return true
        if (Array.isArray(j)) return !j[0]?.name
        return !j.name
      })

      if (missingJoin && list.length > 0) {
        const names = await loadRestaurantNames(list.map((r) => r.restaurant_id))
        setRestaurantNames(names)
        warnings.push(
          'Bazı kayıtlarda join ile restoran adı gelmedi; restaurants tablosundan tamamlandı.'
        )
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
    setExpandedRowId((prev) => (prev === id ? null : id))
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
                          {pkgs.length > 0 && (
                            <span className="ml-2 text-xs font-normal text-slate-500">
                              ({pkgs.length} paket)
                            </span>
                          )}
                          {!pkgs.length && (row.package_count ?? 0) > 0 && (
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
                            {pkgs.length === 0 ? (
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
