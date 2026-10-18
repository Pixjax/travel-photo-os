-- NØMIA Social / migration 002 - notifications generated only by database triggers
create table if not exists public.social_notifications(
 id uuid primary key default gen_random_uuid(),
 recipient_id uuid not null references public.social_profiles(id) on delete cascade,
 actor_id uuid not null references public.social_profiles(id) on delete cascade,
 post_id uuid references public.social_posts(id) on delete cascade,
 kind text not null check(kind in('like','comment','follow')),
 created_at timestamptz not null default now(),
 read_at timestamptz,
 check(recipient_id<>actor_id)
);
create index if not exists social_notifications_recipient_idx
 on public.social_notifications(recipient_id,created_at desc);
alter table public.social_notifications enable row level security;
create policy "notifications_select" on public.social_notifications
 for select to authenticated using(recipient_id=auth.uid());
create policy "notifications_mark_read" on public.social_notifications
 for update to authenticated using(recipient_id=auth.uid())
 with check(recipient_id=auth.uid());
revoke insert,delete on public.social_notifications from anon,authenticated;
-- Limit client update to read_at only (client cannot spoof actors/recipients).
revoke update on public.social_notifications from authenticated;
grant update(read_at) on public.social_notifications to authenticated;

create or replace function public.social_emit_notification()
returns trigger language plpgsql security definer set search_path='' as $$
declare owner_id uuid;
begin
 if TG_TABLE_NAME='social_follows' then
  owner_id:=new.following_id;
  if owner_id<>new.follower_id then
   insert into public.social_notifications(recipient_id,actor_id,kind)
   values(owner_id,new.follower_id,'follow');
  end if;
 elsif TG_TABLE_NAME='social_likes' then
  select author_id into owner_id from public.social_posts where id=new.post_id;
  if owner_id is not null and owner_id<>new.user_id then
   insert into public.social_notifications(recipient_id,actor_id,post_id,kind)
   values(owner_id,new.user_id,new.post_id,'like');
  end if;
 elsif TG_TABLE_NAME='social_comments' then
  select author_id into owner_id from public.social_posts where id=new.post_id;
  if owner_id is not null and owner_id<>new.author_id then
   insert into public.social_notifications(recipient_id,actor_id,post_id,kind)
   values(owner_id,new.author_id,new.post_id,'comment');
  end if;
 end if;
 return new;
end $$;
drop trigger if exists social_follow_notify on public.social_follows;
create trigger social_follow_notify after insert on public.social_follows
 for each row execute function public.social_emit_notification();
drop trigger if exists social_like_notify on public.social_likes;
create trigger social_like_notify after insert on public.social_likes
 for each row execute function public.social_emit_notification();
drop trigger if exists social_comment_notify on public.social_comments;
create trigger social_comment_notify after insert on public.social_comments
 for each row execute function public.social_emit_notification();
