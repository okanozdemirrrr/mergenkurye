# 📦 Sipariş Durum Akışı - Yaşam Döngüsü

## 🎯 Sipariş Durumları (Status Flow)

### Tam Akış (İlk Alımdan Teslime)

```
1. new_order (YENİ SİPARİŞ)
   ↓
2. getting_ready (HAZIRLANIYOR)
   ↓
3. ready (HAZIR)
   ↓
4. assigned (ATANDI)
   ↓
5. picking_up (ALINIYOR)
   ↓
6. on_the_way (YOLDA)
   ↓
7. delivered (TESLİM EDİLDİ) ✅

VEYA

❌ cancelled (İPTAL EDİLDİ) - Her aşamadan iptal edilebilir
```

---

## 📊 Detaylı Durum Açıklamaları

### 1️⃣ new_order (YENİ SİPARİŞ)
```
Kod: 0
Renk: Mavi (Blue)
Etiket: "YENİ SİPARİŞ"
Kısa: "Yeni"
Açıklama: "Restoran onayı bekliyor"

Ne Oluyor:
- Müşteri siparişi verdi
- Sistem siparişi oluşturdu
- Restoran panelinde görünüyor
- Restoran onayı bekleniyor

Sonraki Adımlar:
✅ getting_ready (Restoran hazırlamaya başladı)
❌ cancelled (İptal edildi)
```

### 2️⃣ getting_ready (HAZIRLANIYOR)
```
Kod: 1
Renk: Cyan (Açık Mavi)
Etiket: "HAZIRLANIYOR"
Kısa: "Hazırlanıyor"
Açıklama: "Restoran hazırlıyor"

Ne Oluyor:
- Restoran siparişi onayladı
- Yemek hazırlanıyor
- Müşteri bilgilendiriliyor
- Hazır olması bekleniyor

Sonraki Adımlar:
✅ ready (Sipariş hazır)
❌ cancelled (İptal edildi)
```

### 3️⃣ ready (HAZIR)
```
Kod: 2
Renk: Teal (Yeşilimsi Mavi)
Etiket: "HAZIR"
Kısa: "Hazır"
Açıklama: "Kurye ataması bekliyor"

Ne Oluyor:
- Sipariş hazır
- Admin panelinde görünüyor
- Kurye ataması bekleniyor
- Alınmaya hazır

Sonraki Adımlar:
✅ assigned (Kurye atandı)
❌ cancelled (İptal edildi)
```

### 4️⃣ assigned (ATANDI)
```
Kod: 3
Renk: Mor (Purple)
Etiket: "ATANDI"
Kısa: "Atandı"
Açıklama: "Kurye atandı"

Ne Oluyor:
- Admin kurye atadı
- Kurye bildirimi aldı
- Kurye siparişi gördü
- Restorandan alım bekleniyor

Sonraki Adımlar:
✅ picking_up (Restorandan alınıyor)
❌ cancelled (İptal edildi)
```

### 5️⃣ picking_up (ALINIYOR)
```
Kod: 4
Renk: Turuncu (Orange)
Etiket: "ALINIYOR"
Kısa: "Alınıyor"
Açıklama: "Restorandan alınıyor"

Ne Oluyor:
- Kurye restorana gitti
- Sipariş hazır
- Kurye paketi alıyor
- Teslimat başlamak üzere

Sonraki Adımlar:
✅ on_the_way (Teslimat yolunda)
❌ cancelled (İptal edildi)
```

### 6️⃣ on_the_way (YOLDA)
```
Kod: 5
Renk: Sarı (Yellow)
Etiket: "YOLDA"
Kısa: "Yolda"
Açıklama: "Teslimat yolunda"

Ne Oluyor:
- Kurye paketi aldı
- Müşteriye gidiyor
- Konum takibi aktif
- Teslim edilmek üzere

Sonraki Adımlar:
✅ delivered (Başarıyla teslim edildi)
❌ cancelled (İptal edildi)
```

### 7️⃣ delivered (TESLİM EDİLDİ) ✅
```
Kod: 6
Renk: Yeşil (Green)
Etiket: "TESLİM EDİLDİ"
Kısa: "Teslim"
Açıklama: "Başarıyla teslim edildi"

Ne Oluyor:
- Kurye müşteriye teslim etti
- Sipariş tamamlandı
- Ödeme işlendi
- Geçmiş siparişlere taşındı

Sonraki Adımlar:
🔒 Değiştirilemez (Final durum)
```

