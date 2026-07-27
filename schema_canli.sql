--
-- PostgreSQL database dump
--

\restrict dzZztY4ITNcuI25RHDCgXBYVFeCaD03OjQXrQ0JJg9qnWqsVF1CJHmm0kkbz4Xs

-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: user_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.user_role AS ENUM (
    'admin',
    'restaurant',
    'courier'
);


--
-- Name: approve_courier_application(uuid, uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.approve_courier_application(application_id uuid, admin_user_id uuid, company_id_param uuid) RETURNS json
    LANGUAGE plpgsql
    AS $$
DECLARE
  app_data JSONB;
  app_type VARCHAR(20);
  new_user_id UUID;
  new_courier_id UUID;
  result JSON;
BEGIN
  -- Başvuruyu al
  SELECT full_data, type INTO app_data, app_type
  FROM applications
  WHERE id = application_id AND status = 'beklemede';

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Başvuru bulunamadı veya zaten işlenmiş');
  END IF;

  IF app_type != 'kurye' THEN
    RETURN json_build_object('success', false, 'error', 'Bu başvuru kurye başvurusu değil');
  END IF;

  -- Users tablosuna ekle
  INSERT INTO users (
    company_id,
    username,
    password,
    email,
    full_name,
    phone,
    user_type,
    is_active
  ) VALUES (
    company_id_param,
    app_data->>'username',
    app_data->>'password',
    app_data->>'email',
    CONCAT(app_data->>'firstName', ' ', app_data->>'lastName'),
    app_data->>'phone',
    'courier',
    true
  ) RETURNING id INTO new_user_id;

  -- Couriers tablosuna ekle
  INSERT INTO couriers (
    company_id,
    user_id,
    username,
    password,
    full_name,
    is_active,
    status
  ) VALUES (
    company_id_param,
    new_user_id,
    app_data->>'username',
    app_data->>'password',
    CONCAT(app_data->>'firstName', ' ', app_data->>'lastName'),
    true,
    'idle'
  ) RETURNING id INTO new_courier_id;

  -- Başvuru durumunu güncelle (approved_by NULL)
  UPDATE applications
  SET 
    status = 'onaylandı',
    approved_at = NOW(),
    approved_by = NULL
  WHERE id = application_id;

  result := json_build_object(
    'success', true,
    'user_id', new_user_id,
    'courier_id', new_courier_id,
    'message', 'Kurye başvurusu onaylandı'
  );

  RETURN result;

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;


--
-- Name: approve_restaurant_application(uuid, uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.approve_restaurant_application(application_id uuid, admin_user_id uuid, company_id_param uuid) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  app_data JSONB;
  new_restaurant_id UUID;
BEGIN
  -- Başvuru verilerini al
  SELECT full_data INTO app_data
  FROM applications
  WHERE id = application_id AND type = 'restoran' AND status = 'beklemede';

  IF app_data IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Başvuru bulunamadı veya zaten işlenmiş'
    );
  END IF;

  -- Yeni restoran kaydı oluştur
  INSERT INTO restaurants (
    name,
    email,
    phone,
    address,
    latitude,
    longitude,
    username,
    password,
    company_id,
    is_active,
    created_at
  ) VALUES (
    COALESCE(
      NULLIF(app_data ->> 'businessName', ''),
      CONCAT(
        COALESCE(app_data ->> 'firstName', ''),
        ' ',
        COALESCE(app_data ->> 'lastName', '')
      )
    ),
    app_data ->> 'email',
    app_data ->> 'phone',
    COALESCE(
      NULLIF(app_data ->> 'businessAddress', ''),
      app_data ->> 'location'
    ),
    CASE 
      WHEN app_data ->> 'latitude' IS NOT NULL AND app_data ->> 'latitude' != '' 
      THEN (app_data ->> 'latitude')::DECIMAL 
      ELSE NULL 
    END,
    CASE 
      WHEN app_data ->> 'longitude' IS NOT NULL AND app_data ->> 'longitude' != '' 
      THEN (app_data ->> 'longitude')::DECIMAL 
      ELSE NULL 
    END,
    app_data ->> 'username',
    app_data ->> 'password',
    company_id_param,
    true,
    NOW()
  ) RETURNING id INTO new_restaurant_id;

  -- Başvuru durumunu güncelle
  UPDATE applications
  SET 
    status = 'onaylandi',
    approved_at = NOW(),
    approved_by = NULL,
    restaurant_id = new_restaurant_id
  WHERE id = application_id;

  RETURN json_build_object(
    'success', true,
    'message', 'Restoran başvurusu başarıyla onaylandı',
    'restaurant_id', new_restaurant_id
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;


--
-- Name: auto_assign_night_shift_courier(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.auto_assign_night_shift_courier() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_night_courier_id UUID;
  v_local_time TIME;
BEGIN
  -- Zaten kurye atanmışsa dokunma
  IF NEW.courier_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  v_local_time := (NOW() AT TIME ZONE 'Europe/Istanbul')::time;
  -- 00:30 (dahil) ile 02:00 (dahil) arası
  IF v_local_time >= TIME '00:30' AND v_local_time <= TIME '02:00' THEN
    SELECT id
    INTO v_night_courier_id
    FROM couriers
    WHERE is_night_shift = true
    LIMIT 1;
    IF v_night_courier_id IS NOT NULL THEN
      NEW.courier_id := v_night_courier_id;
      NEW.status := 'assigned';
      NEW.assigned_at := COALESCE(NEW.assigned_at, NOW());
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: auto_set_delivered_by_courier_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.auto_set_delivered_by_courier_id() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Eğer status 'delivered' olarak değiştiriliyorsa
    IF NEW.status = 'delivered' THEN
        -- delivered_by_courier_id NULL ise ve courier_id varsa
        IF NEW.delivered_by_courier_id IS NULL AND NEW.courier_id IS NOT NULL THEN
            NEW.delivered_by_courier_id := NEW.courier_id;
            
            -- Log için (opsiyonel)
            RAISE NOTICE 'Auto-set delivered_by_courier_id: Package #% -> Courier %', 
                NEW.id, NEW.courier_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;


--
-- Name: courier_login(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.courier_login(p_username text, p_password text) RETURNS TABLE(id uuid, full_name text, username text, account_status text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.full_name,
    c.username,
    COALESCE(c.account_status, 'active')
  FROM couriers c
  WHERE c.username = p_username
    AND c.password = p_password;

  IF FOUND THEN
    UPDATE couriers
    SET
      is_active = true,
      status = 'idle',
      updated_at = NOW()
    WHERE couriers.username = p_username
      AND couriers.password = p_password
      AND COALESCE(couriers.account_status, 'active') = 'active';
  END IF;
END;
$$;


--
-- Name: create_restaurant_debt_on_delivery(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_restaurant_debt_on_delivery() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_package_fee NUMERIC(10, 2);
    v_should_charge BOOLEAN := FALSE;
BEGIN
    -- Restoranın paket ücretini al
    SELECT COALESCE(package_fee, 100)
    INTO v_package_fee
    FROM restaurants
    WHERE id = NEW.restaurant_id;
    
    -- DURUM 1: Başarıyla teslim edildi
    IF NEW.status = 'delivered' AND (OLD.status IS NULL OR OLD.status != 'delivered') THEN
        v_should_charge := TRUE;
    END IF;
    
    -- DURUM 2: İptal edildi AMA kurye paketi almıştı (EDGE-CASE)
    -- Kural: picked_up_at dolu VEYA courier_id atanmış ise masraf yansır
    IF NEW.status = 'cancelled' AND (OLD.status IS NULL OR OLD.status != 'cancelled') THEN
        IF NEW.picked_up_at IS NOT NULL OR NEW.courier_id IS NOT NULL THEN
            v_should_charge := TRUE;
            RAISE NOTICE 'İPTAL EDGE-CASE: Kurye paketi almıştı, masraf restorana yansıtılıyor. Package ID: %, Courier ID: %, Picked Up: %', 
                NEW.id, NEW.courier_id, NEW.picked_up_at;
        END IF;
    END IF;
    
    -- Masraf kaydı oluştur
    IF v_should_charge THEN
        INSERT INTO restaurant_debts (
            restaurant_id,
            debt_date,
            amount,
            package_count,
            package_fee,
            status
        ) VALUES (
            NEW.restaurant_id,
            CURRENT_DATE,
            v_package_fee,
            1,
            v_package_fee,
            'pending'
        );
        
        RAISE NOTICE 'Restoran masraf kaydı oluşturuldu: Restaurant ID: %, Amount: %, Status: %', 
            NEW.restaurant_id, v_package_fee, NEW.status;
    END IF;
    
    RETURN NEW;
END;
$$;


--
-- Name: FUNCTION create_restaurant_debt_on_delivery(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.create_restaurant_debt_on_delivery() IS 'Paket delivered VEYA iptal edildiğinde (kurye almışsa) otomatik masraf kaydı oluşturur';


--
-- Name: generate_order_number(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_order_number() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Eğer sipariş numarası boş gelirse (manuel girilenlerde)
    IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
        -- lpad fonksiyonu ile numarayı 6 haneye tamamlayıp soluna '0' koyar
        NEW.order_number := lpad(nextval('order_number_seq')::text, 6, '0');
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: get_all_restaurants_financials(timestamp with time zone, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_all_restaurants_financials(p_start_date timestamp with time zone DEFAULT NULL::timestamp with time zone, p_end_date timestamp with time zone DEFAULT NULL::timestamp with time zone) RETURNS json
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_result JSON;
BEGIN
    WITH restaurant_stats AS (
        SELECT 
            r.id,
            r.name,
            r.package_fee,
            -- Kümülatif Hesaplamalar (Bakiye için)
            COALESCE((SELECT SUM(amount) FROM packages WHERE restaurant_id = r.id AND status = 'delivered'), 0) as cum_rev,
            COALESCE((SELECT COUNT(id) FROM packages WHERE restaurant_id = r.id AND status = 'delivered'), 0) as cum_del,
            COALESCE((SELECT COUNT(id) FROM packages WHERE restaurant_id = r.id AND status = 'cancelled' AND is_chargeable_cancellation = true), 0) as cum_can,
            COALESCE((SELECT SUM(amount_paid) FROM restaurant_payment_transactions WHERE restaurant_id = r.id), 0) as cum_pay,
            
            -- Periyot Hesaplamalar (Ekstre için)
            COALESCE((SELECT SUM(amount) FROM packages WHERE restaurant_id = r.id AND status = 'delivered' AND delivered_at >= p_start_date AND delivered_at <= p_end_date), 0) as per_rev,
            COALESCE((SELECT COUNT(id) FROM packages WHERE restaurant_id = r.id AND status = 'delivered' AND delivered_at >= p_start_date AND delivered_at <= p_end_date), 0) as per_del,
            COALESCE((SELECT COUNT(id) FROM packages WHERE restaurant_id = r.id AND status = 'cancelled' AND is_chargeable_cancellation = true AND created_at >= p_start_date AND created_at <= p_end_date), 0) as per_can
        FROM restaurants r
    )
    SELECT json_agg(
        json_build_object(
            'id', s.id,
            'name', s.name,
            'package_fee', s.package_fee,
            'current_balance', s.cum_rev - ((s.cum_del + s.cum_can) * s.package_fee) - s.cum_pay,
            'period', json_build_object(
                'revenue', s.per_rev,
                'cost', (s.per_del + s.per_can) * s.package_fee,
                'total_package_count', s.per_del + s.per_can
            )
        )
    ) INTO v_result
    FROM restaurant_stats s;
    RETURN v_result;
END;
$$;


--
-- Name: get_all_restaurants_unpaid_balances(timestamp with time zone, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_all_restaurants_unpaid_balances(p_start_date timestamp with time zone DEFAULT NULL::timestamp with time zone, p_end_date timestamp with time zone DEFAULT NULL::timestamp with time zone) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_result JSON;
BEGIN
    WITH unpaid AS (
        SELECT
            p.restaurant_id,
            COALESCE(SUM(CASE WHEN p.status = 'delivered' THEN p.amount ELSE 0 END), 0) AS unpaid_rev,
            COUNT(*) AS unpaid_count,
            COALESCE(SUM(CASE WHEN p.status = 'delivered' THEN COALESCE(p.commission_amount, 0) ELSE 0 END), 0) AS unpaid_commission,
            COALESCE(SUM(COALESCE(p.applied_price, r.package_fee, 100)), 0) AS unpaid_cost
        FROM packages p
        JOIN restaurants r ON r.id = p.restaurant_id
        WHERE p.is_paid_to_restaurant = false
          AND (
            (p.status = 'delivered'
             AND (p_start_date IS NULL OR p.delivered_at >= p_start_date)
             AND (p_end_date   IS NULL OR p.delivered_at <= p_end_date))
            OR
            (p.status = 'cancelled' AND p.is_chargeable_cancellation = true
             AND (p_start_date IS NULL OR p.created_at >= p_start_date)
             AND (p_end_date   IS NULL OR p.created_at <= p_end_date))
          )
        GROUP BY p.restaurant_id
    )
    SELECT json_agg(
      json_build_object(
        'id', r.id,
        'name', r.name,
        'package_fee', COALESCE(r.package_fee, 100),
        'unpaid_revenue', COALESCE(u.unpaid_rev, 0),
        'unpaid_package_count', COALESCE(u.unpaid_count, 0),
        'unpaid_cost', COALESCE(u.unpaid_cost, 0),
        'unpaid_commission', COALESCE(u.unpaid_commission, 0),
        'current_balance', COALESCE(u.unpaid_rev, 0) - COALESCE(u.unpaid_cost, 0) - COALESCE(u.unpaid_commission, 0)
      )
    ) INTO v_result
    FROM restaurants r
    LEFT JOIN unpaid u ON u.restaurant_id = r.id;

    RETURN v_result;
END;
$$;


--
-- Name: get_orders_summary(timestamp with time zone, timestamp with time zone, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_orders_summary(p_start_date timestamp with time zone DEFAULT NULL::timestamp with time zone, p_end_date timestamp with time zone DEFAULT NULL::timestamp with time zone, p_status_filter text DEFAULT 'all'::text) RETURNS TABLE(total_orders bigint, total_amount numeric, total_cash numeric, total_card numeric)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(COUNT(id), 0)::bigint as total_orders,
    COALESCE(SUM(CASE WHEN status != 'cancelled' THEN amount ELSE 0 END), 0)::numeric as total_amount,
    COALESCE(SUM(CASE WHEN status != 'cancelled' AND payment_method = 'cash' THEN amount ELSE 0 END), 0)::numeric as total_cash,
    COALESCE(SUM(CASE WHEN status != 'cancelled' AND payment_method IN ('card', 'iban') THEN amount ELSE 0 END), 0)::numeric as total_card
  FROM packages
  WHERE 
    -- Durum filtresi (delivered, cancelled veya all)
    (
      CASE 
        WHEN p_status_filter = 'all' THEN status IN ('delivered', 'cancelled')
        ELSE status = p_status_filter
      END
    )
    -- Tarih aralığı filtreleri (NULL ise tüm zamanları getirir)
    AND (p_start_date IS NULL OR created_at >= p_start_date)
    AND (p_end_date IS NULL OR created_at <= p_end_date);
END;
$$;


--
-- Name: get_restaurant_financial_summary(uuid, date, date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_restaurant_financial_summary(p_restaurant_id uuid, p_start_date date DEFAULT NULL::date, p_end_date date DEFAULT NULL::date) RETURNS TABLE(brut_ciro numeric, toplam_masraf numeric, net_hakedis numeric, onceki_odemeler numeric, net_odenecek numeric, paket_sayisi integer)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    WITH delivered_packages AS (
        -- Brüt Ciro: SADECE başarıyla teslim edilen paketler
        -- İptal edilen paketler ciroya dahil DEĞİL (restoran para kazanmaz)
        SELECT 
            COALESCE(SUM(amount), 0) as total_revenue,
            COUNT(*) as pkg_count
        FROM packages
        WHERE restaurant_id = p_restaurant_id
          AND status = 'delivered'  -- SADECE delivered
          AND (p_start_date IS NULL OR delivered_at >= p_start_date::TIMESTAMPTZ)
          AND (p_end_date IS NULL OR delivered_at <= (p_end_date::DATE + INTERVAL '1 day')::TIMESTAMPTZ)
    ),
    restaurant_costs AS (
        -- Toplam Masraf: restaurant_debts toplamı
        -- Bu tablo hem delivered hem de ücretli iptalleri içerir (trigger sayesinde)
        SELECT COALESCE(SUM(amount), 0) as total_cost
        FROM restaurant_debts
        WHERE restaurant_id = p_restaurant_id
          AND status = 'pending'
          AND (p_start_date IS NULL OR debt_date >= p_start_date)
          AND (p_end_date IS NULL OR debt_date <= p_end_date)
    ),
    previous_payments AS (
        -- Önceki Ödemeler: restaurant_payment_transactions toplamı
        SELECT COALESCE(SUM(amount_paid), 0) as total_paid
        FROM restaurant_payment_transactions
        WHERE restaurant_id = p_restaurant_id
          AND (p_start_date IS NULL OR transaction_date >= p_start_date)
          AND (p_end_date IS NULL OR transaction_date <= p_end_date)
    )
    SELECT 
        dp.total_revenue as brut_ciro,
        rc.total_cost as toplam_masraf,
        (dp.total_revenue - rc.total_cost) as net_hakedis,
        pp.total_paid as onceki_odemeler,
        (dp.total_revenue - rc.total_cost - pp.total_paid) as net_odenecek,
        dp.pkg_count::INTEGER as paket_sayisi
    FROM delivered_packages dp
    CROSS JOIN restaurant_costs rc
    CROSS JOIN previous_payments pp;
END;
$$;


--
-- Name: FUNCTION get_restaurant_financial_summary(p_restaurant_id uuid, p_start_date date, p_end_date date); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_restaurant_financial_summary(p_restaurant_id uuid, p_start_date date, p_end_date date) IS 'YENİ MANTIK: Brüt Ciro (sadece delivered) - Toplam Masraf (delivered + ücretli iptaller) - Önceki Ödemeler';


--
-- Name: get_restaurant_financials_v2(uuid, timestamp with time zone, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_restaurant_financials_v2(p_restaurant_id uuid, p_start_date timestamp with time zone DEFAULT NULL::timestamp with time zone, p_end_date timestamp with time zone DEFAULT NULL::timestamp with time zone) RETURNS json
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_package_fee NUMERIC(10,2);
    v_cum_rev NUMERIC(10,2);
    v_cum_del INT;
    v_cum_can INT;
    v_cum_pay NUMERIC(10,2);
    
    v_per_rev NUMERIC(10,2) := 0;
    v_per_del INT := 0;
    v_per_can INT := 0;
    v_per_pay NUMERIC(10,2) := 0;
    v_result JSON;
BEGIN
    SELECT COALESCE(package_fee, 100) INTO v_package_fee FROM restaurants WHERE id = p_restaurant_id;
    
    -- Kümülatif (Tüm Zamanlar)
    SELECT COALESCE(SUM(amount), 0), COUNT(id) INTO v_cum_rev, v_cum_del FROM packages WHERE restaurant_id = p_restaurant_id AND status = 'delivered';
    SELECT COUNT(id) INTO v_cum_can FROM packages WHERE restaurant_id = p_restaurant_id AND status = 'cancelled' AND is_chargeable_cancellation = true;
    SELECT COALESCE(SUM(amount_paid), 0) INTO v_cum_pay FROM restaurant_payment_transactions WHERE restaurant_id = p_restaurant_id;

    -- Periyot (Ekstre)
    IF p_start_date IS NOT NULL AND p_end_date IS NOT NULL THEN
        SELECT COALESCE(SUM(amount), 0), COUNT(id) INTO v_per_rev, v_per_del FROM packages WHERE restaurant_id = p_restaurant_id AND status = 'delivered' AND delivered_at >= p_start_date AND delivered_at <= p_end_date;
        SELECT COUNT(id) INTO v_per_can FROM packages WHERE restaurant_id = p_restaurant_id AND status = 'cancelled' AND is_chargeable_cancellation = true AND created_at >= p_start_date AND created_at <= p_end_date;
        SELECT COALESCE(SUM(amount_paid), 0) INTO v_per_pay FROM restaurant_payment_transactions WHERE restaurant_id = p_restaurant_id AND created_at >= p_start_date AND created_at <= p_end_date;
    ELSE
        v_per_rev := v_cum_rev; v_per_del := v_cum_del; v_per_can := v_cum_can;
    END IF;

    v_result := json_build_object(
        'package_fee', v_package_fee,
        'current_balance', v_cum_rev - ((v_cum_del + v_cum_can) * v_package_fee) - v_cum_pay,
        'period', json_build_object(
            'revenue', v_per_rev,
            'cost', (v_per_del + v_per_can) * v_package_fee,
            'payments', v_per_pay,
            'delivered_count', v_per_del,
            'total_package_count', v_per_del + v_per_can
        )
    );
    RETURN v_result;
END;
$$;


--
-- Name: get_restaurant_period_financials(uuid, timestamp with time zone, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_restaurant_period_financials(p_restaurant_id uuid, p_start_date timestamp with time zone, p_end_date timestamp with time zone) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_package_fee        NUMERIC(10,2);
    v_unpaid_rev         NUMERIC(10,2) := 0;
    v_unpaid_count       INT           := 0;
    v_unpaid_commission  NUMERIC(10,2) := 0;
    v_unpaid_cost        NUMERIC(10,2) := 0;
    v_paid_rev           NUMERIC(10,2) := 0;
    v_paid_count         INT           := 0;
BEGIN
    SELECT COALESCE(package_fee, 100) INTO v_package_fee
    FROM restaurants WHERE id = p_restaurant_id;

    SELECT
      COALESCE(SUM(CASE WHEN status = 'delivered' THEN amount ELSE 0 END), 0),
      COUNT(*),
      COALESCE(SUM(CASE WHEN status = 'delivered' THEN COALESCE(commission_amount, 0) ELSE 0 END), 0),
      COALESCE(SUM(COALESCE(applied_price, v_package_fee)), 0)
    INTO v_unpaid_rev, v_unpaid_count, v_unpaid_commission, v_unpaid_cost
    FROM packages
    WHERE restaurant_id = p_restaurant_id
      AND is_paid_to_restaurant = false
      AND (
        (status = 'delivered' AND delivered_at >= p_start_date AND delivered_at <= p_end_date)
        OR
        (status = 'cancelled' AND is_chargeable_cancellation = true
         AND created_at >= p_start_date AND created_at <= p_end_date)
      );

    SELECT
      COALESCE(SUM(CASE WHEN status = 'delivered' THEN amount ELSE 0 END), 0),
      COUNT(*)
    INTO v_paid_rev, v_paid_count
    FROM packages
    WHERE restaurant_id = p_restaurant_id
      AND is_paid_to_restaurant = true
      AND (
        (status = 'delivered' AND delivered_at >= p_start_date AND delivered_at <= p_end_date)
        OR
        (status = 'cancelled' AND is_chargeable_cancellation = true
         AND created_at >= p_start_date AND created_at <= p_end_date)
      );

    RETURN json_build_object(
      'package_fee', v_package_fee,
      'unpaid_revenue', v_unpaid_rev,
      'unpaid_package_count', v_unpaid_count,
      'unpaid_cost', v_unpaid_cost,
      'unpaid_commission', v_unpaid_commission,
      'net_payable', v_unpaid_rev - v_unpaid_cost - v_unpaid_commission,
      'paid_revenue', v_paid_rev,
      'paid_package_count', v_paid_count,
      'total_package_count', v_unpaid_count + v_paid_count
    );
END;
$$;


--
-- Name: get_restaurant_web_order_stats(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_restaurant_web_order_stats(p_restaurant_id uuid) RETURNS json
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_result JSON;
    v_package_fee NUMERIC(10, 2);
    v_total_revenue NUMERIC(10, 2);
    v_total_commission NUMERIC(10, 2);
    v_order_count INT;
    v_total_cost NUMERIC(10, 2);
    v_net_payable NUMERIC(10, 2);
BEGIN
    -- Restoran paket başı ücretini al
    SELECT COALESCE(package_fee, 100) INTO v_package_fee
    FROM restaurants WHERE id = p_restaurant_id;
    
    -- Web siparişlerini topla (sadece delivered, iptal edilenler hariç)
    SELECT 
        COALESCE(SUM(amount), 0),
        COALESCE(SUM(commission_amount), 0),
        COUNT(*)
    INTO v_total_revenue, v_total_commission, v_order_count
    FROM packages
    WHERE restaurant_id = p_restaurant_id
      AND platform = 'web'
      AND status = 'delivered'
      AND is_paid_to_restaurant = false;
    
    -- Kurye masrafı hesapla
    v_total_cost := v_order_count * v_package_fee;
    
    -- Net ödenecek hesapla ve yuvarla
    v_net_payable := ROUND(v_total_revenue - v_total_commission - v_total_cost, 2);
    
    -- JSON olarak döndür
    SELECT json_build_object(
        'total_revenue', ROUND(v_total_revenue, 2),
        'total_commission', ROUND(v_total_commission, 2),
        'total_cost', ROUND(v_total_cost, 2),
        'net_payable', v_net_payable,
        'order_count', v_order_count,
        'package_fee', v_package_fee
    ) INTO v_result;
    
    RETURN v_result;
END;
$$;


--
-- Name: get_today_avg_package_amount(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_today_avg_package_amount() RETURNS numeric
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  WITH bounds AS (
    SELECT
      CASE
        WHEN (NOW() AT TIME ZONE 'Europe/Istanbul')::time < TIME '05:00'
        THEN ((NOW() AT TIME ZONE 'Europe/Istanbul')::date - 1)
        ELSE (NOW() AT TIME ZONE 'Europe/Istanbul')::date
      END AS business_date
  )
  SELECT COALESCE(
    ROUND(
      SUM(p.amount) / NULLIF(COUNT(*)::numeric, 0),
      2
    ),
    0
  )::numeric
  FROM packages p
  CROSS JOIN bounds b
  WHERE p.status = 'delivered'
    AND p.amount > 0
    AND p.delivered_at IS NOT NULL
    AND p.delivered_at >= ((b.business_date + TIME '05:00') AT TIME ZONE 'Europe/Istanbul')
    AND p.delivered_at <  (((b.business_date + INTERVAL '1 day') + TIME '05:00') AT TIME ZONE 'Europe/Istanbul');
$$;


--
-- Name: normalize_delivery_address(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.normalize_delivery_address() RETURNS trigger
    LANGUAGE plpgsql
    AS $_$
DECLARE
  v_tarif TEXT;
  v_core TEXT;
  v_match TEXT[];
BEGIN
  IF NEW.delivery_address IS NULL OR btrim(NEW.delivery_address) = '' THEN
    RETURN NEW;
  END IF;

  IF NEW.delivery_address ~* '\|\s*Tarif:' THEN
    v_tarif := btrim(substring(NEW.delivery_address FROM '\|\s*Tarif:\s*(.+)$'));
    v_core := btrim(substring(NEW.delivery_address FROM '^(.+?)(?:\s*\|\s*Tarif:)'));
  ELSE
    v_core := btrim(NEW.delivery_address);
    v_tarif := NULL;
  END IF;

  v_match := regexp_match(
    v_core,
    '^[^-]+\s*-\s*([^,]+),\s*([^,]+),\s*Kat:\s*([^,]+),\s*No:\s*(.+)$',
    'i'
  );

  IF v_match IS NOT NULL THEN
    v_core := btrim(v_match[2]) || ', ' || btrim(v_match[1]) || ', Kat: ' || btrim(v_match[3]) || ', No: ' || btrim(v_match[4]);
  END IF;

  IF v_tarif IS NOT NULL AND v_tarif <> '' THEN
    NEW.delivery_address := v_core || ' | Tarif: ' || v_tarif;
  ELSE
    NEW.delivery_address := v_core;
  END IF;

  RETURN NEW;
END;
$_$;


--
-- Name: notify_customer_on_order_status_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_customer_on_order_status_change() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  notification_title TEXT;
  notification_message TEXT;
BEGIN
  -- Sadece belirli durum değişikliklerinde bildirim gönder
  IF NEW.status != OLD.status THEN
    CASE NEW.status
      WHEN 'ready' THEN
        notification_title := '👨‍🍳 Siparişiniz Hazır!';
        notification_message := 'Siparişiniz ' || NEW.order_number || ' hazırlandı ve kurye ataması bekleniyor.';
      WHEN 'assigned' THEN
        notification_title := '🛵 Kurye Atandı!';
        notification_message := 'Siparişiniz ' || NEW.order_number || ' için kurye atandı. Yakında yola çıkacak.';
      WHEN 'on_the_way' THEN
        notification_title := '🚀 Siparişiniz Yolda!';
        notification_message := 'Kurye siparişinizi ' || NEW.order_number || ' getiriyor. Hazır olun!';
      WHEN 'delivered' THEN
        notification_title := '✅ Teslim Edildi!';
        notification_message := 'Siparişiniz ' || NEW.order_number || ' teslim edildi. Afiyet olsun!';
      ELSE
        RETURN NEW;
    END CASE;
    
    INSERT INTO notifications (
      customer_id,
      title,
      message,
      type,
      related_order_id,
      action_url
    ) VALUES (
      NEW.customer_id,
      notification_title,
      notification_message,
      'order_update',
      NEW.id,
      '/musteri/siparislerim'
    );
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: notify_customer_on_review_reply(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_customer_on_review_reply() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Eğer reply eklendiyse ve önceden yoksa
  IF NEW.reply IS NOT NULL AND (OLD.reply IS NULL OR OLD.reply = '') THEN
    INSERT INTO notifications (
      customer_id,
      title,
      message,
      type,
      related_review_id,
      related_order_id,
      action_url
    )
    SELECT 
      NEW.customer_id,
      '🎉 Yorumunuza Yanıt Var!',
      'Restoranınız yorumunuza yanıt verdi. Hemen inceleyin!',
      'order_reply',
      NEW.id,
      NEW.order_id,
      '/musteri/siparislerim'
    WHERE NOT EXISTS (
      SELECT 1 FROM notifications 
      WHERE related_review_id = NEW.id 
      AND type = 'order_reply'
    );
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: process_restaurant_payment(uuid, timestamp with time zone, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.process_restaurant_payment(p_restaurant_id uuid, p_end_date timestamp with time zone, p_notes text DEFAULT NULL::text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_package_fee   NUMERIC(10,2);
    v_affected_ids  INTEGER[];
    v_total_revenue NUMERIC(10,2);
    v_package_count INTEGER;
    v_total_cost    NUMERIC(10,2);
    v_total_commission NUMERIC(10,2);
    v_net_amount    NUMERIC(10,2);
    v_oldest_date   DATE;
BEGIN
    SELECT COALESCE(package_fee, 100) INTO v_package_fee
    FROM restaurants WHERE id = p_restaurant_id;

    SELECT
      array_agg(id),
      COALESCE(SUM(CASE WHEN status = 'delivered' THEN amount ELSE 0 END), 0),
      COUNT(*),
      COALESCE(SUM(COALESCE(applied_price, v_package_fee)), 0),
      COALESCE(SUM(CASE WHEN status = 'delivered' THEN COALESCE(commission_amount, 0) ELSE 0 END), 0),
      MIN(COALESCE(delivered_at, created_at))::DATE
    INTO v_affected_ids, v_total_revenue, v_package_count, v_total_cost, v_total_commission, v_oldest_date
    FROM packages
    WHERE restaurant_id = p_restaurant_id
      AND is_paid_to_restaurant = false
      AND (
        (status = 'delivered' AND delivered_at <= p_end_date)
        OR
        (status = 'cancelled' AND is_chargeable_cancellation = true AND created_at <= p_end_date)
      );

    IF v_package_count = 0 OR v_affected_ids IS NULL THEN
      RETURN json_build_object(
        'success', false,
        'error', 'Bu tarihe kadar ödenmemiş paket bulunamadı.'
      );
    END IF;

    v_net_amount := v_total_revenue - v_total_cost - v_total_commission;

    UPDATE packages
    SET
      is_paid_to_restaurant = true,
      restaurant_settled_at = NOW()
    WHERE id = ANY(v_affected_ids);

    INSERT INTO restaurant_payment_transactions (
      restaurant_id, transaction_date,
      brut_ciro, toplam_masraf, net_hakedis, amount_paid,
      package_count, order_ids, notes,
      period_start, period_end
    ) VALUES (
      p_restaurant_id, CURRENT_DATE,
      v_total_revenue, v_total_cost,
      GREATEST(v_net_amount, 0), GREATEST(v_net_amount, 0),
      v_package_count, v_affected_ids,
      COALESCE(p_notes, 'Bakiye kapatma — ' || to_char(NOW(), 'DD.MM.YYYY HH24:MI')),
      v_oldest_date, p_end_date::DATE
    );

    RETURN json_build_object(
      'success', true,
      'message', v_package_count || ' paket ödendi olarak işaretlendi.',
      'package_count', v_package_count,
      'revenue', v_total_revenue,
      'cost', v_total_cost,
      'commission', v_total_commission,
      'net_paid', v_net_amount
    );
END;
$$;


--
-- Name: process_restaurant_payment(uuid, timestamp with time zone, timestamp with time zone, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.process_restaurant_payment(p_restaurant_id uuid, p_start_date timestamp with time zone, p_end_date timestamp with time zone, p_notes text DEFAULT NULL::text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_package_fee NUMERIC(10,2);
    v_affected_ids INTEGER[];
    v_total_revenue NUMERIC(10,2);
    v_package_count INTEGER;
    v_total_cost NUMERIC(10,2);
    v_net_amount NUMERIC(10,2);
BEGIN
    -- Restoranın paket ücretini al
    SELECT COALESCE(package_fee, 100) INTO v_package_fee
    FROM restaurants WHERE id = p_restaurant_id;

    -- Filtrelenen aralıktaki ödenmemiş paketleri bul
    SELECT
        array_agg(id),
        COALESCE(SUM(amount), 0),
        COUNT(*)
    INTO v_affected_ids, v_total_revenue, v_package_count
    FROM packages
    WHERE restaurant_id = p_restaurant_id
      AND is_paid_to_restaurant = false
      AND (
        (status = 'delivered' AND delivered_at >= p_start_date AND delivered_at <= p_end_date)
        OR
        (status = 'cancelled' AND is_chargeable_cancellation = true
         AND created_at >= p_start_date AND created_at <= p_end_date)
      );

    -- Ödenmemiş paket yoksa hata dön
    IF v_package_count = 0 OR v_affected_ids IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Bu tarih aralığında ödenmemiş paket bulunamadı.'
        );
    END IF;

    -- Hesapla
    v_total_cost := v_package_count * v_package_fee;
    v_net_amount := v_total_revenue - v_total_cost;

    -- Paketleri ödendi olarak işaretle
    UPDATE packages
    SET is_paid_to_restaurant = true
    WHERE id = ANY(v_affected_ids);

    -- Ödeme makbuzu kaydet (audit log)
    INSERT INTO restaurant_payment_transactions (
        restaurant_id, transaction_date,
        brut_ciro, toplam_masraf, net_hakedis, amount_paid,
        package_count, order_ids, notes,
        period_start, period_end
    ) VALUES (
        p_restaurant_id, CURRENT_DATE,
        v_total_revenue, v_total_cost,
        GREATEST(v_net_amount, 0), GREATEST(v_net_amount, 0),
        v_package_count, v_affected_ids,
        COALESCE(p_notes, 'Dönem Ödemesi — ' || to_char(NOW(), 'DD.MM.YYYY')),
        p_start_date::DATE, p_end_date::DATE
    );

    RETURN json_build_object(
        'success', true,
        'message', v_package_count || ' paket ödendi olarak işaretlendi.',
        'package_count', v_package_count,
        'revenue', v_total_revenue,
        'cost', v_total_cost,
        'net_paid', v_net_amount
    );
END;
$$;


--
-- Name: process_restaurant_settlement(uuid, timestamp with time zone, timestamp with time zone, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.process_restaurant_settlement(p_restaurant_id uuid, p_start_date timestamp with time zone, p_end_date timestamp with time zone, p_notes text DEFAULT NULL::text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_package_fee       NUMERIC(10,2);
  v_affected_ids      INTEGER[];
  v_total_revenue     NUMERIC(10,2);
  v_package_count     INTEGER;
  v_courier_cost      NUMERIC(10,2);
  v_commission        NUMERIC(10,2);
  v_net_paid          NUMERIC(10,2);
  v_settlement_id     UUID;
  v_start_date        DATE;
  v_end_date          DATE;
BEGIN
  IF p_restaurant_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Restoran ID zorunludur.');
  END IF;

  IF p_start_date IS NULL OR p_end_date IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Başlangıç ve bitiş tarihi zorunludur.');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM restaurants WHERE id = p_restaurant_id) THEN
    RETURN json_build_object('success', false, 'error', 'Restoran bulunamadı.');
  END IF;

  SELECT COALESCE(package_fee, 100) INTO v_package_fee
  FROM restaurants
  WHERE id = p_restaurant_id;

  v_start_date := (p_start_date AT TIME ZONE 'Europe/Istanbul')::DATE;
  v_end_date   := (p_end_date   AT TIME ZONE 'Europe/Istanbul')::DATE;

  SELECT
    array_agg(id),
    COALESCE(SUM(CASE WHEN status = 'delivered' THEN amount ELSE 0 END), 0),
    COUNT(*),
    COALESCE(SUM(COALESCE(applied_price, v_package_fee)), 0),
    COALESCE(SUM(
      CASE WHEN status = 'delivered' THEN COALESCE(commission_amount, 0) ELSE 0 END
    ), 0)
  INTO
    v_affected_ids,
    v_total_revenue,
    v_package_count,
    v_courier_cost,
    v_commission
  FROM packages
  WHERE restaurant_id = p_restaurant_id
    AND is_paid_to_restaurant = false
    AND (
      (status = 'delivered'
        AND delivered_at >= p_start_date
        AND delivered_at <= p_end_date)
      OR
      (status = 'cancelled'
        AND is_chargeable_cancellation = true
        AND created_at >= p_start_date
        AND created_at <= p_end_date)
    );

  IF v_package_count = 0 OR v_affected_ids IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Bu tarih aralığında ödenmemiş paket bulunamadı.'
    );
  END IF;

  v_net_paid := v_total_revenue - v_courier_cost - v_commission;

  INSERT INTO restaurant_settlements (
    restaurant_id,
    start_date,
    end_date,
    total_revenue,
    courier_cost,
    commission_amount,
    net_paid,
    package_count,
    notes
  ) VALUES (
    p_restaurant_id,
    v_start_date,
    v_end_date,
    v_total_revenue,
    v_courier_cost,
    v_commission,
    v_net_paid,
    v_package_count,
    COALESCE(
      p_notes,
      'Donem mutabakati - ' || to_char(NOW() AT TIME ZONE 'Europe/Istanbul', 'DD.MM.YYYY HH24:MI')
    )
  )
  RETURNING id INTO v_settlement_id;

  UPDATE packages
  SET
    is_paid_to_restaurant = true,
    restaurant_settled_at = NOW(),
    restaurant_settlement_id = v_settlement_id
  WHERE id = ANY(v_affected_ids);

  -- NOT: restaurant_payment_transactions dual-write kaldırıldı (legacy).
  -- Tek kaynak: restaurant_settlements.

  RETURN json_build_object(
    'success', true,
    'message', v_package_count || ' paket mutabakata alindi.',
    'settlement_id', v_settlement_id,
    'package_count', v_package_count,
    'revenue', v_total_revenue,
    'cost', v_courier_cost,
    'commission', v_commission,
    'net_paid', v_net_paid,
    'start_date', v_start_date,
    'end_date', v_end_date
  );
END;
$$;


--
-- Name: reject_application(uuid, uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.reject_application(application_id uuid, admin_user_id uuid, reason text DEFAULT NULL::text) RETURNS json
    LANGUAGE plpgsql
    AS $$
BEGIN
  UPDATE applications
  SET 
    status = 'reddedildi',
    rejected_at = NOW(),
    rejection_reason = reason
  WHERE id = application_id AND status = 'beklemede';

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Başvuru bulunamadı veya zaten işlenmiş');
  END IF;

  RETURN json_build_object('success', true, 'message', 'Başvuru reddedildi');
END;
$$;


--
-- Name: reopen_application(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.reopen_application(application_id uuid) RETURNS json
    LANGUAGE plpgsql
    AS $$
BEGIN
  UPDATE applications
  SET 
    status = 'beklemede',
    rejected_at = NULL,
    rejection_reason = NULL,
    updated_at = NOW()
  WHERE id = application_id AND status = 'reddedildi';

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Başvuru bulunamadı veya reddedilmiş değil');
  END IF;

  RETURN json_build_object('success', true, 'message', 'Başvuru tekrar değerlendirmeye açıldı');
END;
$$;


--
-- Name: save_courier_settlement_transactional(uuid, numeric, numeric, numeric, numeric, numeric, numeric, text, text, date, date, timestamp with time zone, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.save_courier_settlement_transactional(p_courier_id uuid, p_received_amount numeric, p_total_cash numeric, p_total_card numeric, p_total_iban numeric, p_total_earned numeric, p_remaining_debt numeric, p_notes text DEFAULT NULL::text, p_created_by text DEFAULT 'admin'::text, p_start_date date DEFAULT CURRENT_DATE, p_end_date date DEFAULT CURRENT_DATE, p_scope_start timestamp with time zone DEFAULT NULL::timestamp with time zone, p_scope_end timestamp with time zone DEFAULT NULL::timestamp with time zone) RETURNS TABLE(settlement_id uuid, packages_marked integer)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_settlement_id UUID;
  v_marked_count INTEGER;
BEGIN
  IF p_courier_id IS NULL THEN
    RAISE EXCEPTION 'courier_id gerekli';
  END IF;
  IF p_received_amount IS NULL OR p_received_amount <= 0 THEN
    RAISE EXCEPTION 'received_amount geçersiz';
  END IF;

  INSERT INTO courier_settlements (
    courier_id,
    start_date,
    end_date,
    amount_paid,
    received_amount,
    total_cash,
    total_card,
    total_iban,
    total_earned,
    remaining_debt,
    notes,
    created_by
  )
  VALUES (
    p_courier_id,
    COALESCE(p_start_date, CURRENT_DATE),
    COALESCE(p_end_date, CURRENT_DATE),
    p_received_amount,
    p_received_amount,
    COALESCE(p_total_cash, 0),
    COALESCE(p_total_card, 0),
    COALESCE(p_total_iban, 0),
    COALESCE(p_total_earned, 0),
    COALESCE(p_remaining_debt, 0),
    p_notes,
    COALESCE(p_created_by, 'admin')
  )
  RETURNING id INTO v_settlement_id;

  WITH updated AS (
    UPDATE packages p
    SET
      courier_settlement_id = v_settlement_id,
      courier_settled_at = NOW()
    WHERE p.status = 'delivered'
      AND p.delivered_by_courier_id = p_courier_id
      AND p.courier_settlement_id IS NULL
      AND p.courier_settled_at IS NULL
      AND (
        p_scope_start IS NULL OR p_scope_end IS NULL
        OR (p.delivered_at >= p_scope_start AND p.delivered_at <= p_scope_end)
      )
    RETURNING p.id
  )
  SELECT COUNT(*) INTO v_marked_count FROM updated;

  IF COALESCE(v_marked_count, 0) = 0 THEN
    RAISE EXCEPTION 'Mutabakat için işaretlenecek açık paket bulunamadı';
  END IF;

  RETURN QUERY SELECT v_settlement_id, v_marked_count;
END;
$$;


--
-- Name: seal_commission_on_web_order(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.seal_commission_on_web_order() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_commission_rate NUMERIC(5, 2);
    v_calculated_commission NUMERIC(10, 2);
BEGIN
    -- Sadece platform = 'web' olan siparişler için çalış
    IF NEW.platform = 'web' THEN
        -- KRİTİK KURAL: İptal edilen siparişlerden komisyon alınmaz
        IF NEW.status = 'cancelled' THEN
            NEW.applied_commission_rate := 0.00;
            NEW.commission_amount := 0.00;
            RAISE NOTICE 'İptal edilen sipariş, komisyon 0: Paket #%', NEW.id;
            RETURN NEW;
        END IF;
        
        -- Restoranın güncel komisyon oranını al
        SELECT current_commission_rate 
        INTO v_commission_rate
        FROM restaurants 
        WHERE id = NEW.restaurant_id;
        
        -- Eğer restoran bulunamazsa default %10 kullan
        IF v_commission_rate IS NULL THEN
            v_commission_rate := 10.00;
        END IF;
        
        -- Komisyon tutarını hesapla ve ROUND ile yuvarla (2 ondalık)
        v_calculated_commission := ROUND((NEW.amount * v_commission_rate / 100), 2);
        
        -- Komisyon oranını ve tutarını mühürle
        NEW.applied_commission_rate := v_commission_rate;
        NEW.commission_amount := v_calculated_commission;
        
        -- Log (opsiyonel)
        RAISE NOTICE 'Komisyon mühürlendi: Paket #%, Oran: %, Tutar: %', 
            NEW.id, v_commission_rate, v_calculated_commission;
    ELSE
        -- Web dışı platformlar için komisyon 0
        NEW.applied_commission_rate := 0.00;
        NEW.commission_amount := 0.00;
    END IF;
    
    RETURN NEW;
END;
$$;


--
-- Name: send_campaign_notification(text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.send_campaign_notification(p_title text, p_message text, p_action_url text DEFAULT NULL::text) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
  inserted_count INTEGER;
BEGIN
  INSERT INTO notifications (customer_id, title, message, type, action_url)
  SELECT id, p_title, p_message, 'campaign', p_action_url
  FROM customers;
  
  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count;
END;
$$;


--
-- Name: set_chargeable_cancellation(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_chargeable_cancellation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.status = 'cancelled' THEN
    NEW.is_chargeable_cancellation := (
      COALESCE(OLD.picked_up_at, NEW.picked_up_at) IS NOT NULL
    );
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: set_night_shift_courier(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_night_shift_courier(p_courier_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF p_courier_id IS NULL THEN
    RAISE EXCEPTION 'Kurye ID zorunludur';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM couriers WHERE id = p_courier_id) THEN
    RAISE EXCEPTION 'Kurye bulunamadı: %', p_courier_id;
  END IF;
  UPDATE couriers
  SET is_night_shift = false
  WHERE is_night_shift = true;
  UPDATE couriers
  SET is_night_shift = true
  WHERE id = p_courier_id;
END;
$$;


--
-- Name: set_user_addresses_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_user_addresses_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: update_applications_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_applications_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_category_sort_orders(uuid, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_category_sort_orders(p_restaurant_id uuid, p_updates jsonb) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  item JSONB;
BEGIN
  IF p_updates IS NULL OR jsonb_array_length(p_updates) = 0 THEN
    RETURN;
  END IF;

  FOR item IN SELECT * FROM jsonb_array_elements(p_updates)
  LOOP
    UPDATE categories
    SET
      sort_order = (item->>'sort_order')::INTEGER,
      display_order = (item->>'sort_order')::INTEGER
    WHERE id = (item->>'id')::UUID
      AND restaurant_id = p_restaurant_id;
  END LOOP;
END;
$$;


--
-- Name: update_courier_location_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_courier_location_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF (NEW.last_location IS DISTINCT FROM OLD.last_location) THEN
        NEW.last_location_update = NOW();
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: update_full_name(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_full_name() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.full_name = TRIM(NEW.name || ' ' || COALESCE(NEW.surname, ''));
  RETURN NEW;
END;
$$;


--
-- Name: update_market_products_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_market_products_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_restaurant_debts_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_restaurant_debts_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: app_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_settings (
    key text NOT NULL,
    value text NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE app_settings; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.app_settings IS 'Uygulama geneli ayarlar (force update, feature flags)';


--
-- Name: COLUMN app_settings.key; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.app_settings.key IS 'Ayar anahtarı, örn: min_required_version';


--
-- Name: applications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.applications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    type character varying(20) NOT NULL,
    status character varying(20) DEFAULT 'beklemede'::character varying NOT NULL,
    full_data jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    approved_at timestamp with time zone,
    rejected_at timestamp with time zone,
    approved_by uuid,
    rejection_reason text,
    restaurant_id uuid,
    CONSTRAINT applications_type_check CHECK (((type)::text = ANY ((ARRAY['kurye'::character varying, 'restoran'::character varying])::text[])))
);


--
-- Name: cart_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cart_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_id uuid,
    product_id uuid,
    quantity integer DEFAULT 1,
    item_note text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    restaurant_id uuid,
    name text NOT NULL,
    display_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    icon_url text,
    sort_order integer DEFAULT 0
);


--
-- Name: COLUMN categories.icon_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.categories.icon_url IS 'Kategori ikonu URL';


--
-- Name: COLUMN categories.sort_order; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.categories.sort_order IS 'Kategori görüntüleme sırası (küçükten büyüğe)';


--
-- Name: companies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.companies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_code character varying(50) NOT NULL,
    company_name character varying(255) NOT NULL,
    logo_url text,
    theme_primary_color character varying(7) DEFAULT '#f97316'::character varying,
    theme_secondary_color character varying(7) DEFAULT '#ea580c'::character varying,
    theme_accent_color character varying(7) DEFAULT '#fb923c'::character varying,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: courier_debts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.courier_debts (
    id bigint NOT NULL,
    courier_id uuid NOT NULL,
    debt_date date NOT NULL,
    amount numeric(10,2) NOT NULL,
    remaining_amount numeric(10,2) NOT NULL,
    status text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT courier_debts_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'paid'::text])))
);


--
-- Name: courier_debts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.courier_debts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: courier_debts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.courier_debts_id_seq OWNED BY public.courier_debts.id;


--
-- Name: courier_settlements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.courier_settlements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    courier_id uuid NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    amount_paid numeric(10,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    created_by text DEFAULT 'admin'::text,
    notes text,
    total_cash numeric(10,2) DEFAULT 0,
    total_card numeric(10,2) DEFAULT 0,
    total_iban numeric(10,2) DEFAULT 0,
    total_earned numeric(10,2) DEFAULT 0,
    received_amount numeric(10,2),
    remaining_debt numeric(10,2) DEFAULT 0
);


--
-- Name: TABLE courier_settlements; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.courier_settlements IS 'Kurye gün sonu mutabakatları - Admin kuryeden para aldığında kayıt oluşturulur';


--
-- Name: COLUMN courier_settlements.start_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.courier_settlements.start_date IS 'Mutabakat tarih aralığı başlangıcı';


--
-- Name: COLUMN courier_settlements.end_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.courier_settlements.end_date IS 'Mutabakat tarih aralığı bitişi';


--
-- Name: COLUMN courier_settlements.amount_paid; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.courier_settlements.amount_paid IS 'Admin tarafından kuryeden alınan tutar (eksik, tam veya fazla olabilir)';


--
-- Name: couriers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.couriers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    username text NOT NULL,
    password text NOT NULL,
    full_name text NOT NULL,
    is_active boolean DEFAULT false,
    status text DEFAULT 'idle'::text,
    last_lat numeric(10,8),
    last_lng numeric(11,8),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    last_update timestamp with time zone DEFAULT now(),
    last_location jsonb,
    last_location_update timestamp with time zone,
    company_id uuid,
    user_id uuid,
    fcm_token text,
    account_status text DEFAULT 'active'::text,
    payment_type text DEFAULT 'paket_basi'::text,
    package_rate numeric(10,2) DEFAULT NULL::numeric,
    has_seen_v2_update boolean DEFAULT false,
    is_night_shift boolean DEFAULT false NOT NULL,
    CONSTRAINT couriers_account_status_check CHECK ((account_status = ANY (ARRAY['active'::text, 'suspended'::text, 'terminated'::text]))),
    CONSTRAINT couriers_payment_type_check CHECK ((payment_type = ANY (ARRAY['paket_basi'::text, 'saatlik'::text]))),
    CONSTRAINT couriers_status_check CHECK ((status = ANY (ARRAY['idle'::text, 'busy'::text, 'picking_up'::text, 'on_the_way'::text, 'assigned'::text, 'inactive'::text])))
);


--
-- Name: COLUMN couriers.last_location; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.couriers.last_location IS 'Kuryenin son bilinen konumu (JSON: latitude, longitude, updated_at)';


--
-- Name: COLUMN couriers.fcm_token; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.couriers.fcm_token IS 'Firebase Cloud Messaging token for push notifications';


--
-- Name: COLUMN couriers.has_seen_v2_update; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.couriers.has_seen_v2_update IS 'Kurye v2.0 güncelleme modalını gördü mü?';


--
-- Name: COLUMN couriers.is_night_shift; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.couriers.is_night_shift IS 'Gece vardiyacısı kurye. 00:30-02:00 (Europe/Istanbul) arası gelen paketler otomatik atanır.';


--
-- Name: customers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    full_name text NOT NULL,
    phone text,
    email text,
    address text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    latitude numeric(10,8),
    longitude numeric(11,8),
    name text NOT NULL,
    surname text,
    district character varying(100),
    neighborhood character varying(100),
    street_address character varying(255),
    floor character varying(10),
    door_number character varying(10),
    restaurant_id uuid,
    registration_source text DEFAULT 'restaurant_manual'::text NOT NULL,
    CONSTRAINT chk_registration_source CHECK ((registration_source = ANY (ARRAY['restaurant_manual'::text, 'app_user'::text])))
);


--
-- Name: debt_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.debt_transactions (
    id bigint NOT NULL,
    courier_id uuid NOT NULL,
    transaction_date date NOT NULL,
    daily_cash_total numeric(10,2) NOT NULL,
    amount_received numeric(10,2) NOT NULL,
    new_debt_amount numeric(10,2) DEFAULT 0,
    payment_to_debts numeric(10,2) DEFAULT 0,
    notes text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: debt_transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.debt_transactions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: debt_transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.debt_transactions_id_seq OWNED BY public.debt_transactions.id;


--
-- Name: incoming_calls; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.incoming_calls (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    restaurant_id uuid NOT NULL,
    phone_number text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    is_handled boolean DEFAULT false
);


--
-- Name: market_products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.market_products (
    id bigint NOT NULL,
    name character varying(255) NOT NULL,
    category character varying(100) NOT NULL,
    price numeric(10,2) NOT NULL,
    discount_price numeric(10,2),
    discount_percentage integer,
    unit character varying(50) DEFAULT '1 Adet'::character varying NOT NULL,
    description text,
    image_url text,
    emoji character varying(10) DEFAULT '📦'::character varying,
    stock_status character varying(20) DEFAULT 'active'::character varying,
    is_featured boolean DEFAULT false,
    sort_order integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    CONSTRAINT market_products_stock_status_check CHECK (((stock_status)::text = ANY ((ARRAY['active'::character varying, 'out_of_stock'::character varying, 'inactive'::character varying])::text[])))
);


--
-- Name: TABLE market_products; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.market_products IS 'Market ürünleri - Admin CMS ile yönetilir';


--
-- Name: COLUMN market_products.category; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.market_products.category IS 'Kategori: firsatlar, yemeklik, et, meyve, sut, kahvalti, atistirmalik, icecek, ekmek, dondurulmus';


--
-- Name: COLUMN market_products.stock_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.market_products.stock_status IS 'Stok durumu: active, out_of_stock, inactive';


--
-- Name: COLUMN market_products.is_featured; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.market_products.is_featured IS 'Öne çıkan ürün mü?';


--
-- Name: COLUMN market_products.sort_order; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.market_products.sort_order IS 'Sıralama önceliği (küçükten büyüğe)';


--
-- Name: market_products_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.market_products_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: market_products_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.market_products_id_seq OWNED BY public.market_products.id;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_id uuid NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    type text NOT NULL,
    is_read boolean DEFAULT false,
    related_order_id integer,
    related_review_id uuid,
    action_url text,
    created_at timestamp with time zone DEFAULT now(),
    read_at timestamp with time zone,
    CONSTRAINT notifications_type_check CHECK ((type = ANY (ARRAY['order_reply'::text, 'campaign'::text, 'system'::text, 'order_update'::text])))
);


--
-- Name: order_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_logs (
    id bigint NOT NULL,
    package_id bigint,
    action character varying(100) NOT NULL,
    details jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE order_logs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.order_logs IS 'Sipariş işlem logları - İptal, durum değişikliği vb.';


--
-- Name: COLUMN order_logs.action; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.order_logs.action IS 'İşlem tipi: cancelled_by_restaurant, cancelled_by_admin, status_changed vb.';


--
-- Name: COLUMN order_logs.details; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.order_logs.details IS 'İşlem detayları JSON formatında';


--
-- Name: order_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.order_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: order_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.order_logs_id_seq OWNED BY public.order_logs.id;


--
-- Name: order_number_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.order_number_seq
    START WITH 1000
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: packages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.packages (
    id bigint NOT NULL,
    customer_name text NOT NULL,
    delivery_address text NOT NULL,
    amount numeric NOT NULL,
    status text DEFAULT 'new_order'::text,
    payment_method text,
    courier_id uuid,
    restaurant_id uuid,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    assigned_at timestamp with time zone,
    picked_up_at timestamp with time zone,
    content text,
    delivered_at timestamp with time zone,
    customer_phone text,
    settled_at timestamp with time zone,
    restaurant_settled_at timestamp with time zone,
    order_number text,
    accepted_at timestamp with time zone,
    latitude double precision,
    longitude double precision,
    source text,
    external_order_number text,
    platform text,
    cancelled_at timestamp with time zone,
    cancelled_by text,
    cancellation_reason text,
    delivery_neighborhood character varying(255),
    company_id uuid,
    customer_id uuid,
    items jsonb DEFAULT '[]'::jsonb,
    subtotal numeric(10,2) DEFAULT 0,
    total numeric(10,2) DEFAULT 0,
    delivery_fee numeric(10,2),
    ready_at timestamp with time zone,
    getting_ready_at timestamp with time zone,
    applied_price numeric(10,2),
    delivered_by_courier_id uuid,
    is_chargeable_cancellation boolean DEFAULT false,
    is_paid_to_courier boolean DEFAULT false,
    is_paid_to_restaurant boolean DEFAULT false,
    applied_commission_rate numeric(5,2) DEFAULT 0.00,
    commission_amount numeric(10,2) DEFAULT 0.00,
    courier_settlement_id uuid,
    courier_settled_at timestamp with time zone,
    is_courier_settled boolean DEFAULT false,
    is_courier_earned_paid boolean DEFAULT false,
    restaurant_settlement_id uuid,
    CONSTRAINT packages_payment_method_check CHECK ((payment_method = ANY (ARRAY['cash'::text, 'card'::text, 'iban'::text]))),
    CONSTRAINT packages_status_check CHECK ((status = ANY (ARRAY['new_order'::text, 'getting_ready'::text, 'ready'::text, 'assigned'::text, 'picking_up'::text, 'on_the_way'::text, 'delivered'::text, 'cancelled'::text, 'waiting'::text, 'pending'::text])))
);


--
-- Name: COLUMN packages.assigned_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.packages.assigned_at IS 'Kurye atandığı zaman (admin tarafından)';


--
-- Name: COLUMN packages.picked_up_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.packages.picked_up_at IS 'Kurye paketi restorandan aldığı zaman';


--
-- Name: COLUMN packages.delivered_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.packages.delivered_at IS 'Paketin müşteriye teslim edildiği zaman';


--
-- Name: COLUMN packages.accepted_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.packages.accepted_at IS 'Kurye paketi kabul ettiği zaman';


--
-- Name: COLUMN packages.ready_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.packages.ready_at IS 'Restoran siparişi hazır olarak işaretlediğinde (TIMESTAMPTZ - UTC)';


--
-- Name: COLUMN packages.getting_ready_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.packages.getting_ready_at IS 'Restoran siparişi hazırlamaya başladığında (TIMESTAMPTZ - UTC)';


--
-- Name: COLUMN packages.applied_price; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.packages.applied_price IS 'Paketin oluşturulduğu andaki paket başı ücret (snapshot). Fiyat değişiklikleri geçmiş siparişleri etkilemez.';


--
-- Name: COLUMN packages.delivered_by_courier_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.packages.delivered_by_courier_id IS 'Paketi teslim eden kurye (kurye değişikliğinde bile değişmez)';


--
-- Name: COLUMN packages.is_chargeable_cancellation; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.packages.is_chargeable_cancellation IS 'Ücretli iptal mi? true = Kurye paketi aldıktan sonra iptal (hesaplamalara dahil), false = Kurye paketi almadan önce iptal (hesaplamalara dahil değil)';


--
-- Name: packages_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.packages ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.packages_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: product_option_groups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_option_groups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid,
    name text NOT NULL,
    type text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    necessity boolean DEFAULT false NOT NULL,
    CONSTRAINT product_option_groups_type_check CHECK ((type = ANY (ARRAY['radio'::text, 'checkbox'::text])))
);


--
-- Name: product_options; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_options (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    group_id uuid,
    name text NOT NULL,
    price_modifier numeric(10,2) DEFAULT 0.00 NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);


--
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    restaurant_id uuid,
    category_id uuid,
    name text NOT NULL,
    description text,
    price numeric(10,2) NOT NULL,
    image_url text,
    is_available boolean DEFAULT true,
    display_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    is_visible boolean DEFAULT true,
    upsell_product_ids text[] DEFAULT '{}'::text[],
    related_products text[],
    options jsonb DEFAULT '[]'::jsonb,
    option_groups jsonb DEFAULT '[]'::jsonb
);


--
-- Name: COLUMN products.image_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.products.image_url IS 'Ürün görseli URL';


--
-- Name: COLUMN products.is_visible; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.products.is_visible IS 'Ürünün müşteri panelinde görünür olup olmadığı';


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    full_name text NOT NULL,
    is_active boolean DEFAULT false,
    work_status text DEFAULT 'idle'::text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    status text DEFAULT 'idle'::text,
    last_lat double precision,
    last_lng double precision
);


--
-- Name: read_announcements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.read_announcements (
    user_id text NOT NULL,
    announcement_id uuid NOT NULL,
    read_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: restaurant_debts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.restaurant_debts (
    id bigint NOT NULL,
    restaurant_id uuid NOT NULL,
    debt_date date NOT NULL,
    amount numeric(10,2) NOT NULL,
    status text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    package_count integer DEFAULT 0 NOT NULL,
    package_fee numeric(10,2) DEFAULT 100 NOT NULL,
    CONSTRAINT restaurant_debts_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'paid'::text])))
);


--
-- Name: restaurant_debts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.restaurant_debts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: restaurant_debts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.restaurant_debts_id_seq OWNED BY public.restaurant_debts.id;


--
-- Name: restaurant_payment_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.restaurant_payment_transactions (
    id bigint NOT NULL,
    restaurant_id uuid NOT NULL,
    transaction_date date NOT NULL,
    brut_ciro numeric(10,2) NOT NULL,
    amount_paid numeric(10,2) NOT NULL,
    new_debt_amount numeric(10,2) DEFAULT 0,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    toplam_masraf numeric(10,2) DEFAULT 0 NOT NULL,
    net_hakedis numeric(10,2) DEFAULT 0 NOT NULL,
    package_count integer DEFAULT 0 NOT NULL,
    order_ids integer[] DEFAULT '{}'::integer[],
    period_start date,
    period_end date
);


--
-- Name: COLUMN restaurant_payment_transactions.period_start; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.restaurant_payment_transactions.period_start IS 'Ödemenin kapsadığı dönem başlangıcı (opsiyonel)';


--
-- Name: COLUMN restaurant_payment_transactions.period_end; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.restaurant_payment_transactions.period_end IS 'Ödemenin kapsadığı dönem bitişi (opsiyonel)';


--
-- Name: restaurant_payment_transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.restaurant_payment_transactions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: restaurant_payment_transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.restaurant_payment_transactions_id_seq OWNED BY public.restaurant_payment_transactions.id;


--
-- Name: restaurant_settlements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.restaurant_settlements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    restaurant_id uuid NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    total_revenue numeric(10,2) DEFAULT 0 NOT NULL,
    courier_cost numeric(10,2) DEFAULT 0 NOT NULL,
    commission_amount numeric(10,2) DEFAULT 0 NOT NULL,
    net_paid numeric(10,2) DEFAULT 0 NOT NULL,
    package_count integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by text DEFAULT 'admin'::text,
    notes text
);


--
-- Name: TABLE restaurant_settlements; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.restaurant_settlements IS 'Restoran dönem mutabakat fişleri — Hesap Öde işleminde oluşturulur';


--
-- Name: restaurants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.restaurants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    password text,
    phone text,
    address text,
    maps_link text,
    delivery_fee numeric DEFAULT 100,
    logo_url text,
    latitude numeric(10,8),
    longitude numeric(11,8),
    company_id uuid,
    user_id uuid,
    cover_image_url text,
    rating numeric(2,1) DEFAULT 4.5,
    estimated_delivery_time text DEFAULT '20-30 dk'::text,
    category text DEFAULT 'Genel'::text,
    is_open boolean DEFAULT true,
    has_campaign boolean DEFAULT false,
    minimum_order_value numeric(10,2) DEFAULT 0,
    description text,
    working_hours character varying(100),
    is_active boolean DEFAULT true,
    package_fee numeric(10,2) DEFAULT 100.00,
    email character varying(255),
    username character varying(100),
    has_seen_v2_update boolean DEFAULT false,
    categories text[] DEFAULT '{}'::text[],
    current_commission_rate numeric(5,2) DEFAULT 10.00
);


--
-- Name: COLUMN restaurants.logo_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.restaurants.logo_url IS 'Logo URL';


--
-- Name: COLUMN restaurants.cover_image_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.restaurants.cover_image_url IS 'Kapak fotoğrafı URL';


--
-- Name: COLUMN restaurants.description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.restaurants.description IS 'Restoran açıklaması/tanıtımı';


--
-- Name: COLUMN restaurants.working_hours; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.restaurants.working_hours IS 'Çalışma saatleri (Örn: 09:00 - 23:00)';


--
-- Name: COLUMN restaurants.has_seen_v2_update; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.restaurants.has_seen_v2_update IS 'Restoran v2.0 güncelleme modalını gördü mü?';


--
-- Name: reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id integer NOT NULL,
    customer_id uuid NOT NULL,
    restaurant_id uuid NOT NULL,
    rating_taste integer NOT NULL,
    rating_delivery integer NOT NULL,
    comment text,
    reply text,
    created_at timestamp with time zone DEFAULT now(),
    replied_at timestamp with time zone,
    CONSTRAINT reviews_rating_delivery_check CHECK (((rating_delivery >= 1) AND (rating_delivery <= 5))),
    CONSTRAINT reviews_rating_taste_check CHECK (((rating_taste >= 1) AND (rating_taste <= 5)))
);


--
-- Name: TABLE reviews; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.reviews IS 'Müşteri değerlendirmeleri ve restoran cevapları';


--
-- Name: COLUMN reviews.order_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.reviews.order_id IS 'Değerlendirilen sipariş (benzersiz)';


--
-- Name: COLUMN reviews.rating_taste; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.reviews.rating_taste IS 'Lezzet puanı (1-5)';


--
-- Name: COLUMN reviews.rating_delivery; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.reviews.rating_delivery IS 'Teslimat puanı (1-5)';


--
-- Name: system_announcements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_announcements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_addresses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_addresses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title text DEFAULT 'Ev'::text NOT NULL,
    full_address text NOT NULL,
    latitude double precision,
    longitude double precision,
    is_default boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    username character varying(100) NOT NULL,
    password character varying(255) NOT NULL,
    email character varying(255),
    full_name character varying(255),
    phone character varying(20),
    user_type character varying(20) NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT users_user_type_check CHECK (((user_type)::text = ANY ((ARRAY['admin'::character varying, 'courier'::character varying, 'restaurant'::character varying])::text[])))
);


--
-- Name: courier_debts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courier_debts ALTER COLUMN id SET DEFAULT nextval('public.courier_debts_id_seq'::regclass);


--
-- Name: debt_transactions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.debt_transactions ALTER COLUMN id SET DEFAULT nextval('public.debt_transactions_id_seq'::regclass);


--
-- Name: market_products id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.market_products ALTER COLUMN id SET DEFAULT nextval('public.market_products_id_seq'::regclass);


--
-- Name: order_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_logs ALTER COLUMN id SET DEFAULT nextval('public.order_logs_id_seq'::regclass);


--
-- Name: restaurant_debts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.restaurant_debts ALTER COLUMN id SET DEFAULT nextval('public.restaurant_debts_id_seq'::regclass);


--
-- Name: restaurant_payment_transactions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.restaurant_payment_transactions ALTER COLUMN id SET DEFAULT nextval('public.restaurant_payment_transactions_id_seq'::regclass);


--
-- Name: app_settings app_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_settings
    ADD CONSTRAINT app_settings_pkey PRIMARY KEY (key);


--
-- Name: applications applications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_pkey PRIMARY KEY (id);


--
-- Name: cart_items cart_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_pkey PRIMARY KEY (id);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: companies companies_company_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_company_code_key UNIQUE (company_code);


--
-- Name: companies companies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_pkey PRIMARY KEY (id);


--
-- Name: courier_debts courier_debts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courier_debts
    ADD CONSTRAINT courier_debts_pkey PRIMARY KEY (id);


--
-- Name: courier_settlements courier_settlements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courier_settlements
    ADD CONSTRAINT courier_settlements_pkey PRIMARY KEY (id);


--
-- Name: couriers couriers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.couriers
    ADD CONSTRAINT couriers_pkey PRIMARY KEY (id);


--
-- Name: couriers couriers_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.couriers
    ADD CONSTRAINT couriers_username_key UNIQUE (username);


--
-- Name: customers customers_phone_restaurant_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_phone_restaurant_unique UNIQUE (phone, restaurant_id);


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);


--
-- Name: debt_transactions debt_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.debt_transactions
    ADD CONSTRAINT debt_transactions_pkey PRIMARY KEY (id);


--
-- Name: incoming_calls incoming_calls_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incoming_calls
    ADD CONSTRAINT incoming_calls_pkey PRIMARY KEY (id);


--
-- Name: market_products market_products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.market_products
    ADD CONSTRAINT market_products_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: order_logs order_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_logs
    ADD CONSTRAINT order_logs_pkey PRIMARY KEY (id);


--
-- Name: packages packages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.packages
    ADD CONSTRAINT packages_pkey PRIMARY KEY (id);


--
-- Name: product_option_groups product_option_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_option_groups
    ADD CONSTRAINT product_option_groups_pkey PRIMARY KEY (id);


--
-- Name: product_options product_options_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_options
    ADD CONSTRAINT product_options_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: read_announcements read_announcements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.read_announcements
    ADD CONSTRAINT read_announcements_pkey PRIMARY KEY (user_id, announcement_id);


--
-- Name: restaurant_debts restaurant_debts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.restaurant_debts
    ADD CONSTRAINT restaurant_debts_pkey PRIMARY KEY (id);


--
-- Name: restaurant_payment_transactions restaurant_payment_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.restaurant_payment_transactions
    ADD CONSTRAINT restaurant_payment_transactions_pkey PRIMARY KEY (id);


--
-- Name: restaurant_settlements restaurant_settlements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.restaurant_settlements
    ADD CONSTRAINT restaurant_settlements_pkey PRIMARY KEY (id);


--
-- Name: restaurants restaurants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.restaurants
    ADD CONSTRAINT restaurants_pkey PRIMARY KEY (id);


--
-- Name: reviews reviews_order_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_order_id_key UNIQUE (order_id);


--
-- Name: reviews reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);


--
-- Name: system_announcements system_announcements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_announcements
    ADD CONSTRAINT system_announcements_pkey PRIMARY KEY (id);


--
-- Name: packages unique_order_per_platform; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.packages
    ADD CONSTRAINT unique_order_per_platform UNIQUE (order_number, platform);


--
-- Name: user_addresses user_addresses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_addresses
    ADD CONSTRAINT user_addresses_pkey PRIMARY KEY (id);


--
-- Name: users users_company_id_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_company_id_username_key UNIQUE (company_id, username);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_applications_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_applications_created_at ON public.applications USING btree (created_at DESC);


--
-- Name: idx_applications_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_applications_status ON public.applications USING btree (status);


--
-- Name: idx_applications_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_applications_type ON public.applications USING btree (type);


--
-- Name: idx_applications_type_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_applications_type_status ON public.applications USING btree (type, status);


--
-- Name: idx_cart_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cart_customer ON public.cart_items USING btree (customer_id);


--
-- Name: idx_categories_restaurant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_categories_restaurant ON public.categories USING btree (restaurant_id);


--
-- Name: idx_categories_restaurant_sort_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_categories_restaurant_sort_order ON public.categories USING btree (restaurant_id, sort_order);


--
-- Name: idx_courier_debts_courier_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_courier_debts_courier_id ON public.courier_debts USING btree (courier_id);


--
-- Name: idx_courier_debts_debt_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_courier_debts_debt_date ON public.courier_debts USING btree (debt_date);


--
-- Name: idx_courier_debts_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_courier_debts_status ON public.courier_debts USING btree (status);


--
-- Name: idx_courier_settlements_courier_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_courier_settlements_courier_id ON public.courier_settlements USING btree (courier_id);


--
-- Name: idx_courier_settlements_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_courier_settlements_created_at ON public.courier_settlements USING btree (created_at);


--
-- Name: idx_courier_settlements_dates; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_courier_settlements_dates ON public.courier_settlements USING btree (start_date, end_date);


--
-- Name: idx_couriers_account_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_couriers_account_status ON public.couriers USING btree (account_status);


--
-- Name: idx_couriers_active_location; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_couriers_active_location ON public.couriers USING btree (is_active, last_location_update) WHERE (is_active = true);


--
-- Name: idx_couriers_company; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_couriers_company ON public.couriers USING btree (company_id);


--
-- Name: idx_couriers_fcm_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_couriers_fcm_token ON public.couriers USING btree (fcm_token);


--
-- Name: idx_couriers_has_seen_v2_update; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_couriers_has_seen_v2_update ON public.couriers USING btree (has_seen_v2_update);


--
-- Name: idx_couriers_last_location; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_couriers_last_location ON public.couriers USING gin (last_location);


--
-- Name: idx_couriers_night_shift; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_couriers_night_shift ON public.couriers USING btree (id) WHERE (is_night_shift = true);


--
-- Name: idx_couriers_username; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_couriers_username ON public.couriers USING btree (username);


--
-- Name: idx_customers_district; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customers_district ON public.customers USING btree (district);


--
-- Name: idx_customers_neighborhood; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customers_neighborhood ON public.customers USING btree (neighborhood);


--
-- Name: idx_customers_phone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customers_phone ON public.customers USING btree (phone);


--
-- Name: idx_customers_registration_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customers_registration_source ON public.customers USING btree (registration_source);


--
-- Name: idx_debt_transactions_courier_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_debt_transactions_courier_id ON public.debt_transactions USING btree (courier_id);


--
-- Name: idx_debt_transactions_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_debt_transactions_date ON public.debt_transactions USING btree (transaction_date);


--
-- Name: idx_market_products_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_market_products_category ON public.market_products USING btree (category);


--
-- Name: idx_market_products_featured; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_market_products_featured ON public.market_products USING btree (is_featured);


--
-- Name: idx_market_products_sort_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_market_products_sort_order ON public.market_products USING btree (sort_order);


--
-- Name: idx_market_products_stock_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_market_products_stock_status ON public.market_products USING btree (stock_status);


--
-- Name: idx_notifications_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_created_at ON public.notifications USING btree (created_at DESC);


--
-- Name: idx_notifications_customer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_customer_id ON public.notifications USING btree (customer_id);


--
-- Name: idx_notifications_customer_unread; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_customer_unread ON public.notifications USING btree (customer_id, is_read) WHERE (is_read = false);


--
-- Name: idx_notifications_is_read; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_is_read ON public.notifications USING btree (is_read);


--
-- Name: idx_order_logs_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_logs_action ON public.order_logs USING btree (action);


--
-- Name: idx_order_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_logs_created_at ON public.order_logs USING btree (created_at DESC);


--
-- Name: idx_order_logs_package_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_logs_package_id ON public.order_logs USING btree (package_id);


--
-- Name: idx_packages_accepted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_packages_accepted_at ON public.packages USING btree (accepted_at);


--
-- Name: idx_packages_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_packages_active ON public.packages USING btree (status, courier_id) WHERE (status <> ALL (ARRAY['delivered'::text, 'cancelled'::text]));


--
-- Name: idx_packages_assigned_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_packages_assigned_at ON public.packages USING btree (assigned_at);


--
-- Name: idx_packages_cancelled_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_packages_cancelled_at ON public.packages USING btree (cancelled_at) WHERE (cancelled_at IS NOT NULL);


--
-- Name: idx_packages_chargeable_cancellation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_packages_chargeable_cancellation ON public.packages USING btree (is_chargeable_cancellation) WHERE (status = 'cancelled'::text);


--
-- Name: idx_packages_company; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_packages_company ON public.packages USING btree (company_id);


--
-- Name: idx_packages_coordinates; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_packages_coordinates ON public.packages USING btree (latitude, longitude) WHERE ((latitude IS NOT NULL) AND (longitude IS NOT NULL));


--
-- Name: idx_packages_courier_open_v3; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_packages_courier_open_v3 ON public.packages USING btree (delivered_by_courier_id, delivered_at) WHERE ((status = 'delivered'::text) AND (courier_settlement_id IS NULL) AND (courier_settled_at IS NULL));


--
-- Name: idx_packages_courier_payment_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_packages_courier_payment_status ON public.packages USING btree (delivered_by_courier_id, is_paid_to_courier, delivered_at);


--
-- Name: idx_packages_courier_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_packages_courier_status ON public.packages USING btree (courier_id, status) WHERE (status = ANY (ARRAY['assigned'::text, 'on_the_way'::text]));


--
-- Name: idx_packages_customer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_packages_customer_id ON public.packages USING btree (customer_id);


--
-- Name: idx_packages_delivered; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_packages_delivered ON public.packages USING btree (status, delivered_at DESC) WHERE (status = 'delivered'::text);


--
-- Name: idx_packages_delivered_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_packages_delivered_at ON public.packages USING btree (delivered_at);


--
-- Name: idx_packages_delivered_by_courier; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_packages_delivered_by_courier ON public.packages USING btree (delivered_by_courier_id);


--
-- Name: idx_packages_external_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_packages_external_order ON public.packages USING btree (external_order_number, source);


--
-- Name: idx_packages_getting_ready_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_packages_getting_ready_at ON public.packages USING btree (getting_ready_at);


--
-- Name: idx_packages_is_paid_to_courier; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_packages_is_paid_to_courier ON public.packages USING btree (is_paid_to_courier) WHERE (is_paid_to_courier = false);


--
-- Name: idx_packages_order_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_packages_order_number ON public.packages USING btree (order_number);


--
-- Name: idx_packages_picked_up_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_packages_picked_up_at ON public.packages USING btree (picked_up_at);


--
-- Name: idx_packages_ready_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_packages_ready_at ON public.packages USING btree (ready_at);


--
-- Name: idx_packages_restaurant_settled_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_packages_restaurant_settled_at ON public.packages USING btree (restaurant_settled_at);


--
-- Name: idx_packages_restaurant_settlement_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_packages_restaurant_settlement_id ON public.packages USING btree (restaurant_settlement_id) WHERE (restaurant_settlement_id IS NOT NULL);


--
-- Name: idx_packages_restaurant_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_packages_restaurant_status ON public.packages USING btree (restaurant_id, status, created_at DESC);


--
-- Name: idx_packages_restaurant_unpaid_v2; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_packages_restaurant_unpaid_v2 ON public.packages USING btree (restaurant_id, delivered_at, created_at) WHERE (is_paid_to_restaurant = false);


--
-- Name: idx_packages_settled_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_packages_settled_at ON public.packages USING btree (settled_at);


--
-- Name: idx_packages_settlement; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_packages_settlement ON public.packages USING btree (courier_settlement_id);


--
-- Name: idx_packages_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_packages_status ON public.packages USING btree (status);


--
-- Name: idx_packages_status_cancelled; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_packages_status_cancelled ON public.packages USING btree (status) WHERE (status = 'cancelled'::text);


--
-- Name: idx_packages_status_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_packages_status_created ON public.packages USING btree (status, created_at DESC);


--
-- Name: idx_packages_status_pending; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_packages_status_pending ON public.packages USING btree (status) WHERE (status = 'pending'::text);


--
-- Name: idx_pkg_is_paid_restaurant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pkg_is_paid_restaurant ON public.packages USING btree (is_paid_to_restaurant);


--
-- Name: idx_products_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_category ON public.products USING btree (category_id);


--
-- Name: idx_products_restaurant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_restaurant ON public.products USING btree (restaurant_id);


--
-- Name: idx_products_upsell_ids; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_upsell_ids ON public.products USING gin (upsell_product_ids);


--
-- Name: idx_read_announcements_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_read_announcements_user_id ON public.read_announcements USING btree (user_id);


--
-- Name: idx_restaurant_debts_restaurant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_restaurant_debts_restaurant_id ON public.restaurant_debts USING btree (restaurant_id);


--
-- Name: idx_restaurant_debts_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_restaurant_debts_status ON public.restaurant_debts USING btree (status);


--
-- Name: idx_restaurant_payment_transactions_restaurant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_restaurant_payment_transactions_restaurant_id ON public.restaurant_payment_transactions USING btree (restaurant_id);


--
-- Name: idx_restaurant_settlements_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_restaurant_settlements_created_at ON public.restaurant_settlements USING btree (created_at DESC);


--
-- Name: idx_restaurant_settlements_dates; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_restaurant_settlements_dates ON public.restaurant_settlements USING btree (start_date, end_date);


--
-- Name: idx_restaurant_settlements_restaurant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_restaurant_settlements_restaurant_id ON public.restaurant_settlements USING btree (restaurant_id);


--
-- Name: idx_restaurants_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_restaurants_category ON public.restaurants USING btree (category);


--
-- Name: idx_restaurants_company; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_restaurants_company ON public.restaurants USING btree (company_id);


--
-- Name: idx_restaurants_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_restaurants_email ON public.restaurants USING btree (email);


--
-- Name: idx_restaurants_has_seen_v2_update; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_restaurants_has_seen_v2_update ON public.restaurants USING btree (has_seen_v2_update);


--
-- Name: idx_restaurants_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_restaurants_is_active ON public.restaurants USING btree (is_active);


--
-- Name: idx_restaurants_is_open; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_restaurants_is_open ON public.restaurants USING btree (is_open);


--
-- Name: idx_restaurants_location; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_restaurants_location ON public.restaurants USING btree (latitude, longitude);


--
-- Name: idx_restaurants_username; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_restaurants_username ON public.restaurants USING btree (username);


--
-- Name: idx_reviews_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reviews_created_at ON public.reviews USING btree (created_at DESC);


--
-- Name: idx_reviews_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reviews_customer ON public.reviews USING btree (customer_id);


--
-- Name: idx_reviews_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reviews_order ON public.reviews USING btree (order_id);


--
-- Name: idx_reviews_restaurant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reviews_restaurant ON public.reviews USING btree (restaurant_id);


--
-- Name: idx_system_announcements_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_announcements_created_at ON public.system_announcements USING btree (created_at DESC);


--
-- Name: idx_user_addresses_user_default; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_addresses_user_default ON public.user_addresses USING btree (user_id, is_default);


--
-- Name: idx_user_addresses_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_addresses_user_id ON public.user_addresses USING btree (user_id);


--
-- Name: idx_users_company_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_company_type ON public.users USING btree (company_id, user_type);


--
-- Name: idx_users_company_username; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_company_username ON public.users USING btree (company_id, username);


--
-- Name: packages gece notifications; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "gece notifications" AFTER INSERT ON public.packages FOR EACH ROW EXECUTE FUNCTION supabase_functions.http_request('https://mergenkuryesistem.vercel.app/api/webhook/night-shift', 'POST', '{"Content-type":"application/json","x-api-secret":"okanbaba44."}', '{}', '5000');


--
-- Name: packages normalize_packages_delivery_address; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER normalize_packages_delivery_address BEFORE INSERT OR UPDATE OF delivery_address ON public.packages FOR EACH ROW EXECUTE FUNCTION public.normalize_delivery_address();


--
-- Name: packages tr_auto_set_delivered_by_courier_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tr_auto_set_delivered_by_courier_id BEFORE UPDATE ON public.packages FOR EACH ROW WHEN ((new.status = 'delivered'::text)) EXECUTE FUNCTION public.auto_set_delivered_by_courier_id();


--
-- Name: packages tr_generate_order_number; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tr_generate_order_number BEFORE INSERT ON public.packages FOR EACH ROW EXECUTE FUNCTION public.generate_order_number();


--
-- Name: user_addresses trg_user_addresses_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_user_addresses_updated_at BEFORE UPDATE ON public.user_addresses FOR EACH ROW EXECUTE FUNCTION public.set_user_addresses_updated_at();


--
-- Name: applications trigger_applications_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_applications_updated_at BEFORE UPDATE ON public.applications FOR EACH ROW EXECUTE FUNCTION public.update_applications_updated_at();


--
-- Name: packages trigger_auto_assign_night_shift_courier; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_auto_assign_night_shift_courier BEFORE INSERT ON public.packages FOR EACH ROW EXECUTE FUNCTION public.auto_assign_night_shift_courier();


--
-- Name: packages trigger_create_restaurant_debt; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_create_restaurant_debt AFTER INSERT OR UPDATE OF status ON public.packages FOR EACH ROW EXECUTE FUNCTION public.create_restaurant_debt_on_delivery();


--
-- Name: reviews trigger_review_reply_notification; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_review_reply_notification AFTER UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.notify_customer_on_review_reply();


--
-- Name: packages trigger_seal_commission; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_seal_commission BEFORE INSERT OR UPDATE ON public.packages FOR EACH ROW EXECUTE FUNCTION public.seal_commission_on_web_order();


--
-- Name: packages trigger_set_chargeable_cancellation; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_set_chargeable_cancellation BEFORE INSERT OR UPDATE ON public.packages FOR EACH ROW EXECUTE FUNCTION public.set_chargeable_cancellation();


--
-- Name: couriers trigger_update_courier_location; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_courier_location BEFORE UPDATE ON public.couriers FOR EACH ROW EXECUTE FUNCTION public.update_courier_location_timestamp();


--
-- Name: market_products trigger_update_market_products_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_market_products_updated_at BEFORE UPDATE ON public.market_products FOR EACH ROW EXECUTE FUNCTION public.update_market_products_updated_at();


--
-- Name: restaurant_debts trigger_update_restaurant_debts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_restaurant_debts_updated_at BEFORE UPDATE ON public.restaurant_debts FOR EACH ROW EXECUTE FUNCTION public.update_restaurant_debts_updated_at();


--
-- Name: companies update_companies_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: customers update_customers_full_name; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_customers_full_name BEFORE INSERT OR UPDATE OF name, surname ON public.customers FOR EACH ROW EXECUTE FUNCTION public.update_full_name();


--
-- Name: customers update_customers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: users update_users_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: applications applications_restaurant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE SET NULL;


--
-- Name: cart_items cart_items_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;


--
-- Name: cart_items cart_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: categories categories_restaurant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;


--
-- Name: courier_debts courier_debts_courier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courier_debts
    ADD CONSTRAINT courier_debts_courier_id_fkey FOREIGN KEY (courier_id) REFERENCES public.couriers(id) ON DELETE CASCADE;


--
-- Name: courier_settlements courier_settlements_courier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courier_settlements
    ADD CONSTRAINT courier_settlements_courier_id_fkey FOREIGN KEY (courier_id) REFERENCES public.couriers(id) ON DELETE CASCADE;


--
-- Name: couriers couriers_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.couriers
    ADD CONSTRAINT couriers_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: couriers couriers_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.couriers
    ADD CONSTRAINT couriers_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: customers customers_restaurant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id);


--
-- Name: debt_transactions debt_transactions_courier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.debt_transactions
    ADD CONSTRAINT debt_transactions_courier_id_fkey FOREIGN KEY (courier_id) REFERENCES public.couriers(id) ON DELETE CASCADE;


--
-- Name: incoming_calls incoming_calls_restaurant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incoming_calls
    ADD CONSTRAINT incoming_calls_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id);


--
-- Name: notifications notifications_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_related_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_related_order_id_fkey FOREIGN KEY (related_order_id) REFERENCES public.packages(id) ON DELETE SET NULL;


--
-- Name: notifications notifications_related_review_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_related_review_id_fkey FOREIGN KEY (related_review_id) REFERENCES public.reviews(id) ON DELETE SET NULL;


--
-- Name: order_logs order_logs_package_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_logs
    ADD CONSTRAINT order_logs_package_id_fkey FOREIGN KEY (package_id) REFERENCES public.packages(id) ON DELETE CASCADE;


--
-- Name: packages packages_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.packages
    ADD CONSTRAINT packages_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: packages packages_courier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.packages
    ADD CONSTRAINT packages_courier_id_fkey FOREIGN KEY (courier_id) REFERENCES public.couriers(id) ON DELETE SET NULL;


--
-- Name: packages packages_courier_settlement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.packages
    ADD CONSTRAINT packages_courier_settlement_id_fkey FOREIGN KEY (courier_settlement_id) REFERENCES public.courier_settlements(id) ON DELETE SET NULL;


--
-- Name: packages packages_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.packages
    ADD CONSTRAINT packages_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL;


--
-- Name: packages packages_delivered_by_courier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.packages
    ADD CONSTRAINT packages_delivered_by_courier_id_fkey FOREIGN KEY (delivered_by_courier_id) REFERENCES public.couriers(id);


--
-- Name: packages packages_restaurant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.packages
    ADD CONSTRAINT packages_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE SET NULL;


--
-- Name: packages packages_restaurant_settlement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.packages
    ADD CONSTRAINT packages_restaurant_settlement_id_fkey FOREIGN KEY (restaurant_settlement_id) REFERENCES public.restaurant_settlements(id) ON DELETE SET NULL;


--
-- Name: product_option_groups product_option_groups_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_option_groups
    ADD CONSTRAINT product_option_groups_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: product_options product_options_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_options
    ADD CONSTRAINT product_options_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.product_option_groups(id) ON DELETE CASCADE;


--
-- Name: products products_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE CASCADE;


--
-- Name: products products_restaurant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;


--
-- Name: read_announcements read_announcements_announcement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.read_announcements
    ADD CONSTRAINT read_announcements_announcement_id_fkey FOREIGN KEY (announcement_id) REFERENCES public.system_announcements(id) ON DELETE CASCADE;


--
-- Name: restaurant_debts restaurant_debts_restaurant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.restaurant_debts
    ADD CONSTRAINT restaurant_debts_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;


--
-- Name: restaurant_payment_transactions restaurant_payment_transactions_restaurant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.restaurant_payment_transactions
    ADD CONSTRAINT restaurant_payment_transactions_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;


--
-- Name: restaurant_settlements restaurant_settlements_restaurant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.restaurant_settlements
    ADD CONSTRAINT restaurant_settlements_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;


--
-- Name: restaurants restaurants_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.restaurants
    ADD CONSTRAINT restaurants_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: restaurants restaurants_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.restaurants
    ADD CONSTRAINT restaurants_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: reviews reviews_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;


--
-- Name: reviews reviews_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.packages(id) ON DELETE CASCADE;


--
-- Name: reviews reviews_restaurant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;


--
-- Name: user_addresses user_addresses_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_addresses
    ADD CONSTRAINT user_addresses_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: users users_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: order_logs Admin can view all logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can view all logs" ON public.order_logs FOR SELECT USING (true);


--
-- Name: market_products Admin market ürünleri ekleyebilir; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin market ürünleri ekleyebilir" ON public.market_products FOR INSERT WITH CHECK (true);


--
-- Name: market_products Admin market ürünleri güncelleyebilir; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin market ürünleri güncelleyebilir" ON public.market_products FOR UPDATE USING (true);


--
-- Name: market_products Admin market ürünleri silebilir; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin market ürünleri silebilir" ON public.market_products FOR DELETE USING (true);


--
-- Name: product_option_groups Allow all actions for anon on groups; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all actions for anon on groups" ON public.product_option_groups TO anon USING (true) WITH CHECK (true);


--
-- Name: product_options Allow all actions for anon on options; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all actions for anon on options" ON public.product_options TO anon USING (true) WITH CHECK (true);


--
-- Name: product_option_groups Allow all actions for authenticated users on groups; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all actions for authenticated users on groups" ON public.product_option_groups TO authenticated USING (true) WITH CHECK (true);


--
-- Name: product_options Allow all actions for authenticated users on options; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all actions for authenticated users on options" ON public.product_options TO authenticated USING (true) WITH CHECK (true);


--
-- Name: customers Allow all operations for customers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all operations for customers" ON public.customers USING (true) WITH CHECK (true);


--
-- Name: courier_settlements Allow insert courier_settlements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow insert courier_settlements" ON public.courier_settlements FOR INSERT TO authenticated, anon WITH CHECK (true);


--
-- Name: couriers Allow public read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read" ON public.couriers FOR SELECT TO authenticated, anon USING (true);


--
-- Name: profiles Allow public update for profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public update for profiles" ON public.profiles FOR UPDATE USING (true);


--
-- Name: courier_settlements Allow read courier_settlements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow read courier_settlements" ON public.courier_settlements FOR SELECT TO authenticated, anon USING (true);


--
-- Name: courier_settlements Allow update courier_settlements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow update courier_settlements" ON public.courier_settlements FOR UPDATE TO authenticated, anon USING (true) WITH CHECK (true);


--
-- Name: packages Allow update packages settlement link; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow update packages settlement link" ON public.packages FOR UPDATE TO authenticated, anon USING (true) WITH CHECK (true);


--
-- Name: reviews Anyone can read reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read reviews" ON public.reviews FOR SELECT USING (true);


--
-- Name: couriers Couriers can update own data; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Couriers can update own data" ON public.couriers FOR UPDATE USING (true);


--
-- Name: reviews Customers can insert their own reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Customers can insert their own reviews" ON public.reviews FOR INSERT WITH CHECK (true);


--
-- Name: notifications Customers can update own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Customers can update own notifications" ON public.notifications FOR UPDATE USING (true) WITH CHECK (true);


--
-- Name: notifications Customers can view own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Customers can view own notifications" ON public.notifications FOR SELECT USING (true);


--
-- Name: packages Customers can view own packages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Customers can view own packages" ON public.packages FOR SELECT USING (true);


--
-- Name: packages Eklenti paket ekleyebilir; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Eklenti paket ekleyebilir" ON public.packages FOR INSERT WITH CHECK (true);


--
-- Name: restaurants Eklenti restoranları görebilir; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Eklenti restoranları görebilir" ON public.restaurants FOR SELECT USING (true);


--
-- Name: restaurant_debts Enable all access for restaurant_debts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable all access for restaurant_debts" ON public.restaurant_debts USING (true);


--
-- Name: restaurant_payment_transactions Enable all access for restaurant_payment_transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable all access for restaurant_payment_transactions" ON public.restaurant_payment_transactions USING (true);


--
-- Name: courier_debts Enable insert for all users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable insert for all users" ON public.courier_debts FOR INSERT WITH CHECK (true);


--
-- Name: debt_transactions Enable insert for all users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable insert for all users" ON public.debt_transactions FOR INSERT WITH CHECK (true);


--
-- Name: notifications Enable insert for all users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable insert for all users" ON public.notifications FOR INSERT WITH CHECK (true);


--
-- Name: courier_debts Enable read access for all users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable read access for all users" ON public.courier_debts FOR SELECT USING (true);


--
-- Name: debt_transactions Enable read access for all users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable read access for all users" ON public.debt_transactions FOR SELECT USING (true);


--
-- Name: courier_debts Enable update for all users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable update for all users" ON public.courier_debts FOR UPDATE USING (true);


--
-- Name: debt_transactions Enable update for all users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable update for all users" ON public.debt_transactions FOR UPDATE USING (true);


--
-- Name: couriers Everyone can view couriers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Everyone can view couriers" ON public.couriers FOR SELECT USING (true);


--
-- Name: categories Herkes kategorileri görebilir; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Herkes kategorileri görebilir" ON public.categories FOR SELECT USING (true);


--
-- Name: market_products Herkes market ürünlerini görebilir; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Herkes market ürünlerini görebilir" ON public.market_products FOR SELECT USING (true);


--
-- Name: product_option_groups Herkes okuyabilir; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Herkes okuyabilir" ON public.product_option_groups FOR SELECT USING (true);


--
-- Name: product_options Herkes okuyabilir; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Herkes okuyabilir" ON public.product_options FOR SELECT USING (true);


--
-- Name: packages Herkes packages okuyabilir; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Herkes packages okuyabilir" ON public.packages FOR SELECT USING (true);


--
-- Name: packages Herkes paketleri görebilir; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Herkes paketleri görebilir" ON public.packages FOR SELECT USING (true);


--
-- Name: restaurants Herkes restoranları görebilir; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Herkes restoranları görebilir" ON public.restaurants FOR SELECT USING (true);


--
-- Name: products Herkes ürünleri görebilir; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Herkes ürünleri görebilir" ON public.products FOR SELECT USING (true);


--
-- Name: reviews Restaurants can update replies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Restaurants can update replies" ON public.reviews FOR UPDATE USING (true);


--
-- Name: incoming_calls Restoranlar sadece kendi cagrilarini gorebilir; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Restoranlar sadece kendi cagrilarini gorebilir" ON public.incoming_calls FOR SELECT USING ((restaurant_id IN ( SELECT restaurants.id
   FROM public.restaurants
  WHERE (restaurants.user_id = auth.uid()))));


--
-- Name: order_logs System can insert logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert logs" ON public.order_logs FOR INSERT WITH CHECK (true);


--
-- Name: user_addresses Users can delete own addresses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own addresses" ON public.user_addresses FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: user_addresses Users can insert own addresses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own addresses" ON public.user_addresses FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: user_addresses Users can update own addresses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own addresses" ON public.user_addresses FOR UPDATE USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: user_addresses Users can view own addresses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own addresses" ON public.user_addresses FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: product_option_groups allow_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY allow_public_read ON public.product_option_groups FOR SELECT USING (true);


--
-- Name: product_options allow_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY allow_public_read ON public.product_options FOR SELECT USING (true);


--
-- Name: product_option_groups allow_public_read_groups; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY allow_public_read_groups ON public.product_option_groups FOR SELECT USING (true);


--
-- Name: product_options allow_public_read_options; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY allow_public_read_options ON public.product_options FOR SELECT USING (true);


--
-- Name: app_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: app_settings app_settings_select_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY app_settings_select_all ON public.app_settings FOR SELECT TO authenticated, anon USING (true);


--
-- Name: courier_debts courier_debts_insert_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY courier_debts_insert_policy ON public.courier_debts FOR INSERT WITH CHECK (true);


--
-- Name: courier_debts courier_debts_select_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY courier_debts_select_policy ON public.courier_debts FOR SELECT USING (true);


--
-- Name: courier_debts courier_debts_update_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY courier_debts_update_policy ON public.courier_debts FOR UPDATE USING (true) WITH CHECK (true);


--
-- Name: couriers couriers_delete_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY couriers_delete_policy ON public.couriers FOR DELETE USING (true);


--
-- Name: couriers couriers_insert_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY couriers_insert_policy ON public.couriers FOR INSERT WITH CHECK (true);


--
-- Name: couriers couriers_select_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY couriers_select_all ON public.couriers FOR SELECT TO authenticated, anon USING (true);


--
-- Name: couriers couriers_select_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY couriers_select_policy ON public.couriers FOR SELECT USING (true);


--
-- Name: couriers couriers_update_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY couriers_update_all ON public.couriers FOR UPDATE TO authenticated, anon USING (true) WITH CHECK (true);


--
-- Name: couriers couriers_update_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY couriers_update_policy ON public.couriers FOR UPDATE USING (true) WITH CHECK (true);


--
-- Name: couriers enable_insert_for_all_couriers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY enable_insert_for_all_couriers ON public.couriers FOR INSERT TO authenticated, anon WITH CHECK (true);


--
-- Name: restaurants enable_insert_for_all_restaurants; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY enable_insert_for_all_restaurants ON public.restaurants FOR INSERT TO authenticated, anon WITH CHECK (true);


--
-- Name: applications enable_insert_for_all_users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY enable_insert_for_all_users ON public.applications FOR INSERT TO authenticated, anon WITH CHECK (true);


--
-- Name: users enable_insert_for_all_users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY enable_insert_for_all_users ON public.users FOR INSERT TO authenticated, anon WITH CHECK (true);


--
-- Name: couriers enable_select_for_all_couriers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY enable_select_for_all_couriers ON public.couriers FOR SELECT TO authenticated, anon USING (true);


--
-- Name: restaurants enable_select_for_all_restaurants; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY enable_select_for_all_restaurants ON public.restaurants FOR SELECT TO authenticated, anon USING (true);


--
-- Name: applications enable_select_for_all_users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY enable_select_for_all_users ON public.applications FOR SELECT TO authenticated, anon USING (true);


--
-- Name: users enable_select_for_all_users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY enable_select_for_all_users ON public.users FOR SELECT TO authenticated, anon USING (true);


--
-- Name: couriers enable_update_for_all_couriers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY enable_update_for_all_couriers ON public.couriers FOR UPDATE TO authenticated, anon USING (true) WITH CHECK (true);


--
-- Name: restaurants enable_update_for_all_restaurants; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY enable_update_for_all_restaurants ON public.restaurants FOR UPDATE TO authenticated, anon USING (true) WITH CHECK (true);


--
-- Name: applications enable_update_for_all_users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY enable_update_for_all_users ON public.applications FOR UPDATE TO authenticated, anon USING (true) WITH CHECK (true);


--
-- Name: users enable_update_for_all_users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY enable_update_for_all_users ON public.users FOR UPDATE TO authenticated, anon USING (true) WITH CHECK (true);


--
-- Name: packages packages_delete_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY packages_delete_policy ON public.packages FOR DELETE USING (true);


--
-- Name: packages packages_insert_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY packages_insert_policy ON public.packages FOR INSERT WITH CHECK (true);


--
-- Name: packages packages_select_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY packages_select_policy ON public.packages FOR SELECT USING (true);


--
-- Name: packages packages_update_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY packages_update_policy ON public.packages FOR UPDATE USING (true) WITH CHECK (true);


--
-- Name: read_announcements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.read_announcements ENABLE ROW LEVEL SECURITY;

--
-- Name: read_announcements read_announcements_insert_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY read_announcements_insert_all ON public.read_announcements FOR INSERT TO authenticated, anon WITH CHECK (true);


--
-- Name: read_announcements read_announcements_select_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY read_announcements_select_all ON public.read_announcements FOR SELECT TO authenticated, anon USING (true);


--
-- Name: restaurant_debts restaurant_debts_insert_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY restaurant_debts_insert_policy ON public.restaurant_debts FOR INSERT WITH CHECK (true);


--
-- Name: restaurant_debts restaurant_debts_select_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY restaurant_debts_select_policy ON public.restaurant_debts FOR SELECT USING (true);


--
-- Name: restaurant_debts restaurant_debts_update_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY restaurant_debts_update_policy ON public.restaurant_debts FOR UPDATE USING (true) WITH CHECK (true);


--
-- Name: restaurant_payment_transactions restaurant_payment_transactions_insert_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY restaurant_payment_transactions_insert_policy ON public.restaurant_payment_transactions FOR INSERT WITH CHECK (true);


--
-- Name: restaurant_payment_transactions restaurant_payment_transactions_select_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY restaurant_payment_transactions_select_policy ON public.restaurant_payment_transactions FOR SELECT USING (true);


--
-- Name: restaurant_settlements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.restaurant_settlements ENABLE ROW LEVEL SECURITY;

--
-- Name: restaurant_settlements restaurant_settlements_insert_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY restaurant_settlements_insert_all ON public.restaurant_settlements FOR INSERT WITH CHECK (true);


--
-- Name: restaurant_settlements restaurant_settlements_select_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY restaurant_settlements_select_all ON public.restaurant_settlements FOR SELECT USING (true);


--
-- Name: restaurant_settlements restaurant_settlements_update_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY restaurant_settlements_update_all ON public.restaurant_settlements FOR UPDATE USING (true) WITH CHECK (true);


--
-- Name: restaurants restaurants_delete_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY restaurants_delete_policy ON public.restaurants FOR DELETE USING (true);


--
-- Name: restaurants restaurants_insert_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY restaurants_insert_policy ON public.restaurants FOR INSERT WITH CHECK (true);


--
-- Name: restaurants restaurants_select_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY restaurants_select_policy ON public.restaurants FOR SELECT USING (true);


--
-- Name: restaurants restaurants_update_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY restaurants_update_policy ON public.restaurants FOR UPDATE USING (true) WITH CHECK (true);


--
-- Name: system_announcements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.system_announcements ENABLE ROW LEVEL SECURITY;

--
-- Name: system_announcements system_announcements_insert_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY system_announcements_insert_all ON public.system_announcements FOR INSERT TO authenticated, anon WITH CHECK (true);


--
-- Name: system_announcements system_announcements_select_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY system_announcements_select_all ON public.system_announcements FOR SELECT TO authenticated, anon USING (true);


--
-- PostgreSQL database dump complete
--

\unrestrict dzZztY4ITNcuI25RHDCgXBYVFeCaD03OjQXrQ0JJg9qnWqsVF1CJHmm0kkbz4Xs

