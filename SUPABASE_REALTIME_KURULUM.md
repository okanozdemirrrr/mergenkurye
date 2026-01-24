# 🔴 SUPABASE REALTIME KURULUM KILAVUZU

## ⚠️ ÖNEMLİ: Realtime Çalışmıyorsa Bu Adımları Takip Edin

Panellerde veriler otomatik güncellenmiyor mu? Supabase Dashboard'da Realtime'ı aktifleştirmeniz gerekiyor.

## 📋 Adım Adım Kurulum

### 1. Supabase Dashboard'a Giriş Yapın
- https://supabase.com adresine gidin
- Projenizi seçin

### 2. Database Replication Ayarlarına Gidin
```
Dashboard → Database → Replication
```

### 3. Tabloları Realtime için Aktifleştirin

Aşağıdaki tabloların yanındaki **kutucukları işaretleyin**:

- ✅ **packages** (Paketler - EN ÖNEMLİ!)
- ✅ **couriers** (Kuryeler)
- ✅ **restaurants** (Restoranlar)
- ✅ **courier_debts** (Kurye Borçları - opsiyonel)
- ✅ **restaurant_debts** (Restoran Borçları - opsiyonel)

### 4. Değişiklikleri Kaydedin
- "Save" veya "Apply" butonuna tıklayın
- Birkaç saniye bekleyin

### 5. Test Edin
1. Admin panelinde yeni bir paket oluşturun
2. Kurye panelini açın (yenileme yapmadan)
3. Paket otomatik olarak görünmeli

## 🔍 Realtime Çalışıyor mu Kontrol Edin

Tarayıcı konsolunda şu mesajları görmelisiniz:

```
🔴 Admin Realtime dinleme başlatıldı
📦 Paket değişikliği algılandı: INSERT
📦 Paket güncellendi
```

## ❌ Sorun Devam Ediyorsa

1. **Tarayıcı konsolunu kontrol edin**
   - F12 tuşuna basın
   - Console sekmesine gidin
   - Realtime hata mesajları var mı?

2. **Supabase API Key'i kontrol edin**
   - `.env.local` dosyasında doğru key'ler var mı?
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` doğru mu?

3. **RLS (Row Level Security) Politikalarını Kontrol Edin**
   - Dashboard → Authentication → Policies
   - Tablolarda SELECT, INSERT, UPDATE izinleri var mı?

## 📝 Kod Tarafında Zaten Hazır

Tüm panellerde Realtime subscription'lar kurulu:

- **Admin Panel**: packages, couriers, restaurants tablolarını dinliyor
- **Kurye Panel**: Kendi paketlerini ve durumunu dinliyor
- **Restoran Panel**: Kendi paketlerini dinliyor

Sadece Supabase Dashboard'da aktifleştirmeniz yeterli!

## 🎯 Beklenen Davranış

- ✅ Yeni paket eklendiğinde → Tüm paneller otomatik güncellenir
- ✅ Paket durumu değiştiğinde → İlgili paneller güncellenir
- ✅ Kurye durumu değiştiğinde → Admin paneli güncellenir
- ❌ Sayfa yenilenmez (window.location.reload YOK!)
- ❌ Kullanıcı scroll pozisyonunu kaybetmez

## 🚀 Performans

- Realtime sadece değişen verileri çeker
- Gereksiz API çağrısı yok
- Anlık güncelleme (< 1 saniye)
