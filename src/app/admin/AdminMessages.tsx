/**
 * @file src/app/admin/AdminMessages.tsx
 * @description Admin Panel için merkezi mesaj gösterimi (Toast benzeri)
 */
'use client'

import { useAdminData } from './AdminDataProvider'
import { useEffect } from 'react'

export function AdminMessages() {
  const { successMessage, errorMessage, setSuccessMessage, setErrorMessage } = useAdminData()

  // Auto-dismiss messages
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 5000)
      return () => clearTimeout(timer)
    }
  }, [successMessage, setSuccessMessage])

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(''), 8000)
      return () => clearTimeout(timer)
    }
  }, [errorMessage, setErrorMessage])

  if (!successMessage && !errorMessage) return null

  return (
    <div className="fixed top-4 right-4 z-[100] space-y-2 max-w-md">
      {/* Success Message */}
      {successMessage && (
        <div className="bg-emerald-900/95 border-2 border-emerald-500 text-emerald-100 px-6 py-4 rounded-xl shadow-2xl shadow-emerald-900/50 backdrop-blur-sm animate-slide-in-right">
          <div className="flex items-start gap-3">
            <div className="text-2xl">✅</div>
            <div className="flex-1">
              <p className="font-bold text-sm">{successMessage}</p>
            </div>
            <button
              onClick={() => setSuccessMessage('')}
              className="text-emerald-300 hover:text-white transition-colors text-xl leading-none"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="bg-rose-900/95 border-2 border-rose-500 text-rose-100 px-6 py-4 rounded-xl shadow-2xl shadow-rose-900/50 backdrop-blur-sm animate-slide-in-right">
          <div className="flex items-start gap-3">
            <div className="text-2xl">❌</div>
            <div className="flex-1">
              <p className="font-bold text-sm whitespace-pre-wrap">{errorMessage}</p>
            </div>
            <button
              onClick={() => setErrorMessage('')}
              className="text-rose-300 hover:text-white transition-colors text-xl leading-none"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
