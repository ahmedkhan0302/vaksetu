-- Remove the redundant type column
ALTER TABLE public.quiz DROP COLUMN IF EXISTS type;

-- Optional: If you created the enum 'quiz_type', you can drop it too
-- DROP TYPE IF EXISTS quiz_type;