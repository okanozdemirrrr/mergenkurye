-- Mutabakat Geçmişi ekranı ile courier_settlements karşılaştırma
-- Supabase SQL Editor (aynı proje: .env NEXT_PUBLIC_SUPABASE_URL)

-- 1) Taha + ~48k
SELECT
  cs.id,
  cs.created_at,
  c.full_name,
  cs.amount_paid,
  cs.received_amount,
  cs.total_cash,
  cs.total_card,
  cs.total_iban,
  cs.total_earned,
  (COALESCE(cs.total_cash, 0) + COALESCE(cs.total_card, 0) + COALESCE(cs.total_iban, 0)) AS tahsilat_toplami,
  cs.start_date,
  cs.end_date,
  cs.notes,
  cs.created_by,
  (SELECT COUNT(*) FROM packages p WHERE p.courier_settlement_id = cs.id) AS bagli_paket
FROM courier_settlements cs
JOIN couriers c ON c.id = cs.courier_id
WHERE c.full_name ILIKE '%taha%'
ORDER BY cs.created_at DESC;

-- 2) Kasaya kolonu ekranda: received_amount > 0 ise o, değilse amount_paid
SELECT id, created_at, amount_paid, received_amount,
       COALESCE(NULLIF(received_amount, 0), amount_paid) AS ekranda_kasaya
FROM courier_settlements
WHERE COALESCE(NULLIF(received_amount, 0), amount_paid) BETWEEN 48000 AND 49000
ORDER BY created_at DESC;

-- 3) Toplam kayıt (UI satır sayısı ile karşılaştır)
SELECT COUNT(*) AS settlement_sayisi FROM courier_settlements;
