export interface Category {
  id: string
  restaurant_id: string
  name: string
  display_order: number
  created_at: string
}

export interface Product {
  id: string
  restaurant_id: string
  category_id: string
  name: string
  description?: string
  price: number
  image_url?: string
  is_available: boolean
  display_order: number
  created_at: string
}

export interface CartItem {
  id: string
  customer_id: string
  product_id: string
  quantity: number
  item_note?: string
  product?: Product
}

export interface CartItemLocal {
  product: Product
  quantity: number
  item_note?: string
}
