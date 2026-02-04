/**
 * @file src/app/admin/components/tabs/ManagementView.tsx
 * @description Kurye ve Restoran Yönetimi Görünümü (Placeholder)
 * AŞAMA 1: Şimdilik inline component'leri kullanıyor
 * TODO: Sonraki aşamada CouriersTab ve RestaurantsTab'i de ayrı dosyalara taşı
 */

interface ManagementViewProps {
  activeTab: 'couriers' | 'restaurants'
  CouriersTabComponent: () => JSX.Element
  RestaurantsTabComponent: () => JSX.Element
}

export function ManagementView({
  activeTab,
  CouriersTabComponent,
  RestaurantsTabComponent
}: ManagementViewProps) {
  return (
    <>
      {activeTab === 'couriers' && <CouriersTabComponent />}
      {activeTab === 'restaurants' && <RestaurantsTabComponent />}
    </>
  )
}
