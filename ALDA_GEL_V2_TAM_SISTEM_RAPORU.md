# 🏥 ALDA-GEL KURYE V2.0 - TAM SSTEM OTOPSS

**Tarih:** 11 Mayıs 2026  
**Versiyon:** 2.0  
**Hazırlayan:** Sistem Mimarisi Analizi  
**Durum:** PRODUCTION READY

---

## 📑 ÇNDEKLER

1. [Veritabanı Anatomisi](#1-veritabani-anatomisi)
2. [lişki Ağı (Foreign Key Matrix)](#2-iliski-agi)
3. [Finansal Mimari ve Akış](#3-finansal-mimari-ve-akis)
4. [Çöp/Ölü Tablolar](#4-cop-olu-tablolar)
5. [Kritik ş Kuralları](#5-kritik-is-kurallari)
6. [Trigger ve Fonksiyonlar](#6-trigger-ve-fonksiyonlar)

---

## 1. VERTABANI ANATOMS

### 1.1 CORE TABLES (Sistem Omurgası)

#### 📦 **packages** (Sipariş Tablosu)
**Amaç:** Tüm siparişlerin yaşam döngüsünü takip eder

| Kolon | Tip | Açıklama | Kritik |
|-------|-----|----------|--------|
| id | SERIAL PRIMARY KEY | Sipariş ID | ✅ |
| order_number | VARCHAR | Sipariş numarası (opsiyonel) | |
| customer_name | VARCHAR NOT NULL | Müşteri adı | ✅ |
| customer_phone | VARCHAR | Müşteri telefonu | |
| delivery_address | TEXT NOT NULL | Teslimat adresi | ✅ |
| amount | NUMERIC(10,2) NOT NULL | Sipariş tutarı | ✅ |
| status | VARCHAR NOT NULL | Sipariş durumu | ✅ |
| content | TEXT | Sipariş içeriği | |
| payment_method | VARCHAR | cash/card/iban | ✅ |
| platform | VARCHAR | getir/yemeksepeti/trendyol/migros/other | |
| restaurant_id | UUID FK | Restoran referansı | ✅ |
| courier_id | UUID FK | Kurye referansı | ✅ |
| delivered_by_courier_id | UUID FK | Teslim eden kurye (snapshot) | ✅ |
| applied_price | NUMERIC(10,2) | Paket ücreti (snapshot) | ✅ |
| is_chargeable_cancellation | BOOLEAN | Ücretli iptal mi? | ✅ |
| created_at | TIMESTAMPTZ | Oluşturulma zamanı | ✅ |
| getting_ready_at | TIMESTAMPTZ | Hazırlanmaya başlama | |
| ready_at | TIMESTAMPTZ | Hazır olma | |
| assigned_at | TIMESTAMPTZ | Kuryeye atanma | |
| picked_up_at | TIMESTAMPTZ | Kuryenin alması | ✅ |
| delivered_at | TIMESTAMPTZ | Teslim edilme | ✅ |
| cancelled_at | TIMESTAMPTZ | ptal edilme | |
| cancelled_by | VARCHAR | admin/restaurant | |
| cancellation_reason | TEXT | ptal nedeni | |
| settled_at | TIMESTAMPTZ | Kurye mutabakatı | |
| restaurant_settled_at | TIMESTAMPTZ | Restoran mutabakatı | |
| is_paid_to_courier | BOOLEAN | Kuryeye ödendi mi? | |
| latitude | NUMERIC | Teslimat konumu (lat) | |
| longitude | NUMERIC | Teslimat konumu (lng) | |

**Status Flow:**
\\\
new_order → getting_ready → ready → assigned → picking_up → on_the_way → delivered
                                                                        ↓
                                                                   cancelled
\\\

**ndeksler:**
- idx_packages_status
- idx_packages_restaurant_id
- idx_packages_courier_id
- idx_packages_delivered_at
- idx_packages_chargeable_cancellation

---

#### 🏪 **restaurants** (Restoran Tablosu)
**Amaç:** Restoran master data

| Kolon | Tip | Açıklama | Kritik |
|-------|-----|----------|--------|
| id | UUID PRIMARY KEY | Restoran ID | ✅ |
| name | VARCHAR NOT NULL | Restoran adı | ✅ |
| phone | VARCHAR | Telefon | |
| address | TEXT | Adres | |
| package_fee | NUMERIC(10,2) DEFAULT 100 | Paket başı ücret | ✅ |
| is_active | BOOLEAN DEFAULT true | Aktif mi? | ✅ |
| maps_link | TEXT | Google Maps linki | |
| logo_url | TEXT | Logo URL | |
| banner_url | TEXT | Banner URL | |
| fcm_token | TEXT | Push notification token | |
| created_at | TIMESTAMPTZ | Oluşturulma | |

**ndeksler:**
- idx_restaurants_is_active

---

#### 🚴 **couriers** (Kurye Tablosu)
**Amaç:** Kurye master data

| Kolon | Tip | Açıklama | Kritik |
|-------|-----|----------|--------|
| id | UUID PRIMARY KEY | Kurye ID | ✅ |
| full_name | VARCHAR | Kurye adı | ✅ |
| phone | VARCHAR | Telefon | ✅ |
| is_active | BOOLEAN DEFAULT true | Aktif mi? | ✅ |
| status | VARCHAR | idle/picking_up/on_the_way/assigned/inactive | ✅ |
| payment_type | VARCHAR | paket_basi/saatlik | ✅ |
| package_rate | NUMERIC(10,2) DEFAULT 80 | Paket başı ücret | ✅ |
| last_location | JSONB | Son konum {lat, lng, updated_at} | |
| fcm_token | TEXT | Push notification token | |
| account_status | VARCHAR | active/suspended/pending | ✅ |
| created_at | TIMESTAMPTZ | Oluşturulma | |

**ndeksler:**
- idx_couriers_is_active
- idx_couriers_status

---

### 1.2 FINANCIAL TABLES (Finansal Omurga)

#### 💰 **restaurant_debts** (Restoran Paket Masrafları)
**Amaç:** Restoranların paket başı masraf borçlarını takip eder

| Kolon | Tip | Açıklama | Kritik |
|-------|-----|----------|--------|
| id | UUID PRIMARY KEY | Kayıt ID | ✅ |
| restaurant_id | UUID FK NOT NULL | Restoran referansı | ✅ |
| debt_date | DATE NOT NULL | Borç tarihi | ✅ |
| amount | NUMERIC(10,2) NOT NULL | Toplam masraf | ✅ |
| package_count | INTEGER NOT NULL | Paket sayısı | ✅ |
| package_fee | NUMERIC(10,2) NOT NULL | Paket başı ücret (snapshot) | ✅ |
| status | VARCHAR NOT NULL | pending/paid/cancelled | ✅ |
| created_at | TIMESTAMPTZ | Oluşturulma | |
| updated_at | TIMESTAMPTZ | Güncellenme | |

**Constraint:**
\\\sql
CHECK (amount = package_count * package_fee)
\\\

**ndeksler:**
- idx_rd_restaurant_id
- idx_rd_status
- idx_rd_debt_date

**Trigger:** \create_restaurant_debt_on_delivery()\
- Paket delivered olduğunda otomatik kayıt oluşturur
- Paket cancelled + picked_up_at IS NOT NULL ise de kayıt oluşturur (ücretli iptal)

---

#### 💳 **restaurant_payment_transactions** (Restoran Ödeme Kayıtları)
**Amaç:** Admin'in restorana yaptığı ödemelerin audit log'u

| Kolon | Tip | Açıklama | Kritik |
|-------|-----|----------|--------|
| id | UUID PRIMARY KEY | şlem ID | ✅ |
| restaurant_id | UUID FK NOT NULL | Restoran referansı | ✅ |
| transaction_date | DATE NOT NULL | şlem tarihi | ✅ |
| brut_ciro | NUMERIC(10,2) NOT NULL | Toplam ciro | ✅ |
| toplam_masraf | NUMERIC(10,2) NOT NULL | Toplam masraf | ✅ |
| net_hakedis | NUMERIC(10,2) NOT NULL | Net hakediş | ✅ |
| amount_paid | NUMERIC(10,2) NOT NULL | Ödenen tutar | ✅ |
| package_count | INTEGER | Paket sayısı | |
| order_ids | INTEGER[] | Sipariş ID'leri | |
| admin_id | UUID FK | Admin referansı | |
| notes | TEXT | Notlar | |
| created_at | TIMESTAMPTZ | Oluşturulma | ✅ |

**Constraint:**
\\\sql
CHECK (net_hakedis = brut_ciro - toplam_masraf)
\\\

**ndeksler:**
- idx_rpt_restaurant_id
- idx_rpt_transaction_date
- idx_rpt_created_at

**FIFO Mantık:** Ödeme yapıldığında en eski restaurant_debts kayıtları 'paid' olarak işaretlenir

---

#### 🏦 **courier_settlements** (Kurye Gün Sonu Mutabakatları)
**Amaç:** Admin'in kuryeden para aldığı işlemleri kaydeder

| Kolon | Tip | Açıklama | Kritik |
|-------|-----|----------|--------|
| id | UUID PRIMARY KEY | Mutabakat ID | ✅ |
| courier_id | UUID FK NOT NULL | Kurye referansı | ✅ |
| start_date | DATE NOT NULL | Başlangıç tarihi | ✅ |
| end_date | DATE NOT NULL | Bitiş tarihi | ✅ |
| amount_paid | NUMERIC(10,2) NOT NULL | Alınan tutar | ✅ |
| created_at | TIMESTAMPTZ | Oluşturulma | ✅ |
| created_by | TEXT | Oluşturan (admin) | |
| notes | TEXT | Notlar | |

**ndeksler:**
- idx_courier_settlements_courier_id
- idx_courier_settlements_dates
- idx_courier_settlements_created_at

**ÖNEML:** Bu tablo sadece audit log'dur. Packages tablosundaki veriler DEŞMEZ!

---

#### 💸 **courier_debts** (Kurye Borçları)
**Amaç:** Kuryelerin borç takibi

| Kolon | Tip | Açıklama | Kritik |
|-------|-----|----------|--------|
| id | SERIAL PRIMARY KEY | Borç ID | ✅ |
| courier_id | UUID FK NOT NULL | Kurye referansı | ✅ |
| debt_date | DATE NOT NULL | Borç tarihi | ✅ |
| amount | NUMERIC(10,2) NOT NULL | Borç tutarı | ✅ |
| remaining_amount | NUMERIC(10,2) | Kalan tutar | |
| status | VARCHAR NOT NULL | pending/paid | ✅ |
| created_at | TIMESTAMPTZ | Oluşturulma | |

**ndeksler:**
- idx_courier_debts_courier_id
- idx_courier_debts_status

---

### 1.3 SUPPORT TABLES (Destek Tabloları)

#### 📝 **order_logs** (Sipariş Durum Logları)
**Amaç:** Sipariş durum değişikliklerini loglar

| Kolon | Tip | Açıklama |
|-------|-----|----------|
| id | SERIAL PRIMARY KEY | Log ID |
| package_id | INTEGER FK | Sipariş referansı |
| old_status | VARCHAR | Eski durum |
| new_status | VARCHAR | Yeni durum |
| changed_by | VARCHAR | Değiştiren (admin/courier/restaurant) |
| changed_at | TIMESTAMPTZ | Değişim zamanı |
| notes | TEXT | Notlar |

---

#### 🔔 **notifications** (Bildirimler)
**Amaç:** Push notification kayıtları

| Kolon | Tip | Açıklama |
|-------|-----|----------|
| id | UUID PRIMARY KEY | Bildirim ID |
| user_id | UUID FK | Kullanıcı referansı |
| user_type | VARCHAR | courier/restaurant/admin |
| title | VARCHAR | Başlık |
| body | TEXT | çerik |
| data | JSONB | Ek veri |
| is_read | BOOLEAN | Okundu mu? |
| created_at | TIMESTAMPTZ | Oluşturulma |

---

#### 📋 **applications** (Başvurular)
**Amaç:** Kurye ve restoran başvurularını saklar

| Kolon | Tip | Açıklama |
|-------|-----|----------|
| id | UUID PRIMARY KEY | Başvuru ID |
| type | VARCHAR | courier/restaurant |
| first_name | VARCHAR | Ad |
| last_name | VARCHAR | Soyad |
| phone | VARCHAR | Telefon |
| email | VARCHAR | E-posta |
| status | VARCHAR | pending/approved/rejected |
| approved_by | UUID FK | Onaylayan admin |
| restaurant_id | UUID FK | Oluşturulan restoran (approved ise) |
| created_at | TIMESTAMPTZ | Başvuru tarihi |

---

#### 👤 **users** (Kullanıcılar - Supabase Auth)
**Amaç:** Authentication sistemi

| Kolon | Tip | Açıklama |
|-------|-----|----------|
| id | UUID PRIMARY KEY | Kullanıcı ID |
| email | VARCHAR | E-posta |
| encrypted_password | VARCHAR | Şifreli parola |
| created_at | TIMESTAMPTZ | Oluşturulma |

**Not:** Supabase Auth tarafından yönetilir

---

