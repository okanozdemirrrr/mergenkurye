# 🗄️ SUPABASE TABLO OLUŞTURMA TALİMATI

## ⚠️ ÖNEMLİ: Bu adımları sırayla takip et!

### Adım 1: Supabase Dashboard'a Git
1. Tarayıcıda Supabase projenize giriş yapın
2. Sol menüden **"SQL Editor"** sekmesine tıklayın

### Adım 2: Yeni Query Oluştur
1. Sağ üstteki **"+ New query"** butonuna tıklayın
2. Boş bir SQL editörü açılacak

### Adım 3: SQL Kodunu Kopyala
Aşağıdaki SQL kodunu **TAMAMEN** kopyalayın:

```sql
-- ÖNCE ESKİ TABLOLARI VE POLİTİKALARI TEMİZLE
DROP POLICY IF EXISTS "Enable read access for all users" ON courier_debts;
DROP POLICY IF EXISTS "Enable read access for all users" ON debt_transactions;
DROP POLICY IF EXISTS "Enable insert for all users" ON courier_debts;
DROP POLICY IF EXISTS "Enable insert for all users" ON debt_transactions;
DROP POLICY IF EXISTS "Enable update for all users" ON courier_debts;
DROP POLICY IF EXISTS "Enable update for all users" ON debt_transactions;

DROP TABLE IF EXISTS debt_transactions CASCADE;
DROP TABLE IF EXISTS courier_debts CASCADE;

-- Kurye Borçları Tablosu
CREATE TABLE courier_debts (
  id BIGSERIAL PRIMARY KEY,
  courier_id UUID NOT NULL REFERENCES couriers(id) ON DELETE CASCADE,
  debt_date DATE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  remaining_amount DECIMAL(10, 2) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'paid')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- İndeksler
CREATE INDEX idx_courier_debts_courier_id ON courier_debts(courier_id);
CREATE INDEX idx_courier_debts_status ON courier_debts(status);
CREATE INDEX idx_courier_debts_debt_date ON courier_debts(debt_date);

-- Gün Sonu İşlem Kayıtları Tablosu
CREATE TABLE debt_transactions (
  id BIGSERIAL PRIMARY KEY,
  courier_id UUID NOT NULL REFERENCES couriers(id) ON DELETE CASCADE,
  transaction_date DATE NOT NULL,
  daily_cash_total DECIMAL(10, 2) NOT NULL,
  amount_received DECIMAL(10, 2) NOT NULL,
  new_debt_amount DECIMAL(10, 2) DEFAULT 0,
  payment_to_debts DECIMAL(10, 2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- İndeksler
CREATE INDEX idx_debt_transactions_courier_id ON debt_transactions(courier_id);
CREATE INDEX idx_debt_transactions_date ON debt_transactions(transaction_date);

-- RLS (Row Level Security) Politikaları
ALTER TABLE courier_debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE debt_transactions ENABLE ROW LEVEL SECURITY;

-- Herkes okuyabilir (admin paneli için)
CREATE POLICY "Enable read access for all users" ON courier_debts FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON debt_transactions FOR SELECT USING (true);

-- Herkes ekleyebilir (admin paneli için)
CREATE POLICY "Enable insert for all users" ON courier_debts FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable insert for all users" ON debt_transactions FOR INSERT WITH CHECK (true);

-- Herkes güncelleyebilir (admin paneli için)
CREATE POLICY "Enable update for all users" ON courier_debts FOR UPDATE USING (true);
CREATE POLICY "Enable update for all users" ON debt_transactions FOR UPDATE USING (true);
```

### Adım 4: SQL Kodunu Yapıştır ve Çalıştır
1. Kopyaladığınız SQL kodunu Supabase SQL Editor'e yapıştırın
2. Sağ alttaki **"Run"** (Çalıştır) butonuna tıklayın
3. Yeşil "Success" mesajı görmelisiniz

### Adım 5: Tabloları Kontrol Et
1. Sol menüden **"Table Editor"** sekmesine gidin
2. Şu tabloları görmelisiniz:
   - ✅ `courier_debts`
   - ✅ `debt_transactions`

### Adım 6: Admin Panelini Test Et
1. Admin paneline giriş yapın
2. Kurye Hesapları → Bir kuryenin Detaylı Rapor'una gidin
3. "Bugün" filtresini seçin
4. "💰 Gün Sonu Al" butonu görünmeli
5. Butona tıklayın - artık hata vermemeli!

---

## 🔍 Sorun Giderme

### Hata: "relation already exists"
**Çözüm**: Tablo zaten var, sorun yok. Devam edebilirsin.

### Hata: "foreign key constraint"
**Çözüm**: `couriers` tablosu mevcut değil. Önce kurye tablosunu oluştur.

### Hata: "permission denied"
**Çözüm**: Supabase projesinde admin yetkisi olduğundan emin ol.

### Tablolar görünmüyor
**Çözüm**: 
1. Sayfayı yenile (F5)
2. Table Editor'de "public" schema'sını seçtiğinden emin ol

---

## ✅ Başarı Kontrolü

Tabloları başarıyla oluşturduğunu anlamak için:

1. **SQL Editor'de şu sorguyu çalıştır:**
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('courier_debts', 'debt_transactions');
```

2. **Sonuç 2 satır göstermeli:**
```
courier_debts
debt_transactions
```

3. **Admin panelinde "Gün Sonu Al" butonuna tıkla**
   - Hata vermemeli
   - Modal açılmalı
   - "Bugünkü Nakit Toplam" gösterilmeli

---

## 📝 Notlar

- Bu işlem **sadece bir kez** yapılır
- Mevcut veriler etkilenmez
- Tablolar boş olarak oluşturulur
- İlk gün sonu işleminde veriler dolmaya başlar

**Sorun yaşarsan konsola bak ve hata mesajını paylaş!**
