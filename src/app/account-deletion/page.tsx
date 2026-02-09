/**
 * @file src/app/account-deletion/page.tsx
 * @description Account Deletion Request Page - Google Play Console Requirement (English)
 */
'use client'

export default function AccountDeletionPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      <div className="bg-slate-900 p-8 md:p-12 rounded-2xl border border-slate-800 w-full max-w-2xl">
        {/* Logo */}
        <div className="text-center mb-8">
          <img src="/logo.png" alt="Mergen Kurye Logo" className="w-32 h-32 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-white mb-2">Account Deletion Request</h1>
          <p className="text-slate-400 text-sm">Mergen Kurye System</p>
        </div>

        {/* Content */}
        <div className="space-y-6 text-slate-300">
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">📧 Account Deletion Procedure</h2>
            <p className="mb-4 leading-relaxed">
              If you wish to delete your account from the Mergen Kurye system, please send your 
              account deletion request to the following email address:
            </p>
            <div className="bg-slate-900 border border-slate-600 rounded-lg p-4 mb-4">
              <a 
                href="mailto:ozdemiribrahimokan@gmail.com?subject=Mergen Kurye - Account Deletion Request"
                className="text-orange-400 hover:text-orange-300 font-medium text-lg transition-colors"
              >
                ozdemiribrahimokan@gmail.com
              </a>
            </div>
            <p className="text-sm text-slate-400">
              Please include your registered phone number or username in your email.
            </p>
          </div>

          <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-red-300 mb-4">⚠️ Important Notice</h2>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-1">•</span>
                <span>
                  After your request, all your personal data and order history will be permanently 
                  deleted <strong className="text-white">within 7 business days</strong>.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-1">•</span>
                <span>
                  Once your account is deleted, this action <strong className="text-white">cannot be undone</strong>.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-1">•</span>
                <span>
                  If you have pending payments or active orders, the account deletion process 
                  may be delayed until they are completed.
                </span>
              </li>
            </ul>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">🔒 Data to be Deleted</h2>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                <span>Personal information (name, phone, email)</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                <span>Order history</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                <span>Payment records</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                <span>Location history</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                <span>Account settings</span>
              </li>
            </ul>
          </div>

          <div className="text-center pt-4">
            <a 
              href="/"
              className="inline-block px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
            >
              ← Back to Home
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-slate-800 text-center text-slate-500 text-xs">
          <p>© 2026 Mergen Teknoloji - All rights reserved</p>
          <p className="mt-2">
            For questions:{' '}
            <a 
              href="mailto:ozdemiribrahimokan@gmail.com" 
              className="text-orange-400 hover:text-orange-300 transition-colors"
            >
              ozdemiribrahimokan@gmail.com
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
