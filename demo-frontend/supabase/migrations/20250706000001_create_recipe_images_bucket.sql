-- Create recipe-images storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'recipe-images', 
  'recipe-images', 
  false, 
  52428800, -- 50MB in bytes
  '{"image/jpeg", "image/png", "image/webp", "application/pdf"}'
);

-- Create policies for recipe-images bucket
-- Policy 1: Allow authenticated users to upload images to their own folder
CREATE POLICY "Users can upload images to their own folder" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'recipe-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy 2: Allow authenticated users to view images in their own folder
CREATE POLICY "Users can view images in their own folder" 
ON storage.objects FOR SELECT 
USING (
  bucket_id = 'recipe-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy 3: Allow authenticated users to delete images in their own folder
CREATE POLICY "Users can delete images in their own folder" 
ON storage.objects FOR DELETE 
USING (
  bucket_id = 'recipe-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy 4: Allow authenticated users to update images in their own folder
CREATE POLICY "Users can update images in their own folder" 
ON storage.objects FOR UPDATE 
USING (
  bucket_id = 'recipe-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);