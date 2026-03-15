/**
 * @file src/utils/statusHelpers.ts
 * @description Sipariş Durum Yönetimi - Merkezi Helper Fonksiyonlar
 */

import { PackageStatus } from '@/types'

// ============================================
// 📊 STATUS TANIMLARI
// ============================================

export const STATUS_CONFIG = {
  new_order: {
    code: 0,
    label: 'YENİ SİPARİŞ',
    labelShort: 'Yeni',
    color: 'blue',
    bgClass: 'bg-blue-600',
    textClass: 'text-blue-600',
    badgeClass: 'bg-blue-900/50 text-blue-300',
    description: 'Atama bekliyor'
  },
  assigned: {
    code: 1,
    label: 'ATANDI',
    labelShort: 'Atandı',
    color: 'purple',
    bgClass: 'bg-purple-600',
    textClass: 'text-purple-600',
    badgeClass: 'bg-purple-900/50 text-purple-300',
    description: 'Kurye atandı'
  },
  picking_up: {
    code: 2,
    label: 'ALINIYOR',
    labelShort: 'Alınıyor',
    color: 'orange',
    bgClass: 'bg-orange-600',
    textClass: 'text-orange-600',
    badgeClass: 'bg-orange-900/50 text-orange-300',
    description: 'Restorandan alınıyor'
  },
  on_the_way: {
    code: 3,
    label: 'YOLDA',
    labelShort: 'Yolda',
    color: 'yellow',
    bgClass: 'bg-yellow-600',
    textClass: 'text-yellow-600',
    badgeClass: 'bg-yellow-900/50 text-yellow-300',
    description: 'Teslimat yolunda'
  },
  delivered: {
    code: 4,
    label: 'TESLİM EDİLDİ',
    labelShort: 'Teslim',
    color: 'green',
    bgClass: 'bg-green-600',
    textClass: 'text-green-600',
    badgeClass: 'bg-green-900/50 text-green-300',
    description: 'Başarıyla teslim edildi'
  },
  cancelled: {
    code: 5,
    label: 'İPTAL EDİLDİ',
    labelShort: 'İptal',
    color: 'red',
    bgClass: 'bg-red-600',
    textClass: 'text-red-600',
    badgeClass: 'bg-red-900/50 text-red-300',
    description: 'Sipariş iptal edildi'
  }
} as const

// ============================================
// 🎨 STATUS BADGE COMPONENT
// ============================================

export function getStatusBadgeClass(status: PackageStatus): string {
  return STATUS_CONFIG[status]?.badgeClass || 'bg-gray-900/50 text-gray-300'
}

export function getStatusLabel(status: PackageStatus, short: boolean = false): string {
  const config = STATUS_CONFIG[status]
  if (!config) return status
  return short ? config.labelShort : config.label
}

export function getStatusColor(status: PackageStatus): string {
  return STATUS_CONFIG[status]?.color || 'gray'
}

export function getStatusBgClass(status: PackageStatus): string {
  return STATUS_CONFIG[status]?.bgClass || 'bg-gray-600'
}

export function getStatusTextClass(status: PackageStatus): string {
  return STATUS_CONFIG[status]?.textClass || 'text-gray-600'
}

// ============================================
// 🔄 STATUS DÖNÜŞÜM FONKSİYONLARI
// ============================================

// String status'u PackageStatus'a çevir
export function normalizeStatus(status: string | null | undefined): PackageStatus {
  // Eski 'waiting' değerini 'new_order'a çevir
  if (status === 'waiting' || status === 'pending') {
    return 'new_order'
  }
  
  // Geçerli status'leri kontrol et
  const validStatuses: PackageStatus[] = ['new_order', 'assigned', 'picking_up', 'on_the_way', 'delivered', 'cancelled']
  
  if (status && validStatuses.includes(status as PackageStatus)) {
    return status as PackageStatus
  }
  
  // Default: new_order
  return 'new_order'
}

// Status code'dan status string'e çevir
export function statusFromCode(code: number): PackageStatus {
  const entry = Object.entries(STATUS_CONFIG).find(([_, config]) => config.code === code)
  return (entry?.[0] as PackageStatus) || 'new_order'
}

// Status string'den code'a çevir
export function statusToCode(status: PackageStatus): number {
  return STATUS_CONFIG[status]?.code ?? 0
}

// ============================================
// ✅ STATUS DOĞRULAMA
// ============================================

