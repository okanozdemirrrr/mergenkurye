-- 02.06.2026 05:00 öncesi: kaç paket hâlâ AÇIK (mutabakat bekliyor)?
SELECT
  COUNT(*) FILTER (WHERE courier_settlement_id IS NULL) AS acik_paket,
  COUNT(*) FILTER (WHERE courier_settlement_id IS NOT NULL) AS kapali_paket,
  COUNT(*) AS toplam
FROM packages
WHERE status = 'delivered'
  AND delivered_at <= TIMESTAMPTZ '2026-06-02 05:00:00+03'
  AND delivered_by_courier_id IS NOT NULL;

-- acik_paket > 0 ise bulk_close script'inde ROLLBACK yerine COMMIT ile tekrar çalıştırın
