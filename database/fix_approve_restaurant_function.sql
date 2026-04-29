-- Restoran başvurusunu onaylama fonksiyonu (Düzeltilmiş)
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
    approved_by = NULL,  -- Geçici olarak NULL
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