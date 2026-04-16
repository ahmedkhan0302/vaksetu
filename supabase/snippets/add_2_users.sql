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