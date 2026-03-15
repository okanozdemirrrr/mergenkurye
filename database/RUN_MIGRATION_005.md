# 🚀 Migration 005 Çalıştırma Talimatları

## Adım 1: Supabase SQL Editor'ü Aç

1. https://supabase.com/dashboard adresine git
2. Projenizi seçin (otrjbpwirwgrxmezyuwg)
3. Sol menüden "SQL Editor" sekmesine tıklayın
4. "New query" butonuna tıklayın

## Adım 2: Migration SQL'ini Kopyala

`database/migrations/005_ready_status_system.sql` dosyasının tamamını kopyalayın.

## Adım 3: SQL'i Çalıştır

1. Kopyaladığınız SQL'i SQL Editor'e yapıştırın
2. Sağ alttaki "Run" butonuna tıklayın
3. Başarılı mesajını bekleyin

## Adım 4: Realtime Ayarlarını Kontrol Et

1. Sol menüden "Database" → "Replication" sekmesine gidin
2. Şu tabloların işaretli olduğundan emin olun:
   - ✅ packages
   - ✅ products
   - ✅ restaurants
   - ✅ categories

## Adım 5: Test Et

### Test 1: Restoran Paneli
```
1. http://localhost:3000/restoran adresine git
2. Giriş yap (Örn: Öküz Burger / 123456)
3. Sol menüde "Menü Yönetimi" sekmesini gör
4. Minimum sepet tutarını değiştir
5. Yeni ürün ekle
```

### Test 2: Sipariş Akışı
```
1. Müşteri panelinden sipariş ver
2. Restoran panelinde "Yeni Siparişler" bölümünde gör
3. "Teslimata Hazır" butonuna bas
4. Admin panelinde kurye atama listesinde gör
```

## Adım 6: Mevcut Verileri Temizle (Opsiyonel)

Eğer test verileri varsa ve temizlemek istiyorsanız:

```sql
-- Tüm 'waiting' statuslerini 'new_order'a çevir
UPDATE packages 
SET status = 'new_order' 
WHERE status = 'waiting';

-- Veya tüm test siparişlerini sil
DELETE FROM packages WHERE created_at < NOW() - INTERVAL '1 day';
```

## ✅ Başarı Kriterleri

Migration başarılı olduysa:
- [ ] `packages` tablosunda `ready_at` sütunu var
- [ ] `products` tablosunda `is_available` sütunu var
- [ ] `restaurants` tablosunda `minimum_order_value` sütunu var
- [ ] Status constraint 'ready' değerini kabul ediyor
- [ ] Restoran panelinde "Menü Yönetimi" sekmesi görünüyor
- [ ] Admin panelinde sadece ready siparişler kurye atama listesinde

## 🆘 Sorun Giderme

### Hata: "constraint packages_status_check already exists"
**Çözüm:** Migration zaten çalıştırılmış. Adım 4'e geç.

### Hata: "column ready_at already exists"
**Çözüm:** Migration zaten çalıştırılmış. Adım 4'e geç.

### Hata: "permission denied"
**Çözüm:** Supabase Dashboard'da "postgres" kullanıcısı ile giriş yaptığınızdan emin olun.

## 📞 Destek

Sorun yaşarsanız:
1. Supabase Dashboard → Logs sekmesini kontrol edin
2. Browser Console'u açın (F12)
3. Hata mesajlarını kaydedin
