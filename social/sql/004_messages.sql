-- NØMIA Messages 001: private two-person threads; invitation and permission checked server-side.
create table public.social_dm_threads (
 id uuid primary key default gen_random_uuid(),
 user_low uuid not null references public.social_profiles(id) on delete cascade,
 user_high uuid not null references public.social_profiles(id) on delete cascade,
 initiated_by uuid not null references public.social_profiles(id),
 status text not null default 'pending' check(status in ('pending','accepted','declined')),
 last_activity timestamptz not null default now(),
 created_at timestamptz not null default now(),
 check(user_low<user_high),
 unique(user_low,user_high),
 check(initiated_by in (user_low,user_high))
);
create table public.social_dm_messages (
 id uuid primary key default gen_random_uuid(),
 thread_id uuid not null references public.social_dm_threads(id) on delete cascade,
 sender_id uuid not null references public.social_profiles(id) on delete cascade,
 body text check(body is null or char_length(body)<=3000),
 media_path text,
 post_id uuid references public.social_posts(id) on delete set null,
 created_at timestamptz not null default now(),
 check((char_length(trim(coalesce(body,'')))>0)::int+(media_path is not null)::int+(post_id is not null)::int>=1)
);
create table public.social_dm_reads (
 thread_id uuid not null references public.social_dm_threads(id) on delete cascade,
 user_id uuid not null references public.social_profiles(id) on delete cascade,
 read_at timestamptz not null default now(),
 primary key(thread_id,user_id)
);
create index social_dm_messages_thread_date on public.social_dm_messages(thread_id,created_at desc);
create index social_dm_threads_recent on public.social_dm_threads(last_activity desc);
alter table public.social_dm_threads enable row level security;
alter table public.social_dm_messages enable row level security;
alter table public.social_dm_reads enable row level security;
create policy "thread_participants_read" on public.social_dm_threads for select to authenticated
using(auth.uid() in(user_low,user_high) and not public.social_blocked(user_low,user_high));
create policy "messages_participants_read" on public.social_dm_messages for select to authenticated
using(exists(select 1 from public.social_dm_threads t where t.id=thread_id and auth.uid() in(t.user_low,t.user_high) and t.status='accepted' and not public.social_blocked(t.user_low,t.user_high)));
create policy "reads_private" on public.social_dm_reads for select to authenticated
using(exists(select 1 from public.social_dm_threads t where t.id=thread_id and auth.uid() in(t.user_low,t.user_high)));
-- All mutations via tightly validated RPC functions; no direct table writes.
revoke all on public.social_dm_threads,public.social_dm_messages,public.social_dm_reads from anon,authenticated;
grant select on public.social_dm_threads,public.social_dm_messages,public.social_dm_reads to authenticated;

create or replace function public.social_dm_start(other_user uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare me uuid:=auth.uid(); thread_id uuid;
begin
 if me is null or other_user is null or me=other_user then raise exception 'Invalid participants';end if;
 if not exists(select 1 from public.social_profiles where id=other_user) then raise exception 'Unknown user';end if;
 if public.social_blocked(me,other_user) then raise exception 'Conversation unavailable';end if;
 insert into public.social_dm_threads(user_low,user_high,initiated_by,status)
 values(least(me,other_user),greatest(me,other_user),me,
 case when public.social_follows_user(other_user,me) then 'accepted' else 'pending' end)
 on conflict(user_low,user_high) do nothing;
 select id into thread_id from public.social_dm_threads where user_low=least(me,other_user) and user_high=greatest(me,other_user);
 return thread_id;
end $$;
create or replace function public.social_dm_respond(p_thread uuid,p_accept boolean)
returns void language plpgsql security definer set search_path='' as $$
declare t public.social_dm_threads%rowtype;
begin
 select * into t from public.social_dm_threads where id=p_thread for update;
 if not found or auth.uid() not in(t.user_low,t.user_high) or auth.uid()=t.initiated_by then raise exception 'Unauthorized';end if;
 if t.status<>'pending' then raise exception 'Request already handled';end if;
 if public.social_blocked(t.user_low,t.user_high) then raise exception 'Blocked';end if;
 update public.social_dm_threads set status=case when p_accept then 'accepted' else 'declined' end where id=p_thread;
end $$;
create or replace function public.social_dm_send(p_thread uuid,p_body text,p_media text default null,p_post uuid default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare t public.social_dm_threads%rowtype; message_id uuid; me uuid:=auth.uid();
begin
 select * into t from public.social_dm_threads where id=p_thread for update;
 if not found or me not in(t.user_low,t.user_high) or t.status<>'accepted'
 or public.social_blocked(t.user_low,t.user_high) then raise exception 'Conversation not allowed';end if;
 if char_length(coalesce(p_body,''))>3000 or (nullif(trim(coalesce(p_body,'')),'') is null and p_media is null and p_post is null) then raise exception 'Invalid message';end if;
 if p_media is not null and p_media not like me::text||'/%' then raise exception 'Invalid media path';end if;
 if p_post is not null and not exists(select 1 from public.social_posts where id=p_post and public.social_can_view(author_id,visibility)) then raise exception 'Post not visible';end if;
 if exists(select 1 from public.social_dm_messages where sender_id=me and created_at>now()-interval '1 second') then raise exception 'Please wait';end if;
 insert into public.social_dm_messages(thread_id,sender_id,body,media_path,post_id)
 values(p_thread,me,nullif(trim(coalesce(p_body,'')),''),p_media,p_post) returning id into message_id;
 update public.social_dm_threads set last_activity=now() where id=p_thread;
 return message_id;
end $$;
create or replace function public.social_dm_read(p_thread uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.social_dm_threads t where t.id=p_thread and auth.uid() in(t.user_low,t.user_high)) then raise exception 'Unauthorized';end if;
 insert into public.social_dm_reads(thread_id,user_id) values(p_thread,auth.uid())
 on conflict(thread_id,user_id) do update set read_at=now();
end $$;
create or replace function public.social_dm_delete(p_message uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
 delete from public.social_dm_messages where id=p_message and sender_id=auth.uid();
 if not found then raise exception 'Unauthorized';end if;
end $$;
revoke all on function public.social_dm_start(uuid),public.social_dm_respond(uuid,boolean),public.social_dm_send(uuid,text,text,uuid),public.social_dm_read(uuid),public.social_dm_delete(uuid) from public,anon;
grant execute on function public.social_dm_start(uuid),public.social_dm_respond(uuid,boolean),public.social_dm_send(uuid,text,text,uuid),public.social_dm_read(uuid),public.social_dm_delete(uuid) to authenticated;
-- Private media: participants must belong to an accepted thread referencing the image.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('nomia-messages','nomia-messages',false,10485760,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
create policy "dm_image_upload" on storage.objects for insert to authenticated
with check(bucket_id='nomia-messages' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "dm_image_read" on storage.objects for select to authenticated
using(bucket_id='nomia-messages' and ((storage.foldername(name))[1]=auth.uid()::text
 or exists(select 1 from public.social_dm_messages m join public.social_dm_threads t on t.id=m.thread_id
 where m.media_path=name and t.status='accepted' and auth.uid() in(t.user_low,t.user_high) and not public.social_blocked(t.user_low,t.user_high))));
create policy "dm_image_delete" on storage.objects for delete to authenticated
using(bucket_id='nomia-messages' and (storage.foldername(name))[1]=auth.uid()::text);
