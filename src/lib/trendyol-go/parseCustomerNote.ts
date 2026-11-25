import type { ParsedCustomerNote } from './types'

/** Türkçe İ/ı → ASCII i (regex /i ile U+0130 sorunlu) */
function foldTr(s: string): string {
  return s.replace(/İ/g, 'I').replace(/ı/g, 'i').toLowerCase()
}

const SERVIS_ISTIYORUM = /servis\s+istiyorum/
const SERVIS_ISTEMIYORUM = /servis\s+istemiyorum/

/**
 * customerNote: "restoran:... kurye:... - Servis İstiyorum"
 * Önek yoksa tüm metin genel not.
 */
export function parseCustomerNote(raw: string | null | undefined): ParsedCustomerNote {
  const ham = (raw ?? '').trim()
  if (!ham) {
    return {
      mutfakNotu: null,
      kuryeNotu: null,
      genelNot: null,
      servisIstiyorMu: null,
      ham: '',
    }
  }

  const folded = foldTr(ham)
  let servisIstiyorMu: boolean | null = null
  if (SERVIS_ISTIYORUM.test(folded)) servisIstiyorMu = true
  else if (SERVIS_ISTEMIYORUM.test(folded)) servisIstiyorMu = false

  const lower = folded
  const hasRestoran = /(?:^|\n|\s)restoran\s*:/i.test(ham)
  const hasKurye = /(?:^|\n|\s)kurye\s*:/i.test(ham)

  if (!hasRestoran && !hasKurye) {
    return {
      mutfakNotu: null,
      kuryeNotu: null,
      genelNot: ham,
      servisIstiyorMu,
      ham,
    }
  }

  let mutfakNotu: string | null = null
  let kuryeNotu: string | null = null

  try {
    const restoranIdx = lower.search(/restoran\s*:/)
    const kuryeIdx = lower.search(/kurye\s*:/)

    if (restoranIdx >= 0) {
      const after = ham.slice(restoranIdx).replace(/^restoran\s*:/i, '')
      if (kuryeIdx > restoranIdx) {
        const kuryeRel = after.toLowerCase().search(/kurye\s*:/)
        mutfakNotu = (kuryeRel >= 0 ? after.slice(0, kuryeRel) : after).trim()
      } else {
        mutfakNotu = stripServisSuffix(after).trim() || null
      }
    }

    if (kuryeIdx >= 0) {
      const after = ham.slice(kuryeIdx).replace(/^kurye\s*:/i, '')
      kuryeNotu = stripServisSuffix(after).trim() || null
    }

    return {
      mutfakNotu: mutfakNotu || null,
      kuryeNotu: kuryeNotu || null,
      genelNot: null,
      servisIstiyorMu,
      ham,
    }
  } catch {
    return {
      mutfakNotu: null,
      kuryeNotu: null,
      genelNot: ham,
      servisIstiyorMu,
      ham,
    }
  }
}

function stripServisSuffix(text: string): string {
  // Ham metinde Türkçe İ kalabilir — karakter sınıfı ile yakala
  return text
    .replace(/[-–—]?\s*[Ss]ervis\s+[İIiı]st(e)?miyorum\s*$/u, '')
    .replace(/[-–—]?\s*[Ss]ervis\s+[İIiı]stiyorum\s*$/u, '')
    .trim()
}
