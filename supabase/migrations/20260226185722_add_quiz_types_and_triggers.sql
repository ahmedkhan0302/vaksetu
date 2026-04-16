create extension if not exists "pg_cron" with schema "pg_catalog";

create type "public"."quiz_type" as enum ('image_mcq', 'sign_mcq', 'sign_live');

create sequence "public"."glosses_id_seq";


  create table "public"."glosses" (
    "id" bigint not null default nextval('public.glosses_id_seq'::regclass),
    "gloss_name" text not null,
    "image_url" text,
    "gloss_descr" text,
    "gloss_tags" text[],
    "created_at" timestamp with time zone default now()
      );



  create table "public"."group_member" (
    "group_id" uuid not null,
    "user_id" uuid not null,
    "role" text default 'member'::text,
    "joined_at" timestamp with time zone default now()
      );



  create table "public"."learning_resource" (
    "id" uuid not null default gen_random_uuid(),
    "title" text not null,
    "description" text,
    "thumbnail_url" text,
    "type" text,
    "content_url" text,
    "created_at" timestamp with time zone default now()
      );



  create table "public"."quiz" (
    "id" uuid not null default gen_random_uuid(),
    "title" text not null,
    "description" text,
    "difficulty" text,
    "created_by" uuid,
    "content" jsonb not null,
    "created_at" timestamp with time zone default now(),
    "type" public.quiz_type not null default 'image_mcq'::public.quiz_type
      );



  create table "public"."quiz_attempt" (
    "id" uuid not null default gen_random_uuid(),
    "quiz_id" uuid,
    "user_id" uuid,
    "group_id" uuid,
    "started_at" timestamp with time zone default now(),
    "completed_at" timestamp with time zone,
    "total_score" numeric,
    "response" jsonb
      );



  create table "public"."user_group" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "description" text,
    "invite_code" text not null,
    "created_by" uuid,
    "is_default" boolean default false,
    "created_at" timestamp with time zone default now()
      );



  create table "public"."user_profile" (
    "id" uuid not null,
    "full_name" text,
    "avatar_url" text,
    "email" text,
    "contact_no" text,
    "bio_description" text,
    "created_at" timestamp with time zone default now()
      );


alter sequence "public"."glosses_id_seq" owned by "public"."glosses"."id";

CREATE UNIQUE INDEX glosses_pkey ON public.glosses USING btree (id);

CREATE UNIQUE INDEX group_member_pkey ON public.group_member USING btree (group_id, user_id);

CREATE UNIQUE INDEX learning_resource_pkey ON public.learning_resource USING btree (id);

CREATE UNIQUE INDEX quiz_attempt_pkey ON public.quiz_attempt USING btree (id);

CREATE UNIQUE INDEX quiz_pkey ON public.quiz USING btree (id);

CREATE UNIQUE INDEX user_group_invite_code_key ON public.user_group USING btree (invite_code);

CREATE UNIQUE INDEX user_group_pkey ON public.user_group USING btree (id);

CREATE UNIQUE INDEX user_profile_pkey ON public.user_profile USING btree (id);

alter table "public"."glosses" add constraint "glosses_pkey" PRIMARY KEY using index "glosses_pkey";

alter table "public"."group_member" add constraint "group_member_pkey" PRIMARY KEY using index "group_member_pkey";

alter table "public"."learning_resource" add constraint "learning_resource_pkey" PRIMARY KEY using index "learning_resource_pkey";

alter table "public"."quiz" add constraint "quiz_pkey" PRIMARY KEY using index "quiz_pkey";

alter table "public"."quiz_attempt" add constraint "quiz_attempt_pkey" PRIMARY KEY using index "quiz_attempt_pkey";

alter table "public"."user_group" add constraint "user_group_pkey" PRIMARY KEY using index "user_group_pkey";

alter table "public"."user_profile" add constraint "user_profile_pkey" PRIMARY KEY using index "user_profile_pkey";

alter table "public"."group_member" add constraint "group_member_group_id_fkey" FOREIGN KEY (group_id) REFERENCES public.user_group(id) ON DELETE CASCADE not valid;

alter table "public"."group_member" validate constraint "group_member_group_id_fkey";

alter table "public"."group_member" add constraint "group_member_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.user_profile(id) ON DELETE CASCADE not valid;

alter table "public"."group_member" validate constraint "group_member_user_id_fkey";

alter table "public"."quiz" add constraint "quiz_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.user_profile(id) not valid;

alter table "public"."quiz" validate constraint "quiz_created_by_fkey";

alter table "public"."quiz_attempt" add constraint "quiz_attempt_group_id_fkey" FOREIGN KEY (group_id) REFERENCES public.user_group(id) not valid;

alter table "public"."quiz_attempt" validate constraint "quiz_attempt_group_id_fkey";

