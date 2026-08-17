/**
 * @file src/app/admin/kuryeler/gecikmeler/page.tsx
 * @description Kurye gecikme özeti — tarih filtresi, grid kartlar, accordion
 */
'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronDown, Clock, Package, Store } from 'lucide-react'
import { supabase } from '@/app/lib/supabase'
import { parseFilterInputToUtcIso } from '@/utils/calculations'
import { formatTurkishDateTime } from '@/utils/dateHelpers'

const ISTANBUL_TZ = 'Europe/Istanbul'
const LOG_PAGE_SIZE = 1000

type NestedOne<T> = T | T[] | null

type CourierRow = {
  id: string
  full_name: string | null
}

type DelayLogRow = {
  id: string
  created_at: string
  courier_id: string
  order_id: number
  packages: NestedOne<{
    id: number
    order_number: string | null
    restaurants: NestedOne<{ name: string | null }>
  }>
}

type DelayItem = {
  id: string
  orderId: number
  restaurantName: string
  createdAt: string
}

type CourierCard = {
  id: string
  name: string
  delayCount: number
  delays: DelayItem[]
}

function istanbulTodayYmd(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: ISTANBUL_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

function unwrapOne<T>(value: NestedOne<T>): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

async function fetchDelayLogsInRange(startIso: string, endIso: string): Promise<DelayLogRow[]> {
  const all: DelayLogRow[] = []
  let offset = 0

  while (true) {
    const { data, error } = await supabase
      .from('courier_delay_logs')
      .select(`
        id,
        created_at,
        courier_id,
        order_id,
        packages (
          id,
          order_number,
          restaurants ( name )
        )
      `)
      .gte('created_at', startIso)
      .lte('created_at', endIso)
      .order('created_at', { ascending: false })
      .range(offset, offset + LOG_PAGE_SIZE - 1)

    if (error) throw error

    const chunk = (data || []) as DelayLogRow[]
    all.push(...chunk)
    if (chunk.length < LOG_PAGE_SIZE) break
    offset += LOG_PAGE_SIZE
  }

  return all
}

function toDelayItem(row: DelayLogRow): DelayItem {
  const pkg = unwrapOne(row.packages)
  const restaurant = unwrapOne(pkg?.restaurants ?? null)

  return {
    id: row.id,
    orderId: row.order_id,
    restaurantName: restaurant?.name?.trim() || 'Restoran yok',
    createdAt: row.created_at,
  }
}

export default function KuryeGecikmelerPage() {
  const [startDate, setStartDate] = useState(istanbulTodayYmd)
  const [endDate, setEndDate] = useState(istanbulTodayYmd)
  const [expandedCourierId, setExpandedCourierId] = useState<string | null>(null)
  const [couriers, setCouriers] = useState<CourierRow[]>([])
  const [logs, setLogs] = useState<DelayLogRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchData = useCallback(async (from: string, to: string) => {
    setError('')
    setLoading(true)

    try {
      const startIso = parseFilterInputToUtcIso(from, 'start')
      const endIso = parseFilterInputToUtcIso(to, 'end')

      const [courierRes, delayLogs] = await Promise.all([
        supabase
          .from('couriers')
          .select('id, full_name')
          .neq('account_status', 'terminated')
          .order('full_name', { ascending: true }),
        fetchDelayLogsInRange(startIso, endIso),
      ])

      if (courierRes.error) throw courierRes.error

      setCouriers((courierRes.data || []) as CourierRow[])
      setLogs(delayLogs)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Kayıtlar yüklenemedi'
      setError(message)
      setCouriers([])
      setLogs([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!startDate || !endDate) return
    void fetchData(startDate, endDate)
  }, [startDate, endDate, fetchData])

  const cards = useMemo<CourierCard[]>(() => {
    const delaysByCourier = new Map<string, DelayItem[]>()

    for (const row of logs) {
      if (!row.courier_id) continue
      const list = delaysByCourier.get(row.courier_id) ?? []
      list.push(toDelayItem(row))
      delaysByCourier.set(row.courier_id, list)
    }

    return couriers.map((courier) => {
      const delays = delaysByCourier.get(courier.id) ?? []
      return {
        id: courier.id,
        name: courier.full_name?.trim() || 'İsimsiz kurye',
        delayCount: delays.length,
        delays,
      }
    })
  }, [couriers, logs])

  const toggleCourier = (courierId: string) => {
    setExpandedCourierId((prev) => (prev === courierId ? null : courierId))
  }

  return (
    <div className="w-full min-w-0 overflow-x-hidden">
      <div className="mb-5 flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-white sm:text-2xl">
            Kurye Gecikmeleri
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Kuryelerin seçili tarihteki 10 dk teslim alma uyarıları
          </p>
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <label className="min-w-0">
            <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500">
              Başlangıç
            </span>
            <input
              type="date"
              value={startDate}
              max={endDate}
              onChange={(e) => {
                setStartDate(e.target.value)
                setExpandedCourierId(null)
              }}
              className="w-full min-w-0 rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 shadow-sm transition-colors hover:border-slate-600 focus:border-orange-500/60 focus:outline-none focus:ring-1 focus:ring-orange-500/40 [color-scheme:dark]"
            />
          </label>
          <label className="min-w-0">
            <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500">
              Bitiş
            </span>
            <input
              type="date"
              value={endDate}
              min={startDate}
              onChange={(e) => {
                setEndDate(e.target.value)
                setExpandedCourierId(null)
              }}
              className="w-full min-w-0 rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 shadow-sm transition-colors hover:border-slate-600 focus:border-orange-500/60 focus:outline-none focus:ring-1 focus:ring-orange-500/40 [color-scheme:dark]"
            />
          </label>
        </div>
      </div>

      {error && (
        <div className="mb-4 break-words rounded-md border border-red-500/40 bg-red-900/30 p-3 text-sm text-red-300">
          Kayıtlar yüklenemedi: {error}
        </div>
      )}

      {loading && cards.length === 0 ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-xl border border-slate-800 bg-slate-800/40"
            />
          ))}
        </div>
      ) : cards.length === 0 ? (
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-10 text-center">
          <Clock className="mx-auto mb-3 h-8 w-8 text-slate-500" strokeWidth={1.5} />
          <p className="font-medium text-slate-300">Kurye bulunamadı</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-3 lg:grid-cols-4">
          {cards.map((card) => {
            const isOpen = expandedCourierId === card.id
            const hasDelays = card.delayCount > 0

            return (
              <article
                key={card.id}
                className={`min-w-0 overflow-hidden rounded-xl border shadow-sm transition-colors ${
                  hasDelays
                    ? 'border-orange-500/35 bg-slate-800/80'
                    : 'border-emerald-500/25 bg-slate-800/60'
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleCourier(card.id)}
                  aria-expanded={isOpen}
                  className="flex w-full min-w-0 items-start gap-3 p-4 text-left"
                >
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-sm font-semibold text-white sm:text-base">
                      {card.name}
                    </p>
                    <p
                      className={`mt-2 inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        hasDelays
                          ? 'bg-orange-500/15 text-orange-300'
                          : 'bg-emerald-500/15 text-emerald-300'
                      }`}
                    >
                      {card.delayCount} Gecikme
                    </p>
                  </div>
                  <ChevronDown
                    className={`mt-0.5 h-4 w-4 shrink-0 text-slate-400 transition-transform ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                    strokeWidth={1.5}
                  />
                </button>

                {isOpen && (
                  <div className="border-t border-slate-700/80 px-4 pb-4 pt-3">
                    {card.delays.length === 0 ? (
                      <p className="text-sm text-slate-500">
                        Bu tarihte gecikme bildirimi yok.
                      </p>
                    ) : (
                      <ul className="space-y-2">
                        {card.delays.map((delay) => (
                          <li
                            key={delay.id}
                            className="min-w-0 rounded-lg bg-slate-900/50 px-3 py-2"
                          >
                            <p className="flex min-w-0 items-start gap-2 text-sm text-slate-200">
                              <Package className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500" strokeWidth={1.5} />
                              <span className="min-w-0 break-words">Sipariş #{delay.orderId}</span>
                            </p>
                            <p className="mt-1 flex min-w-0 items-start gap-2 text-sm text-slate-300">
                              <Store className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500" strokeWidth={1.5} />
                              <span className="min-w-0 break-words">{delay.restaurantName}</span>
                            </p>
                            <p className="mt-1 flex min-w-0 items-start gap-2 text-xs text-slate-400">
                              <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500" strokeWidth={1.5} />
                              <span className="min-w-0 break-words">
                                {formatTurkishDateTime(delay.createdAt)}
                              </span>
                            </p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
