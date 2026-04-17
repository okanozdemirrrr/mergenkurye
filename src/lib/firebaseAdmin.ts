/**
 * @file src/lib/firebaseAdmin.ts
 * @description Firebase Admin SDK Yapılandırması
 * 
 * Server-side'da FCM (Firebase Cloud Messaging) ile push notification göndermek için kullanılır.
 * 
 * KURULUM:
 * 1. Firebase Console → Project Settings → Service Accounts
 * 2. "Generate New Private Key" butonuna tıkla
 * 3. İndirilen JSON dosyasını projeye ekle (örn: firebase-service-account.json)
 * 4. .env.local dosyasına FIREBASE_SERVICE_ACCOUNT_KEY ekle
 */

import * as admin from 'firebase-admin'

// Singleton pattern - sadece bir kez initialize et
if (!admin.apps.length) {
  try {
    // Service account key'i environment variable'dan al
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY

    if (!serviceAccount) {
      console.warn('⚠️ FIREBASE_SERVICE_ACCOUNT_KEY bulunamadı. Push notifications çalışmayacak.')
    } else {
      // JSON string'i parse et
      const serviceAccountObj = JSON.parse(serviceAccount)

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccountObj),
        projectId: serviceAccountObj.project_id
      })

      console.log('✅ Firebase Admin SDK başlatıldı')
    }
  } catch (error) {
    console.error('❌ Firebase Admin SDK başlatma hatası:', error)
  }
}

export const firebaseAdmin = admin
export const messaging = admin.messaging
