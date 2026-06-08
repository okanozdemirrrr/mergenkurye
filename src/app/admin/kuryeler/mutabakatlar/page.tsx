/**
 * @file src/app/admin/kuryeler/mutabakatlar/page.tsx
 * @description Kurye mutabakat geçmişi (courier_settlements)
 */
'use client'

import { useEffect, useState, useCallback, Fragment } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { supabase } from '@/app/lib/supabase'

type SettlementPackage = {
  order_number: string | null
  delivered_at: string | null
}

type SettlementRow = {
  id: string
  created_at: string
  courier_id: string
  total_cash: number | null
  total_card: number | null
  total_iban: number | null
  total_earned: number | null
  received_amount: number | null
  amount_paid: number
  couriers: { full_name: string } | { full_name: string }[] | null
  packages?: SettlementPackage | SettlementPackage[] | null
}

const COL_SPAN = 8

const SETTLEMENT_SELECT_WITH_PACKAGES_FKEY = `
  id,
  created_at,
  courier_id,
  total_cash,
  total_card,
  total_iban,
  total_earned,
  received_amount,
  amount_paid,
  couriers ( full_name ),
  packages!packages_courier_settlement_id_fkey ( order_number, delivered_at )
`

const SETTLEMENT_SELECT_WITH_PACKAGES = `
  id,
  created_at,
  courier_id,
  total_cash,
  total_card,
  total_iban,
  total_earned,
  received_amount,
  amount_paid,
  couriers ( full_name ),
  packages ( order_number, delivered_at )
`

const SETTLEMENT_SELECT_BASE = `
  id,
  created_at,
  courier_id,
  total_cash,
  total_card,
  total_iban,
  total_earned,
  received_amount,
  amount_paid,
  couriers ( full_name )
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

function courierNameFromRow(row: SettlementRow, nameById: Map<string, string>): string {
  const joined = row.couriers
  if (joined && !Array.isArray(joined) && joined.full_name) {
    return joined.full_name
  }
  if (Array.isArray(joined) && joined[0]?.full_name) {
    return joined[0].full_name
  }
  return nameById.get(row.courier_id) ?? 'Bilinmeyen Kurye'
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

function netReceived(row: SettlementRow): number {
  const received = Number(row.received_amount)
  if (Number.isFinite(received) && received > 0) return received
  const paid = Number(row.amount_paid)
  return Number.isFinite(paid) ? paid : 0
}

export default function KuryeMutabakatlarPage() {
  const [rows, setRows] = useState<SettlementRow[]>([])
  const [courierNames, setCourierNames] = useState<Map<string, string>>(new Map())
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [joinWarning, setJoinWarning] = useState<string | null>(null)
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null)

  const loadCourierNames = useCallback(async (ids: string[]) => {
    const unique = [...new Set(ids.filter(Boolean))]
    if (unique.length === 0) return new Map<string, string>()

    const { data, error } = await supabase
      .from('couriers')
      .select('id, full_name')
      .in('id', unique)

    if (error) throw error
    const map = new Map<string, string>()
    for (const c of data || []) {
      if (c.id && c.full_name) map.set(c.id, c.full_name)
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
        .from('courier_settlements')
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
          .from('courier_settlements')
          .select(
            `
            id,
            created_at,
            courier_id,
            total_cash,
            total_card,
            total_iban,
            total_earned,
            received_amount,
            amount_paid
          `
          )
          .order('created_at', { ascending: false })

        if (fallback.error) throw fallback.error

        warnings.push(
          'Kurye adı join sorgusu başarısız; isimler couriers tablosundan ayrı yüklendi.'
        )
        const list = (fallback.data || []) as SettlementRow[]
        const names = await loadCourierNames(list.map((r) => r.courier_id))
        setCourierNames(names)
        setRows(list)
        setJoinWarning(warnings.length ? warnings.join(' ') : null)
        return
      }

      const list = (result.data || []) as SettlementRow[]
      const missingJoin = list.some((r) => {
        const j = r.couriers
        if (!j) return true
        if (Array.isArray(j)) return !j[0]?.full_name
        return !j.full_name
      })

      if (missingJoin && list.length > 0) {
        const names = await loadCourierNames(list.map((r) => r.courier_id))
        setCourierNames(names)
        warnings.push(
          'Bazı kayıtlarda join ile kurye adı gelmedi; couriers tablosundan tamamlandı.'
        )
      } else {
        setCourierNames(new Map())
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
  }, [loadCourierNames])

  useEffect(() => {
    fetchSettlements()
  }, [fetchSettlements])

  const toggleRow = (id: string) => {
    setExpandedRowId((prev) => (prev === id ? null : id))
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          Mutabakat Geçmişi
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Kurye gün sonu mutabakat fişleri — en yeni kayıtlar üstte
        </p>
      </div>

      {joinWarning && (
        <p className="text-amber-400/90 text-xs border border-amber-800/40 bg-amber-950/30 rounded-lg px-4 py-2">
          {joinWarning}
        </p>
      )}

      {fetchError && (
        <p className="text-red-400 text-sm border border-red-900/50 bg-red-950/30 rounded-lg px-4 py-3">
          Veriler yüklenemedi: {fetchError}
        </p>
      )}

      <div className="rounded-xl border border-slate-700/80 bg-slate-900/60 shadow-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-600 border-t-orange-500" />
          </div>
        ) : rows.length === 0 && !fetchError ? (
          <div className="py-24 text-center">
            <p className="text-slate-500 text-base">
              Henüz mutabakat kaydı bulunmuyor.
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
                    Kurye Adı
                  </th>
                  <th className="text-right py-3.5 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Nakit
                  </th>
                  <th className="text-right py-3.5 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Kart
                  </th>
                  <th className="text-right py-3.5 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    IBAN
                  </th>
                  <th className="text-right py-3.5 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Kurye Hakedişi
                  </th>
                  <th className="text-right py-3.5 px-4 text-xs font-semibold text-orange-400 uppercase tracking-wider">
                    Kasaya Alınan Net Tutar
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {rows.map((row) => {
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
                          {courierNameFromRow(row, courierNames)}
                          {pkgs.length > 0 && (
                            <span className="ml-2 text-xs font-normal text-slate-500">
                              ({pkgs.length} paket)
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right text-slate-300 tabular-nums">
                          {formatMoney(row.total_cash)}
                        </td>
                        <td className="py-3.5 px-4 text-right text-slate-300 tabular-nums">
                          {formatMoney(row.total_card)}
                        </td>
                        <td className="py-3.5 px-4 text-right text-slate-300 tabular-nums">
                          {formatMoney(row.total_iban)}
                        </td>
                        <td className="py-3.5 px-4 text-right text-slate-300 tabular-nums">
                          {formatMoney(row.total_earned)}
                        </td>
                        <td className="py-3.5 px-4 text-right text-orange-500 font-bold tabular-nums">
                          {formatMoney(netReceived(row))}
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
