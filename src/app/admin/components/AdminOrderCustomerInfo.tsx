'use client'

import { isTrendyolGoOrder } from '@/app/lib/orderDisplay'
import { normalizeCallCenterPhone } from '@/lib/trendyol-go/dialTemplate'

type CustomerInfoPkg = {
  customer_name?: string | null
  customer_phone?: string | null
  delivery_address?: string | null
  address_description?: string | null
  call_center_phone?: string | null
  pin_code?: string | null
  adres_tarifinden_bulunan_telefon?: string | null
  platform?: string | null
  source?: string | null
  trendyol_order_code?: string | null
  trendyol_app_name?: string | null
}

function Copyable({ value, label }: { value: string; label?: string }) {
  return (
    <button
      type="button"
      className="text-white underline decoration-dotted underline-offset-2 hover:text-sky-200 text-left"
      title="Kopyala"
      onClick={() => {
        void navigator.clipboard?.writeText(value)
      }}
    >
      {label ? `${label} ${value}` : value}
    </button>
  )
}

/**
 * Admin sipariş detay — Müşteri Bilgileri (Trendyol çağrı merkezi + adres tarifi dahil)
 */
export default function AdminOrderCustomerInfo({ pkg }: { pkg: CustomerInfoPkg }) {
  const isTgo = isTrendyolGoOrder(pkg)
  const callCenter = (pkg.call_center_phone || '').trim()
  const pin = (pkg.pin_code || '').trim()
  const fromDesc = (pkg.adres_tarifinden_bulunan_telefon || '').trim()
  const addressDesc = (pkg.address_description || '').trim()
  const showTgoContact = isTgo && Boolean(callCenter)

  return (
    <div className="bg-slate-800 p-4 rounded-md space-y-3">
      <h4 className="text-white font-semibold mb-2">Müşteri Bilgileri</h4>

      <div>
        <p className="text-slate-400 text-xs mb-1">Ad Soyad</p>
        <p className="text-white">{pkg.customer_name || '—'}</p>
      </div>

      {showTgoContact ? (
        <div className="space-y-1.5">
          <p className="text-slate-400 text-xs mb-1">Müşteri iletişimi (Trendyol)</p>
          <p className="text-sm">
            <span className="text-slate-400">Çağrı Merkezi: </span>
            <Copyable value={normalizeCallCenterPhone(callCenter) || callCenter} />
          </p>
          {pin && (
            <p className="text-sm">
              <span className="text-slate-400">Pin: </span>
              <Copyable value={pin} />
            </p>
          )}
          <p className="text-[11px] text-slate-400 leading-snug">
            Müşteriye bu numara aranıp pin tuşlanarak ulaşılır, Trendyol müşterinin
            gerçek numarasını paylaşmıyor.
          </p>
          {fromDesc && (
            <p className="text-sm mt-1">
              <span className="text-slate-400">Adres tarifinden: </span>
              <Copyable value={fromDesc} />
              <span className="text-amber-300/90 text-xs ml-1">(doğrulanmamış)</span>
            </p>
          )}
        </div>
      ) : pkg.customer_phone ? (
        <div>
          <p className="text-slate-400 text-xs mb-1">Telefon</p>
          <p className="text-white">{pkg.customer_phone}</p>
        </div>
      ) : (
        <div>
          <p className="text-slate-400 text-xs mb-1">Telefon</p>
          <p className="text-slate-500">Telefon yok</p>
        </div>
      )}

      <div>
        <p className="text-slate-400 text-xs mb-1">Teslimat Adresi</p>
        <p className="text-white">{pkg.delivery_address || 'Adres Belirtilmemiş'}</p>
        {addressDesc &&
          addressDesc.toLowerCase() !== 'tgo yemek' &&
          addressDesc.toLowerCase() !== 'trendyol yemek' && (
            <p className="text-sky-200/90 text-sm mt-2">
              <span className="text-slate-400 text-xs block mb-0.5">Adres tarifi</span>
              {addressDesc}
            </p>
          )}
      </div>
    </div>
  )
}
