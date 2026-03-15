'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/app/lib/supabase'
import dynamic from 'next/dynamic'

// Leaflet'i dinamik import et (SSR sorunlarını önlemek için)
const MapComponent = dynamic(() => import('./MapComponent'), { ssr: false })

interface AddressModalProps {
  onClose: () => void
  onAddressSelect: (address: string) => void
}

const SAMSUN_QUICK_LOCATIONS = [
  { name: '19 Mayıs KYK Yurdu', lat: 41.492892, lng: 36.081592 },
  { name: 'Mühendislik Fakültesi Kampüsü', lat: 41.350000, lng: 36.080000 },
  { name: 'Hangarlar Bölgesi', lat: 41.320000, lng: 36.090000 }
]

export default function AddressModal({ onClose, onAddressSelect }: AddressModalProps) {
  const [step, setStep] = useState<'quick' | 'map' | 'details'>('quick')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Form states
  const [addressName, setAddressName] = useState('Ev')
  const [selectedQuickLocation, setSelectedQuickLocation] = useState('')
  const [latitude, setLatitude] = useState(41.492892)
  const [longitude, setLongitude] = useState(36.081592)
  const [district, setDistrict] = useState('19 Mayıs')
  const [street, setStreet] = useState('')
  const [avenue, setAvenue] = useState('')
  const [floor, setFloor] = useState('')
  const [doorNumber, setDoorNumber] = useState('')
  const [notes, setNotes] = useState('')

  const handleQuickLocationSelect = (location: typeof SAMSUN_QUICK_LOCATIONS[0]) => {
    setSelectedQuickLocation(location.name)
    setLatitude(location.lat)
    setLongitude(location.lng)
    setDistrict(location.name)
    setStep('map')
  }

  const handleMapConfirm = (lat: number, lng: number) => {
    setLatitude(lat)
    setLongitude(lng)
    setStep('details')
  }

  const handleSaveAddress = async () => {
    setLoading(true)
    setError('')

    try {
      const customerId = localStorage.getItem('customer_id')
      if (!customerId) {
        throw new Error('Lütfen önce giriş yapın')
      }

      const fullAddress = `${addressName} - ${district}, ${avenue} ${street}, Kat: ${floor}, No: ${doorNumber}`

      // Adresi veritabanına kaydet
      const { error: updateError } = await supabase
        .from('customers')
        .update({
          address: fullAddress,
          latitude: latitude,
          longitude: longitude
        })
        .eq('id', customerId)

      if (updateError) throw updateError

      // LocalStorage'a kaydet
      localStorage.setItem('customer_address', fullAddress)

      onAddressSelect(fullAddress)
    } catch (err: any) {
      setError(err.message || 'Adres kaydedilemedi')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-[800px] max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#e8e8e8] sticky top-0 bg-white z-10">
          <h2 className="text-[20px] font-bold text-[#3c4043]" style={{ fontFamily: 'Open Sans, sans-serif' }}>
            {step === 'quick' && 'Adres Seç'}
            {step === 'map' && 'Konumunu Doğrula'}
            {step === 'details' && 'Adres Detayları'}
          </h2>
          <button
            onClick={onClose}
            className="text-[#6f6f6f] hover:text-[#3c4043] text-[24px] leading-none"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1: Quick Location Selection */}
          {step === 'quick' && (
            <div className="space-y-3">
              <p className="text-[14px] text-[#6f6f6f] mb-4">
                Samsun 19 Mayıs'ta hızlı adres seçimi yapın
              </p>
              {SAMSUN_QUICK_LOCATIONS.map((location) => (
                <button
                  key={location.name}
                  onClick={() => handleQuickLocationSelect(location)}
                  className="w-full p-4 bg-white border border-[#e8e8e8] rounded-lg text-left hover:border-[#f59e0b] hover:bg-[#fef3c7] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                      <circle cx="12" cy="10" r="3"/>
                    </svg>
                    <span className="text-[14px] font-semibold text-[#3c4043]" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                      {location.name}
                    </span>
                  </div>
                </button>
              ))}

              <button
                onClick={() => setStep('map')}
                className="w-full p-4 bg-[#f7f7f7] border border-[#e8e8e8] rounded-lg text-center hover:bg-[#e8e8e8] transition-colors"
              >
                <span className="text-[14px] font-semibold text-[#3c4043]" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                  📍 Haritadan Seç
                </span>
              </button>
            </div>
          )}

          {/* Step 2: Map Selection */}
          {step === 'map' && (
            <div className="space-y-4">
              <p className="text-[14px] text-[#6f6f6f]">
                Haritayı hareket ettirerek tam konumunuzu belirleyin
              </p>

              <div className="h-[400px] rounded-lg overflow-hidden border border-[#e8e8e8]">
                <MapComponent
                  center={[latitude, longitude]}
                  onLocationChange={(lat, lng) => {
                    setLatitude(lat)
                    setLongitude(lng)
                  }}
                />
              </div>

              <div className="bg-[#f7f7f7] p-4 rounded-lg">
                <p className="text-[12px] text-[#6f6f6f] mb-1">Seçili Koordinatlar:</p>
                <p className="text-[13px] font-mono text-[#3c4043]">
                  {latitude.toFixed(6)}, {longitude.toFixed(6)}
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('quick')}
                  className="flex-1 h-[48px] bg-white border border-[#e8e8e8] text-[#3c4043] rounded-lg font-semibold text-[14px] hover:bg-[#f7f7f7] transition-colors"
                  style={{ fontFamily: 'Open Sans, sans-serif' }}
                >
                  Geri
                </button>
                <button
                  onClick={() => handleMapConfirm(latitude, longitude)}
                  className="flex-1 h-[48px] bg-[#f59e0b] text-white rounded-lg font-semibold text-[14px] hover:bg-[#d97706] transition-colors"
                  style={{ fontFamily: 'Open Sans, sans-serif' }}
                >
                  Konumu Onayla
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Address Details */}
          {step === 'details' && (
            <form onSubmit={(e) => { e.preventDefault(); handleSaveAddress(); }} className="space-y-4">
              <div>
                <label className="block text-[13px] font-semibold text-[#3c4043] mb-2">
                  Adres İsmi
                </label>
                <div className="flex gap-2">
                  {['Ev', 'İş', 'Yurt', 'Diğer'].map((name) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => setAddressName(name)}
                      className={`px-4 py-2 rounded-lg text-[13px] font-semibold transition-colors ${
                        addressName === name
                          ? 'bg-[#f59e0b] text-white'
                          : 'bg-[#f7f7f7] text-[#3c4043] hover:bg-[#e8e8e8]'
                      }`}
                      style={{ fontFamily: 'Open Sans, sans-serif' }}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-semibold text-[#3c4043] mb-2">
                  İlçe
                </label>
                <input
                  type="text"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full h-[48px] px-4 bg-white border border-[#e8e8e8] rounded-lg text-[14px] focus:outline-none focus:border-[#f59e0b] transition-colors"
                  style={{ fontFamily: 'Open Sans, sans-serif' }}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[13px] font-semibold text-[#3c4043] mb-2">
                    Cadde
                  </label>
                  <input
                    type="text"
                    placeholder="Örn: Atatürk Caddesi"
                    value={avenue}
                    onChange={(e) => setAvenue(e.target.value)}
                    className="w-full h-[48px] px-4 bg-white border border-[#e8e8e8] rounded-lg text-[14px] focus:outline-none focus:border-[#f59e0b] transition-colors"
                    style={{ fontFamily: 'Open Sans, sans-serif' }}
                    required
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-semibold text-[#3c4043] mb-2">
                    Sokak
                  </label>
                  <input
                    type="text"
                    placeholder="Örn: 1. Sokak"
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    className="w-full h-[48px] px-4 bg-white border border-[#e8e8e8] rounded-lg text-[14px] focus:outline-none focus:border-[#f59e0b] transition-colors"
                    style={{ fontFamily: 'Open Sans, sans-serif' }}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[13px] font-semibold text-[#3c4043] mb-2">
                    Kat
                  </label>
                  <input
                    type="text"
                    placeholder="Örn: 3"
                    value={floor}
                    onChange={(e) => setFloor(e.target.value)}
                    className="w-full h-[48px] px-4 bg-white border border-[#e8e8e8] rounded-lg text-[14px] focus:outline-none focus:border-[#f59e0b] transition-colors"
                    style={{ fontFamily: 'Open Sans, sans-serif' }}
                    required
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-semibold text-[#3c4043] mb-2">
                    Kapı No
                  </label>
                  <input
                    type="text"
                    placeholder="Örn: 12"
                    value={doorNumber}
                    onChange={(e) => setDoorNumber(e.target.value)}
                    className="w-full h-[48px] px-4 bg-white border border-[#e8e8e8] rounded-lg text-[14px] focus:outline-none focus:border-[#f59e0b] transition-colors"
                    style={{ fontFamily: 'Open Sans, sans-serif' }}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-semibold text-[#3c4043] mb-2">
                  Adres Tarifi (Opsiyonel)
                </label>
                <textarea
                  placeholder="Örn: Kırmızı kapılı bina, 2. blok"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full h-[80px] px-4 py-3 bg-white border border-[#e8e8e8] rounded-lg text-[14px] focus:outline-none focus:border-[#f59e0b] transition-colors resize-none"
                  style={{ fontFamily: 'Open Sans, sans-serif' }}
                />
              </div>

              {error && (
                <p className="text-[#f59e0b] text-[12px]">{error}</p>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep('map')}
                  className="flex-1 h-[48px] bg-white border border-[#e8e8e8] text-[#3c4043] rounded-lg font-semibold text-[14px] hover:bg-[#f7f7f7] transition-colors"
                  style={{ fontFamily: 'Open Sans, sans-serif' }}
                >
                  Geri
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 h-[48px] bg-[#f59e0b] text-white rounded-lg font-semibold text-[14px] hover:bg-[#d97706] transition-colors disabled:opacity-50"
                  style={{ fontFamily: 'Open Sans, sans-serif' }}
                >
                  {loading ? 'Kaydediliyor...' : 'Adresimi Kaydet'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
