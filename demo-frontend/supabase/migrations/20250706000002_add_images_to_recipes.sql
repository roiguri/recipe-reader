-- Add images support to user_recipes table
-- This migration adds an images JSONB field to store uploaded image metadata

-- Add images column to user_recipes table
ALTER TABLE user_recipes 
ADD COLUMN images JSONB DEFAULT '{"uploaded": [], "processed": []}';

-- Add comment to describe the images field structure
COMMENT ON COLUMN user_recipes.images IS 'JSONB field storing image metadata with structure: {"uploaded": [{"id": "uuid", "url": "string", "thumbnail": "string", "filename": "string", "uploadedAt": "timestamp", "size": "number", "mimeType": "string"}], "processed": [{"id": "uuid", "url": "string", "thumbnail": "string", "filename": "string", "processedAt": "timestamp", "ocrText": "string", "confidence": "number"}]}';

-- Create index on images field for efficient querying
CREATE INDEX idx_user_recipes_images_gin ON user_recipes USING gin (images);

-- Add function to validate images JSONB structure
CREATE OR REPLACE FUNCTION validate_recipe_images(images_data JSONB)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if images_data has required top-level keys
  IF NOT (images_data ? 'uploaded' AND images_data ? 'processed') THEN
    RETURN FALSE;
  END IF;
  
  -- Check if uploaded and processed are arrays
  IF jsonb_typeof(images_data->'uploaded') != 'array' OR 
     jsonb_typeof(images_data->'processed') != 'array' THEN
    RETURN FALSE;
  END IF;
  
  -- TODO: Add more detailed validation of array elements if needed
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Add check constraint to ensure images field has proper structure
ALTER TABLE user_recipes 
ADD CONSTRAINT check_images_structure 
CHECK (validate_recipe_images(images));

-- Update existing recipes to have the default images structure
UPDATE user_recipes 
SET images = '{"uploaded": [], "processed": []}'
WHERE images IS NULL;

-- Add RLS policy for images (inherits from existing user_recipes policies)
-- No additional policies needed as images are part of user_recipes table

-- Function to clean up old uploaded images (for maintenance)
CREATE OR REPLACE FUNCTION cleanup_old_uploaded_images()
RETURNS INTEGER AS $$
DECLARE
  cutoff_date TIMESTAMP WITH TIME ZONE;
  updated_count INTEGER := 0;
BEGIN
  -- Remove uploaded images older than 24 hours that haven't been processed
  cutoff_date := NOW() - INTERVAL '24 hours';
  
  UPDATE user_recipes 
  SET images = jsonb_set(
    images,
    '{uploaded}',
    (
      SELECT jsonb_agg(img)
      FROM jsonb_array_elements(images->'uploaded') AS img
      WHERE (img->>'uploadedAt')::timestamp with time zone > cutoff_date
    )
  )
  WHERE images->'uploaded' != '[]'::jsonb;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically update the updated_at timestamp when images change
CREATE OR REPLACE FUNCTION update_recipe_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for images updates (if not already exists)
DROP TRIGGER IF EXISTS trigger_update_recipe_images_timestamp ON user_recipes;
CREATE TRIGGER trigger_update_recipe_images_timestamp
  BEFORE UPDATE OF images ON user_recipes
  FOR EACH ROW
  EXECUTE FUNCTION update_recipe_updated_at();