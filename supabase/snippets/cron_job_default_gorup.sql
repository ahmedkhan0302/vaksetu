CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE OR REPLACE FUNCTION public.assign_default_group_if_none(user_uuid UUID)
RETURNS void AS $$
DECLARE
    default_group_id UUID;
    has_group BOOLEAN;
BEGIN
    -- 1. Check if user already joined a group (via your Next.js code)
    SELECT EXISTS (
        SELECT 1 FROM public.group_member WHERE user_id = user_uuid
    ) INTO has_group;

    -- 2. If they don't have a group, give them the default
    IF NOT has_group THEN
        SELECT id INTO default_group_id FROM public.user_group WHERE name = 'default_global' LIMIT 1;
        
        IF default_group_id IS NOT NULL THEN
            INSERT INTO public.group_member (group_id, user_id, role)
            VALUES (default_group_id, user_uuid, 'member')
            ON CONFLICT DO NOTHING;
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.schedule_default_assignment()
RETURNS trigger AS $$
BEGIN
    -- Schedule the check for 10 seconds from now
    -- We use 'now() + interval '10 seconds''
    PERFORM cron.schedule_in_database(
        'assign-default-' || new.id::text,
        '10 seconds',
        format('SELECT public.assign_default_group_if_none(%L)', new.id),
        'postgres' -- the database name
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_profile_created_schedule_group
  AFTER INSERT ON public.user_profile
  FOR EACH ROW EXECUTE FUNCTION public.schedule_default_assignment();