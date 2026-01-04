-- Declarative schema for storage-related enhancements

-- Enhanced function to get storage usage by bucket
CREATE OR REPLACE FUNCTION get_storage_usage_by_bucket(user_uuid UUID DEFAULT auth.uid())
RETURNS TABLE (
  bucket_id TEXT,
  file_count BIGINT,
  total_size BIGINT,
  last_upload TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    objects.bucket_id,
    COUNT(*) as file_count,
    SUM(COALESCE((objects.metadata->>'size')::BIGINT, 0)) as total_size,
    MAX(objects.created_at) as last_upload
  FROM storage.objects
  WHERE objects.owner = user_uuid
  GROUP BY objects.bucket_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to search files by metadata
CREATE OR REPLACE FUNCTION search_files_by_metadata(
  bucket_name TEXT,
  metadata_query JSONB,
  user_uuid UUID DEFAULT auth.uid()
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  bucket_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    objects.id,
    objects.name,
    objects.bucket_id,
    objects.metadata,
    objects.created_at
  FROM storage.objects
  WHERE objects.bucket_id = bucket_name
    AND objects.owner = user_uuid
    AND objects.metadata @> metadata_query
  ORDER BY objects.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
