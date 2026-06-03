/**
 * @file CourierDailyRoutes.tsx
 * @description Kurye günlük rota ve performans — bugünkü teslimler (frontend filtre)
 */
'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import {
  getBusinessDayDateTimeLocal,
  parseFilterInputToUtcIso,
} from '@/utils/calculations'
import type { Courier } from '@/types'

export type DailyRoutePackage = {
  id: number
  order_number: string | null
  delivery_address: string
  delivered_by_courier_id: string | null
  content: string | null
}

interface CourierDailyRoutesProps {
  couriers: Courier[]
}

export function CourierDailyRoutes({ couriers }: CourierDailyRoutesProps) {
  const [allPackages, setAllPackages] = useState<DailyRoutePackage[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [selectedCourierId, setSelectedCourierId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const fetchTodayDelivered = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const { start, end } = getBusinessDayDateTimeLocal()
      const startIso = parseFilterInputToUtcIso(start, 'start')
      const endIso = parseFilterInputToUtcIso(end, 'end')

      const { data, error } = await supabase
        .from('packages')
        .select(
          'id, order_number, delivery_address, delivered_by_courier_id, content'
        )
        .eq('status', 'delivered')
        .gte('delivered_at', startIso)
        .lte('delivered_at', endIso)
        .not('delivered_by_courier_id', 'is', null)
        .order('delivered_at', { ascending: false })

      if (error) throw error

      const rows = (data || []) as DailyRoutePackage[]
      setAllPackages(rows)

      const firstWithData = rows.find((p) => p.delivered_by_courier_id)?.delivered_by_courier_id
      setSelectedCourierId((prev) => {
        if (prev && rows.some((p) => p.delivered_by_courier_id === prev)) return prev
        return firstWithData ?? null
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setLoadError(msg)
      setAllPackages([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTodayDelivered()
  }, [fetchTodayDelivered])

  const courierNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const c of couriers) {
      if (c.id && c.full_name) map.set(c.id, c.full_name)
    }
    return map
  }, [couriers])

  const activeCouriersWithToday = useMemo(() => {
    const counts = new Map<string, number>()
    for (const p of allPackages) {
      if (!p.delivered_by_courier_id) continue
      counts.set(
        p.delivered_by_courier_id,
        (counts.get(p.delivered_by_courier_id) ?? 0) + 1
      )
    }

    const active = couriers.filter((c) => c.is_active)
    const withDeliveries = active
      .filter((c) => counts.has(c.id))
      .sort((a, b) => (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0))

    if (withDeliveries.length > 0) return withDeliveries

    return active.sort((a, b) =>
      (a.full_name || '').localeCompare(b.full_name || '', 'tr')
    )
  }, [couriers, allPackages])

  const filteredPackages = useMemo(() => {
    if (!selectedCourierId) return []

    let list = allPackages.filter(
      (p) => p.delivered_by_courier_id === selectedCourierId
    )

    const q = searchQuery.trim().toLowerCase()
    if (q) {
      list = list.filter((p) =>
        (p.delivery_address || '').toLowerCase().includes(q)
      )
    }

    return list
  }, [allPackages, selectedCourierId, searchQuery])

  const toggleExpand = (id: number) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  return (
    <div className="bg-slate-900 shadow-xl rounded-2xl p-2 border border-slate-800 h-full flex flex-col lg:sticky lg:top-4">
      <div className="flex items-center justify-between mb-2 px-1">
        <h2 className="text-sm font-bold text-white tracking-tight">
          📍 Kurye Günlük Rota ve Performans
        </h2>
        <button
          type="button"
          onClick={() => fetchTodayDelivered()}
          disabled={loading}
          className="text-[10px] text-slate-400 hover:text-orange-400 disabled:opacity-50"
          title="Yenile"
        >
          ↻
        </button>
      </div>

      {loadError && (
        <p className="text-xs text-red-400 px-1 mb-2">{loadError}</p>
      )}

      {/* Kurye pill'leri */}
      <div className="flex gap-1.5 overflow-x-auto admin-scrollbar pb-2 px-0.5 shrink-0">
        {activeCouriersWithToday.map((c) => {
          const isSelected = selectedCourierId === c.id
          const count = allPackages.filter(
            (p) => p.delivered_by_courier_id === c.id
          ).length
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                setSelectedCourierId(c.id)
                setSearchQuery('')
                setExpandedId(null)
              }}
              className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-medium transition-colors border ${
                isSelected
                  ? 'bg-orange-600 text-white border-orange-500'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600'
              }`}
            >
              {c.full_name}
              {count > 0 && (
                <span
                  className={`ml-1 ${isSelected ? 'text-orange-100' : 'text-slate-500'}`}
                >
                  ({count})
                </span>
              )}
            </button>
          )
        })}
        {activeCouriersWithToday.length === 0 && !loading && (
          <span className="text-xs text-slate-500 px-1">Aktif kurye yok</span>
        )}
      </div>

      {/* Arama + sayaç */}
      <div className="flex items-center gap-2 mb-2 shrink-0">
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Adres ara..."
          disabled={!selectedCourierId || loading}
          className="flex-1 min-w-0 px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:border-orange-500 focus:outline-none"
        />
        <span className="shrink-0 bg-orange-600/20 text-orange-300 border border-orange-600/40 px-2 py-1 rounded-full text-xs font-bold tabular-nums">
          {filteredPackages.length}
        </span>
      </div>

      {/* Liste */}
      <div className="flex-1 min-h-0 max-h-[600px] overflow-y-auto admin-scrollbar rounded-lg border border-slate-800/80 bg-slate-950/50">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 border-2 border-slate-600 border-t-orange-500 rounded-full animate-spin" />
          </div>
        ) : !selectedCourierId ? (
          <p className="text-xs text-slate-500 text-center py-8">Kurye seçin</p>
        ) : filteredPackages.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-8">
            {searchQuery.trim()
              ? 'Aramaya uygun paket yok'
              : 'Bugün teslim kaydı yok'}
          </p>
        ) : (
          <ul className="divide-y divide-slate-800/80">
            {filteredPackages.map((pkg) => {
              const open = expandedId === pkg.id
              const code = pkg.order_number || `#${pkg.id}`
              return (
                <li key={pkg.id}>
                  <button
                    type="button"
                    onClick={() => toggleExpand(pkg.id)}
                    className={`w-full text-left px-2.5 py-2 hover:bg-slate-800/60 transition-colors ${
                      open ? 'bg-slate-800/40' : ''
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <span
                        className={`shrink-0 text-xs font-bold ${
                          open ? 'text-orange-400' : 'text-orange-500'
                        }`}
                      >
                        {code}
                      </span>
                      <span className="text-xs text-slate-300 leading-snug flex-1 line-clamp-2">
                        {pkg.delivery_address || '—'}
                      </span>
                      <span className="text-slate-600 text-[10px] shrink-0">
                        {open ? '▲' : '▼'}
                      </span>
                    </div>
                    {open && (
                      <div className="mt-2 pl-0 pt-2 border-t border-slate-700/50 text-xs text-slate-400 whitespace-pre-wrap">
                        {pkg.content?.trim() ? (
                          pkg.content
                        ) : (
                          <span className="italic text-slate-600">
                            İçerik bilgisi yok
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {selectedCourierId && !loading && (
        <p className="text-[10px] text-slate-600 mt-1.5 px-1 text-center">
          {courierNameById.get(selectedCourierId) ?? 'Kurye'} · iş günü teslimleri
        </p>
      )}
    </div>
  )
}