alter table "public"."quiz_attempt" add constraint "quiz_attempt_quiz_id_fkey" FOREIGN KEY (quiz_id) REFERENCES public.quiz(id) ON DELETE CASCADE not valid;

alter table "public"."quiz_attempt" validate constraint "quiz_attempt_quiz_id_fkey";

alter table "public"."quiz_attempt" add constraint "quiz_attempt_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.user_profile(id) ON DELETE CASCADE not valid;

alter table "public"."quiz_attempt" validate constraint "quiz_attempt_user_id_fkey";

alter table "public"."user_group" add constraint "user_group_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.user_profile(id) not valid;

alter table "public"."user_group" validate constraint "user_group_created_by_fkey";

alter table "public"."user_group" add constraint "user_group_invite_code_key" UNIQUE using index "user_group_invite_code_key";

alter table "public"."user_profile" add constraint "user_profile_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."user_profile" validate constraint "user_profile_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.assign_default_group_if_none(user_uuid uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO public.user_profile (id, full_name, email, avatar_url)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    new.email,
    new.raw_user_meta_data->>'avatar_url'
  );
  RETURN new;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.schedule_default_assignment()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

grant delete on table "public"."glosses" to "anon";

grant insert on table "public"."glosses" to "anon";

grant references on table "public"."glosses" to "anon";

grant select on table "public"."glosses" to "anon";

grant trigger on table "public"."glosses" to "anon";

grant truncate on table "public"."glosses" to "anon";

grant update on table "public"."glosses" to "anon";

grant delete on table "public"."glosses" to "authenticated";

grant insert on table "public"."glosses" to "authenticated";

grant references on table "public"."glosses" to "authenticated";

grant select on table "public"."glosses" to "authenticated";

grant trigger on table "public"."glosses" to "authenticated";

grant truncate on table "public"."glosses" to "authenticated";

grant update on table "public"."glosses" to "authenticated";

grant delete on table "public"."glosses" to "service_role";

grant insert on table "public"."glosses" to "service_role";

grant references on table "public"."glosses" to "service_role";

grant select on table "public"."glosses" to "service_role";

grant trigger on table "public"."glosses" to "service_role";

grant truncate on table "public"."glosses" to "service_role";

grant update on table "public"."glosses" to "service_role";

grant delete on table "public"."group_member" to "anon";

grant insert on table "public"."group_member" to "anon";

grant references on table "public"."group_member" to "anon";

grant select on table "public"."group_member" to "anon";

grant trigger on table "public"."group_member" to "anon";

grant truncate on table "public"."group_member" to "anon";

grant update on table "public"."group_member" to "anon";

grant delete on table "public"."group_member" to "authenticated";

grant insert on table "public"."group_member" to "authenticated";

grant references on table "public"."group_member" to "authenticated";

grant select on table "public"."group_member" to "authenticated";

grant trigger on table "public"."group_member" to "authenticated";

grant truncate on table "public"."group_member" to "authenticated";

grant update on table "public"."group_member" to "authenticated";

grant delete on table "public"."group_member" to "service_role";

grant insert on table "public"."group_member" to "service_role";

grant references on table "public"."group_member" to "service_role";

grant select on table "public"."group_member" to "service_role";

grant trigger on table "public"."group_member" to "service_role";

grant truncate on table "public"."group_member" to "service_role";

grant update on table "public"."group_member" to "service_role";

grant delete on table "public"."learning_resource" to "anon";

grant insert on table "public"."learning_resource" to "anon";

grant references on table "public"."learning_resource" to "anon";

grant select on table "public"."learning_resource" to "anon";

grant trigger on table "public"."learning_resource" to "anon";

grant truncate on table "public"."learning_resource" to "anon";

grant update on table "public"."learning_resource" to "anon";

grant delete on table "public"."learning_resource" to "authenticated";

grant insert on table "public"."learning_resource" to "authenticated";

grant references on table "public"."learning_resource" to "authenticated";

grant select on table "public"."learning_resource" to "authenticated";

grant trigger on table "public"."learning_resource" to "authenticated";

grant truncate on table "public"."learning_resource" to "authenticated";

grant update on table "public"."learning_resource" to "authenticated";

grant delete on table "public"."learning_resource" to "service_role";

grant insert on table "public"."learning_resource" to "service_role";

grant references on table "public"."learning_resource" to "service_role";

grant select on table "public"."learning_resource" to "service_role";

grant trigger on table "public"."learning_resource" to "service_role";

grant truncate on table "public"."learning_resource" to "service_role";

grant update on table "public"."learning_resource" to "service_role";

grant delete on table "public"."quiz" to "anon";

grant insert on table "public"."quiz" to "anon";

