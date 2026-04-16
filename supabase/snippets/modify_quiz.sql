-- 1. Define the custom type
-- CREATE TYPE quiz_type AS ENUM ('image_mcq', 'sign_mcq', 'sign_live');

-- 2. Add the column to the quiz table
ALTER TABLE quiz 
ADD COLUMN type quiz_type NOT NULL DEFAULT 'image_mcq';