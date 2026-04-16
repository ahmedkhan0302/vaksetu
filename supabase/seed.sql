-- 1. Insert into Supabase Auth (The Parent Table)
INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, aud, role)
VALUES (
  '00000000-0000-0000-0000-000000000000', 
  '00000000-0000-0000-0000-000000000000', 
  'admin@vaksetu.com', 
  crypt('system_admin_password_2026', gen_salt('bf')), -- Encrypted password
  now(), 
  '{"provider":"email","providers":["email"]}', 
  '{"full_name": "System Admin"}', 
  'authenticated', 
  'authenticated'
);

-- 2. Insert into User Profile (The Child Table)
-- (If your trigger is already active, this might happen automatically, 
-- but running it manually ensures the bio is set)
INSERT INTO public.user_profile (id, full_name, email, bio_description)
VALUES (
  '00000000-0000-0000-0000-000000000000', 
  'System Admin', 
  'admin@vaksetu.com', 
  'Automated system administrator'
) ON CONFLICT (id) DO UPDATE SET bio_description = EXCLUDED.bio_description;

-- 3. Create the Global Default Group
INSERT INTO public.user_group (name, description, invite_code, created_by, is_default)
VALUES (
  'default_global', 
  'The official Vak-Setu onboarding community.', 
  'GLOBAL2026', 
  '00000000-0000-0000-0000-000000000000', 
  TRUE
);

-- Insert the System Admin as the 'admin' of the global group
INSERT INTO public.group_member (group_id, user_id, role)
SELECT id, '00000000-0000-0000-0000-000000000000', 'admin'
FROM public.user_group 
WHERE name = 'default_global'
ON CONFLICT (group_id, user_id) DO NOTHING;

-- User 1: "Alice Test"
INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, aud, role)
VALUES (
  gen_random_uuid(), 
  '00000000-0000-0000-0000-000000000000', 
  'alice@example.com', 
  crypt('password123', gen_salt('bf')), 
  now(), 
  '{"provider":"email","providers":["email"]}', 
  '{"full_name": "Alice Test", "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=Alice"}', 
  'authenticated', 
  'authenticated'
);

-- User 2: "Bob Test"
INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, aud, role)
VALUES (
  gen_random_uuid(), 
  '00000000-0000-0000-0000-000000000000', 
  'bob@example.com', 
  crypt('password123', gen_salt('bf')), 
  now(), 
  '{"provider":"email","providers":["email"]}', 
  '{"full_name": "Bob Test", "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=Bob"}', 
  'authenticated', 
  'authenticated'
);