grant references on table "public"."quiz" to "anon";

grant select on table "public"."quiz" to "anon";

grant trigger on table "public"."quiz" to "anon";

grant truncate on table "public"."quiz" to "anon";

grant update on table "public"."quiz" to "anon";

grant delete on table "public"."quiz" to "authenticated";

grant insert on table "public"."quiz" to "authenticated";

grant references on table "public"."quiz" to "authenticated";

grant select on table "public"."quiz" to "authenticated";

grant trigger on table "public"."quiz" to "authenticated";

grant truncate on table "public"."quiz" to "authenticated";

grant update on table "public"."quiz" to "authenticated";

grant delete on table "public"."quiz" to "service_role";

grant insert on table "public"."quiz" to "service_role";

grant references on table "public"."quiz" to "service_role";

grant select on table "public"."quiz" to "service_role";

grant trigger on table "public"."quiz" to "service_role";

grant truncate on table "public"."quiz" to "service_role";

grant update on table "public"."quiz" to "service_role";

grant delete on table "public"."quiz_attempt" to "anon";

grant insert on table "public"."quiz_attempt" to "anon";

grant references on table "public"."quiz_attempt" to "anon";

grant select on table "public"."quiz_attempt" to "anon";

grant trigger on table "public"."quiz_attempt" to "anon";

grant truncate on table "public"."quiz_attempt" to "anon";

grant update on table "public"."quiz_attempt" to "anon";

grant delete on table "public"."quiz_attempt" to "authenticated";

grant insert on table "public"."quiz_attempt" to "authenticated";

grant references on table "public"."quiz_attempt" to "authenticated";

grant select on table "public"."quiz_attempt" to "authenticated";

grant trigger on table "public"."quiz_attempt" to "authenticated";

grant truncate on table "public"."quiz_attempt" to "authenticated";

grant update on table "public"."quiz_attempt" to "authenticated";

grant delete on table "public"."quiz_attempt" to "service_role";

grant insert on table "public"."quiz_attempt" to "service_role";

grant references on table "public"."quiz_attempt" to "service_role";

grant select on table "public"."quiz_attempt" to "service_role";

grant trigger on table "public"."quiz_attempt" to "service_role";

grant truncate on table "public"."quiz_attempt" to "service_role";

grant update on table "public"."quiz_attempt" to "service_role";

grant delete on table "public"."user_group" to "anon";

grant insert on table "public"."user_group" to "anon";

grant references on table "public"."user_group" to "anon";

grant select on table "public"."user_group" to "anon";

grant trigger on table "public"."user_group" to "anon";

grant truncate on table "public"."user_group" to "anon";

grant update on table "public"."user_group" to "anon";

grant delete on table "public"."user_group" to "authenticated";

grant insert on table "public"."user_group" to "authenticated";

grant references on table "public"."user_group" to "authenticated";

grant select on table "public"."user_group" to "authenticated";

grant trigger on table "public"."user_group" to "authenticated";

grant truncate on table "public"."user_group" to "authenticated";

grant update on table "public"."user_group" to "authenticated";

grant delete on table "public"."user_group" to "service_role";

grant insert on table "public"."user_group" to "service_role";

grant references on table "public"."user_group" to "service_role";

grant select on table "public"."user_group" to "service_role";

grant trigger on table "public"."user_group" to "service_role";

grant truncate on table "public"."user_group" to "service_role";

grant update on table "public"."user_group" to "service_role";

grant delete on table "public"."user_profile" to "anon";

grant insert on table "public"."user_profile" to "anon";

grant references on table "public"."user_profile" to "anon";

grant select on table "public"."user_profile" to "anon";

grant trigger on table "public"."user_profile" to "anon";

grant truncate on table "public"."user_profile" to "anon";

grant update on table "public"."user_profile" to "anon";

grant delete on table "public"."user_profile" to "authenticated";

grant insert on table "public"."user_profile" to "authenticated";

grant references on table "public"."user_profile" to "authenticated";

grant select on table "public"."user_profile" to "authenticated";

grant trigger on table "public"."user_profile" to "authenticated";

grant truncate on table "public"."user_profile" to "authenticated";

grant update on table "public"."user_profile" to "authenticated";

grant delete on table "public"."user_profile" to "service_role";

grant insert on table "public"."user_profile" to "service_role";

grant references on table "public"."user_profile" to "service_role";

grant select on table "public"."user_profile" to "service_role";

grant trigger on table "public"."user_profile" to "service_role";

grant truncate on table "public"."user_profile" to "service_role";

grant update on table "public"."user_profile" to "service_role";

CREATE TRIGGER on_profile_created_schedule_group AFTER INSERT ON public.user_profile FOR EACH ROW EXECUTE FUNCTION public.schedule_default_assignment();

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


