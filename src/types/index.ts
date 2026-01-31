/**
 * 🛡️ AŞAMA 3: TİPLEME VE HATA ZIRHI
 * Merkezi Type Tanımlamaları - Mergen Kurye Sistemi
 * 
 * Bu dosya tüm projedeki type'ların tek kaynağıdır (Single Source of Truth)
 * ANY kullanımı yasaktır! Her veri yapısı kesin olarak tanımlanmıştır.
 */

// ============================================
// 🏢 RESTORAN TİPLERİ
// ============================================

export interface Restaurant {
    id: number | string
    name: string
    phone?: string
    address?: string
    totalOrders?: number
    totalRevenue?: number
    totalDebt?: number
}

// ============================================
// 📦 SİPARİŞ (PACKAGE) TİPLERİ
// ============================================

export type PackageStatus = 'waiting' | 'assigned' | 'picking_up' | 'on_the_way' | 'delivered' | 'cancelled' | 'pending'
export type PaymentMethod = 'cash' | 'card'
export type CancelledBy = 'admin' | 'restaurant'
export type Platform = 'getir' | 'yemeksepeti' | 'trendyol' | 'migros' | 'other'

export interface Package {
    id: number
    order_number?: string
    customer_name: string
    customer_phone?: string
    delivery_address: string
    amount: number
    status: PackageStatus
    content?: string
    courier_id?: string | null
    payment_method?: PaymentMethod | null
    restaurant_id?: number | string | null
    restaurant?: Restaurant | null
    platform?: Platform | string
    created_at?: string
    assigned_at?: string
    picked_up_at?: string
    delivered_at?: string
    settled_at?: string | null
    restaurant_settled_at?: string | null
    courier_name?: string
    cancelled_at?: string | null
    cancelled_by?: CancelledBy | null
    cancellation_reason?: string | null
    latitude?: number | null
    longitude?: number | null
}

// ============================================
// 🚴 KURYE TİPLERİ
// ============================================

export type CourierStatus = 'idle' | 'picking_up' | 'on_the_way' | 'assigned' | 'inactive'

export interface CourierLocation {
    latitude: number
    longitude: number
    updated_at?: string
}

export interface Courier {
    id: string
    full_name?: string
    phone?: string
    deliveryCount?: number
    todayDeliveryCount?: number
    is_active?: boolean
    activePackageCount?: number
    status?: CourierStatus
    totalDebt?: number
    last_location?: CourierLocation | null
}

// ============================================
// 💰 BORÇ YÖNETİMİ TİPLERİ
// ============================================

export type DebtStatus = 'pending' | 'paid'

export interface CourierDebt {
    id: number
    courier_id: string
    debt_date: string
    amount: number
    remaining_amount: number
    status: DebtStatus
    created_at: string
}

export interface RestaurantDebt {
    id: number
    restaurant_id: number | string
    debt_date: string
    amount: number
    remaining_amount: number
    status: DebtStatus
    created_at: string
}

// ============================================
// 📊 İSTATİSTİK VE RAPOR TİPLERİ
// ============================================

export interface CashSummary {
    cashTotal: number
    cardTotal: number
    grandTotal: number
}

export interface RestaurantSummary {
    name: string
    count: number
}

export interface CourierPerformance {
    courier_id: string
    full_name: string
    totalDeliveries: number
    todayDeliveries: number
    activePackages: number
    totalDebt: number
}

// ============================================
// 🔄 HOOK VE STATE TİPLERİ
// ============================================

export interface UseAdminDataReturn {
    packages: Package[]
    deliveredPackages: Package[]
    couriers: Courier[]
    restaurants: Restaurant[]
    isLoading: boolean
    errorMessage: string
    refreshData: () => Promise<void>
    setPackages: React.Dispatch<React.SetStateAction<Package[]>>
    setCouriers: React.Dispatch<React.SetStateAction<Courier[]>>
    setRestaurants: React.Dispatch<React.SetStateAction<Restaurant[]>>
}

// ============================================
// 🎨 UI COMPONENT PROPS TİPLERİ
// ============================================

export interface LiveOrdersViewProps {
    packages: Package[]
    couriers: Courier[]
    restaurants: Restaurant[]
    isLoading: boolean
    selectedCouriers: { [key: number]: string }
    assigningIds: Set<number>
    restaurantFilter: number | null
    onCourierChange: (packageId: number, courierId: string) => void
    onAssignCourier: (packageId: number) => Promise<void>
    setRestaurantFilter: (id: number | null) => void
}

export interface HistoryViewProps {
    deliveredPackages: Package[]
    dateFilter: 'today' | 'week' | 'month' | 'all'
    setDateFilter: (filter: 'today' | 'week' | 'month' | 'all') => void
    historyCurrentPage: number
    setHistoryCurrentPage: (page: number) => void
    HISTORY_ITEMS_PER_PAGE: number
}

export interface ManagementViewProps {
    activeTab: 'live' | 'history' | 'couriers' | 'restaurants'
}

// ============================================
// ⚠️ HATA YÖNETİMİ TİPLERİ
// ============================================

export interface ErrorState {
    message: string
    type: 'error' | 'warning' | 'info'
    timestamp: number
}

export interface ApiError {
    message: string
    code?: string
    details?: unknown
}

// ============================================
// 🔐 AUTH TİPLERİ
// ============================================

export interface LoginForm {
    username: string
    password: string
}

export interface AuthState {
    isLoggedIn: boolean
    isCheckingAuth: boolean
    userType?: 'admin' | 'courier' | 'restaurant'
}

// ============================================
// 🗺️ HARİTA TİPLERİ
// ============================================

export interface MapMarker {
    id: string | number
    position: [number, number] // [lat, lng]
    type: 'package' | 'courier' | 'restaurant'
    label?: string
    status?: string
}

// ============================================
// 📱 BİLDİRİM TİPLERİ
// ============================================

export interface NotificationState {
    message: string
    type: 'success' | 'error' | 'warning' | 'info'
    duration?: number
}

export type NotificationPermission = 'default' | 'granted' | 'denied'
