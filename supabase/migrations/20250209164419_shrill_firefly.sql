/*
  # Storage Setup

  1. New Tables
    - `files`
      - `id` (uuid, primary key)
      - `created_at` (timestamp)
      - `bucket` (text)
      - `path` (text)
      - `size` (bigint)
      - `mime_type` (text)
      - `metadata` (jsonb)
      - `created_by` (uuid, references auth.users)

  2. Security
    - Enable RLS on `files` table
    - Add policies for authenticated users
*/

-- Create files table
CREATE TABLE IF NOT EXISTS files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  bucket TEXT NOT NULL,
  path TEXT NOT NULL,
  size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(bucket, path)
);

-- Enable RLS
ALTER TABLE files ENABLE ROW LEVEL SECURITY;

-- Policies for files
CREATE POLICY "Allow authenticated read access to files"
  ON files
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated insert to files"
  ON files
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Allow users to delete own files"
  ON files
  FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- Add indexes
CREATE INDEX IF NOT EXISTS files_bucket_path_idx ON files(bucket, path);
CREATE INDEX IF NOT EXISTS files_created_by_idx ON files(created_by);
CREATE INDEX IF NOT EXISTS files_created_at_idx ON files(created_at);