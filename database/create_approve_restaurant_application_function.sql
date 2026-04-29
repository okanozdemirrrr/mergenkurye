-- Restoran başvurusunu onaylama fonksiyonu
CREATE OR REPLACE FUNCTION approve_restaurant_application(
  application_id UUID,
  admin_user_id UUID,
  company_id_param UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  app_data JSONB;
  new_restaurant_id UUID;
  restaurant_name TEXT;
  restaurant_email TEXT;
  restaurant_phone TEXT;
  restaurant_address TEXT;
  restaurant_lat DECIMAL;
  restaurant_lng DECIMAL;
  restaurant_username TEXT;
  restaurant_password TEXT;
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

  -- JSONB verilerini değişkenlere ata
  restaurant_name := COALESCE(app_data->>'businessName', app_data->>'firstName' || ' ' || app_data->>'lastName');
  restaurant_email := app_data->>'email';
  restaurant_phone := app_data->>'phone';
  restaurant_address := COALESCE(app_data->>'businessAddress', app_data->>'location');
  restaurant_username := app_data->>'username';
  restaurant_password := app_data->>'password';
  
  -- Koordinatları güvenli şekilde dönüştür
  BEGIN
    restaurant_lat := CAST(app_data->>'latitude' AS DECIMAL);
  EXCEPTION
    WHEN OTHERS THEN
      restaurant_lat := NULL;
  END;
  
  BEGIN
    restaurant_lng := CAST(app_data->>'longitude' AS DECIMAL);
  EXCEPTION
    WHEN OTHERS THEN
      restaurant_lng := NULL;
  END;

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
    restaurant_name,
    restaurant_email,
    restaurant_phone,
    restaurant_address,
    restaurant_lat,
    restaurant_lng,
    restaurant_username,
    restaurant_password,
    company_id_param,
    true,
    NOW()
  ) RETURNING id INTO new_restaurant_id;

  -- Başvuru durumunu güncelle
  UPDATE applications
  SET 
    status = 'onaylandi',
    approved_at = NOW(),
    approved_by = admin_user_id,
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