-- Insert Quiz dummy data
INSERT INTO public.quiz (title, description, difficulty, content, created_by) VALUES 
('Number Quiz 1', 'Practice session', 'EASY', '{"questions": [{"q_no": 1, "q_type": "image_mcq", "q_text": "Identify the correct sign", "q_gloss_id": 34, "options": [25, 12, 34, 19]}, {"q_no": 2, "q_type": "image_mcq", "q_text": "Identify the correct sign", "q_gloss_id": 7, "options": [10, 7, 4, 6]}, {"q_no": 3, "q_type": "image_mcq", "q_text": "Identify the correct sign", "q_gloss_id": 6, "options": [18, 8, 19, 6]}, {"q_no": 4, "q_type": "image_mcq", "q_text": "Identify the correct sign", "q_gloss_id": 13, "options": [23, 11, 22, 13]}, {"q_no": 5, "q_type": "image_mcq", "q_text": "Identify the correct sign", "q_gloss_id": 24, "options": [1, 24, 5, 22]}, {"q_no": 6, "q_type": "image_mcq", "q_text": "Identify the correct sign", "q_gloss_id": 3, "options": [19, 3, 5, 17]}]}', '00000000-0000-0000-0000-000000000000'),
('Number Quiz 2', 'Practice session', 'EASY', '{"questions": [{"q_no": 1, "q_type": "image_mcq", "q_text": "Identify the correct sign", "q_gloss_id": 21, "options": [15, 10, 21, 33]}, {"q_no": 2, "q_type": "image_mcq", "q_text": "Identify the correct sign", "q_gloss_id": 6, "options": [14, 6, 31, 21]}, {"q_no": 3, "q_type": "image_mcq", "q_text": "Identify the correct sign", "q_gloss_id": 17, "options": [19, 17, 14, 31]}, {"q_no": 4, "q_type": "image_mcq", "q_text": "Identify the correct sign", "q_gloss_id": 2, "options": [27, 2, 31, 6]}, {"q_no": 5, "q_type": "image_mcq", "q_text": "Identify the correct sign", "q_gloss_id": 4, "options": [4, 11, 12, 3]}, {"q_no": 6, "q_type": "image_mcq", "q_text": "Identify the correct sign", "q_gloss_id": 3, "options": [11, 14, 3, 15]}]}', '00000000-0000-0000-0000-000000000000'),
('Alpha Mix', 'Practice session', 'EASY', '{"questions": [{"q_no": 1, "q_type": "image_mcq", "q_text": "Identify the correct sign", "q_gloss_id": 13, "options": [19, 13, 28, 16]}, {"q_no": 2, "q_type": "image_mcq", "q_text": "Identify the correct sign", "q_gloss_id": 17, "options": [3, 30, 9, 17]}, {"q_no": 3, "q_type": "image_mcq", "q_text": "Identify the correct sign", "q_gloss_id": 10, "options": [10, 21, 29, 23]}, {"q_no": 4, "q_type": "image_mcq", "q_text": "Identify the correct sign", "q_gloss_id": 29, "options": [32, 8, 29, 13]}, {"q_no": 5, "q_type": "image_mcq", "q_text": "Identify the correct sign", "q_gloss_id": 7, "options": [10, 5, 20, 7]}, {"q_no": 6, "q_type": "image_mcq", "q_text": "Identify the correct sign", "q_gloss_id": 15, "options": [11, 9, 7, 15]}]}', '00000000-0000-0000-0000-000000000000'),
('Sign Matcher 1', 'Practice session', 'EASY', '{"questions": [{"q_no": 1, "q_type": "sign_mcq", "q_text": "Identify the correct sign", "q_gloss_id": 26, "options": [25, 33, 26, 30]}, {"q_no": 2, "q_type": "sign_mcq", "q_text": "Identify the correct sign", "q_gloss_id": 32, "options": [32, 31, 6, 34]}, {"q_no": 3, "q_type": "sign_mcq", "q_text": "Identify the correct sign", "q_gloss_id": 22, "options": [22, 15, 7, 9]}, {"q_no": 4, "q_type": "sign_mcq", "q_text": "Identify the correct sign", "q_gloss_id": 20, "options": [20, 19, 10, 7]}, {"q_no": 5, "q_type": "sign_mcq", "q_text": "Identify the correct sign", "q_gloss_id": 2, "options": [25, 2, 11, 24]}, {"q_no": 6, "q_type": "sign_mcq", "q_text": "Identify the correct sign", "q_gloss_id": 6, "options": [6, 5, 34, 15]}]}', '00000000-0000-0000-0000-000000000000'),
('Sign Matcher 2', 'Practice session', 'EASY', '{"questions": [{"q_no": 1, "q_type": "sign_mcq", "q_text": "Identify the correct sign", "q_gloss_id": 17, "options": [17, 15, 16, 14]}, {"q_no": 2, "q_type": "sign_mcq", "q_text": "Identify the correct sign", "q_gloss_id": 11, "options": [11, 18, 8, 14]}, {"q_no": 3, "q_type": "sign_mcq", "q_text": "Identify the correct sign", "q_gloss_id": 23, "options": [5, 1, 13, 23]}, {"q_no": 4, "q_type": "sign_mcq", "q_text": "Identify the correct sign", "q_gloss_id": 30, "options": [30, 6, 19, 15]}, {"q_no": 5, "q_type": "sign_mcq", "q_text": "Identify the correct sign", "q_gloss_id": 4, "options": [4, 15, 19, 33]}, {"q_no": 6, "q_type": "sign_mcq", "q_text": "Identify the correct sign", "q_gloss_id": 18, "options": [17, 18, 13, 11]}]}', '00000000-0000-0000-0000-000000000000'),
('Foundational Mix', 'Practice session', 'EASY', '{"questions": [{"q_no": 1, "q_type": "sign_mcq", "q_text": "Identify the correct sign", "q_gloss_id": 35, "options": [29, 33, 15, 35]}, {"q_no": 2, "q_type": "sign_mcq", "q_text": "Identify the correct sign", "q_gloss_id": 20, "options": [1, 9, 20, 7]}, {"q_no": 3, "q_type": "sign_mcq", "q_text": "Identify the correct sign", "q_gloss_id": 22, "options": [5, 8, 35, 22]}, {"q_no": 4, "q_type": "sign_mcq", "q_text": "Identify the correct sign", "q_gloss_id": 1, "options": [1, 14, 4, 9]}, {"q_no": 5, "q_type": "sign_mcq", "q_text": "Identify the correct sign", "q_gloss_id": 25, "options": [4, 33, 30, 25]}, {"q_no": 6, "q_type": "sign_mcq", "q_text": "Identify the correct sign", "q_gloss_id": 30, "options": [29, 30, 25, 5]}]}', '00000000-0000-0000-0000-000000000000');

