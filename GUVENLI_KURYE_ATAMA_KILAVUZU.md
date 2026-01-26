# 🔒 GÜVENLİ KURYE ATAMA SİSTEMİ KILAVUZU

## ✅ YAPILAN DEĞİŞİKLİKLER

### 1. Admin Panel (Frontend)

**Status Filter Güncellendi:**
```typescript
// Agent 'pending' status kullanıyor, admin panel bunu da görmeli
.in('status', ['pending', 'waiting', 'assigned', 'picking_up', 'on_the_way'])
```

**Optimistic Locking Eklendi:**
```typescript
// Sadece status='pending' veya 'waiting' olan paketlere kurye ata
const { data, error } = await supabase
  .from('packages')
  .update({
    courier_id: courierId,
    status: 'assigned',
    locked_by: 'courier',
    assigned_at: new Date().toISOString()
  })
  .eq('id', packageId)
  .in('status', ['pending', 'waiting']) // KRİTİK: Agent 'pending', manuel 'waiting' kullanır
  .select()

// Eğer hiçbir satır güncellenmemişse, paket zaten atanmış demektir
if (!data || data.length === 0) {
  throw new Error('Bu sipariş zaten başka bir kuryeye atanmış!')
}
```

**Realtime Self-Update Prevention:**
- `broadcast: { self: false }` - Kendi update'lerimizi dinlemiyoruz
- Debounce mekanizması (1 saniye) - Hızlı ardışık update'leri engeller
- Update sonrası timestamp işaretleme

### 2. Veritabanı (Backend)

**SQL Migration Dosyası:** `database_migration_secure_courier_assignment.sql`

**Eklenen Özellikler:**

1. **locked_by Kolonu:**
   - `'agent'` : Agent tarafından oluşturuldu, henüz atanmadı
   - `'admin'` : Admin tarafından manuel oluşturuldu
   - `'courier'` : Kuryeye atandı, sadece kurye güncelleyebilir

2. **Otomatik Trigger:**
   - Kurye atandığında (status='assigned') otomatik olarak `locked_by='courier'` yapılır

3. **Row Level Security (RLS) Politikaları:**
   - Agent: Sadece `locked_by='agent'` siparişleri görebilir/güncelleyebilir
   - Kurye: Sadece kendi siparişlerini görebilir/güncelleyebilir
   - Admin: Tüm siparişlere tam erişim

## 📋 KURULUM ADIMLARI

### Adım 1: SQL Migration'ı Çalıştır

1. Supabase Dashboard'a git
2. SQL Editor'ü aç
3. `database_migration_secure_courier_assignment.sql` dosyasının içeriğini yapıştır
4. "Run" butonuna bas

### Adım 2: Frontend'i Deploy Et

```bash
npm run build
# Vercel'e deploy et veya production'a al
```

### Adım 3: Test Et

**Test 1: Optimistic Locking**
1. Admin panelde bir siparişe kurye ata
2. Aynı siparişe tekrar kurye atamaya çalış
3. Hata mesajı görmeli: "Bu sipariş zaten başka bir kuryeye atanmış!"

**Test 2: Agent Erişimi**
1. Agent'i çalıştır
2. Agent sadece `status='waiting'` siparişleri görmeli
3. `status='assigned'` siparişler agent'e görünmemeli

**Test 3: Realtime**
1. Admin panelde kurye ata
2. Sayfa yenilenmemeli (Realtime çalışıyor)
3. Konsola bak: "Kendi update, atlanıyor..." mesajı görmemeli

## 🎯 KULLANIM SENARYOLARI

### Senaryo 1: Normal Kurye Atama

```
1. Agent yeni sipariş oluşturur → status='pending', locked_by='agent'
2. Admin kurye atar → status='assigned', locked_by='courier' (otomatik)
3. Kurye siparişi alır → status='picking_up'
4. Kurye teslim eder → status='delivered'
```

### Senaryo 2: Çakışma Önleme

