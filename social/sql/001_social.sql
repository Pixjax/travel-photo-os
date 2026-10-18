-- NØMIA Social / migration 001
-- Execute in Supabase SQL editor after reviewing permissions. Never expose service_role keys.
create extension if not exists pgcrypto;
create table if not exists public.social_profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 username text unique not null check (username ~ '^[a-z0-9_]{3,24}$'),
 display_name text not null check(char_length(display_name) between 1 and 80),
 bio text not null default '' check(char_length(bio)<=500),
 avatar_path text,
 website text,
 is_private boolean not null default false,
 created_at timestamptz not null default now()
);
create table if not exists public.social_posts (
 id uuid primary key default gen_random_uuid(),
 author_id uuid not null references public.social_profiles(id) on delete cascade,
 image_path text not null,
 caption text not null default '' check(char_length(caption)<=2200),
 place_name text check(char_length(place_name)<=140),
 visibility text not null default 'public' check(visibility in ('public','followers')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public.social_follows (
 follower_id uuid not null references public.social_profiles(id) on delete cascade,
 following_id uuid not null references public.social_profiles(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key(follower_id,following_id),
 check(follower_id<>following_id)
);
create table if not exists public.social_likes (
 user_id uuid not null references public.social_profiles(id) on delete cascade,
 post_id uuid not null references public.social_posts(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key(user_id,post_id)
);
create table if not exists public.social_saved (
 user_id uuid not null references public.social_profiles(id) on delete cascade,
 post_id uuid not null references public.social_posts(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key(user_id,post_id)
);
create table if not exists public.social_comments (
 id uuid primary key default gen_random_uuid(),
 post_id uuid not null references public.social_posts(id) on delete cascade,
 author_id uuid not null references public.social_profiles(id) on delete cascade,
 parent_id uuid references public.social_comments(id) on delete cascade,
 body text not null check(char_length(trim(body)) between 1 and 800),
 created_at timestamptz not null default now()
);
create table if not exists public.social_blocks (
 blocker_id uuid not null references public.social_profiles(id) on delete cascade,
 blocked_id uuid not null references public.social_profiles(id) on delete cascade,
 primary key(blocker_id,blocked_id), check(blocker_id<>blocked_id)
);
create table if not exists public.social_reports (
 id uuid primary key default gen_random_uuid(),
 reporter_id uuid not null references public.social_profiles(id) on delete cascade,
 post_id uuid references public.social_posts(id) on delete cascade,
 target_user_id uuid references public.social_profiles(id) on delete cascade,
 reason text not null check(char_length(reason) between 5 and 500),
 created_at timestamptz not null default now(),
 check ((post_id is not null)::int + (target_user_id is not null)::int = 1)
);
create index if not exists social_posts_feed_idx on public.social_posts(created_at desc,id desc);
create index if not exists social_posts_author_idx on public.social_posts(author_id,created_at desc);
create index if not exists social_comments_post_idx on public.social_comments(post_id,created_at);
create index if not exists social_follows_target_idx on public.social_follows(following_id);
create index if not exists social_likes_post_idx on public.social_likes(post_id);
create index if not exists social_saved_post_idx on public.social_saved(post_id);
alter table public.social_profiles enable row level security;
alter table public.social_posts enable row level security;
alter table public.social_follows enable row level security;
alter table public.social_likes enable row level security;
alter table public.social_saved enable row level security;
alter table public.social_comments enable row level security;
alter table public.social_blocks enable row level security;
alter table public.social_reports enable row level security;

-- Security definer helpers to avoid recursive RLS when checking relations.
create or replace function public.social_blocked(a uuid,b uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.social_blocks where (blocker_id=a and blocked_id=b) or (blocker_id=b and blocked_id=a))
$$;
create or replace function public.social_follows_user(a uuid,b uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.social_follows where follower_id=a and following_id=b)
$$;
create or replace function public.social_can_view(author uuid,vis text) returns boolean
language sql stable security definer set search_path='' as $$
 select not public.social_blocked(auth.uid(),author)
 and (auth.uid()=author or
 (vis='public' and not exists(select 1 from public.social_profiles p where p.id=author and p.is_private))
 or public.social_follows_user(auth.uid(),author))
$$;
revoke all on function public.social_blocked(uuid,uuid) from public;
revoke all on function public.social_follows_user(uuid,uuid) from public;
revoke all on function public.social_can_view(uuid,text) from public;
grant execute on function public.social_blocked(uuid,uuid),public.social_follows_user(uuid,uuid),public.social_can_view(uuid,text) to authenticated;

create policy "profiles_read" on public.social_profiles for select to authenticated using (id=auth.uid() or not public.social_blocked(auth.uid(),id));
create policy "profiles_create" on public.social_profiles for insert to authenticated with check (id=auth.uid());
create policy "profiles_update" on public.social_profiles for update to authenticated using (id=auth.uid()) with check(id=auth.uid());
create policy "posts_read" on public.social_posts for select to authenticated using (public.social_can_view(author_id,visibility));
create policy "posts_create" on public.social_posts for insert to authenticated with check(author_id=auth.uid() and image_path like (auth.uid()::text || '/%'));
create policy "posts_update" on public.social_posts for update to authenticated using(author_id=auth.uid()) with check(author_id=auth.uid() and image_path like (auth.uid()::text || '/%'));
create policy "posts_delete" on public.social_posts for delete to authenticated using(author_id=auth.uid());
create policy "follows_read" on public.social_follows for select to authenticated using ((follower_id=auth.uid() or following_id=auth.uid()) and not public.social_blocked(follower_id,following_id));
create policy "follows_insert" on public.social_follows for insert to authenticated with check (follower_id=auth.uid() and not public.social_blocked(follower_id,following_id));
create policy "follows_delete" on public.social_follows for delete to authenticated using(follower_id=auth.uid());
create policy "likes_read" on public.social_likes for select to authenticated using(exists(select 1 from public.social_posts p where p.id=post_id and public.social_can_view(p.author_id,p.visibility)));
create policy "likes_insert" on public.social_likes for insert to authenticated with check(user_id=auth.uid() and exists(select 1 from public.social_posts p where p.id=post_id and public.social_can_view(p.author_id,p.visibility)));
create policy "likes_delete" on public.social_likes for delete to authenticated using(user_id=auth.uid());
create policy "saved_read" on public.social_saved for select to authenticated using(user_id=auth.uid());
create policy "saved_insert" on public.social_saved for insert to authenticated with check(user_id=auth.uid() and exists(select 1 from public.social_posts p where p.id=post_id and public.social_can_view(p.author_id,p.visibility)));
create policy "saved_delete" on public.social_saved for delete to authenticated using(user_id=auth.uid());
create policy "comments_read" on public.social_comments for select to authenticated using(exists(select 1 from public.social_posts p where p.id=post_id and public.social_can_view(p.author_id,p.visibility)));
create policy "comments_insert" on public.social_comments for insert to authenticated with check(author_id=auth.uid() and exists(select 1 from public.social_posts p where p.id=post_id and public.social_can_view(p.author_id,p.visibility)) and (parent_id is null or exists(select 1 from public.social_comments c where c.id=parent_id and c.post_id=post_id)));
create policy "comments_delete" on public.social_comments for delete to authenticated using(author_id=auth.uid());
create policy "blocks_select" on public.social_blocks for select to authenticated using(blocker_id=auth.uid());
create policy "blocks_insert" on public.social_blocks for insert to authenticated with check(blocker_id=auth.uid());
create policy "blocks_delete" on public.social_blocks for delete to authenticated using(blocker_id=auth.uid());
create policy "reports_insert" on public.social_reports for insert to authenticated with check(reporter_id=auth.uid());
create policy "reports_select" on public.social_reports for select to authenticated using(reporter_id=auth.uid());

-- Authenticated-only access; never public bucket or unrestricted write access.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values('nomia-social','nomia-social',false,10485760,array['image/jpeg','image/png','image/webp'])
on conflict(id) do nothing;
create policy "social_media_read" on storage.objects for select to authenticated
using(bucket_id='nomia-social' and exists(
 select 1 from public.social_posts p
 where p.image_path=name and public.social_can_view(p.author_id,p.visibility)
) or (bucket_id='nomia-social' and (storage.foldername(name))[1]=auth.uid()::text));
create policy "social_media_insert" on storage.objects for insert to authenticated
with check(bucket_id='nomia-social' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "social_media_delete" on storage.objects for delete to authenticated
using(bucket_id='nomia-social' and (storage.foldername(name))[1]=auth.uid()::text);

-- Heads-up: public launch additionally requires dedicated moderation/rate limits,
-- user-deletion backend and privacy/legal review before opening registration broadly.
