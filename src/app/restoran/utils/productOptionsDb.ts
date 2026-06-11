import { supabase } from '@/app/lib/supabase'
import type { OptionGroup } from '../components/ProductOptionsManager'

export function sanitizeOptionGroups(optionGroups: OptionGroup[]): OptionGroup[] {
  return optionGroups
    .map((group) => ({
      name: group.name.trim(),
      type: group.type === 'checkbox' ? 'checkbox' as const : 'radio' as const,
      options: (group.options || [])
        .map((option) => ({
          name: option.name.trim(),
          price_modifier: Number(option.price_modifier) || 0,
        }))
        .filter((option) => option.name.length > 0),
    }))
    .filter((group) => group.name.length > 0 && group.options.length > 0)
}

export function parseProductOptions(raw: unknown): OptionGroup[] {
  if (!raw) return []

  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    return Array.isArray(parsed) ? sanitizeOptionGroups(parsed) : []
  } catch {
    return []
  }
}

export async function loadProductOptions(productId: string): Promise<OptionGroup[]> {
  const { data: product, error: productError } = await supabase
    .from('products')
    .select('options')
    .eq('id', productId)
    .maybeSingle()

  if (productError) {
    if (productError.message?.includes('options')) {
      return []
    }
    throw productError
  }

  const fromJson = parseProductOptions(product?.options)
  if (fromJson.length > 0) return fromJson

  const { data: groups, error: groupsError } = await supabase
    .from('product_option_groups')
    .select(`
      name,
      type,
      product_options (
        name,
        price_modifier
      )
    `)
    .eq('product_id', productId)

  if (groupsError) {
    if (
      groupsError.message?.includes('product_option_groups') ||
      groupsError.code === '42P01' ||
      groupsError.code === 'PGRST205'
    ) {
      return []
    }
    throw groupsError
  }

  return sanitizeOptionGroups(
    (groups || []).map((group: any) => ({
      name: group.name,
      type: group.type === 'checkbox' ? 'checkbox' : 'radio',
      options: (group.product_options || []).map((option: any) => ({
        name: option.name,
        price_modifier: Number(option.price_modifier) || 0,
      })),
    }))
  )
}

async function syncNormalizedProductOptions(productId: string, cleaned: OptionGroup[]): Promise<void> {
  const { error: deleteGroupsError } = await supabase
    .from('product_option_groups')
    .delete()
    .eq('product_id', productId)

  if (deleteGroupsError) throw deleteGroupsError

  for (const group of cleaned) {
    const { data: insertedGroup, error: groupError } = await supabase
      .from('product_option_groups')
      .insert({
        product_id: productId,
        name: group.name,
        type: group.type,
      })
      .select('id')
      .single()

    if (groupError) throw groupError

    const { error: optionsError } = await supabase
      .from('product_options')
      .insert(
        group.options.map((option) => ({
          group_id: insertedGroup.id,
          name: option.name,
          price_modifier: option.price_modifier,
        }))
      )

    if (optionsError) throw optionsError
  }
}

export async function saveProductOptions(productId: string, optionGroups: OptionGroup[]): Promise<OptionGroup[]> {
  const cleaned = sanitizeOptionGroups(optionGroups)

  const { data, error: productUpdateError } = await supabase
    .from('products')
    .update({ options: cleaned })
    .eq('id', productId)
    .select('id, options')
    .single()

  if (productUpdateError) {
    if (productUpdateError.message?.includes('options')) {
      throw new Error(
        'Veritabanında products.options kolonu yok. Supabase SQL Editor\'de database/add_product_options.sql dosyasını çalıştırın.'
      )
    }
    throw productUpdateError
  }

  if (!data) {
    throw new Error('Opsiyonlar kaydedilemedi: ürün bulunamadı veya güncelleme yetkisi yok.')
  }

  try {
    await syncNormalizedProductOptions(productId, cleaned)
  } catch (normalizedError) {
    console.warn('Normalize opsiyon tabloları güncellenemedi (JSONB kaydedildi):', normalizedError)
  }

  return parseProductOptions(data.options)
}
