# 💼 MERGEN KURYE YENİ FİNANSAL MİMARİ

## 🎯 KRİTİK DEĞİŞİKLİK

**restaurant_debts** tablosu artık **"Paket Masrafı Borçları"**nı temsil ediyor.

Eski mantık: restaurant_debts = Restoranın bize olan borçları
**YENİ MANTIK:** restaurant_debts = Restoranın paket masrafları (Paket sayısı × Paket ücreti)

---

## 📊 YENİ FİNANSAL FORMÜL

### Matematiksel Omurga

```
Brüt Ciro = SUM(packages.amount WHERE status = 'delivered')
  ❌ İptal edilen paketler ciroya dahil DEĞİL

Toplam Masraf = SUM(restaurant_debts.amount WHERE status = 'pending')
  ✅ Delivered paketler
  ✅ İptal edilen AMA kurye almış paketler (picked_up_at IS NOT NULL VEYA courier_id IS NOT NULL)

Net Hakediş = Brüt Ciro - Toplam Masraf

Önceki Ödemeler = SUM(restaurant_payment_transactions.amount_paid)

Net Ödenmesi Gereken = Net Hakediş - Önceki Ödemeler
```

### ⚠️ İPTAL EDGE-CASE KURALI

**Kurye paketi restorandan teslim aldıktan sonra sipariş iptal edilirse:**
- Restoran ciroya 0 yansır (para kazanmaz)
- Kurye masrafı restorana yansır (kurye hak eder)
- restaurant_debts tablosuna kayıt eklenir

**Trigger Mantığı:**
```sql
IF status = 'cancelled' AND (picked_up_at IS NOT NULL OR courier_id IS NOT NULL) THEN
  -- Masraf kaydı oluştur
  INSERT INTO restaurant_debts (...)
END IF
```

---

## 🗄️ VERİTABANI YAPISI

### 1. `restaurant_debts` (Paket Masrafı Borçları)

**YENİ AMAÇ:** Her delivered paket için otomatik masraf kaydı

| Kolon | Tip | Açıklama |
|-------|-----|----------|
| `id` | UUID | Primary key |
| `restaurant_id` | UUID | Restoran referansı |
| `debt_date` | DATE | Masraf tarihi |
| `amount` | NUMERIC(10,2) | Toplam masraf (package_count × package_fee) |
| `package_count` | INTEGER | Kaç paket için |
| `package_fee` | NUMERIC(10,2) | Paket başı ücret (snapshot) |
| `status` | TEXT | pending/paid/cancelled |
| `notes` | TEXT | Notlar |

**Constraint:**
```sql
amount = (package_count × package_fee)
```

**Trigger:** Paket delivered olduğunda otomatik masraf kaydı oluşturulur
```sql
CREATE TRIGGER trigger_create_restaurant_debt
    AFTER INSERT OR UPDATE OF status ON packages
    FOR EACH ROW
    EXECUTE FUNCTION create_restaurant_debt_on_delivery();
```

### 2. `restaurant_payment_transactions` (Ödeme Kayıtları)

**AMAÇ:** Tüm ödeme işlemlerinin audit log'u

| Kolon | Tip | Açıklama |
|-------|-----|----------|
| `id` | UUID | Primary key |
| `restaurant_id` | UUID | Restoran referansı |
| `transaction_date` | DATE | İşlem tarihi |
| `brut_ciro` | NUMERIC(10,2) | Toplam paket tutarı |
| `toplam_masraf` | NUMERIC(10,2) | restaurant_debts toplamı |
| `net_hakedis` | NUMERIC(10,2) | Ciro - Masraf |
| `amount_paid` | NUMERIC(10,2) | Ödenen tutar |
| `package_count` | INTEGER | Paket sayısı |
| `order_ids` | INTEGER[] | Sipariş ID'leri |
| `admin_id` | UUID | İşlemi yapan admin |
| `notes` | TEXT | Notlar |

**Constraint:**
```sql
net_hakedis = (brut_ciro - toplam_masraf)
```

---

## 🔧 SQL FONKSİYONLARI

### `get_restaurant_financial_summary()`

**Amaç:** Restoran finansal özetini döndürür

**Parametreler:**
- `p_restaurant_id` (UUID): Restoran ID
- `p_start_date` (DATE): Başlangıç tarihi (opsiyonel)
- `p_end_date` (DATE): Bitiş tarihi (opsiyonel)

