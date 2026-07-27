/**
 * Türkiye cep telefonunu tek forma çevirir: 0 + 10 hane (örn. 05050591629).
 * Geçersiz / yetersiz girdide null döner.
 */
export function normalizePhoneTR(phone: string): string | null {
  if (!phone?.trim()) return null

  let digits = phone.replace(/\D/g, '')
  if (!digits) return null

  // 905050591629 → 05050591629
  if (digits.startsWith('90') && digits.length >= 12) {
    digits = '0' + digits.slice(2)
  }
  // 5050591629 → 05050591629
  else if (digits.length === 10 && digits.startsWith('5')) {
    digits = '0' + digits
  }

  // Hedef: 05xxxxxxxxx (11 hane, 0 ile başlar, ikinci hane 5)
  if (digits.length === 11 && digits.startsWith('05')) {
    return digits
  }

  return null
}
