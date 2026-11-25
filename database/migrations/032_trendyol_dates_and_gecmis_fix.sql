-- =============================================================================
-- 032: Trendyol tarih backfill + yanlış gecmis_veri düzeltmesi
-- 1) ham_payload.packageCreationDate → created_at / package_creation_at
-- 2) packageModificationDate → package_modification_at (+ delivered_at/cancelled_at)
-- 3) Canlı polling event'i olan ama gecmis_veri=true kalmış paketleri geri al
-- =============================================================================

-- 1) Tarih backfill (Trendyol kaynaklı, ham_payload dolu)
UPDATE public.packages p
SET
  package_creation_at = COALESCE(
    p.package_creation_at,
    CASE
      WHEN (p.ham_payload->>'packageCreationDate') ~ '^[0-9]+$'
      THEN to_timestamp(((p.ham_payload->>'packageCreationDate')::bigint) / 1000.0)
      ELSE NULL
    END
  ),
  package_modification_at = COALESCE(
    p.package_modification_at,
    CASE
      WHEN (p.ham_payload->>'packageModificationDate') ~ '^[0-9]+$'
      THEN to_timestamp(((p.ham_payload->>'packageModificationDate')::bigint) / 1000.0)
      ELSE NULL
    END
  ),
  -- Sipariş oluşturulma tarihi = packageCreationDate (import anı değil)
  created_at = COALESCE(
    CASE
      WHEN (p.ham_payload->>'packageCreationDate') ~ '^[0-9]+$'
      THEN to_timestamp(((p.ham_payload->>'packageCreationDate')::bigint) / 1000.0)
      ELSE NULL
    END,
    p.created_at
  ),
  delivered_at = CASE
    WHEN p.status = 'delivered' AND p.delivered_at IS NULL THEN
      COALESCE(
        CASE
          WHEN (p.ham_payload->>'packageModificationDate') ~ '^[0-9]+$'
          THEN to_timestamp(((p.ham_payload->>'packageModificationDate')::bigint) / 1000.0)
          ELSE NULL
        END,
        CASE
          WHEN (p.ham_payload->>'packageCreationDate') ~ '^[0-9]+$'
          THEN to_timestamp(((p.ham_payload->>'packageCreationDate')::bigint) / 1000.0)
          ELSE NULL
        END,
        p.package_modification_at,
        p.package_creation_at
      )
    ELSE p.delivered_at
  END,
  cancelled_at = CASE
    WHEN p.status = 'cancelled' THEN
      COALESCE(
        CASE
          WHEN (p.ham_payload->>'packageModificationDate') ~ '^[0-9]+$'
          THEN to_timestamp(((p.ham_payload->>'packageModificationDate')::bigint) / 1000.0)
          ELSE NULL
        END,
        CASE
          WHEN (p.ham_payload->>'packageCreationDate') ~ '^[0-9]+$'
          THEN to_timestamp(((p.ham_payload->>'packageCreationDate')::bigint) / 1000.0)
          ELSE NULL
        END,
        p.package_modification_at,
        p.package_creation_at,
        p.cancelled_at
      )
    ELSE p.cancelled_at
  END
WHERE p.source = 'trendyol_go'
  AND p.ham_payload IS NOT NULL
  AND (
    (p.ham_payload->>'packageCreationDate') IS NOT NULL
    OR (p.ham_payload->>'packageModificationDate') IS NOT NULL
  );

-- 2) Yanlışlıkla gecmis_veri=true yapılmış canlı siparişler
-- Kanıt: trendyol_go_package_events'te canlı polling (gecmis_veri=false) kaydı
DO $$
DECLARE
  restored_count integer := 0;
BEGIN
  WITH candidates AS (
    SELECT DISTINCT p.id
    FROM public.packages p
    INNER JOIN public.trendyol_go_package_events e
      ON e.local_package_id = p.id
     AND e.gecmis_veri = false
    WHERE p.gecmis_veri = true
      AND p.trendyol_package_id IS NOT NULL
  ),
  fixed AS (
    UPDATE public.packages p
    SET
      gecmis_veri = false,
      -- Geçmiş overwrite ile true olmuş olabilir; GO/maskeli/test değilse kuyruğa aç
      exclude_from_courier_queue = (
        COALESCE(p.is_test_order, false)
        OR COALESCE(p.is_address_masked, false)
        OR upper(COALESCE(p.delivery_type, '')) = 'GO'
      ),
      updated_at = timezone('utc'::text, now())
    FROM candidates c
    WHERE p.id = c.id
    RETURNING p.id
  )
  SELECT COUNT(*)::integer INTO restored_count FROM fixed;

  RAISE NOTICE '032_trendyol_gecmis_fix restored_count=%', restored_count;
END $$;
