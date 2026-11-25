// Platform Badge Utility
// Platforma göre renk ve stil döndürür
// TGO appName: Galaxy → Getir rozeti; Trendyol / TrendyolGo → Trendyol

type PlatformBadgeInput = {
  platform?: string | null
  trendyol_app_name?: string | null
}

function resolveBadgeKey(input?: string | PlatformBadgeInput | null): string {
  if (!input) return ''
  if (typeof input === 'string') return input.toLowerCase()
  const app = (input.trendyol_app_name || '').toLowerCase()
  if (app === 'galaxy') return 'getir'
  if (app === 'trendyol' || app === 'trendyolgo') return 'trendyol'
  return (input.platform || '').toLowerCase()
}

export function getPlatformBadgeClass(
  platform?: string | PlatformBadgeInput | null
): string {
  const platformLower = resolveBadgeKey(platform)

  if (!platformLower) {
    return 'bg-slate-700 text-slate-300'
  }

  if (platformLower.includes('trendyol')) {
    return 'bg-orange-500/20 text-orange-500'
  }

  if (platformLower.includes('getir')) {
    return 'bg-purple-500/20 text-purple-500'
  }

  if (platformLower.includes('yemeksepeti')) {
    return 'bg-red-500/20 text-red-500'
  }

  if (platformLower.includes('migros')) {
    return 'bg-yellow-500/20 text-yellow-500'
  }

  return 'bg-slate-700 text-slate-300'
}

export function getPlatformDisplayName(
  platform?: string | PlatformBadgeInput | null
): string {
  if (!platform) {
    return 'Diğer'
  }

  if (typeof platform !== 'string') {
    const app = (platform.trendyol_app_name || '').toLowerCase()
    if (app === 'galaxy') return 'Getir'
    if (app === 'trendyol' || app === 'trendyolgo') return 'Trendyol'
  }

  const platformLower = resolveBadgeKey(platform)

  if (platformLower.includes('trendyol')) {
    return 'Trendyol'
  }

  if (platformLower.includes('getir')) {
    return 'Getir'
  }

  if (platformLower.includes('yemeksepeti')) {
    return 'Yemeksepeti'
  }

  if (platformLower.includes('migros')) {
    return 'Migros'
  }

  const raw = typeof platform === 'string' ? platform : platform.platform || ''
  if (!raw) return 'Diğer'
  return raw.charAt(0).toUpperCase() + raw.slice(1)
}
