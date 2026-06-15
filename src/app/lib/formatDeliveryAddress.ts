export interface DeliveryAddressInput {
  district?: string | null
  neighborhood?: string | null
  street?: string | null
  street_address?: string | null
  floor?: string | null
  door_no?: string | null
  door_number?: string | null
  directions?: string | null
  description?: string | null
  notes?: string | null
}

/** Checkout sırasında packages.delivery_address için kullanılır. */
export function formatDeliveryAddress(address: DeliveryAddressInput): string {
  const street = address.street ?? address.street_address ?? ''
  const door = address.door_no ?? address.door_number ?? ''
  const base = `${address.district}, ${address.neighborhood}, ${street}, Kat: ${address.floor}, No: ${door}`
  const tarif = (address.directions ?? address.description ?? address.notes ?? '').trim()
  return tarif ? `${base} | Tarif: ${tarif}` : base
}

/**
 * DB'de eski formatta kayıtlı adresleri (örn. "Yurt - Mahalle, İlçe, Kat: 1, No: 1")
 * ekranda yeni formata çevirir.
 */
export function parseDeliveryAddress(raw: string | null | undefined): { address: string; tarif: string | null } {
  if (!raw?.trim()) return { address: raw ?? '', tarif: null }

  const tarifMatch = raw.match(/\s*\|\s*Tarif:\s*(.+)$/i)
  if (tarifMatch) {
    return {
      address: raw.slice(0, tarifMatch.index).trim(),
      tarif: tarifMatch[1].trim() || null,
    }
  }

  const legacy = raw.trim().match(/^[^-]+\s*-\s*([^,]+),\s*([^,]+),\s*Kat:\s*([^,]+),\s*No:\s*(.+)$/i)
  if (legacy) {
    const [, neighborhood, district, floor, door] = legacy
    return {
      address: `${district.trim()}, ${neighborhood.trim()}, Kat: ${floor.trim()}, No: ${door.trim()}`,
      tarif: null,
    }
  }

  return { address: raw.trim(), tarif: null }
}

export function formatStoredDeliveryAddress(raw: string | null | undefined): string {
  const { address, tarif } = parseDeliveryAddress(raw)
  return tarif ? `${address} | Tarif: ${tarif}` : address
}
