/**
 * iOS AppDelegate — FCM background / killed push için zorunlu native kurulum
 *
 * Bu dosya kurye_projesi içinde henüz `ios/` klasörü olmadığı için ŞABLON'dur.
 * Mac'te `npx cap add ios` sonrası içeriği şuraya kopyala:
 *   ios/App/App/AppDelegate.swift
 *
 * Ayrıca:
 * - GoogleService-Info.plist → ios/App/App/ (Xcode target: App)
 * - Podfile target 'App' → pod 'FirebaseMessaging'
 * - Xcode Capabilities → Push Notifications + Background Modes → Remote notifications
 *
 * Foreground banner: Capacitor PushNotifications plugin
 * capacitor.config.ts → presentationOptions: ["badge","sound","alert"]
 * ile yönetilir. Bu yüzden UNUserNotificationCenterDelegate / willPresent
 * burada EKLENMEDİ (çift yönetim / çakışma riski).
 */

import UIKit
import Capacitor
import FirebaseCore
import FirebaseMessaging

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

  var window: UIWindow?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    // Capacitor / diğer init'ten ÖNCE
    FirebaseApp.configure()
    return true
  }

  func application(
    _ application: UIApplication,
    didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
  ) {
    // APNs token'ı Firebase'e bağla → FCM.getToken() JS tarafında çalışabilsin
    Messaging.messaging().apnsToken = deviceToken
    NotificationCenter.default.post(
      name: .capacitorDidRegisterForRemoteNotifications,
      object: deviceToken
    )
  }

  func application(
    _ application: UIApplication,
    didFailToRegisterForRemoteNotificationsWithError error: Error
  ) {
    print("❌ APNs registration failed:", error.localizedDescription)
    NotificationCenter.default.post(
      name: .capacitorDidFailToRegisterForRemoteNotifications,
      object: error
    )
  }

  func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
    return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
  }

  func application(
    _ application: UIApplication,
    continue userActivity: NSUserActivity,
    restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
  ) -> Bool {
    return ApplicationDelegateProxy.shared.application(
      application,
      continue: userActivity,
      restorationHandler: restorationHandler
    )
  }
}
