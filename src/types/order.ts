export interface SelectedOption {
  group_id?: string
  group_name?: string
  option_id?: string
  option_name?: string
  price_diff?: number
}

export interface OrderItem {
  product_id?: string
  product_name: string
  quantity: number
  price: number
  base_price?: number
  selected_options: SelectedOption[]
  item_note?: string | null
}
