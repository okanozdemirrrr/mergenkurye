'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import CampaignBanner from './components/CampaignBanner'
import Link from 'next/link'

interface Restaurant {
  id: string
  name: string
  logo_url?: string
  delivery_fee?: number
  min_order_amount?: number
  delivery_time?: string
  rating?: number
  category?: string
}

const CATEGORIES = [
  { id: 'all', name: 'Tümü', icon: '🍽️' },
  { id: 'burger', name: 'Burger', icon: '🍔' },
  { id: 'doner', name: 'Döner', icon: '🌯' },
  { id: 'pizza', name: 'Pizza', icon: '🍕' },
  { id: 'kebap', name: 'Kebap', icon: '🍢' },
  { id: 'tatli', name: 'Tatlı', icon: '🍰' },
  { id: 'deniz', name: 'Deniz Ürünleri', icon: '🐟' },
]

export default function RestoranlarPage() {
  console.log('🚀 RestoranlarPage rendering...')
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [filteredRestaurants, setFilteredRestaurants] = useState<Restaurant[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')

  useEffect(() => {
    fetchRestaurants()
  }, [])

  useEffect(() => {
    filterRestaurants()
  }, [searchQuery, selectedCategory, restaurants])

  const fetchRestaurants = async () => {
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .order('name', { ascending: true })

      if (error) throw error
      
      // Mock data for missing fields if necessary
      const enhancedData = (data || []).map(r => ({
        ...r,
        rating: r.rating || (4 + Math.random()).toFixed(1),
        delivery_time: r.delivery_time || '20-30 dk',
        min_order_amount: r.min_order_amount || 150,
        category: r.category || ['burger', 'doner', 'pizza', 'kebap'][Math.floor(Math.random() * 4)]
      }))

      setRestaurants(enhancedData)
      setFilteredRestaurants(enhancedData)
    } catch (error) {
      console.error('Restoranlar yüklenemedi:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const filterRestaurants = () => {
    let filtered = restaurants

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(r => r.category === selectedCategory)
    }

    if (searchQuery.trim()) {
      filtered = filtered.filter(r => 
        r.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    setFilteredRestaurants(filtered)
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-slate-100 shadow-sm">
        <div className="max-w-4xl mx-auto p-4 space-y-3">
          {/* Address Bar */}
          <div className="flex items-center gap-2 text-slate-800">
            <div className="bg-orange-100 p-2 rounded-xl text-orange-600">
              <span className="text-lg">📍</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Teslimat Adresi</span>
              <div className="flex items-center gap-1">
                <span className="text-sm font-bold truncate max-w-[200px]">Atatürk Mah. 12. Sokak No:5...</span>
                <span className="text-xs text-orange-500">▼</span>
              </div>
            </div>
          </div>

          {/* Search Input */}
          <div className="relative group">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-500 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Restoran veya yemek ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 bg-slate-100 border-2 border-transparent rounded-2xl text-slate-900 placeholder-slate-500 focus:bg-white focus:border-orange-500/30 focus:ring-4 focus:ring-orange-500/10 transition-all outline-none"
            />
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 pt-6 space-y-8">
        {/* Campaign Banner */}
        <CampaignBanner 
          title="Haftanın Fırsatları" 
          description="Seçili restoranlarda %30'a varan indirimleri ve hediye ürünleri kaçırma!"
          onButtonClick={() => console.log('Kampanyalar inceleniyor')}
        />

        {/* Categories - Horizontal Scroll */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Kategoriler</h2>
            <button className="text-orange-600 text-xs font-bold hover:bg-orange-50 px-3 py-1.5 rounded-xl transition-colors">
              Tümünü Gör
            </button>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex flex-col items-center justify-center min-w-[90px] aspect-square rounded-[2rem] transition-all duration-300 ${
                  selectedCategory === cat.id
                    ? 'bg-orange-500 text-white shadow-xl shadow-orange-500/40 -translate-y-2'
                    : 'bg-white text-slate-600 hover:bg-orange-50 shadow-md shadow-slate-200/50 border border-slate-100 hover:-translate-y-1'
                }`}
              >
                <span className="text-3xl mb-2">{cat.icon}</span>
                <span className="text-[11px] font-black uppercase tracking-tight">{cat.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Restaurant List */}
        <div className="space-y-6">
          <div className="flex items-center justify-between px-1">
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                {selectedCategory === 'all' ? 'Popüler Restoranlar' : `${CATEGORIES.find(c => c.id === selectedCategory)?.name} Restoranları`}
              </h2>
              <p className="text-slate-400 text-xs font-medium mt-1">
                Bölgendeki en iyi seçenekleri listeliyoruz
              </p>
            </div>
            <div className="bg-white border border-slate-100 p-1.5 rounded-2xl shadow-sm flex items-center gap-1">
              <button className="bg-slate-50 text-slate-400 p-2 rounded-xl">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4.5h18M3 12h18M3 19.5h18" />
                </svg>
              </button>
              <button className="bg-orange-500 text-white p-2 rounded-xl shadow-md">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                </svg>
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-[280px] bg-white border border-slate-100 rounded-[2.5rem] p-4 flex flex-col gap-3">
                  <div className="w-full h-40 bg-slate-100 animate-pulse rounded-[2rem]" />
                  <div className="h-6 w-2/3 bg-slate-100 animate-pulse rounded-full" />
                  <div className="h-4 w-1/2 bg-slate-100 animate-pulse rounded-full" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <AnimatePresence mode="popLayout">
                {filteredRestaurants.map((res) => (
                  <motion.div
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    key={res.id}
                    className="bg-white rounded-[2.5rem] overflow-hidden shadow-lg shadow-slate-200/50 border border-slate-100 group hover:shadow-2xl hover:shadow-orange-500/10 transition-all duration-500"
                  >
                    <div className="h-44 bg-slate-100 relative overflow-hidden">
                      {res.logo_url ? (
                        <img src={res.logo_url} alt={res.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-200 text-slate-300 text-5xl">
                          🏪
                        </div>
                      )}
                      {/* Floating Info */}
                      <div className="absolute top-4 right-4 flex flex-col gap-2">
                        <div className="bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-2xl text-xs font-black text-slate-900 flex items-center gap-1 shadow-xl">
                          <span className="text-orange-500">⭐</span> {res.rating}
                        </div>
                        <div className="bg-orange-500/95 backdrop-blur-md px-3 py-1.5 rounded-2xl text-[10px] font-black text-white shadow-xl uppercase tracking-wider">
                          %20 İndirim
                        </div>
                      </div>
                    </div>
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-black text-xl text-slate-900 group-hover:text-orange-600 transition-colors tracking-tight">
                          {res.name}
                        </h3>
                      </div>
                      <div className="flex items-center gap-4 text-[11px] text-slate-500 font-bold uppercase tracking-wide">
                        <span className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg">
                          <span className="text-sm">🕒</span> {res.delivery_time}
                        </span>
                        <span className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg">
                          <span className="text-sm">🛵</span> {res.delivery_fee === 0 ? 'Ücretsiz' : `${res.delivery_fee} ₺`}
                        </span>
                      </div>
                      <div className="mt-5 flex items-center justify-between pt-4 border-t border-slate-50">
                        <span className="text-[11px] text-slate-400 font-black uppercase tracking-tighter">Min. {res.min_order_amount} ₺</span>
                        <Link 
                          href={`/restoran/${res.id}`} 
                          className="bg-slate-900 text-white px-5 py-2.5 rounded-2xl text-xs font-bold hover:bg-orange-600 shadow-lg shadow-slate-900/10 hover:shadow-orange-500/30 transition-all active:scale-95"
                        >
                          Sipariş Ver
                        </Link>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          {!isLoading && filteredRestaurants.length === 0 && (
            <div className="py-20 text-center space-y-3">
              <div className="text-6xl">🔍</div>
              <h3 className="text-lg font-bold text-slate-900">Sonuç Bulunamadı</h3>
              <p className="text-slate-500 text-sm">Arama kriterlerine uygun restoran bulunmuyor.</p>
              <button 
                onClick={() => {setSearchQuery(''); setSelectedCategory('all')}}
                className="text-orange-500 font-bold hover:underline"
              >
                Filtreleri Temizle
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Style for no-scrollbar */}
      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  )
}
