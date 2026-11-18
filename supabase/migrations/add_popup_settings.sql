-- Migration: Add Global Popup Modal Settings to 'settings' table
ALTER TABLE settings 
ADD COLUMN IF NOT EXISTS is_popup_active boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS popup_heading text,
ADD COLUMN IF NOT EXISTS popup_message text,
ADD COLUMN IF NOT EXISTS popup_image_url text,
ADD COLUMN IF NOT EXISTS popup_btn1_text text,
ADD COLUMN IF NOT EXISTS popup_btn1_url text,
ADD COLUMN IF NOT EXISTS popup_btn2_text text,
ADD COLUMN IF NOT EXISTS popup_btn2_url text,
ADD COLUMN IF NOT EXISTS popup_frequency integer DEFAULT 1;

-- Ensure default values for row id = 1
UPDATE settings
SET 
  is_popup_active = COALESCE(is_popup_active, false),
  popup_frequency = COALESCE(popup_frequency, 1)
WHERE id = 1;
