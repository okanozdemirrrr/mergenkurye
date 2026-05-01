package com.aldagel.mergen;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Display cutout desteği
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            getWindow().getAttributes().layoutInDisplayCutoutMode =
                android.view.WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
        }

        // Android 8.0+ (API 26+) için Bildirim Kanalı oluştur
        // Bu NATIVE tarafta yapılır — JavaScript başlamadan önce kanal hazır olur
        // Kanal yoksa FCM arka plan bildirimleri SES ÇALMADAN ve HEADS-UP GÖSTERMEDEN gelir
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            createNotificationChannel();
        }
    }

    private void createNotificationChannel() {
        String channelId = "mergen_high_priority";
        String channelName = "Acil Siparişler";
        String channelDesc = "Yeni sipariş bildirimleri — ses ve titreşim ile";

        NotificationChannel channel = new NotificationChannel(
            channelId,
            channelName,
            NotificationManager.IMPORTANCE_HIGH  // Heads-up (yukarıdan düşen) bildirim için ŞART
        );

        channel.setDescription(channelDesc);
        channel.enableVibration(true);
        channel.setVibrationPattern(new long[]{0, 500, 200, 500});
        channel.enableLights(true);
        channel.setLightColor(Color.parseColor("#FF6B00"));  // Alda Gel turuncu
        channel.setShowBadge(true);
        channel.setLockscreenVisibility(
            android.app.Notification.VISIBILITY_PUBLIC  // Kilit ekranında tam içerik göster
        );

        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager != null) {
            manager.createNotificationChannel(channel);
        }
    }
}
