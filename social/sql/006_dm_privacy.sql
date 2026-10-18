create table public.social_dm_preferences (
 user_id uuid primary key references public.social_profiles(id) on delete cascade,
 allow_requests boolean not null default true
);
alter table public.social_dm_preferences enable row level security;
create policy "dm_preferences_read" on public.social_dm_preferences for select to authenticated using(user_id=auth.uid());
create policy "dm_preferences_insert" on public.social_dm_preferences for insert to authenticated with check(user_id=auth.uid());
create policy "dm_preferences_update" on public.social_dm_preferences for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
revoke all on public.social_dm_preferences from anon;
revoke all on public.social_dm_preferences from authenticated;
grant select,insert,update(allow_requests) on public.social_dm_preferences to authenticated;
create or replace function public.social_dm_start(other_user uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare me uuid:=auth.uid(); thread_id uuid; existing text;
begin
 if me is null or other_user is null or me=other_user then raise exception 'Invalid participants';end if;
 if not exists(select 1 from public.social_profiles where id=other_user) then raise exception 'Unknown user';end if;
 if public.social_blocked(me,other_user) then raise exception 'Conversation unavailable';end if;
 select status into existing from public.social_dm_threads where user_low=least(me,other_user) and user_high=greatest(me,other_user);
 if existing='declined' then raise exception 'Conversation request declined';end if;
 if existing is null and not public.social_follows_user(other_user,me) and
 exists(select 1 from public.social_dm_preferences where user_id=other_user and not allow_requests)
 then raise exception 'This member does not accept message requests';end if;
 if existing is null and exists(select 1 from public.social_dm_threads where initiated_by=me and status='pending' and created_at>now()-interval '5 minutes') then
 raise exception 'Please wait before starting another conversation';end if;
 insert into public.social_dm_threads(user_low,user_high,initiated_by,status)
 values(least(me,other_user),greatest(me,other_user),me,
 case when public.social_follows_user(other_user,me) then 'accepted' else 'pending' end)
 on conflict(user_low,user_high) do nothing;
 select id into thread_id from public.social_dm_threads where user_low=least(me,other_user) and user_high=greatest(me,other_user);
 return thread_id;
end $$;
revoke all on function public.social_dm_start(uuid) from public,anon;
grant execute on function public.social_dm_start(uuid) to authenticated;
