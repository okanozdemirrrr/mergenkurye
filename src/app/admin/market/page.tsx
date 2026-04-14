'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ShoppingCart } from 'lucide-react'
import { supabase } from '@/app/lib/supabase'

interface Category {
  id: string
  name: string
  icon: string
  color: string
  count?: number
}

interface Stats {
  total: number
  active: number
  outOfStock: number
  discounted: number
}

const categories: Category[] = [
  { id: 'firsatlar', name: 'Haftanın Fırsatları', icon: '🔥', color: 'from-red-500 to-orange-500' },
  { id: 'yemeklik', name: 'Yemeklik Malzemeler', icon: '🍝', color: 'from-orange-500 to-amber-500' },
  { id: 'et', name: 'Et & Tavuk & Şarküteri', icon: '🥩', color: 'from-red-600 to-red-700' },
  { id: 'meyve', name: 'Meyve & Sebze', icon: '🥬', color: 'from-green-500 to-emerald-500' },
  { id: 'sut', name: 'Süt & Süt Ürünleri', icon: '🥛', color: 'from-blue-400 to-cyan-400' },
  { id: 'kahvalti', name: 'Kahvaltılık', icon: '🍳', color: 'from-yellow-500 to-amber-500' },
  { id: 'atistirmalik', name: 'Atıştırmalık', icon: '🍿', color: 'from-purple-500 to-pink-500' },
  { id: 'icecek', name: 'İçecek', icon: '🥤', color: 'from-cyan-500 to-blue-500' },
  { id: 'ekmek', name: 'Ekmek & Pastane', icon: '🍞', color: 'from-amber-600 to-orange-600' },
  { id: 'dondurulmus', name: 'Dondurulmuş Ürünler', icon: '🧊', color: 'from-blue-600 to-indigo-600' }
]

export default function MarketYonetimiPage() {
  const router = useRouter()
  const [stats, setStats] = useState<Stats>({ total: 0, active: 0, outOfStock: 0, discounted: 0 })
  const [categoryCounts, setCategoryCounts] = useState<{ [key: string]: number }>({})
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchStats()
    setupRealtime()
  }, [])

  const fetchStats = async () => {
    setIsLoading(true)
    try {
      // Toplam ürün sayısı
      const { count: totalCount } = await supabase
        .from('market_products')
        .select('*', { count: 'exact', head: true })

      // Aktif ürün sayısı
      const { count: activeCount } = await supabase
        .from('market_products')
        .select('*', { count: 'exact', head: true })
        .eq('stock_status', 'active')

      // Stok tükenen ürün sayısı
      const { count: outOfStockCount } = await supabase
        .from('market_products')
        .select('*', { count: 'exact', head: true })
        .eq('stock_status', 'out_of_stock')

      // İndirimli ürün sayısı
      const { count: discountedCount } = await supabase
        .from('market_products')
        .select('*', { count: 'exact', head: true })
        .not('discount_price', 'is', null)

      setStats({
        total: totalCount || 0,
        active: activeCount || 0,
        outOfStock: outOfStockCount || 0,
        discounted: discountedCount || 0
      })

      // Kategori bazında ürün sayıları
      const { data: categoryData } = await supabase
        .from('market_products')
        .select('category')

      const counts: { [key: string]: number } = {}
      categoryData?.forEach(item => {
        counts[item.category] = (counts[item.category] || 0) + 1
      })
      setCategoryCounts(counts)

    } catch (error) {
      console.error('İstatistikler yüklenemedi:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const setupRealtime = () => {
    const channel = supabase
      .channel('admin-market-stats')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'market_products'
        },
        () => {
          fetchStats()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <ShoppingCart size={32} className="text-orange-500" />
          <h1 className="text-3xl font-black text-white">Market Yönetimi</h1>
        </div>
        <p className="text-slate-400">
          Kategori seçerek ürünleri yönetin, fiyatları güncelleyin ve stok durumunu kontrol edin
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm mb-1">Toplam Ürün</p>
              {isLoading ? (
                <div className="h-9 w-16 bg-slate-800 animate-pulse rounded" />
              ) : (
                <p className="text-3xl font-bold text-white">{stats.total}</p>
              )}
            </div>
            <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <span className="text-2xl">📦</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm mb-1">Aktif Ürün</p>
              {isLoading ? (
                <div className="h-9 w-16 bg-slate-800 animate-pulse rounded" />
              ) : (
                <p className="text-3xl font-bold text-green-400">{stats.active}</p>
              )}
            </div>
            <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
              <span className="text-2xl">✅</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm mb-1">Stok Tükendi</p>
              {isLoading ? (
                <div className="h-9 w-16 bg-slate-800 animate-pulse rounded" />
              ) : (
                <p className="text-3xl font-bold text-red-400">{stats.outOfStock}</p>
              )}
            </div>
            <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center">
              <span className="text-2xl">⚠️</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm mb-1">İndirimli</p>
              {isLoading ? (
                <div className="h-9 w-16 bg-slate-800 animate-pulse rounded" />
              ) : (
                <p className="text-3xl font-bold text-orange-400">{stats.discounted}</p>
              )}
            </div>
            <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center">
              <span className="text-2xl">🔥</span>
            </div>
          </div>
        </div>
      </div>

      {/* Categories Grid */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4">Kategoriler</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => router.push(`/admin/market/${category.id}`)}
              className="group relative bg-slate-900 border-2 border-slate-800 rounded-2xl p-6 hover:border-orange-500 hover:shadow-2xl hover:shadow-orange-500/20 transition-all duration-300"
            >
              {/* Gradient Background */}
              <div className={`absolute inset-0 bg-gradient-to-br ${category.color} opacity-0 group-hover:opacity-10 rounded-2xl transition-opacity duration-300`} />

              {/* Content */}
              <div className="relative">
                {/* Icon */}
                <div className={`w-16 h-16 bg-gradient-to-br ${category.color} rounded-2xl flex items-center justify-center text-4xl mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                  {category.icon}
                </div>

                {/* Category Name */}
                <h3 className="font-bold text-white text-lg mb-2 group-hover:text-orange-400 transition-colors">
                  {category.name}
                </h3>

                {/* Product Count */}
                <p className="text-slate-400 text-sm">
                  {isLoading ? '...' : (categoryCounts[category.id] || 0)} ürün
                </p>

                {/* Arrow Icon */}
                <div className="absolute top-4 right-4 text-slate-600 group-hover:text-orange-500 transition-colors">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/30 rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="text-4xl">💡</div>
          <div>
            <h3 className="text-lg font-bold text-white mb-2">Hızlı İpuçları</h3>
            <ul className="text-slate-300 text-sm space-y-1">
              <li>• Kategori seçerek o kategorideki tüm ürünleri görüntüleyin</li>
              <li>• Yeni ürün eklemek için kategori sayfasındaki "+ Yeni Ürün Ekle" butonunu kullanın</li>
              <li>• Ürün fiyatlarını güncellemek için düzenle butonuna tıklayın</li>
              <li>• Stok durumunu aktif/pasif olarak değiştirebilirsiniz</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
