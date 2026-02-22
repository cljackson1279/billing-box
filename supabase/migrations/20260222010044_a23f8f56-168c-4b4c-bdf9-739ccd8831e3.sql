
-- Create storage bucket for CSV uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('csv-uploads', 'csv-uploads', false);

-- RLS: authenticated users can upload to their org folder
CREATE POLICY "Users can upload CSV files" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'csv-uploads'
  AND auth.role() = 'authenticated'
);

-- RLS: users can read their org's files
CREATE POLICY "Users can read own org CSV files" ON storage.objects
FOR SELECT USING (
  bucket_id = 'csv-uploads'
  AND auth.role() = 'authenticated'
);
