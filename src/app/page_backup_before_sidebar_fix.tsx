'use client'

import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { getPlatformBadgeClass, getPlatformDisplayName } from './lib/platformUtils'

// Type Imports
import { Package, Courier, Restaurant, CourierDebt, RestaurantDebt } from '@/types'

// Component Imports
import { LiveTrackingTab } from './admin/components/LiveTrackingTab'
import { HistoryTab } from './admin/components/HistoryTab'
import { CouriersTab } from './admin/components/CouriersTab'
import { RestaurantsTab } from './admin/components/RestaurantsTab'

// Service Imports
import { cancelOrder, assignCourier, updateOrderStatus } from '@/services/orderService'
import { handleEndOfDay as handleEndOfDayService, handlePayDebt as handlePayDebtService } from '@/services/courierService'
import { handleRestaurantPayment as handleRestaurantPaymentService, handleRestaurantDebtPayment as handleRestaurantDebtPaymentService } from '@/services/restaurantService'

export default function Home() {
    // ========== STATE MANAGEMENT ==========
    const [isMounted, setIsMounted] = useState(false)
    const [isCheckingAuth, setIsCheckingAuth] = useState(true)
    const [isLoggedIn, setIsLoggedIn] = useState(false)
    const [loginForm, setLoginForm] = useState({ username: '', password: '' })
    const [activeTab, setActiveTab] = useState<'live' | 'history' | 'couriers' | 'restaurants'>('live')
    const [successMessage, setSuccessMessage] = useState('')
    const [errorMessage, setErrorMessage] = useState('')
    const [notificationMessage, setNotificationMessage] = useState('')

    // Data States
    const [packages, setPackages] = useState<Package[]>([])
    const [deliveredPackages, setDeliveredPackages] = useState<Package[]>([])
    const [couriers, setCouriers] = useState<Courier[]>([])
    const [restaurants, setRestaurants] = useState<Restaurant[]>([])

    // UI States
    const [isLoading, setIsLoading] = useState(true)
    const [selectedCouriers, setSelectedCouriers] = useState<{ [key: number]: string }>({})
    const [assigningIds, setAssigningIds] = useState<Set<number>>(new Set())
    const [openDropdownId, setOpenDropdownId] = useState<number | null>(null)
    const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'all'>('all')
    const [showMenu, setShowMenu] = useState(false)

    // Courier States
    const [selectedCourierId, setSelectedCourierId] = useState<string | null>(null)
    const [showCourierModal, setShowCourierModal] = useState(false)
    const [selectedCourierOrders, setSelectedCourierOrders] = useState<Package[]>([])
    const [courierSubTab, setCourierSubTab] = useState<'accounts' | 'performance' | 'earnings'>('accounts')
    const [courierStartDate, setCourierStartDate] = useState('')
    const [courierEndDate, setCourierEndDate] = useState('')
    const [courierDebts, setCourierDebts] = useState<CourierDebt[]>([])
    const [loadingDebts, setLoadingDebts] = useState(false)
    const [showEndOfDayModal, setShowEndOfDayModal] = useState(false)
    const [endOfDayAmount, setEndOfDayAmount] = useState('')
    const [endOfDayProcessing, setEndOfDayProcessing] = useState(false)
    const [showPayDebtModal, setShowPayDebtModal] = useState(false)
    const [payDebtAmount, setPayDebtAmount] = useState('')
    const [payDebtProcessing, setPayDebtProcessing] = useState(false)

    // Restaurant States
    const [selectedRestaurantId, setSelectedRestaurantId] = useState<number | string | null>(null)
    const [selectedRestaurantOrders, setSelectedRestaurantOrders] = useState<Package[]>([])
    const [showRestaurantModal, setShowRestaurantModal] = useState(false)
    const [restaurantSubTab, setRestaurantSubTab] = useState<'list' | 'details' | 'debt' | 'payments'>('list')
    const [showRestaurantSubmenu, setShowRestaurantSubmenu] = useState(false)
    const [restaurantDebts, setRestaurantDebts] = useState<RestaurantDebt[]>([])
    const [loadingRestaurantDebts, setLoadingRestaurantDebts] = useState(false)
    const [showRestaurantPaymentModal, setShowRestaurantPaymentModal] = useState(false)
    const [restaurantPaymentAmount, setRestaurantPaymentAmount] = useState('')
    const [restaurantPaymentProcessing, setRestaurantPaymentProcessing] = useState(false)
    const [showRestaurantDebtPayModal, setShowRestaurantDebtPayModal] = useState(false)
    const [restaurantDebtPayAmount, setRestaurantDebtPayAmount] = useState('')
    const [restaurantDebtPayProcessing, setRestaurantDebtPayProcessing] = useState(false)
    const [restaurantStartDate, setRestaurantStartDate] = useState('')
    const [restaurantEndDate, setRestaurantEndDate] = useState('')

    // Notification States
    const [notificationPermission, setNotificationPermission] = useState<'default' | 'granted' | 'denied'>('default')
    const [showNotificationPopup, setShowNotificationPopup] = useState(false)
    const [newOrderDetails, setNewOrderDetails] = useState<Package | null>(null)
    const [lastPackageIds, setLastPackageIds] = useState<Set<number>>(new Set())

    // ========== MOUNT & AUTH ==========
    useEffect(() => {
        setIsMounted(true)
    }, [])

    useEffect(() => {
        const checkAuthAndRedirect = () => {
            if (typeof window === 'undefined') return
            if (!isMounted) return

            setIsCheckingAuth(true)

            try {
                const adminLoggedIn = localStorage.getItem('admin_logged_in')
                setIsLoggedIn(adminLoggedIn === 'true')
            } catch (error) {
                console.error('Auth kontrolü hatası:', error)
                setIsLoggedIn(false)
            } finally {
                setIsCheckingAuth(false)
            }
        }

        checkAuthAndRedirect()
    }, [isMounted])

    // ========== DATA FETCHING ==========
    const fetchPackages = async () => {
        try {
            const todayStart = new Date()
            todayStart.setHours(0, 0, 0, 0)

            const { data, error } = await supabase
                .from('packages')
                .select('*, restaurants(*)')
                .is('courier_id', null)
                .gte('created_at', todayStart.toISOString())
                .order('created_at', { ascending: false })

            if (error) throw error

            const transformedData = (data || []).map((pkg: any) => ({
                ...pkg,
                restaurant: Array.isArray(pkg.restaurants) && pkg.restaurants.length > 0
                    ? pkg.restaurants[0]
                    : pkg.restaurants || null,
                restaurants: undefined
            }))

            setPackages(transformedData)
        } catch (error: any) {
            console.error('Siparişler yüklenirken hata:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const fetchDeliveredPackages = async () => {
        try {
            const { data, error } = await supabase
                .from('packages')
                .select('*, restaurants(*), couriers(*)')
                .eq('status', 'delivered')
                .order('delivered_at', { ascending: false })

            if (error) throw error

            const transformedData = (data || []).map((pkg: any) => ({
                ...pkg,
                restaurant: pkg.restaurants,
                courier_name: pkg.couriers?.full_name,
                restaurants: undefined,
                couriers: undefined
            }))

            setDeliveredPackages(transformedData)
        } catch (error: any) {
            console.error('Geçmiş siparişler yüklenirken hata:', error)
        }
    }

    const fetchCouriers = async () => {
        try {
            const { data, error } = await supabase
                .from('couriers')
                .select('*')
                .order('full_name', { ascending: true })

            if (error) throw error

            const couriersData = (data || []).map(courier => ({
                ...courier,
                id: courier.id,
                full_name: courier.full_name || 'İsimsiz Kurye',
                is_active: Boolean(courier.is_active),
                deliveryCount: 0,
                todayDeliveryCount: 0,
                activePackageCount: 0,
                totalDebt: 0
            }))

            setCouriers(couriersData)
        } catch (error: any) {
            console.error('Kuryeler yüklenemedi:', error)
        }
    }

    const fetchRestaurants = async () => {
        try {
            const { data, error } = await supabase
                .from('restaurants')
                .select('*')
                .order('name', { ascending: true })

            if (error) throw error
            setRestaurants(data || [])
        } catch (error: any) {
            console.error('Restoranlar yüklenemedi:', error)
        }
    }

    const fetchCourierDebts = async (courierId: string) => {
        setLoadingDebts(true)
        try {
            const { data, error } = await supabase
                .from('courier_debts')
                .select('*')
                .eq('courier_id', courierId)
                .eq('status', 'pending')
                .order('debt_date', { ascending: true })

            if (error) throw error
            setCourierDebts(data || [])
        } catch (error: any) {
            console.error('Borçlar yüklenemedi:', error)
            setCourierDebts([])
        } finally {
            setLoadingDebts(false)
        }
    }

    const fetchRestaurantDebts = async (restaurantId: number | string) => {
        setLoadingRestaurantDebts(true)
        try {
            const { data, error } = await supabase
                .from('restaurant_debts')
                .select('*')
                .eq('restaurant_id', restaurantId)
                .eq('status', 'pending')
                .order('debt_date', { ascending: true })

            if (error) throw error
            setRestaurantDebts(data || [])
        } catch (error: any) {
            console.error('Restoran borçları yüklenemedi:', error)
            setRestaurantDebts([])
        } finally {
            setLoadingRestaurantDebts(false)
        }
    }

    // ========== INITIAL DATA LOAD ==========
    useEffect(() => {
        if (!isLoggedIn) return

        fetchPackages()
        fetchDeliveredPackages()
        fetchCouriers()
        fetchRestaurants()

        // Realtime subscriptions
        const packagesChannel = supabase
            .channel('packages-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'packages' }, () => {
                fetchPackages()
                fetchDeliveredPackages()
            })
            .subscribe()

        const couriersChannel = supabase
            .channel('couriers-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'couriers' }, () => {
                fetchCouriers()
            })
            .subscribe()

        return () => {
            packagesChannel.unsubscribe()
            couriersChannel.unsubscribe()
        }
    }, [isLoggedIn])

    // ========== EVENT HANDLERS ==========
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()

        if (loginForm.username === 'admin' && loginForm.password === 'admin123') {
            localStorage.setItem('admin_logged_in', 'true')
            setIsLoggedIn(true)
            setSuccessMessage('Giriş başarılı!')
            setTimeout(() => setSuccessMessage(''), 2000)
        } else {
            setErrorMessage('Kullanıcı adı veya şifre hatalı!')
            setTimeout(() => setErrorMessage(''), 3000)
        }
    }

    const handleCourierChange = (packageId: number, courierId: string) => {
        setSelectedCouriers(prev => ({ ...prev, [packageId]: courierId }))
    }

    const handleAssignCourier = async (packageId: number) => {
        const courierId = selectedCouriers[packageId]
        if (!courierId) {
            setErrorMessage('Lütfen kurye seçin!')
            setTimeout(() => setErrorMessage(''), 3000)
            return
        }

        setAssigningIds(prev => new Set(prev).add(packageId))

        try {
            await assignCourier(packageId, courierId)
            setSuccessMessage('Kurye atandı!')
            setTimeout(() => setSuccessMessage(''), 2000)
            await fetchPackages()
        } catch (error: any) {
            setErrorMessage(error.message)
            setTimeout(() => setErrorMessage(''), 3000)
        } finally {
            setAssigningIds(prev => {
                const newSet = new Set(prev)
                newSet.delete(packageId)
                return newSet
            })
        }
    }

    const handleCancelOrder = async (packageId: number) => {
        if (!confirm('Bu siparişi iptal etmek istediğinize emin misiniz?')) return

        try {
            await cancelOrder(packageId)
            setSuccessMessage('Sipariş iptal edildi!')
            setTimeout(() => setSuccessMessage(''), 2000)
            await fetchPackages()
            await fetchDeliveredPackages()
        } catch (error: any) {
            setErrorMessage(error.message)
            setTimeout(() => setErrorMessage(''), 3000)
        }
    }

    const handleCourierClick = async (courierId: string) => {
        setSelectedCourierId(courierId)
        await fetchCourierDebts(courierId)
        setShowCourierModal(true)
    }

    const handleRestaurantClick = async (restaurantId: number | string) => {
        setSelectedRestaurantId(restaurantId)
        await fetchRestaurantDebts(restaurantId)
        setShowRestaurantModal(true)
    }

    // ========== RENDER ==========
    if (!isMounted || isCheckingAuth) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="text-white text-xl">Yükleniyor...</div>
            </div>
        )
    }

    if (!isLoggedIn) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
                <form onSubmit={handleLogin} className="bg-slate-900 p-8 rounded-2xl border border-slate-800 w-full max-w-md">
                    <div className="text-center mb-8">
                        <img
                            src="/logo.png"
                            alt="Logo"
                            className="w-64 h-64 mx-auto mb-4"
                        />
                        <h1 className="text-2xl font-bold text-white mb-2">
                            Admin Girişi
                        </h1>
                    </div>
                    <input
                        type="text"
                        placeholder="Kullanıcı Adı"
                        className="w-full p-3 mb-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 outline-none focus:border-blue-500 transition-colors"
                        value={loginForm.username}
                        onChange={e => setLoginForm({ ...loginForm, username: e.target.value })}
                    />
                    <input
                        type="password"
                        placeholder="Şifre"
                        className="w-full p-3 mb-4 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 outline-none focus:border-blue-500 transition-colors"
                        value={loginForm.password}
                        onChange={e => setLoginForm({ ...loginForm, password: e.target.value })}
                    />
                    <button className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors">
                        Giriş Yap
                    </button>
                    {errorMessage && <p className="text-red-400 text-sm mt-3 text-center">{errorMessage}</p>}
                </form>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Hamburger Menu Button */}
            <button
                onClick={() => setShowMenu(!showMenu)}
                className="fixed top-4 left-4 z-50 bg-slate-800 text-white p-3 rounded-lg shadow-lg hover:bg-slate-700 transition-colors"
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
            </button>

            {/* Sidebar Menu */}
            {showMenu && (
                <div className="fixed inset-0 z-40 flex">
                    <div
                        className="fixed inset-0 bg-black/50"
                        onClick={() => setShowMenu(false)}
                    />
                    <div className="relative bg-slate-900 w-80 h-full overflow-y-auto p-6">
                        <nav className="space-y-2">
                            <button
                                onClick={() => {
                                    setActiveTab('live')
                                    setShowMenu(false)
                                }}
                                className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-all ${activeTab === 'live'
                                        ? 'bg-blue-600 text-white'
                                        : 'text-slate-300 hover:bg-slate-800'
                                    }`}
                            >
                                📦 Canlı Takip
                            </button>
                            <button
                                onClick={() => {
                                    setActiveTab('history')
                                    setShowMenu(false)
                                }}
                                className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-all ${activeTab === 'history'
                                        ? 'bg-blue-600 text-white'
                                        : 'text-slate-300 hover:bg-slate-800'
                                    }`}
                            >
                                📜 Geçmiş
                            </button>
                            <button
                                onClick={() => {
                                    setActiveTab('couriers')
                                    setShowMenu(false)
                                }}
                                className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-all ${activeTab === 'couriers'
                                        ? 'bg-blue-600 text-white'
                                        : 'text-slate-300 hover:bg-slate-800'
                                    }`}
                            >
                                🚴 Kuryeler
                            </button>
                            <button
                                onClick={() => {
                                    setActiveTab('restaurants')
                                    setShowMenu(false)
                                }}
                                className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-all ${activeTab === 'restaurants'
                                        ? 'bg-blue-600 text-white'
                                        : 'text-slate-300 hover:bg-slate-800'
                                    }`}
                            >
                                🍽️ Restoranlar
                            </button>
                        </nav>

                        <button
                            onClick={() => {
                                localStorage.removeItem('admin_logged_in')
                                window.location.href = '/'
                            }}
                            className="w-full mt-8 bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-lg font-medium transition-colors"
                        >
                            ← Çıkış Yap
                        </button>
                    </div>
                </div>
            )}

            {/* Sticky Navbar */}
            <div className="sticky top-0 z-30 bg-white shadow-lg border-b border-slate-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-center items-center h-16">
                        <h1 className="text-3xl font-black tracking-wider bg-gradient-to-r from-gray-200 to-gray-500 bg-clip-text text-transparent" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                            ADMIN PANEL
                        </h1>
                    </div>
                </div>
            </div>

            {/* Tab Content */}
            <div className="py-8 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    {/* Messages */}
                    {notificationMessage && (
                        <div className="mb-4 p-3 bg-blue-100 border border-blue-300 rounded-lg text-blue-800 animate-pulse">
                            {notificationMessage}
                        </div>
                    )}
                    {successMessage && (
                        <div className="mb-4 p-3 bg-green-100 border border-green-300 rounded-lg text-green-800">
                            {successMessage}
                        </div>
                    )}
                    {errorMessage && (
                        <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-lg text-red-800">
                            {errorMessage}
                        </div>
                    )}

                    {/* Tab Components */}
                    {activeTab === 'live' && (
                        <LiveTrackingTab
                            packages={packages}
                            couriers={couriers}
                            isLoading={isLoading}
                            selectedCouriers={selectedCouriers}
                            assigningIds={assigningIds}
                            openDropdownId={openDropdownId}
                            setOpenDropdownId={setOpenDropdownId}
                            handleCourierChange={handleCourierChange}
                            handleAssignCourier={handleAssignCourier}
                            handleCancelOrder={handleCancelOrder}
                        />
                    )}
                    {activeTab === 'history' && (
                        <HistoryTab
                            deliveredPackages={deliveredPackages}
                            dateFilter={dateFilter}
                            setDateFilter={setDateFilter}
                            openDropdownId={openDropdownId}
                            setOpenDropdownId={setOpenDropdownId}
                            handleCancelOrder={handleCancelOrder}
                        />
                    )}
                    {activeTab === 'couriers' && (
                        <CouriersTab
                            couriers={couriers}
                            courierSubTab={courierSubTab}
                            onCourierClick={handleCourierClick}
                        />
                    )}
                    {activeTab === 'restaurants' && (
                        <RestaurantsTab
                            restaurants={restaurants}
                            restaurantSubTab={restaurantSubTab}
                            onRestaurantClick={handleRestaurantClick}
                            onDebtPayClick={(id) => {
                                setSelectedRestaurantId(id)
                                fetchRestaurantDebts(id)
                                setShowRestaurantDebtPayModal(true)
                            }}
                        />
                    )}
                </div>
            </div>
        </div>
    )
}