export function isValidStatus(status: string | null | undefined): boolean {
  if (!status) return false
  const validStatuses: PackageStatus[] = ['new_order', 'assigned', 'picking_up', 'on_the_way', 'delivered', 'cancelled']
  return validStatuses.includes(status as PackageStatus)
}

export function isActiveStatus(status: PackageStatus): boolean {
  return status !== 'delivered' && status !== 'cancelled'
}

export function isCompletedStatus(status: PackageStatus): boolean {
  return status === 'delivered' || status === 'cancelled'
}

// ============================================
// 🔀 STATUS GEÇİŞ KURALLARI
// ============================================

export function canTransitionTo(currentStatus: PackageStatus, nextStatus: PackageStatus): boolean {
  const transitions: Record<PackageStatus, PackageStatus[]> = {
    new_order: ['assigned', 'cancelled'],
    assigned: ['picking_up', 'cancelled'],
    picking_up: ['on_the_way', 'cancelled'],
    on_the_way: ['delivered', 'cancelled'],
    delivered: [], // Teslim edildikten sonra değiştirilemez
    cancelled: [] // İptal edildikten sonra değiştirilemez
  }
  
  return transitions[currentStatus]?.includes(nextStatus) || false
}

export function getNextValidStatuses(currentStatus: PackageStatus): PackageStatus[] {
  const transitions: Record<PackageStatus, PackageStatus[]> = {
    new_order: ['assigned', 'cancelled'],
    assigned: ['picking_up', 'cancelled'],
    picking_up: ['on_the_way', 'cancelled'],
    on_the_way: ['delivered', 'cancelled'],
    delivered: [],
    cancelled: []
  }
  
  return transitions[currentStatus] || []
}

// ============================================
// 📊 STATUS İSTATİSTİKLERİ
// ============================================

export function getStatusPriority(status: PackageStatus): number {
  // Öncelik sırası (düşük numara = yüksek öncelik)
  const priorities: Record<PackageStatus, number> = {
    new_order: 1,      // En yüksek öncelik
    assigned: 2,
    picking_up: 3,
    on_the_way: 4,
    delivered: 5,
    cancelled: 6       // En düşük öncelik
  }
  
  return priorities[status] || 999
}

export function sortByStatusPriority<T extends { status: PackageStatus }>(packages: T[]): T[] {
  return [...packages].sort((a, b) => {
    const priorityA = getStatusPriority(a.status)
    const priorityB = getStatusPriority(b.status)
    return priorityA - priorityB
  })
}

// ============================================
// 🎯 STATUS FİLTRELEME
// ============================================

export function filterByStatus<T extends { status: PackageStatus }>(
  packages: T[],
  statuses: PackageStatus[]
): T[] {
  return packages.filter(pkg => statuses.includes(pkg.status))
}

export function filterActivePackages<T extends { status: PackageStatus }>(packages: T[]): T[] {
  return packages.filter(pkg => isActiveStatus(pkg.status))
}

export function filterCompletedPackages<T extends { status: PackageStatus }>(packages: T[]): T[] {
  return packages.filter(pkg => isCompletedStatus(pkg.status))
}

// ============================================
// 🔔 STATUS BİLDİRİMLERİ
// ============================================

export function getStatusChangeMessage(
  oldStatus: PackageStatus,
  newStatus: PackageStatus,
  orderNumber?: string
): string {
  const order = orderNumber ? `${orderNumber} numaralı sipariş` : 'Sipariş'
  
  const messages: Record<PackageStatus, string> = {
    new_order: `${order} sisteme eklendi`,
    assigned: `${order} kuryeye atandı`,
    picking_up: `${order} restorandan alınıyor`,
    on_the_way: `${order} teslimat yolunda`,
    delivered: `${order} başarıyla teslim edildi`,
    cancelled: `${order} iptal edildi`
  }
  
  return messages[newStatus] || `${order} durumu güncellendi`
}

// ============================================
// 🎨 STATUS BADGE REACT COMPONENT (String)
// ============================================

export function getStatusBadgeHTML(status: PackageStatus): string {
  const config = STATUS_CONFIG[status]
  if (!config) return `<span class="px-3 py-1 rounded-full text-sm font-semibold bg-gray-900/50 text-gray-300">${status}</span>`
  
  return `<span class="px-3 py-1 rounded-full text-sm font-semibold ${config.badgeClass}">${config.label}</span>`
}
