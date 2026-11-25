/**
 * Admin geliştirici: geçmiş Trendyol Go siparişlerini içe aktar + eşleme raporu.
 * Restoran paneli bu aracı görmez. son_polling_imleci değişmez.
 */
'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, Download } from 'lucide-react'

type IntegrationItem = {
  id: string
  restaurant_id: string
  restaurant_name: string
  supplier_id: number
  store_id: string
  ortam: string
  aktif_mi: boolean
  durum: string
}

type Report = {
  packagesRead: number
  maskedAddressCount: number
  courierNoteCount: number
  phoneFromDescriptionCount: number
  unmatchedProductCount: number
  paymentTypesSeen: Record<string, number>
  unexpectedFields: string[]
  cancelledCount: number
  testPackageCount: number
}

export default function TrendyolGoImportPage() {
  const [items, setItems] = useState<IntegrationItem[]>([])
  const [restaurantId, setRestaurantId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState('')
  const [report, setReport] = useState<Report | null>(null)
  const [summary, setSummary] = useState<Record<string, number> | null>(null)
  const [fetched, setFetched] = useState<number | null>(null)
  const [sampleErrors, setSampleErrors] = useState<Array<{ packageId: string; error?: string }>>([])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/trendyol-go/admin/integrations', {
        credentials: 'include',
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Liste alınamadı — admin olarak tekrar giriş yapın')
        return
      }
      setItems(data.items || [])
      if (data.items?.[0]) setRestaurantId(data.items[0].restaurant_id)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function runImport() {
    if (!restaurantId || !startDate || !endDate) {
      setError('Restoran ve tarih aralığı zorunlu')
      return
    }
    setRunning(true)
    setError('')
    setReport(null)
    setSummary(null)
    setSampleErrors([])
    try {
      const startMs = new Date(startDate).getTime()
      const endMs = new Date(endDate).getTime() + 24 * 60 * 60 * 1000 - 1
      const res = await fetch('/api/trendyol-go/import-history', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurant_id: restaurantId,
          start_ms: startMs,
          end_ms: endMs,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'İçe aktarma başarısız')
        return
      }
      setReport(data.report)
      setSummary(data.resultsSummary)
      setFetched(data.fetched)
      setSampleErrors(data.sampleErrors || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Hata')
    } finally {
      setRunning(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Yükleniyor…
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <header>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Download className="w-7 h-7 text-orange-500" />
            Geçmiş siparişleri içe aktar
          </h1>
          <p className="text-slate-400 text-sm mt-2">
            Delivered + Cancelled paketler sayfa sayfa çekilir, eşlemeden geçer,{' '}
            <code className="text-orange-300">gecmis_veri=true</code> ile kaydedilir.
            Canlı polling imlecine dokunulmaz. Kurye kuyruğu / bildirim / ciro dışı.
          </p>
        </header>

        {error && (
          <div className="rounded-lg border border-red-500/40 bg-red-950/50 px-4 py-3 text-red-200 text-sm">
            {error}
          </div>
        )}

        <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
          <label className="block text-sm">
            <span className="text-slate-400">Restoran entegrasyonu</span>
            <select
              className="mt-1 w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2"
              value={restaurantId}
              onChange={(e) => setRestaurantId(e.target.value)}
            >
              {items.length === 0 && <option value="">Kayıt yok</option>}
              {items.map((i) => (
                <option key={i.id} value={i.restaurant_id}>
                  {i.restaurant_name} — supplier {i.supplier_id} / store {i.store_id} (
                  {i.ortam})
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block text-sm">
              <span className="text-slate-400">Başlangıç</span>
              <input
                type="date"
                className="mt-1 w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="text-slate-400">Bitiş</span>
              <input
                type="date"
                className="mt-1 w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </label>
          </div>
          <button
            type="button"
            disabled={running || !restaurantId}
            onClick={() => void runImport()}
            className="inline-flex items-center gap-2 rounded-md bg-orange-600 px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            İçe aktar ve raporla
          </button>
        </section>

        {(report || summary) && (
          <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
            <h2 className="font-medium text-lg">Eşleme raporu</h2>
            {fetched != null && (
              <p className="text-sm text-slate-300">Çekilen paket: {fetched}</p>
            )}
            {summary && (
              <ul className="text-sm text-slate-300 grid grid-cols-2 gap-2">
                <li>Yeni: {summary.inserted}</li>
                <li>Güncellenen: {summary.updated}</li>
                <li>Atlanan (idempotent): {summary.skipped}</li>
                <li>İptal: {summary.cancelled}</li>
                {'errors' in summary && (
                  <li className={(summary as { errors?: number }).errors ? 'text-red-300' : ''}>
                    Hata: {(summary as { errors?: number }).errors ?? 0}
                  </li>
                )}
              </ul>
            )}
            {report && (
              <div className="text-sm space-y-2 border-t border-slate-800 pt-3">
                <p>Okunan: {report.packagesRead}</p>
                <p>Maskeli adres: {report.maskedAddressCount}</p>
                <p>Kurye notu olan: {report.courierNoteCount}</p>
                <p>Tariften telefon: {report.phoneFromDescriptionCount}</p>
                <p>Eşleşmeyen ürün (adet): {report.unmatchedProductCount}</p>
                <p>İptal sayısı: {report.cancelledCount}</p>
                <p>Test paket: {report.testPackageCount}</p>
                <div>
                  <p className="text-slate-400 mb-1">paymentType değerleri:</p>
                  <pre className="bg-slate-950 rounded p-2 text-xs overflow-auto">
                    {JSON.stringify(report.paymentTypesSeen, null, 2)}
                  </pre>
                </div>
                {report.unexpectedFields.length > 0 && (
                  <div>
                    <p className="text-slate-400 mb-1">Beklenmedik alanlar:</p>
                    <p className="text-xs text-amber-200">
                      {report.unexpectedFields.join(', ')}
                    </p>
                  </div>
                )}
                {sampleErrors.length > 0 && (
                  <div>
                    <p className="text-red-300 mb-1">Örnek hatalar:</p>
                    <pre className="bg-slate-950 rounded p-2 text-xs overflow-auto text-red-200">
                      {JSON.stringify(sampleErrors, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  )
}