### ❌ cancelled (İPTAL EDİLDİ)
```
Kod: 7
Renk: Kırmızı (Red)
Etiket: "İPTAL EDİLDİ"
Kısa: "İptal"
Açıklama: "Sipariş iptal edildi"

Ne Oluyor:
- Sipariş iptal edildi
- İptal nedeni kaydedildi
- Ödeme iade edildi (varsa)
- Geçmiş siparişlere taşındı

Sonraki Adımlar:
🔒 Değiştirilemez (Final durum)
```

---

## 🔄 Durum Geçiş Kuralları

### İzin Verilen Geçişler

```typescript
new_order → getting_ready ✅
new_order → cancelled ✅

getting_ready → ready ✅
getting_ready → cancelled ✅

ready → assigned ✅
ready → cancelled ✅

assigned → picking_up ✅
assigned → cancelled ✅

picking_up → on_the_way ✅
picking_up → cancelled ✅

on_the_way → delivered ✅
on_the_way → cancelled ✅

delivered → (değiştirilemez) 🔒
cancelled → (değiştirilemez) 🔒
```

### İzin Verilmeyen Geçişler

```typescript
new_order → ready ❌ (getting_ready atlanmış)
new_order → assigned ❌ (getting_ready ve ready atlanmış)
getting_ready → assigned ❌ (ready atlanmış)
ready → picking_up ❌ (assigned atlanmış)
assigned → on_the_way ❌ (picking_up atlanmış)
picking_up → delivered ❌ (on_the_way atlanmış)
delivered → herhangi bir durum ❌
cancelled → herhangi bir durum ❌
```

---

## 🎨 Görsel Tasarım

### Renk Kodları

```css
new_order:      bg-blue-600      text-blue-600      🔵
getting_ready:  bg-cyan-600      text-cyan-600      🔷
ready:          bg-teal-600      text-teal-600      💠
assigned:       bg-purple-600    text-purple-600    🟣
picking_up:     bg-orange-600    text-orange-600    🟠
on_the_way:     bg-yellow-600    text-yellow-600    🟡
delivered:      bg-green-600     text-green-600     🟢
cancelled:      bg-red-600       text-red-600       🔴
```

### Badge Sınıfları

```css
new_order:      bg-blue-900/50      text-blue-300
getting_ready:  bg-cyan-900/50      text-cyan-300
ready:          bg-teal-900/50      text-teal-300
assigned:       bg-purple-900/50    text-purple-300
picking_up:     bg-orange-900/50    text-orange-300
on_the_way:     bg-yellow-900/50    text-yellow-300
delivered:      bg-green-900/50     text-green-300
cancelled:      bg-red-900/50       text-red-300
```

---

## 📱 Kullanıcı Görünümü

### Müşteri Perspektifi

```
1. new_order       → "Siparişiniz alındı"
2. getting_ready   → "Siparişiniz hazırlanıyor"
3. ready           → "Siparişiniz hazır"
4. assigned        → "Kurye atandı"
5. picking_up      → "Kurye yolda"
6. on_the_way      → "Siparişiniz yolda"
7. delivered       → "Teslim edildi - Afiyet olsun!"
```

### Kurye Perspektifi

```
1. new_order       → (Görmez - henüz hazır değil)
2. getting_ready   → (Görmez - henüz hazır değil)
3. ready           → (Görmez - henüz atanmadı)
4. assigned        → "Yeni sipariş atandı"
5. picking_up      → "Restorandan al"
6. on_the_way      → "Müşteriye teslim et"
7. delivered       → "Teslim edildi - Kazanç eklendi"
```

### Restoran Perspektifi

```
1. new_order       → "Yeni sipariş geldi - Onayla"
2. getting_ready   → "Hazırlanıyor"
3. ready           → "Hazır - Kurye bekleniyor"
4. assigned        → "Kurye atandı"
5. picking_up      → "Kurye geliyor"
6. on_the_way      → "Kurye aldı"
7. delivered       → "Teslim edildi - Ödeme işlendi"
```

