'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, FileText, User, ShoppingCart, UtensilsCrossed } from 'lucide-react'
import AuthModal from './components/AuthModal'
import AddressModal from './components/AddressModal'
import WelcomeSplash from './components/WelcomeSplash'
import NotificationBell from './components/NotificationBell'
import PushNotificationPrompt from './components/PushNotificationPrompt'

// Split Screen Selector Component
function SplitScreenSelector() {
  const router = useRouter()
  const [showComingSoon, setShowComingSoon] = useState(false)

  const handleYemekClick = () => {
    router.push('/musteri/restoranlar')
  }

  const handleMarketClick = () => {
    setShowComingSoon(true)
    setTimeout(() => setShowComingSoon(false), 3000)
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-0 h-[calc(100vh-200px)] min-h-[500px]">
        {/* YEMEK Section */}
        <motion.button
          onClick={handleYemekClick}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="relative overflow-hidden group cursor-pointer"
        >
          {/* Background Image */}
          <div 
            className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
            style={{
              backgroundImage: 'url(https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80)',
            }}
          />
          
          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-orange-600/80 to-orange-800/90 group-hover:from-orange-500/85 group-hover:to-orange-700/95 transition-all duration-300" />
          
          {/* Content */}
          <div className="relative h-full flex flex-col items-center justify-center text-white p-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="mb-6"
            >
              <UtensilsCrossed size={80} strokeWidth={1.5} />
            </motion.div>
            
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-6xl md:text-7xl font-black tracking-tight mb-4"
              style={{ fontFamily: 'Open Sans, sans-serif' }}
            >
              YEMEK
            </motion.h2>
            
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-xl md:text-2xl font-medium opacity-90"
            >
              Restoranlardan sipariş ver
            </motion.p>

            {/* Hover Arrow */}
            <motion.div
              initial={{ opacity: 0 }}
              whileHover={{ opacity: 1, x: 10 }}
              className="absolute right-8 top-1/2 transform -translate-y-1/2"
            >
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </motion.div>
          </div>

          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/5 rounded-full blur-3xl" />
        </motion.button>

        {/* MARKET Section */}
        <motion.button
          onClick={handleMarketClick}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="relative overflow-hidden group cursor-pointer"
        >
          {/* Background Image */}
          <div 
            className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
            style={{
              backgroundImage: 'url(https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=800&q=80)',
            }}
          />
          
          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-green-600/80 to-green-800/90 group-hover:from-green-500/85 group-hover:to-green-700/95 transition-all duration-300" />
          
          {/* Content */}
          <div className="relative h-full flex flex-col items-center justify-center text-white p-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="mb-6"
            >
              <ShoppingCart size={80} strokeWidth={1.5} />
            </motion.div>
            
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-6xl md:text-7xl font-black tracking-tight mb-4"
              style={{ fontFamily: 'Open Sans, sans-serif' }}
            >
              MARKET
            </motion.h2>
            
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-xl md:text-2xl font-medium opacity-90"
            >
              Marketlerden alışveriş yap
            </motion.p>

            {/* Coming Soon Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
              className="absolute top-8 right-8 bg-yellow-400 text-green-900 px-4 py-2 rounded-full font-bold text-sm"
            >
              Yakında
            </motion.div>

            {/* Hover Arrow */}
            <motion.div
              initial={{ opacity: 0 }}
              whileHover={{ opacity: 1, x: 10 }}
              className="absolute right-8 top-1/2 transform -translate-y-1/2"
            >
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </motion.div>
          </div>

          {/* Decorative Elements */}
          <div className="absolute top-0 left-0 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-40 h-40 bg-white/5 rounded-full blur-3xl" />
        </motion.button>
      </div>

      {/* Coming Soon Modal */}
      <AnimatePresence>
        {showComingSoon && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-white/95 backdrop-blur-xl rounded-3xl p-8 md:p-12 max-w-md text-center shadow-2xl border border-white/20"
            >
              <div className="text-6xl mb-4">🛒</div>
              <h3 className="text-2xl font-bold text-[#3c4043] mb-3" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                Marketlerimiz Yüklenmekte
              </h3>
              <p className="text-[#6f6f6f] text-lg">
                Beklemede kalın, çok yakında sizlerle!
              </p>
              <div className="mt-6 flex gap-2 justify-center">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export default function MusteriAnaSayfa() {
  const router = useRouter()
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [customerName, setCustomerName] = useState('')
  const [selectedAddress, setSelectedAddress] = useState('')
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showAddressModal, setShowAddressModal] = useState(false)
  const [showWelcomeSplash, setShowWelcomeSplash] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Oturum kontrolü
    const customerId = localStorage.getItem('customer_id')
    const name = localStorage.getItem('customer_name')
    const address = localStorage.getItem('customer_address')

    if (customerId && name) {
      setIsLoggedIn(true)
      setCustomerName(name)
      if (address) {
        setSelectedAddress(address)
        // Adres varsa split screen göster (restoranlar sayfasına otomatik yönlendirme kaldırıldı)
      }
    }
  }, [])

  // Menü dışına tıklama kontrolü
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false)
      }
    }

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showMenu])

  const handleAddressClick = () => {
    if (!isLoggedIn) {
      setShowAuthModal(true)
    } else {
      setShowAddressModal(true)
    }
  }

  const handleLoginSuccess = (name: string) => {
    setIsLoggedIn(true)
    setCustomerName(name)
    setShowAuthModal(false)
    setShowWelcomeSplash(true)
  }

  const handleAddressSelect = (address: string) => {
    setSelectedAddress(address)
    setShowAddressModal(false)
  }

  const handleLogout = () => {
    localStorage.removeItem('customer_id')
    localStorage.removeItem('customer_name')
    localStorage.removeItem('customer_address')
    setIsLoggedIn(false)
    setCustomerName('')
    setSelectedAddress('')
  }

  return (
    <>
      {/* Welcome Splash */}
      {showWelcomeSplash && (
        <WelcomeSplash 
          name={customerName} 
          onComplete={() => setShowWelcomeSplash(false)} 
        />
      )}

      <div className="min-h-screen bg-white">
        {/* Header */}
        <header className="bg-white border-b border-[#e8e8e8] sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 h-[72px] flex items-center justify-between">
            {/* Sol: Logo + Adres */}
            <div className="flex items-center gap-4">
              <Image 
                src="/logo.png" 
                alt="Alda Gel" 
                width={120} 
                height={40}
                className="cursor-pointer"
                onClick={() => router.push('/musteri')}
              />
              
              <button
                onClick={handleAddressClick}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-[#e8e8e8] rounded-lg hover:border-[#f59e0b] transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
                <span className="text-[14px] font-semibold text-[#3c4043]" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                  {selectedAddress || 'Adresini Seç'}
                </span>
              </button>
            </div>

            {/* Sağ: Auth Buttons veya User Info */}
            <div className="flex items-center gap-3">
              {!isLoggedIn ? (
                <>
                  <button
                    onClick={() => setShowAuthModal(true)}
                    className="px-6 py-2 text-[14px] font-semibold text-[#3c4043] hover:bg-[#f7f7f7] rounded-lg transition-colors"
                    style={{ fontFamily: 'Open Sans, sans-serif' }}
                  >
                    Giriş Yap
                  </button>
                  <button
                    onClick={() => setShowAuthModal(true)}
                    className="px-6 py-2 text-[14px] font-semibold text-white bg-[#f59e0b] hover:bg-[#d97706] rounded-lg transition-colors"
                    style={{ fontFamily: 'Open Sans, sans-serif' }}
                  >
                    Kayıt Ol
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-[#f59e0b] rounded-full flex items-center justify-center text-white font-bold text-[14px]">
                      {customerName.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-[14px] font-semibold text-[#3c4043]" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                      {customerName}
                    </span>
                  </div>
                  
                  {/* Hamburger Menu */}
                  <div className="relative" ref={menuRef}>
                    <button
                      onClick={() => setShowMenu(!showMenu)}
                      className="p-2 text-gray-300 hover:text-[#f59e0b] transition-colors cursor-pointer"
                    >
                      <Menu size={20} />
                    </button>

                    <AnimatePresence>
                      {showMenu && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95, y: -10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: -10 }}
                          transition={{ duration: 0.15 }}
                          className="absolute right-0 mt-2 w-56 bg-slate-800 rounded-xl shadow-2xl border border-gray-700 overflow-hidden z-50"
                        >
                          <button
                            onClick={() => {
                              setShowMenu(false)
                              router.push('/musteri/siparislerim')
                            }}
                            className="w-full px-4 py-3 flex items-center gap-3 text-white hover:bg-slate-700 transition-colors text-left"
                          >
                            <FileText size={18} />
                            <span className="text-[14px] font-medium">📜 Geçmiş Siparişlerim</span>
                          </button>
                          <button
                            onClick={() => {
                              setShowMenu(false)
                              router.push('/musteri/profil')
                            }}
                            className="w-full px-4 py-3 flex items-center gap-3 text-white hover:bg-slate-700 transition-colors text-left"
                          >
                            <User size={18} />
                            <span className="text-[14px] font-medium">👤 Profilim</span>
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  
                  {/* Notification Bell - Hamburger ile Çıkış arasında */}
                  <NotificationBell />
                  
                  <button
                    onClick={handleLogout}
                    className="text-[13px] text-[#6f6f6f] hover:text-[#f59e0b] transition-colors"
                  >
                    Çıkış
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 py-8">
          {!isLoggedIn || !selectedAddress ? (
            // Giriş yapmamış veya adres seçmemiş kullanıcılar için
            <div className="text-center py-20">
              <h1 className="text-[48px] font-bold text-[#3c4043] mb-4" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                Alda Gel
              </h1>
              <p className="text-[18px] text-[#6f6f6f] mb-8">
                Samsun 19 Mayıs'ta hızlı teslimat
              </p>
              
              <button
                onClick={handleAddressClick}
                className="px-8 py-4 text-[16px] font-bold text-white bg-[#f59e0b] hover:bg-[#d97706] rounded-lg transition-colors"
                style={{ fontFamily: 'Open Sans, sans-serif' }}
              >
                {!isLoggedIn ? 'Giriş Yap ve Başla' : 'Adresini Seç ve Başla'}
              </button>
            </div>
          ) : (
            // Giriş yapmış ve adres seçmiş kullanıcılar için Split Screen
            <SplitScreenSelector />
          )}
        </main>
      </div>

      {/* Modals */}
      {showAuthModal && (
        <AuthModal 
          onClose={() => setShowAuthModal(false)}
          onLoginSuccess={handleLoginSuccess}
        />
      )}

      {showAddressModal && (
        <AddressModal
          onClose={() => setShowAddressModal(false)}
          onAddressSelect={handleAddressSelect}
        />
      )}

      {/* Push Notification Prompt */}
      {isLoggedIn && <PushNotificationPrompt />}
    </>
  )
}
