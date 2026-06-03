/**
 * @file src/app/admin/kuryeler/mutabakatlar/page.tsx
 * @description Kurye mutabakat geçmişi (courier_settlements)
 */
'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/app/lib/supabase'

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
}

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

    try {
      const { data, error } = await supabase
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
          amount_paid,
          couriers ( full_name )
        `
        )
        .order('created_at', { ascending: false })

      if (error) {
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

        const list = (fallback.data || []) as SettlementRow[]
        setJoinWarning(
          'Kurye adı join sorgusu başarısız; isimler couriers tablosundan ayrı yüklendi.'
        )
        const names = await loadCourierNames(list.map((r) => r.courier_id))
        setCourierNames(names)
        setRows(list)
        return
      }

      const list = (data || []) as SettlementRow[]
      const missingJoin = list.some((r) => {
        const j = r.couriers
        if (!j) return true
        if (Array.isArray(j)) return !j[0]?.full_name
        return !j.full_name
      })

      if (missingJoin && list.length > 0) {
        const names = await loadCourierNames(list.map((r) => r.courier_id))
        setCourierNames(names)
        setJoinWarning(
          'Bazı kayıtlarda join ile kurye adı gelmedi; couriers tablosundan tamamlandı.'
        )
      } else {
        setCourierNames(new Map())
      }

      setRows(list)
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
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className="transition-colors hover:bg-slate-800/50"
                  >
                    <td className="py-3.5 px-4 text-slate-300 whitespace-nowrap">
                      {formatDateTime(row.created_at)}
                    </td>
                    <td className="py-3.5 px-4 text-white font-medium">
                      {courierNameFromRow(row, courierNames)}
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
