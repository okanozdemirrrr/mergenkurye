// Platform Badge Utility
// Platforma göre renk ve stil döndürür

export function getPlatformBadgeClass(platform?: string): string {
  if (!platform) {
    return 'bg-slate-700 text-slate-300'
  }
  
  const platformLower = platform.toLowerCase()
  
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

export function getPlatformDisplayName(platform?: string): string {
  if (!platform) {
    return 'Diğer'
  }
  
  const platformLower = platform.toLowerCase()
  
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
  
  return platform.charAt(0).toUpperCase() + platform.slice(1)
}
