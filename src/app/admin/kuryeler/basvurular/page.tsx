/**
 * @file src/app/admin/kuryeler/basvurular/page.tsx
 * @description Kurye Başvuruları Sayfası
 */
'use client'

import { ApplicationsTab } from '../../components/ApplicationsTab'
import { useAdminData } from '../../AdminDataProvider'

export default function KuryeBasvurularPage() {
  const { setSuccessMessage, setErrorMessage } = useAdminData()

  return (
    <ApplicationsTab
      type="kurye"
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
