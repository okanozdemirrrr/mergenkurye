import type { OrderItem } from '@/types/order'

export function normalizeOrderItems(raw: unknown): OrderItem[] {
  let arr: unknown = raw
  if (typeof raw === 'string') {
    try {
      arr = JSON.parse(raw)
    } catch {
      return []
    }
  }
  if (!Array.isArray(arr)) return []

  return arr.map((item: Record<string, unknown>) => ({
    product_id: item.product_id as string | undefined,
    product_name: String(item.product_name || item.name || 'Ürün'),
    quantity: Number(item.quantity || 1),
    price: Number(item.price ?? item.unit_price ?? 0),
    base_price: item.base_price != null ? Number(item.base_price) : undefined,
    selected_options: Array.isArray(item.selected_options) ? item.selected_options : [],
    item_note: (item.item_note ?? item.note ?? null) as string | null,
  }))
}
