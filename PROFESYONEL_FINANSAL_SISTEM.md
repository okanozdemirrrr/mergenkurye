# 💼 MERGEN KURYE PROFESYONEL FİNANSAL SİSTEM

## 🎯 PAZARYERI MANTIGI (Trendyol/Yemeksepeti)

Mergen Kurye artık profesyonel pazaryeri mantığıyla çalışıyor. Restoran ödemeleri şeffaf, denetlenebilir ve kuruş hassasiyetinde.

---

## 📊 FİNANSAL HESAPLAMA MANTIĞI

### 1. Brüt Ciro
```
Brüt Ciro = SUM(packages.amount WHERE status = 'delivered')
```
- Restoranın toplam paket tutarı
- Müşterilerden toplanan para (nakit + kart)

### 2. Toplam Masraf
```
Toplam Masraf = SUM(packages.applied_price WHERE status = 'delivered')
```
- Her paketin **snapshot fiyatı** (applied_price)
- Paket oluşturulduğu andaki `restaurant.package_fee` değeri
- Geçmiş fiyat değişiklikleri siparişleri etkilemez

### 3. Net Hakediş
```
Net Hakediş = Brüt Ciro - Toplam Masraf
```
- Restorana ödenecek net tutar
- Kurye masrafları düşüldükten sonra kalan

### 4. Bakiye Hesabı
```
Ödenecek Net = Net Hakediş - Önceki Ödemeler + Mevcut Borç
```
- Önceki ödemeler: `restaurant_payment_transactions` tablosundan
- Mevcut borç: `restaurant_debts` tablosundan (status = 'pending')

---

## 🗄️ VERİTABANI YAPISI

### 1. `restaurant_payment_transactions` (Audit Log)
**Amaç:** Tüm ödeme işlemlerinin kayıtları (SİLME YOK)

| Kolon | Tip | Açıklama |
|-------|-----|----------|
| `id` | UUID | Primary key |
| `restaurant_id` | UUID | Restoran referansı |
| `transaction_date` | DATE | İşlem tarihi |
| `total_order_amount` | NUMERIC(10,2) | Brüt ciro |
| `total_package_cost` | NUMERIC(10,2) | Toplam masraf |
| `net_amount` | NUMERIC(10,2) | Net hakediş |
| `amount_paid` | NUMERIC(10,2) | Ödenen tutar |
| `previous_debt` | NUMERIC(10,2) | Önceki borç |
| `new_debt` | NUMERIC(10,2) | Yeni borç |
| `debt_paid` | NUMERIC(10,2) | Borçtan ödenen |
| `package_count` | INTEGER | Paket sayısı |
| `order_ids` | INTEGER[] | Sipariş ID'leri |
| `admin_id` | UUID | İşlemi yapan admin |
| `notes` | TEXT | Notlar |

### 2. `restaurant_debts` (Borç Takibi)
**Amaç:** Kısmi ödemeler ve borç yönetimi

| Kolon | Tip | Açıklama |
|-------|-----|----------|
| `id` | UUID | Primary key |
| `restaurant_id` | UUID | Restoran referansı |
| `debt_date` | DATE | Borç tarihi |
| `amount` | NUMERIC(10,2) | Orijinal borç |
| `remaining_amount` | NUMERIC(10,2) | Kalan borç |
| `status` | TEXT | pending/paid/cancelled |

### 3. `packages` (Sipariş Tablosu)
**Yeni Kolonlar:**

| Kolon | Tip | Açıklama |
|-------|-----|----------|
| `applied_price` | NUMERIC(10,2) | Snapshot fiyat (oluşturulduğu andaki package_fee) |
| `restaurant_settled_at` | TIMESTAMPTZ | Restorana ödeme yapıldığı zaman |

---

## 🔧 SQL FONKSİYONLARI

### `get_restaurant_financial_summary()`
Restoran finansal özetini döndürür.

**Parametreler:**
- `p_restaurant_id` (UUID): Restoran ID
- `p_start_date` (DATE): Başlangıç tarihi (opsiyonel)
- `p_end_date` (DATE): Bitiş tarihi (opsiyonel)

**Dönen Değerler:**
```sql
{
  brut_ciro: NUMERIC(10,2),
  toplam_masraf: NUMERIC(10,2),
  net_hakedis: NUMERIC(10,2),
  onceki_odemeler: NUMERIC(10,2),
  mevcut_borc: NUMERIC(10,2),
  odenecek_net: NUMERIC(10,2),
  paket_sayisi: INTEGER
}
```

**Kullanım:**
```sql
SELECT * FROM get_restaurant_financial_summary(
  'restaurant-uuid',
  '2024-01-01'::DATE,
  '2024-12-31'::DATE
);
```

---

## 🎨 UI/UX DEĞİŞİKLİKLERİ

### 1. Restoran Detay Modalı
**3'lü Finansal Kart Yapısı:**

1. **Brüt Ciro** (Gri)
   - Toplam paket tutarı
   - İkon: 💰

2. **Toplam Masraf** (Rose)
   - Paket sayısı × Dinamik ücret
   - İkon: 📦
   - Renk: `text-rose-500`