-- Insert Quiz dummy data (Batch 2 - Random Quizzes)
INSERT INTO public.quiz (title, description, difficulty, type, content, created_by) VALUES 
('Beginner Numbers 1', 'Basic number practice', 'EASY', 'image_mcq', '{"questions": [{"q_no": 1, "q_text": "Identify the correct sign", "q_gloss_id": 6, "options": [28, 30, 8, 6]}, {"q_no": 2, "q_text": "Identify the correct sign", "q_gloss_id": 28, "options": [16, 9, 5, 28]}, {"q_no": 3, "q_text": "Identify the correct sign", "q_gloss_id": 25, "options": [7, 8, 14, 25]}, {"q_no": 4, "q_text": "Identify the correct sign", "q_gloss_id": 32, "options": [4, 31, 10, 32]}, {"q_no": 5, "q_text": "Identify the correct sign", "q_gloss_id": 20, "options": [3, 20, 25, 10]}, {"q_no": 6, "q_text": "Identify the correct sign", "q_gloss_id": 35, "options": [35, 26, 12, 14]}]}', '00000000-0000-0000-0000-000000000000'),
('Beginner Numbers 2', 'More basic number practice', 'EASY', 'image_mcq', '{"questions": [{"q_no": 1, "q_text": "Identify the correct sign", "q_gloss_id": 25, "options": [23, 25, 30, 6]}, {"q_no": 2, "q_text": "Identify the correct sign", "q_gloss_id": 10, "options": [2, 10, 4, 24]}, {"q_no": 3, "q_text": "Identify the correct sign", "q_gloss_id": 33, "options": [33, 12, 32, 7]}, {"q_no": 4, "q_text": "Identify the correct sign", "q_gloss_id": 19, "options": [19, 26, 31, 32]}, {"q_no": 5, "q_text": "Identify the correct sign", "q_gloss_id": 35, "options": [24, 12, 25, 35]}, {"q_no": 6, "q_text": "Identify the correct sign", "q_gloss_id": 6, "options": [14, 6, 5, 12]}]}', '00000000-0000-0000-0000-000000000000'),
('Alphabet Intro 1', 'Starting with letters', 'EASY', 'image_mcq', '{"questions": [{"q_no": 1, "q_text": "Identify the correct sign", "q_gloss_id": 3, "options": [6, 3, 28, 20]}, {"q_no": 2, "q_text": "Identify the correct sign", "q_gloss_id": 12, "options": [6, 11, 30, 12]}, {"q_no": 3, "q_text": "Identify the correct sign", "q_gloss_id": 32, "options": [32, 28, 24, 8]}, {"q_no": 4, "q_text": "Identify the correct sign", "q_gloss_id": 1, "options": [1, 4, 15, 20]}, {"q_no": 5, "q_text": "Identify the correct sign", "q_gloss_id": 20, "options": [25, 2, 16, 20]}, {"q_no": 6, "q_text": "Identify the correct sign", "q_gloss_id": 9, "options": [30, 34, 16, 9]}]}', '00000000-0000-0000-0000-000000000000'),
('Sign Matcher 1', 'Sign recognition basics', 'EASY', 'sign_mcq', '{"questions": [{"q_no": 1, "q_text": "Identify the correct sign", "q_gloss_id": 6, "options": [15, 35, 6, 28]}, {"q_no": 2, "q_text": "Identify the correct sign", "q_gloss_id": 8, "options": [8, 2, 27, 28]}, {"q_no": 3, "q_text": "Identify the correct sign", "q_gloss_id": 25, "options": [33, 9, 26, 25]}, {"q_no": 4, "q_text": "Identify the correct sign", "q_gloss_id": 2, "options": [5, 1, 2, 32]}, {"q_no": 5, "q_text": "Identify the correct sign", "q_gloss_id": 27, "options": [25, 5, 27, 4]}, {"q_no": 6, "q_text": "Identify the correct sign", "q_gloss_id": 33, "options": [33, 8, 6, 24]}]}', '00000000-0000-0000-0000-000000000000'),
('Sign Matcher 2', 'Quick sign identification', 'EASY', 'sign_mcq', '{"questions": [{"q_no": 1, "q_text": "Identify the correct sign", "q_gloss_id": 12, "options": [12, 25, 32, 14]}, {"q_no": 2, "q_text": "Identify the correct sign", "q_gloss_id": 7, "options": [2, 7, 4, 34]}, {"q_no": 3, "q_text": "Identify the correct sign", "q_gloss_id": 15, "options": [29, 12, 15, 19]}, {"q_no": 4, "q_text": "Identify the correct sign", "q_gloss_id": 2, "options": [6, 16, 2, 10]}, {"q_no": 5, "q_text": "Identify the correct sign", "q_gloss_id": 34, "options": [30, 17, 29, 34]}, {"q_no": 6, "q_text": "Identify the correct sign", "q_gloss_id": 9, "options": [1, 20, 2, 9]}]}', '00000000-0000-0000-0000-000000000000'),
('Foundational Mix', 'Mixed alphanumeric basics', 'EASY', 'sign_mcq', '{"questions": [{"q_no": 1, "q_text": "Identify the correct sign", "q_gloss_id": 24, "options": [25, 16, 24, 31]}, {"q_no": 2, "q_text": "Identify the correct sign", "q_gloss_id": 15, "options": [25, 35, 18, 15]}, {"q_no": 3, "q_text": "Identify the correct sign", "q_gloss_id": 16, "options": [16, 22, 31, 23]}, {"q_no": 4, "q_text": "Identify the correct sign", "q_gloss_id": 17, "options": [27, 23, 17, 25]}, {"q_no": 5, "q_text": "Identify the correct sign", "q_gloss_id": 35, "options": [14, 9, 35, 12]}, {"q_no": 6, "q_text": "Identify the correct sign", "q_gloss_id": 6, "options": [6, 10, 34, 7]}]}', '00000000-0000-0000-0000-000000000000');