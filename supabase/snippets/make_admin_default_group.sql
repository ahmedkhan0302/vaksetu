-- Insert the System Admin as the 'admin' of the global group
INSERT INTO public.group_member (group_id, user_id, role)
SELECT id, '00000000-0000-0000-0000-000000000000', 'admin'
FROM public.user_group 
WHERE name = 'default_global'
ON CONFLICT (group_id, user_id) DO NOTHING;