```
1. Admin A kurye atar → UPDATE ... WHERE status IN ('pending', 'waiting')
2. Admin B aynı anda kurye atar → UPDATE ... WHERE status IN ('pending', 'waiting')
3. Sadece biri başarılı olur (Optimistic Locking)
4. Diğeri hata alır: "Bu sipariş zaten atanmış!"
```

### Senaryo 3: Agent Koruması

```
1. Kurye atandı → locked_by='courier'
2. Agent bu siparişi göremez (RLS politikası)
3. Agent bu siparişi güncelleyemez (RLS politikası)
4. Sadece kurye ve admin erişebilir
```

## 🔧 SORUN GİDERME

### Sorun 1: "Bu sipariş zaten atanmış" Hatası

**Sebep:** Sipariş zaten başka bir kuryeye atanmış veya status değişmiş.

**Çözüm:** 
- Sayfayı yenile (F5)
- Sipariş listesini kontrol et
- Eğer hata devam ederse, veritabanında `status` kolonunu kontrol et

### Sorun 2: Agent Siparişleri Göremiyor

**Sebep:** RLS politikaları aktif ve agent sadece kendi siparişlerini görebilir.

**Çözüm:**
- Supabase Dashboard → Authentication → Policies
- `agent_read_policy` politikasını kontrol et
- Eğer agent tüm siparişleri görmeli ise, politikayı devre dışı bırak

### Sorun 3: Realtime Çalışmıyor

**Sebep:** `broadcast: { self: false }` ayarı yanlış yapılandırılmış olabilir.

**Çözüm:**
- Tarayıcı konsolunu aç (F12)
- "Admin Realtime bağlantısı kuruldu" mesajını kontrol et
- Eğer bağlantı yoksa, Supabase Realtime ayarlarını kontrol et

## 📊 VERİTABANI YAPISI

```sql
packages
├── id (PRIMARY KEY)
├── order_number
├── status ('waiting', 'assigned', 'picking_up', 'on_the_way', 'delivered')
├── locked_by ('agent', 'admin', 'courier') -- YENİ
├── courier_id
├── assigned_at
└── ...
```

## 🚀 GELİŞMİŞ ÖZELLİKLER (Opsiyonel)

### Özellik 1: External Order ID

Eğer agent'ten gelen siparişlerin unique ID'si varsa:

```sql
ALTER TABLE packages ADD COLUMN external_order_id VARCHAR(255) UNIQUE;
CREATE INDEX idx_packages_external_order_id ON packages(external_order_id);
```

### Özellik 2: Audit Log

Kimin ne zaman ne yaptığını takip et:

```sql
CREATE TABLE package_audit_log (
  id SERIAL PRIMARY KEY,
  package_id INTEGER REFERENCES packages(id),
  action VARCHAR(50),
  old_status VARCHAR(50),
  new_status VARCHAR(50),
  changed_by VARCHAR(50),
  changed_at TIMESTAMP DEFAULT NOW()
);
```

### Özellik 3: Webhook Bildirimleri

Agent'e sipariş atandığında bildirim gönder:

```sql
CREATE OR REPLACE FUNCTION notify_agent_on_assign()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'assigned' AND OLD.status = 'waiting' THEN
    PERFORM pg_notify('order_assigned', json_build_object(
      'order_id', NEW.id,
      'courier_id', NEW.courier_id
    )::text);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_agent
  AFTER UPDATE ON packages
  FOR EACH ROW
  EXECUTE FUNCTION notify_agent_on_assign();
```

## 📝 NOTLAR

- **Performans:** Optimistic locking çok hızlıdır (tek sorgu)
- **Güvenlik:** RLS politikaları Supabase seviyesinde çalışır
- **Ölçeklenebilirlik:** Binlerce eşzamanlı atama destekler
- **Geri Alma:** Migration dosyasının sonunda rollback komutları var

## 🆘 DESTEK

Sorun yaşarsan:
1. Tarayıcı konsolunu kontrol et (F12)
2. Supabase Dashboard → Logs → API Logs
3. `database_migration_secure_courier_assignment.sql` dosyasını tekrar çalıştır