**Dönen Değerler:**
```sql
{
  brut_ciro: NUMERIC(10,2),           -- Toplam paket tutarı
  toplam_masraf: NUMERIC(10,2),       -- restaurant_debts toplamı
  net_hakedis: NUMERIC(10,2),         -- Ciro - Masraf
  onceki_odemeler: NUMERIC(10,2),     -- Önceki ödemeler toplamı
  net_odenecek: NUMERIC(10,2),        -- Net Hakediş - Önceki Ödemeler
  paket_sayisi: INTEGER               -- Paket sayısı
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

## 💻 BACKEND SERVİSLER

### `restaurantService.ts`

#### 1. `getRestaurantFinancialSummary()`
SQL fonksiyonunu çağırır, finansal özeti döndürür.

#### 2. `handleRestaurantPayment()`
**Parametreler:**
```typescript
{
  brutCiro: number          // Toplam paket tutarı
  toplamMasraf: number      // restaurant_debts toplamı
  netHakedis: number        // Ciro - Masraf
  amountPaid: number        // Ödenen tutar
  orderIds: number[]        // Hangi siparişler
  packageCount: number      // Kaç paket
}
```

**İşlem Akışı:**
1. Ödeme işlemi kaydı oluştur (`restaurant_payment_transactions`)
2. Paket masraflarını 'paid' olarak işaretle (`restaurant_debts`)
3. Siparişleri settled olarak işaretle (`packages.restaurant_settled_at`)

**Önemli:** Masraflar FIFO (First In First Out) mantığıyla ödenir

#### 3. `handleRestaurantDebtPayment()`
Sadece eski masrafları ödemek için kullanılır (artık çok kullanılmayacak).

---

## 🎨 UI/UX DEĞİŞİKLİKLERİ

### 1. Restoran Detay Modalı
**3'lü Finansal Kart Yapısı:**

1. **Brüt Ciro** (Gri)
   - Toplam paket tutarı
   - İkon: 💰

2. **Toplam Masraf** (Rose)
   - restaurant_debts toplamı
   - İkon: 📦
   - Renk: `text-rose-500`

3. **Net Hakediş** (Emerald - DEVASA)
   - Ciro - Masraf
   - İkon: ✓
   - Renk: `text-emerald-500`
   - Gradient border ve shadow

### 2. Ödeme Modalı
**Özellikler:**
- **Net Ödenmesi Gereken** başlığı (eski: "Restorana Ödenecek Net Tutar")
- Formül gösterimi: "(Brüt Ciro - Toplam Masraf) - Önceki Ödemeler"
- MAX butonu: Tek tıkla Net Ödenmesi Gereken tutarını doldurur
- Kısmi ödeme desteği
- Fazla tutar uyarısı (ödeme > net ödenecek)
- **🎉 Konfeti Efekti:** Başarılı ödeme sonrası 2 saniye animasyon

### 3. Paket Masrafları Listesi
Ödeme modalında restaurant_debts kayıtları gösterilir:
- Tarih
- Paket sayısı
- Masraf tutarı

---

## 🔒 VERİ TUTARLILIĞI

### 1. Otomatik Masraf Kaydı
Her paket delivered olduğunda:
```sql
INSERT INTO restaurant_debts (
    restaurant_id,
    amount,
    package_count,
    package_fee,
    status
) VALUES (
    restaurant_id,
    package_fee,
    1,
    package_fee,
    'pending'
);
```

### 2. Ödeme İşlemi
Ödeme yapıldığında:
1. `restaurant_payment_transactions` tablosuna kayıt at
2. `restaurant_debts` kayıtlarını 'paid' olarak işaretle (FIFO)
3. `packages.restaurant_settled_at` güncelle

### 3. Bakiye Hesabı
```sql
Net Ödenmesi Gereken = 
    (Brüt Ciro - Toplam Masraf) - Önceki Ödemeler
```

**Canlı Güncelleme:** Ödeme yapıldığı an bakiye ANINDA düşer

---

## 🧪 TEST SENARYOSU

### Örnek: 10.000 TL Ciro, 1.000 TL Masraf

**Başlangıç:**
- Brüt Ciro: 10.000 TL
- Toplam Masraf: 1.000 TL (10 paket × 100 TL)
- Net Hakediş: 9.000 TL
- Önceki Ödemeler: 0 TL
- **Net Ödenmesi Gereken: 9.000 TL**

**Senaryo 1: Tam Ödeme (9.000 TL)**
```
Ödenen: 9.000 TL
Kalan: 0 TL
Durum: ✅ Tam ödeme
Konfeti: 🎉 2 saniye
```

**Senaryo 2: Kısmi Ödeme (5.000 TL)**
```
Ödenen: 5.000 TL
Kalan: 4.000 TL
Durum: ⚠️ Kısmi ödeme

