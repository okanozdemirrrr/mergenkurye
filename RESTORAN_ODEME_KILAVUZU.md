# 🍽️ Restoran Ödemeleri ve Borç Yönetimi Modülü

## 📋 Genel Bakış

Mergen sistemine eklenen bu modül, restoranlarla yapılan ödemeleri ve borç takibini yönetir. Kurye Hesapları modülüne benzer şekilde çalışır.

## 🗄️ Veritabanı Kurulumu

### 1. Migration Dosyasını Çalıştırın

`database_migration_restaurant_debts.sql` dosyasını Supabase SQL Editor'de çalıştırın.

Bu dosya şu tabloları oluşturur:
- `restaurant_debts` - Restoran borç kayıtları
- `restaurant_payment_transactions` - Ödeme işlem geçmişi
- `packages` tablosuna `restaurant_settled_at` kolonu eklenir

## 🎯 Özellikler

### 1. Restoran Ödemeleri Sekmesi

**Konum:** Admin Panel > Restoranlar > Restoranların Ödemesi

Her restoran için gösterilen bilgiler:
- ✅ Toplam Sipariş Sayısı
- ✅ Toplam Sipariş Tutarı (Ciro)
- ✅ Restorana Borcum (Adminin restorana yapması gereken ödeme)

### 2. Detaylı Rapor ve Ödeme

**"Detaylı Rapor Görüntüle"** butonuna tıklandığında:

#### Modal İçeriği:
- 📅 Tarih aralığı seçici (başlangıç - bitiş)
- 📊 Seçilen tarih aralığındaki tüm siparişler
- 💰 Toplam sipariş tutarı
- 📋 Sipariş detay tablosu

#### Hesap Ödeme İşlemi:
1. **"Hesap Öde"** butonuna tıklayın
2. Ödeme tutarını girin
3. Sistem otomatik kontrol yapar:
   - ⚠️ **Fazla Ödeme:** "Fazla tutar girdiniz, lütfen ödemeyi kontrol edin" uyarısı
   - ⚠️ **Eksik Ödeme:** Kalan tutar borç olarak kaydedilir
   - ✅ **Tam Ödeme:** Hesap kapanır

#### Örnek Senaryo:
```
Toplam Borç: 30.458 TL
Ödenen: 30.000 TL
Sonuç: 458 TL "22.01.2026 tarihinden kalan borç" olarak kaydedilir
```

### 3. Borç Ödeme ve Takip

#### Borç Varsa:
- Kartta **"Borç Öde"** butonu görünür
- Borç yoksa bu buton gizlenir

#### Borç Ödeme Ekranı:
- 📅 Geçmiş borçlar tarihleriyle listelenir
  - Örn: 22.01.2026 → 5000 TL
  - Örn: 23.01.2026 → 4000 TL
- 💰 Genel Toplam Borç gösterilir (Örn: 9000 TL)
- 💵 Ödeme input alanı

#### Ödeme Mantığı:
```
Toplam Borç: 9000 TL
Ödenen: 6000 TL

İşlem:
1. Eski borçlar kapatılır (en eskiden başlayarak)
2. Kalan 3000 TL bugünün tarihiyle yeni borç kaydı olarak eklenir
```

## 🔧 Teknik Detaylar

### State Yönetimi
```typescript
// Restoran Ödeme State'leri
const [selectedRestaurantId, setSelectedRestaurantId] = useState<number | null>(null)
const [selectedRestaurantOrders, setSelectedRestaurantOrders] = useState<Package[]>([])
const [showRestaurantModal, setShowRestaurantModal] = useState(false)
const [restaurantDebts, setRestaurantDebts] = useState<RestaurantDebt[]>([])
const [loadingRestaurantDebts, setLoadingRestaurantDebts] = useState(false)
const [showRestaurantPaymentModal, setShowRestaurantPaymentModal] = useState(false)
const [restaurantPaymentAmount, setRestaurantPaymentAmount] = useState('')
const [restaurantPaymentProcessing, setRestaurantPaymentProcessing] = useState(false)
const [showRestaurantDebtPayModal, setShowRestaurantDebtPayModal] = useState(false)
const [restaurantDebtPayAmount, setRestaurantDebtPayAmount] = useState('')
const [restaurantDebtPayProcessing, setRestaurantDebtPayProcessing] = useState(false)
const [restaurantStartDate, setRestaurantStartDate] = useState('')
const [restaurantEndDate, setRestaurantEndDate] = useState('')
```

