/**
 * Restoran — Trendyol Go entegrasyon ayarları (salt okuma).
 * Secret'lar write-only; GET yalnızca maskeli döner.
 */
'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, Plug, AlertTriangle, CheckCircle2, Link2 } from 'lucide-react'

type Settings = {
  id?: string
  supplier_id?: number
  store_id?: string
  api_key_masked?: string
  has_api_secret?: boolean
  has_basic_token?: boolean
  agent_name?: string
  executor_email?: string
  ortam?: 'prod' | 'stage'
  aktif_mi?: boolean
  polling_araligi_sn?: number
  son_basarili_baglanti?: string | null
  son_hata?: string | null
  durum?: 'ok' | 'sorunlu'
}

type Unmatched = {
  id: string
  trendyol_product_id: string
  trendyol_name: string | null
  last_seen_at: string
}

type LocalProduct = { id: string; name: string; price: number }

export default function TrendyolGoSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [connectionTested, setConnectionTested] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [settings, setSettings] = useState<Settings | null>(null)

  const [supplierId, setSupplierId] = useState('6654483')
  const [storeId, setStoreId] = useState('374640')
  const [apiKey, setApiKey] = useState('')
  const [apiSecret, setApiSecret] = useState('')
  const [basicToken, setBasicToken] = useState('')
  const [agentName, setAgentName] = useState('Regon')
  const [executorEmail, setExecutorEmail] = useState('')
  const [ortam, setOrtam] = useState<'prod' | 'stage'>('prod')
  const [aktifMi, setAktifMi] = useState(false)
  const [pollingSn, setPollingSn] = useState(15)

  const [unmatched, setUnmatched] = useState<Unmatched[]>([])
  const [products, setProducts] = useState<LocalProduct[]>([])
  const [mapSelect, setMapSelect] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/trendyol-go/settings', { credentials: 'include' })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Ayarlar yüklenemedi — tekrar giriş yapın')
        return
      }
      const s = data.settings as Settings | null
      setSettings(s)
      if (s) {
        setSupplierId(String(s.supplier_id ?? '6654483'))
        setStoreId(String(s.store_id ?? '374640'))
        setAgentName(String(s.agent_name || 'Regon'))
        setExecutorEmail(String(s.executor_email || ''))
        setOrtam(s.ortam === 'stage' ? 'stage' : 'prod')
        setAktifMi(Boolean(s.aktif_mi))
        setPollingSn(Number(s.polling_araligi_sn) || 15)
      }

      const u = await fetch('/api/trendyol-go/unmatched-products', { credentials: 'include' })
      if (u.ok) {
        const uj = await u.json()
        setUnmatched(uj.items || [])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    // Yerel ürün listesi — eşleme için (Supabase client)
    void (async () => {
      try {
        const { supabase } = await import('@/app/lib/supabase')
        const restaurantId = localStorage.getItem('restoran_logged_restaurant_id')
        if (!restaurantId) return
        const { data } = await supabase
          .from('products')
          .select('id, name, price')
          .eq('restaurant_id', restaurantId)
          .order('name')
        setProducts((data as LocalProduct[]) || [])
      } catch {
        /* ignore */
      }
    })()
  }, [])

  async function testConnection() {
    setTesting(true)
    setError('')
    setSuccess('')
    setConnectionTested(false)
    try {
      const res = await fetch('/api/trendyol-go/test-connection', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplier_id: Number(supplierId),
          store_id: storeId,
          api_key: apiKey || undefined,
          api_secret: apiSecret || undefined,
          basic_token: basicToken || undefined,
          agent_name: agentName,
          executor_email: executorEmail,
          ortam,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        setError(data.error || 'Bağlantı testi başarısız')
        return
      }
      setConnectionTested(true)
      setSuccess(
        `Bağlantı başarılı (örnek toplam: ${data.sampleTotalCount ?? 0}). Şimdi kaydedebilirsiniz.`
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Test hatası')
    } finally {
      setTesting(false)
    }
  }

  async function save() {
    if (!connectionTested) {
      setError('Önce “Bağlantıyı Test Et” ile başarılı test yapın.')
      return
    }
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const res = await fetch('/api/trendyol-go/settings', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplier_id: Number(supplierId),
          store_id: storeId,
          api_key: apiKey || undefined,
          api_secret: apiSecret || undefined,
          basic_token: basicToken || undefined,
          agent_name: agentName,
          executor_email: executorEmail,
          ortam,
          aktif_mi: aktifMi,
          polling_araligi_sn: pollingSn,
          connection_tested: true,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Kayıt başarısız')
        return
      }
      setSettings(data.settings)
      setApiSecret('')
      setBasicToken('')
      setSuccess('Ayarlar kaydedildi')
      setConnectionTested(false)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kayıt hatası')
    } finally {
      setSaving(false)
    }
  }

  async function mapProduct(trendyolProductId: string) {
    const localId = mapSelect[trendyolProductId]
    if (!localId) return
    const res = await fetch('/api/trendyol-go/map-product', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        trendyol_product_id: trendyolProductId,
        local_product_id: localId,
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error || 'Eşleme başarısız')
      return
    }
    setUnmatched((prev) => prev.filter((u) => u.trendyol_product_id !== trendyolProductId))
    setSuccess('Ürün eşlendi')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Yükleniyor…
      </div>
    )
  }

  const sorunlu = settings?.durum === 'sorunlu'

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="flex items-start gap-3">
          <Plug className="w-8 h-8 text-orange-500 shrink-0" />
          <div>
            <h1 className="text-2xl font-semibold">Trendyol Go</h1>
            <p className="text-slate-400 text-sm mt-1">
              Salt okuma sipariş entegrasyonu. Trendyol’a yazma isteği gönderilmez.
            </p>
          </div>
        </header>

        {settings && (
          <div
            className={`rounded-lg border px-4 py-3 flex items-center gap-2 text-sm ${
              sorunlu
                ? 'border-red-500/50 bg-red-950/40 text-red-200'
                : 'border-emerald-500/30 bg-emerald-950/30 text-emerald-200'
            }`}
          >
            {sorunlu ? (
              <AlertTriangle className="w-4 h-4" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            <span>
              Durum: <strong>{sorunlu ? 'Sorunlu' : 'Tamam'}</strong>
              {settings.son_basarili_baglanti &&
                ` · Son başarılı: ${new Date(settings.son_basarili_baglanti).toLocaleString('tr-TR')}`}
              {settings.son_hata && ` · ${settings.son_hata}`}
            </span>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-500/40 bg-red-950/50 px-4 py-3 text-red-200 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-lg border border-emerald-500/40 bg-emerald-950/40 px-4 py-3 text-emerald-200 text-sm">
            {success}
          </div>
        )}

        <section className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/60 p-5">
          <h2 className="font-medium text-lg">Bağlantı</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block text-sm">
              <span className="text-slate-400">Supplier ID</span>
              <input
                className="mt-1 w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2"
                value={supplierId}
                onChange={(e) => {
                  setSupplierId(e.target.value)
                  setConnectionTested(false)
                }}
              />
            </label>
            <label className="block text-sm">
              <span className="text-slate-400">Store ID</span>
              <input
                className="mt-1 w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2"
                value={storeId}
                onChange={(e) => {
                  setStoreId(e.target.value)
                  setConnectionTested(false)
                }}
              />
            </label>
            <label className="block text-sm md:col-span-2">
              <span className="text-slate-400">
                API Key {settings?.api_key_masked ? `(kayıtlı: ${settings.api_key_masked})` : ''}
              </span>
              <input
                className="mt-1 w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2"
                value={apiKey}
                placeholder="API Key"
                onChange={(e) => {
                  setApiKey(e.target.value)
                  setConnectionTested(false)
                }}
              />
            </label>
            <label className="block text-sm">
              <span className="text-slate-400">
                API Secret {settings?.has_api_secret ? '(kayıtlı ••••)' : ''} — write-only
              </span>
              <input
                type="password"
                autoComplete="new-password"
                className="mt-1 w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2"
                value={apiSecret}
                placeholder="Değiştirmek için yazın"
                onChange={(e) => {
                  setApiSecret(e.target.value)
                  setConnectionTested(false)
                }}
              />
            </label>
            <label className="block text-sm">
              <span className="text-slate-400">
                Basic Token {settings?.has_basic_token ? '(kayıtlı ••••)' : ''} — write-only
              </span>
              <input
                type="password"
                autoComplete="new-password"
                className="mt-1 w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2"
                value={basicToken}
                placeholder="Panel token (opsiyonel)"
                onChange={(e) => {
                  setBasicToken(e.target.value)
                  setConnectionTested(false)
                }}
              />
            </label>
            <label className="block text-sm">
              <span className="text-slate-400">Agent name (x-agentname)</span>
              <input
                className="mt-1 w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2"
                value={agentName}
                onChange={(e) => {
                  setAgentName(e.target.value)
                  setConnectionTested(false)
                }}
              />
            </label>
            <label className="block text-sm">
              <span className="text-slate-400">Executor e-posta (x-executor-user)</span>
              <input
                className="mt-1 w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2"
                value={executorEmail}
                onChange={(e) => {
                  setExecutorEmail(e.target.value)
                  setConnectionTested(false)
                }}
              />
            </label>
            <label className="block text-sm">
              <span className="text-slate-400">Ortam</span>
              <select
                className="mt-1 w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2"
                value={ortam}
                onChange={(e) => {
                  setOrtam(e.target.value as 'prod' | 'stage')
                  setConnectionTested(false)
                }}
              >
                <option value="prod">Prod</option>
                <option value="stage">Stage</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-slate-400">Polling aralığı (sn)</span>
              <input
                type="number"
                min={5}
                max={120}
                className="mt-1 w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2"
                value={pollingSn}
                onChange={(e) => setPollingSn(Number(e.target.value) || 15)}
              />
            </label>
            <label className="flex items-center gap-2 text-sm md:col-span-2 mt-2">
              <input
                type="checkbox"
                checked={aktifMi}
                onChange={(e) => setAktifMi(e.target.checked)}
              />
              Canlı polling aktif
            </label>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              onClick={() => void testConnection()}
              disabled={testing}
              className="inline-flex items-center gap-2 rounded-md bg-slate-100 text-slate-900 px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
              Bağlantıyı Test Et
            </button>
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving || !connectionTested}
              className="inline-flex items-center gap-2 rounded-md bg-orange-600 text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Kaydet
            </button>
          </div>
          <p className="text-xs text-slate-500">
            200 alınmayan test sonucu kaydı engeller. Secret alanlar yanıtlarda asla dönmez.
          </p>
        </section>

        <section className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/60 p-5">
          <h2 className="font-medium text-lg">Eşleşmeyen ürünler</h2>
          {unmatched.length === 0 ? (
            <p className="text-sm text-slate-400">Eşleşmeyen ürün yok.</p>
          ) : (
            <ul className="space-y-3">
              {unmatched.map((u) => (
                <li
                  key={u.id}
                  className="flex flex-col md:flex-row md:items-center gap-2 border border-slate-800 rounded-md p-3"
                >
                  <div className="flex-1 text-sm">
                    <div className="font-medium">{u.trendyol_name || 'İsimsiz'}</div>
                    <div className="text-slate-500 text-xs">ID: {u.trendyol_product_id}</div>
                  </div>
                  <select
                    className="rounded-md bg-slate-950 border border-slate-700 px-2 py-1.5 text-sm"
                    value={mapSelect[u.trendyol_product_id] || ''}
                    onChange={(e) =>
                      setMapSelect((prev) => ({
                        ...prev,
                        [u.trendyol_product_id]: e.target.value,
                      }))
                    }
                  >
                    <option value="">Ürün seç…</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.price}₺)
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="rounded-md bg-orange-600 px-3 py-1.5 text-sm"
                    onClick={() => void mapProduct(u.trendyol_product_id)}
                  >
                    Eşle
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
