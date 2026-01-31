// Type Definitions for Mergen Kurye System

export interface Restaurant {
    id: number | string
    name: string
    phone?: string
    address?: string
    totalOrders?: number
    totalRevenue?: number
    totalDebt?: number
}

export interface Package {
    id: number
    order_number?: string
    customer_name: string
    customer_phone?: string
    delivery_address: string
    amount: number
    status: 'waiting' | 'assigned' | 'picking_up' | 'on_the_way' | 'delivered' | 'cancelled'
    content?: string
    courier_id?: string | null
    payment_method?: 'cash' | 'card' | null
    restaurant_id?: number | string | null
    restaurant?: Restaurant | null
    platform?: string
    created_at?: string
    assigned_at?: string
    picked_up_at?: string
    delivered_at?: string
    settled_at?: string | null
    restaurant_settled_at?: string | null
    courier_name?: string
    cancelled_at?: string | null
    cancelled_by?: 'admin' | 'restaurant' | null
    cancellation_reason?: string | null
}

export interface Courier {
    id: string
    full_name?: string
    deliveryCount?: number
    todayDeliveryCount?: number
    is_active?: boolean
    activePackageCount?: number
    status?: 'idle' | 'picking_up' | 'on_the_way' | 'assigned' | 'inactive'
    totalDebt?: number
}

export interface CourierDebt {
    id: number
    courier_id: string
    debt_date: string
    amount: number
    remaining_amount: number
    status: 'pending' | 'paid'
    created_at: string
}

export interface RestaurantDebt {
    id: number
    restaurant_id: number | string
    debt_date: string
    amount: number
    remaining_amount: number
    status: 'pending' | 'paid'
    created_at: string
}