### Admin Perspektifi

```
1. new_order       → "Restoran onayı bekleniyor"
2. getting_ready   → "Restoran hazırlıyor"
3. ready           → "Kurye ata"
4. assigned        → "Kurye atandı - Takip et"
5. picking_up      → "Alım aşamasında"
6. on_the_way      → "Teslimat aşamasında"
7. delivered       → "Tamamlandı - Ödemeler işlendi"
```

---

## 🔔 Bildirimler

### Durum Değişikliği Mesajları

```typescript
new_order      → "Sipariş sisteme eklendi"
getting_ready  → "Sipariş hazırlanmaya başlandı"
ready          → "Sipariş hazır, kurye ataması bekleniyor"
assigned       → "Sipariş kuryeye atandı"
picking_up     → "Sipariş restorandan alınıyor"
on_the_way     → "Sipariş teslimat yolunda"
delivered      → "Sipariş başarıyla teslim edildi"
cancelled      → "Sipariş iptal edildi"
```

---

## 📊 Veritabanı Alanları

### packages Tablosu

```sql
status VARCHAR(20) NOT NULL
  -- Değerler: 'new_order', 'getting_ready', 'ready', 'assigned', 'picking_up', 'on_the_way', 'delivered', 'cancelled'

created_at TIMESTAMP
  -- Sipariş oluşturulma zamanı

getting_ready_at TIMESTAMP
  -- Restoran hazırlamaya başlama zamanı (getting_ready)

ready_at TIMESTAMP
  -- Sipariş hazır olma zamanı (ready)

assigned_at TIMESTAMP
  -- Kurye atanma zamanı (assigned)

picked_up_at TIMESTAMP
  -- Restorandan alınma zamanı (picking_up → on_the_way)

delivered_at TIMESTAMP
  -- Teslim edilme zamanı (delivered)

cancelled_at TIMESTAMP
  -- İptal edilme zamanı (cancelled)

cancellation_reason TEXT
  -- İptal nedeni (cancelled)
```

---

## 🎯 Öncelik Sıralaması

```
1. new_order       (En yüksek öncelik - Restoran onayı gerekli)
2. getting_ready   (Yüksek öncelik - Hazırlanıyor)
3. ready           (Yüksek öncelik - Kurye ataması gerekli)
4. assigned        (Orta öncelik - Alım bekleniyor)
5. picking_up      (Orta öncelik - Alım aşamasında)
6. on_the_way      (Orta öncelik - Teslimat aşamasında)
7. delivered       (Düşük öncelik - Tamamlandı)
8. cancelled       (En düşük öncelik - İptal edildi)
```

---

## 🔍 Filtreleme

### Aktif Siparişler
```typescript
isActiveStatus(status)
→ new_order, getting_ready, ready, assigned, picking_up, on_the_way
```

### Tamamlanmış Siparişler
```typescript
isCompletedStatus(status)
→ delivered, cancelled
```

---

## 📈 Örnek Zaman Çizelgesi

```
14:00:00 → new_order        (Müşteri sipariş verdi)
14:01:00 → getting_ready    (Restoran onayladı, hazırlamaya başladı)
14:15:00 → ready            (Sipariş hazır)
14:17:00 → assigned         (Admin kurye atadı)
14:25:00 → picking_up       (Kurye restorana vardı)
14:30:00 → on_the_way       (Kurye paketi aldı)
14:45:00 → delivered        (Müşteriye teslim edildi)

Toplam Süre: 45 dakika ✅
```

---

## 🎯 Özet

**Sipariş Yaşam Döngüsü:**
1. 🔵 YENİ SİPARİŞ (new_order)
2. � HAZIRLANIYOR (getting_ready)
3. 💠 HAZIR (ready)
4. �🟣 ATANDI (assigned)
5. 🟠 ALINIYOR (picking_up)
6. 🟡 YOLDA (on_the_way)
7. 🟢 TESLİM EDİLDİ (delivered)

**veya**

❌ İPTAL EDİLDİ (cancelled) - Her aşamadan

**Toplam Durum:** 8 adet
**Aktif Durum:** 6 adet (new_order → on_the_way)
**Final Durum:** 2 adet (delivered, cancelled)
