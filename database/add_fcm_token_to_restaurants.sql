-- Add FCM token column to restaurants table for push notifications
-- This allows restaurants to receive push notifications on their devices

-- Add fcm_token column to restaurants table
ALTER TABLE restaurants 
ADD COLUMN IF NOT EXISTS fcm_token TEXT;

-- Add comment for documentation
COMMENT ON COLUMN restaurants.fcm_token IS 'Firebase Cloud Messaging token for push notifications';

-- Create index for faster lookups (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_restaurants_fcm_token ON restaurants(fcm_token) WHERE fcm_token IS NOT NULL;

-- Verify the column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'restaurants' AND column_name = 'fcm_token';