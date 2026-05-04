package com.aldagel.mergen;

import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.util.Log;

import androidx.core.app.NotificationCompat;

import com.google.firebase.messaging.RemoteMessage;

import java.util.Map;

/**
 * Firebase Cloud Messaging Service
 * 
 * Arka planda ve ön planda gelen bildirimleri işler.
 * Data payload kullanarak bildirim garantisini sağlar.
 * Android 8+ üzerinde high importance kanalı ile heads-up bildirim gösterir.
 */
public class FirebaseMessagingService extends com.google.firebase.messaging.FirebaseMessagingService {
    private static final String TAG = "FCM_SERVICE";
    private static final String CHANNEL_ID = "mergen_high_priority";
    private static final int NOTIFICATION_ID = 1001;

    /**
     * Yeni FCM token alındığında çağrılır
     * Token değiştiğinde Supabase'e gönderilir
     */
    @Override
    public void onNewToken(String token) {
        super.onNewToken(token);
        Log.d(TAG, "🔄 Yeni FCM Token: " + token);
        
        // Token'ı Supabase'e gönder
        sendTokenToSupabase(token);
    }

    /**
     * Mesaj alındığında çağrılır (ön plan ve arka plan)
     * Data payload'ı işler ve bildirim gösterir
     */
    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        super.onMessageReceived(remoteMessage);
        
        Log.d(TAG, "📨 Mesaj alındı");
        Log.d(TAG, "From: " + remoteMessage.getFrom());
        
        // Data payload'ı al
        Map<String, String> data = remoteMessage.getData();
        
        if (!data.isEmpty()) {
            Log.d(TAG, "📦 Data Payload: " + data.toString());
            
            // Data payload'dan bildirim bilgilerini çıkar
            String title = data.getOrDefault("title", "Alda Gel");
            String body = data.getOrDefault("body", "Yeni sipariş var!");
            String courierIdStr = data.getOrDefault("courier_id", "");
            
            // Bildirim göster
            showNotification(title, body, courierIdStr);
        }
        
        // Notification payload'ı da kontrol et (opsiyonel)
        if (remoteMessage.getNotification() != null) {
            Log.d(TAG, "📢 Notification Payload:");
            Log.d(TAG, "Title: " + remoteMessage.getNotification().getTitle());
            Log.d(TAG, "Body: " + remoteMessage.getNotification().getBody());
        }
    }

    /**
     * Bildirim göster
     * Android 8+ üzerinde high importance kanalı kullanır
     */
    private void showNotification(String title, String body, String courierId) {
        Context context = getApplicationContext();
        
        // MainActivity'ye intent oluştur
        Intent intent = new Intent(context, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);
        if (!courierId.isEmpty()) {
            intent.putExtra("courier_id", courierId);
        }
        
        // PendingIntent oluştur (Android 12+ uyumlu)
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        PendingIntent pendingIntent = PendingIntent.getActivity(
            context,
            0,
            intent,
            flags
        );
        
        // Ses URL'si
        Uri soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
        
        // Bildirim oluştur
        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_info)  // Sistem ikonu kullan
            .setContentTitle(title)
            .setContentText(body)
            .setAutoCancel(true)
            .setSound(soundUri)
            .setVibrate(new long[]{0, 500, 200, 500})
            .setLights(0xFFFF6B00, 1000, 3000)  // Turuncu ışık
            .setPriority(NotificationCompat.PRIORITY_HIGH)  // Heads-up için
            .setCategory(NotificationCompat.CATEGORY_MESSAGE)
            .setContentIntent(pendingIntent);
        
        // Android 5.0+ üzerinde big text style ekle
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            builder.setStyle(new NotificationCompat.BigTextStyle().bigText(body));
        }
        
        // Bildirim göster
        NotificationManager notificationManager = 
            (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        
        if (notificationManager != null) {
            notificationManager.notify(NOTIFICATION_ID, builder.build());
            Log.d(TAG, "✅ Bildirim gösterildi: " + title);
        }
    }

    /**
     * FCM Token'ı Supabase'e gönder
     * Uygulama ilk kez yüklendiğinde veya token yenilendiğinde çağrılır
     */
    private void sendTokenToSupabase(String token) {
        // Bu işlem JavaScript tarafından yapılır
        // Capacitor plugin aracılığıyla token alınır ve Supabase'e gönderilir
        Log.d(TAG, "📤 Token Supabase'e gönderilecek: " + token);
        
        // Token, onNewToken() içinde JavaScript tarafına iletilir
        // JavaScript: PushNotifications.addListener('registration', ...) ile alır
    }
}
