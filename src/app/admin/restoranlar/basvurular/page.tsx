/**
 * @file src/app/admin/restoranlar/basvurular/page.tsx
 * @description Restoran Başvuruları Sayfası
 */
'use client'

import { ApplicationsTab } from '../../components/ApplicationsTab'
import { useAdminData } from '../../AdminDataProvider'

export default function RestoranBasvurularPage() {
  const { setSuccessMessage, setErrorMessage } = useAdminData()

  return (
    <ApplicationsTab
      type="restoran"
      onSuccess={(msg) => {
        setSuccessMessage(msg)
        setTimeout(() => setSuccessMessage(''), 3000)
      }}
      onError={(msg) => {
        setErrorMessage(msg)
        setTimeout(() => setErrorMessage(''), 3000)
      }}
    />
  )
}
