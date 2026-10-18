-- Messages: reject nonexistent attachments and require accepted conversation for uploads.
create or replace function public.social_dm_send(p_thread uuid,p_body text,p_media text default null,p_post uuid default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare t public.social_dm_threads%rowtype; message_id uuid; me uuid:=auth.uid();
begin
 select * into t from public.social_dm_threads where id=p_thread for update;
 if not found or me not in(t.user_low,t.user_high) or t.status<>'accepted'
 or public.social_blocked(t.user_low,t.user_high) then raise exception 'Conversation not allowed';end if;
 if char_length(coalesce(p_body,''))>3000 or (nullif(trim(coalesce(p_body,'')),'') is null and p_media is null and p_post is null) then raise exception 'Invalid message';end if;
 if p_media is not null and p_media not like me::text||'/%' then raise exception 'Invalid media path';end if;
 if p_media is not null and not exists(select 1 from storage.objects where bucket_id='nomia-messages' and name=p_media) then raise exception 'Media not found';end if;
 if p_post is not null and not exists(select 1 from public.social_posts where id=p_post and public.social_can_view(author_id,visibility)) then raise exception 'Post not visible';end if;
 if exists(select 1 from public.social_dm_messages where sender_id=me and created_at>now()-interval '1 second') then raise exception 'Please wait';end if;
 insert into public.social_dm_messages(thread_id,sender_id,body,media_path,post_id)
 values(p_thread,me,nullif(trim(coalesce(p_body,'')),''),p_media,p_post) returning id into message_id;
 update public.social_dm_threads set last_activity=now() where id=p_thread;
 return message_id;
end $$;

drop policy if exists "dm_image_upload" on storage.objects;
create policy "dm_image_upload" on storage.objects for insert to authenticated
with check (
 bucket_id='nomia-messages'
 and (storage.foldername(name))[1]=auth.uid()::text
 and exists(select 1 from public.social_dm_threads t where auth.uid() in(t.user_low,t.user_high) and t.status='accepted' and not public.social_blocked(t.user_low,t.user_high))
);
