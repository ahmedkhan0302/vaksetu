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