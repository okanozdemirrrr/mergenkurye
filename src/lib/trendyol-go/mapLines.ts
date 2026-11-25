import type { MappedLineItem, TrendyolLine, TrendyolModifierProduct } from './types'

export interface ProductMappingLookup {
  /** trendyol_product_id → local product uuid (yoksa unmatched) */
  getLocalProductId: (trendyolProductId: string) => string | undefined
}

function flattenModifiers(
  mods: TrendyolModifierProduct[] | undefined,
  out: Array<{ group_name?: string; option_name: string; price_diff?: number }> = []
): typeof out {
  if (!mods?.length) return out
  for (const m of mods) {
    out.push({
      option_name: m.name || 'Ekstra',
      price_diff: typeof m.price === 'number' ? m.price : 0,
    })
    if (m.modifierProducts?.length) {
      flattenModifiers(m.modifierProducts, out)
    }
  }
  return out
}

function sumModifierPrices(mods: TrendyolModifierProduct[] | undefined): number {
  if (!mods?.length) return 0
  let sum = 0
  for (const m of mods) {
    sum += typeof m.price === 'number' ? m.price : 0
    sum += sumModifierPrices(m.modifierProducts)
  }
  return sum
}

/**
 * Adet = items[].length (quantity alanı yok).
 * isCancelled true kalemler iptal sayılır.
 * modifier price ürün birim fiyatına eklenir (özyinelemeli).
 */
export function mapLines(
  lines: TrendyolLine[] | undefined,
  lookup?: ProductMappingLookup
): { items: MappedLineItem[]; unmatchedProductIds: string[] } {
  const items: MappedLineItem[] = []
  const unmatched = new Set<string>()

  for (const line of lines || []) {
    const trendyolProductId = String(line.productId ?? '')
    const localId = trendyolProductId
      ? lookup?.getLocalProductId(trendyolProductId)
      : undefined
    const isUnmatched = Boolean(trendyolProductId) && !localId
    if (isUnmatched) unmatched.add(trendyolProductId)

    const allItems = line.items || []
    const activeCount = allItems.filter((i) => !i.isCancelled).length
    const cancelledCount = allItems.filter((i) => i.isCancelled).length
    const isCancelled =
      allItems.length > 0 ? activeCount === 0 : Boolean((line as { isCancelled?: boolean }).isCancelled)

    // Adet: items uzunluğu; dizi yoksa 1
    const quantity =
      allItems.length > 0
        ? isCancelled
          ? cancelledCount || allItems.length
          : activeCount
        : 1

    const base =
      typeof line.unitSellingPrice === 'number'
        ? line.unitSellingPrice
        : typeof line.price === 'number'
          ? line.price
          : 0
    const modSum = sumModifierPrices(line.modifierProducts)
    const unitPrice = base + modSum

    const options = flattenModifiers(line.modifierProducts)
    for (const extra of line.extraIngredients || []) {
      options.push({
        option_name: `+ ${extra.name || 'Ekstra'}`,
        price_diff: typeof extra.price === 'number' ? extra.price : 0,
      })
    }
    for (const rem of line.removedIngredients || []) {
      options.push({
        option_name: `- ${rem.name || 'Çıkarılan'}`,
        price_diff: 0,
      })
    }

    let lineCoupon: number | null = null
    for (const it of allItems) {
      if (typeof it.coupon?.totalSellerAmount === 'number') {
        lineCoupon = (lineCoupon || 0) + it.coupon.totalSellerAmount
      }
    }

    items.push({
      product_id: localId,
      product_name: line.name || 'Ürün',
      quantity: Math.max(quantity, 1),
      price: unitPrice,
      base_price: base,
      selected_options: options,
      item_note: line.description || null,
      trendyol_product_id: trendyolProductId,
      unmatched: isUnmatched,
      is_cancelled: isCancelled,
      line_coupon_amount: lineCoupon,
    })
  }

  return { items, unmatchedProductIds: [...unmatched] }
}