### Güvenlik Kontrolleri
- ✅ `isMounted` ve `isCheckingAuth` korumaları aktif
- ✅ Tüm matematiksel işlemlerde `Number()` dönüşümleri güvenli
- ✅ Fazla ödeme kontrolü
- ✅ Negatif tutar kontrolü
- ✅ Veritabanı hata yönetimi

### Fonksiyonlar

#### 1. `fetchRestaurantOrders(restaurantId)`
Seçilen restoran için tarih aralığındaki siparişleri çeker.

#### 2. `fetchRestaurantDebts(restaurantId)`
Restoran için bekleyen borçları çeker.

#### 3. `handleRestaurantPayment()`
Hesap ödeme işlemini gerçekleştirir:
- Fazla ödeme kontrolü
- Eksik ödeme durumunda borç kaydı
- Tam ödeme durumunda hesap kapatma
- Transaction kaydı oluşturma

#### 4. `handleRestaurantDebtPayment()`
Borç ödeme işlemini gerçekleştirir:
- Eski borçları sırayla kapatır
- Kalan tutarı yeni borç olarak kaydeder
- Transaction kaydı oluşturur

## 📊 Veritabanı Yapısı

### restaurant_debts Tablosu
```sql
- id: BIGSERIAL PRIMARY KEY
- restaurant_id: UUID (restaurants tablosuna referans)
- debt_date: DATE (Borcun oluştuğu tarih)
- amount: DECIMAL(10, 2) (İlk borç tutarı)
- remaining_amount: DECIMAL(10, 2) (Kalan borç tutarı)
- status: TEXT ('pending' | 'paid')
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

### restaurant_payment_transactions Tablosu
```sql
- id: BIGSERIAL PRIMARY KEY
- restaurant_id: UUID
- transaction_date: DATE
- total_order_amount: DECIMAL(10, 2)
- amount_paid: DECIMAL(10, 2)
- new_debt_amount: DECIMAL(10, 2)
- payment_to_debts: DECIMAL(10, 2)
- notes: TEXT
- created_at: TIMESTAMPTZ
```

## 🎨 UI Özellikleri

### Renkler ve Göstergeler
- 🔵 Mavi: Toplam sipariş sayısı
- 🟢 Yeşil: Toplam ciro / Tam ödeme
- 🔴 Kırmızı: Borç tutarları
- 🟡 Sarı: Uyarılar (fazla ödeme)
- 🟠 Turuncu: Eksik ödeme / Kalan borç
- 🟣 Mor: Genel toplam

### Modallar
- ✅ Dark mode uyumlu
- ✅ Responsive tasarım
- ✅ Özel kaydırma çubukları (`admin-scrollbar`)
- ✅ Animasyonlu yükleme göstergeleri
- ✅ Gerçek zamanlı hesaplama önizlemeleri

## 🚀 Kullanım Adımları

### Hesap Ödeme:
1. Admin Panel > Restoranlar > Restoranların Ödemesi
2. Restoran kartında "Detaylı Rapor Görüntüle"
3. Tarih aralığı seçin
4. "Hesap Öde" butonuna tıklayın
5. Ödeme tutarını girin
6. "Ödemeyi Onayla"

### Borç Ödeme:
1. Admin Panel > Restoranlar > Restoranların Ödemesi
2. Borcu olan restoran kartında "Borç Öde"
3. Ödeme tutarını girin
4. "Borç Öde" butonuna tıklayın

## ⚠️ Önemli Notlar

1. **Veritabanı Migration:** İlk kullanımdan önce mutlaka `database_migration_restaurant_debts.sql` dosyasını çalıştırın.

2. **Tarih Aralığı:** Hesap ödemesi yaparken mutlaka tarih aralığı seçin.

3. **Borç Takibi:** Eski borçlar en eskiden başlayarak otomatik olarak kapatılır.

4. **Transaction Kayıtları:** Tüm işlemler `restaurant_payment_transactions` tablosunda loglanır.

5. **Settled Paketler:** Ödeme yapılan paketler `restaurant_settled_at` alanıyla işaretlenir ve bir daha hesaba dahil edilmez.

## 🔄 Otomatik Güncelleme

- Restoran istatistikleri 30 saniyede bir otomatik güncellenir
- Realtime güncellemeler aktif
- Fallback polling mekanizması mevcut

## 📞 Destek

Herhangi bir sorun yaşarsanız:
1. Tarayıcı konsolunu kontrol edin
2. Supabase SQL Editor'de tabloların oluşturulduğundan emin olun
3. Network sekmesinde API çağrılarını inceleyin

---

**Geliştirici Notu:** Bu modül, Kurye Hesapları modülüyle aynı mantıkta çalışır. Kod yapısı ve kullanıcı deneyimi tutarlılık için benzer tutulmuştur.
