CREATE EXTENSION IF NOT EXISTS vector;

-- Add vector embedding column to document_chunk after JPA creates the table
-- (defer-datasource-initialization=true ensures Hibernate runs first)
ALTER TABLE document_chunk ADD COLUMN IF NOT EXISTS embedding vector(1536);
