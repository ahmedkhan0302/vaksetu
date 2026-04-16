-- 1. User Profiles (Extends Supabase Auth)
CREATE TABLE user_profile (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  email TEXT,
  contact_no TEXT,
  bio_description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Groups
CREATE TABLE user_group (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  invite_code TEXT UNIQUE NOT NULL,
  created_by UUID REFERENCES user_profile(id),
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Group Membership (Many-to-Many)
CREATE TABLE group_member (
  group_id UUID REFERENCES user_group(id) ON DELETE CASCADE,
  user_id UUID REFERENCES user_profile(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member', -- 'member' or 'admin'
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (group_id, user_id)
);

-- 4. Learning Resources
CREATE TABLE learning_resource (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  type TEXT, -- 'VIDEO', 'PDF'
  content_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Glosses
CREATE TABLE glosses (
  id BIGSERIAL PRIMARY KEY,
  gloss_name TEXT NOT NULL,
  image_url TEXT,
  gloss_descr TEXT,
  gloss_tags TEXT[], -- PostgreSQL Array type
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Quizzes
CREATE TABLE quiz (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  difficulty TEXT, -- 'EASY', 'MEDIUM', 'HARD'
  created_by UUID REFERENCES user_profile(id),
  content JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Quiz Attempts
CREATE TABLE quiz_attempt (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES quiz(id) ON DELETE CASCADE,
  user_id UUID REFERENCES user_profile(id) ON DELETE CASCADE,
  group_id UUID REFERENCES user_group(id),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  total_score NUMERIC,
  response JSONB
);