restaurant_debts:
- 5 paket 'paid' olarak işaretlendi
- 5 paket 'pending' olarak kaldı
```

**Senaryo 3: İkinci Ödeme (4.000 TL)**
```
Önceki Ödemeler: 5.000 TL
Net Ödenmesi Gereken: 4.000 TL

Ödenen: 4.000 TL
Kalan: 0 TL
Durum: ✅ Tam ödeme
Konfeti: 🎉 2 saniye

restaurant_debts:
- Tüm kayıtlar 'paid' olarak işaretlendi
```

---

## 🚀 KURULUM

### 1. Veritabanı Migration
```bash
psql -U postgres -d mergen_kurye -f database/fix_financial_architecture.sql
```

### 2. Kontrol
```sql
-- Tabloları kontrol et
\d restaurant_debts
\d restaurant_payment_transactions

-- Trigger'ı kontrol et
SELECT tgname FROM pg_trigger WHERE tgname = 'trigger_create_restaurant_debt';

-- Fonksiyonu test et
SELECT * FROM get_restaurant_financial_summary(
  'restaurant-uuid',
  '2024-01-01'::DATE,
  CURRENT_DATE
);
```

### 3. Test Verisi
```sql
-- Test restoranı oluştur
INSERT INTO restaurants (name, package_fee) 
VALUES ('Test Restoran', 100);

-- Test paketi oluştur (otomatik masraf kaydı oluşacak)
INSERT INTO packages (
  restaurant_id, 
  status, 
  amount, 
  delivered_at
) VALUES (
  'restaurant-uuid',
  'delivered',
  1000,
  NOW()
);

-- Masraf kaydını kontrol et
SELECT * FROM restaurant_debts 
WHERE restaurant_id = 'restaurant-uuid';
```

---

## 📈 PERFORMANS

### İndeksler
```sql
-- restaurant_debts
CREATE INDEX idx_rd_restaurant_id ON restaurant_debts(restaurant_id);
CREATE INDEX idx_rd_status ON restaurant_debts(status);
CREATE INDEX idx_rd_debt_date ON restaurant_debts(debt_date);

-- restaurant_payment_transactions
CREATE INDEX idx_rpt_restaurant_id ON restaurant_payment_transactions(restaurant_id);
CREATE INDEX idx_rpt_transaction_date ON restaurant_payment_transactions(transaction_date);
```

### Query Optimizasyonu
- `get_restaurant_financial_summary()` fonksiyonu CTE kullanır
- Tek sorguda tüm hesaplamalar
- CROSS JOIN (performans)

---

## 🎯 SONUÇ

✅ **restaurant_debts artık "Paket Masrafı Borçları"**
✅ **Otomatik masraf kaydı (trigger)**
✅ **Net Ödenmesi Gereken = (Ciro - Masraf) - Önceki Ödemeler**
✅ **Canlı bakiye güncelleme**
✅ **FIFO masraf ödeme mantığı**
✅ **Konfeti efekti ile UX iyileştirmesi**
✅ **Decimal hassasiyet garantisi**
✅ **⚠️ İPTAL EDGE-CASE: Kurye paketi aldıysa, iptal edilse bile masraf restorana yansır**

**Sistem artık profesyonel hakediş mantığıyla çalışıyor!** 🚀

---

## ⚠️ ÖNEMLİ NOTLAR

1. **Eski Veriler:** Mevcut restaurant_debts kayıtları yeni yapıya uygun değilse temizlenmelidir
2. **Trigger:** Yeni paketler otomatik olarak masraf kaydı oluşturacak
3. **İptal Kuralı:** Kurye paketi aldıysa, iptal edilse bile masraf yansır
4. **Bakiye:** Her ödeme sonrası bakiye ANINDA güncellenir
5. **FIFO:** Masraflar en eskiden başlayarak ödenir
6. **Audit Log:** restaurant_payment_transactions tablosundan SİLME YOK

**Test etmeden deploy etme!** 🛑

---

## 📚 EK DOKÜMANTASYON

- `İPTAL_EDGE_CASE_KURALI.md` - İptal edge-case detaylı açıklama
- `database/fix_financial_architecture.sql` - Migration dosyası