3. **Net Hakediş** (Emerald - DEVASA)
   - Ciro - Masraf
   - İkon: ✓
   - Renk: `text-emerald-500`
   - Gradient border ve shadow

### 2. Ödeme Modalı
**Özellikler:**
- MAX butonu: Tek tıkla toplam tutarı doldurur
- Kısmi ödeme desteği
- Eksik ödeme uyarısı (Rose)
- Tam ödeme onayı (Emerald)
- **🎉 Konfeti Efekti:** Başarılı ödeme sonrası 2 saniye animasyon

---

## 💻 BACKEND SERVİSLER

### `restaurantService.ts`

#### 1. `getRestaurantFinancialSummary()`
SQL fonksiyonunu çağırır, finansal özeti döndürür.

#### 2. `handleRestaurantPayment()`
**Parametreler:**
```typescript
{
  brutCiro: number
  toplamMasraf: number
  netHakedis: number
  mevcutBorc: number
  amountPaid: number
  orderIds: number[]
  packageCount: number
}
```

**İşlem Akışı:**
1. Ödeme işlemi kaydı oluştur (`restaurant_payment_transactions`)
2. Siparişleri settled olarak işaretle (`packages.restaurant_settled_at`)
3. Eski borçları öde (varsa)
4. Yeni borç oluştur (eksik ödeme varsa)

#### 3. `handleRestaurantDebtPayment()`
Sadece eski borçları ödemek için kullanılır.

---

## 🔒 VERİ TUTARLILIĞI GARANTİLERİ

### 1. Decimal Hassasiyet
- Tüm parasal değerler: `NUMERIC(10, 2)`
- Kuruş kaybı: **YOK**
- JavaScript'te: `toFixed(2)` kullanımı

### 2. Snapshot Fiyat (applied_price)
- Her paket oluşturulduğunda `restaurant.package_fee` değeri snapshot olarak kaydedilir
- Trigger: `trigger_set_applied_price`
- Geçmiş fiyat değişiklikleri siparişleri etkilemez

### 3. Audit Log
- `restaurant_payment_transactions` tablosundan **SİLME YOK**
- Tüm işlemler kayıt altında
- Admin takibi: `admin_id` kolonu

### 4. Borç Yönetimi
- En eski borçtan başlayarak ödeme (FIFO)
- Kısmi ödeme desteği
- Otomatik borç güncelleme

---

## 🧪 TEST SENARYOSU

### Örnek: 10.000 TL Ciro, 1.000 TL Masraf

**Başlangıç:**
- Brüt Ciro: 10.000 TL
- Toplam Masraf: 1.000 TL (10 paket × 100 TL)
- Net Hakediş: 9.000 TL
- Mevcut Borç: 0 TL
- **Ödenecek Net: 9.000 TL**

**Senaryo 1: Tam Ödeme (9.000 TL)**
```
Ödenen: 9.000 TL
Yeni Borç: 0 TL
Durum: ✅ Tam ödeme
```

**Senaryo 2: Kısmi Ödeme (5.000 TL)**
```
Ödenen: 5.000 TL
Yeni Borç: 4.000 TL
Durum: ⚠️ Kısmi ödeme
```

**Senaryo 3: Eski Borç Varken Ödeme**
```
Başlangıç:
- Net Hakediş: 9.000 TL
- Mevcut Borç: 2.000 TL
- Ödenecek Net: 11.000 TL

Ödenen: 10.000 TL
- Net hakediş: 9.000 TL ödendi
- Eski borçtan: 1.000 TL ödendi
- Kalan borç: 1.000 TL
```

---

## 🚀 KURULUM

### 1. Veritabanı Migration
```bash
# SQL dosyasını çalıştır
psql -U postgres -d mergen_kurye -f database/create_professional_finance_system.sql
```

### 2. Kontrol
```sql
-- Tabloları kontrol et
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('restaurant_payment_transactions', 'restaurant_debts');

-- Fonksiyonu test et
SELECT * FROM get_restaurant_financial_summary(
  'restaurant-uuid',
  '2024-01-01'::DATE,
  CURRENT_DATE
);
```

---

## 📈 PERFORMANS OPTİMİZASYONU

### İndeksler
```sql
-- restaurant_payment_transactions
CREATE INDEX idx_rpt_restaurant_id ON restaurant_payment_transactions(restaurant_id);
CREATE INDEX idx_rpt_transaction_date ON restaurant_payment_transactions(transaction_date);

-- restaurant_debts
CREATE INDEX idx_rd_restaurant_id ON restaurant_debts(restaurant_id);
CREATE INDEX idx_rd_status ON restaurant_debts(status);
```

### Query Optimizasyonu
- `get_restaurant_financial_summary()` fonksiyonu CTE kullanır
- Tek sorguda tüm hesaplamalar
- JOIN yerine CROSS JOIN (performans)

---

## 🎯 SONUÇ

✅ **Profesyonel pazaryeri mantığı kuruldu**
✅ **Decimal hassasiyet garantisi**
✅ **Audit log sistemi**
✅ **Snapshot fiyat mekanizması**
✅ **Kısmi ödeme desteği**
✅ **Konfeti efekti ile UX iyileştirmesi**

**Sistem artık Trendyol/Yemeksepeti seviyesinde finansal takip yapıyor!** 🚀
