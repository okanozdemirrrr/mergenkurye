import { normalizePhoneTR } from '@/utils/normalizePhoneTR'

/**
 * addressDescription içinden TR cep numarası yakala.
 * Bulunan numara "tariften okundu" — doğrulanmış müşteri telefonu değil.
 */
const PHONE_CANDIDATE =
  /(?:\+90|0)?[\s().-]*5[\s().-]*\d[\s().-]*\d[\s().-]*\d[\s().-]*\d[\s().-]*\d[\s().-]*\d[\s().-]*\d[\s().-]*\d[\s().-]*\d/g

export function extractPhoneFromAddressDescription(
  description: string | null | undefined
): string | null {
  if (!description?.trim()) return null

  const matches = description.match(PHONE_CANDIDATE)
  if (!matches?.length) return null

  for (const raw of matches) {
    const normalized = normalizePhoneTR(raw)
    if (normalized) return normalized
  }
  return null
}
