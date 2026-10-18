-- NØMIA Messages: private abuse reports from authorized conversation participants.
create table public.social_dm_reports(
 id uuid primary key default gen_random_uuid(),
 reporter_id uuid not null references public.social_profiles(id) on delete cascade,
 message_id uuid not null references public.social_dm_messages(id) on delete cascade,
 reason text not null check(char_length(trim(reason)) between 5 and 500),
 created_at timestamptz not null default now(),
 unique(reporter_id,message_id)
);
alter table public.social_dm_reports enable row level security;
create policy "dm_reports_create" on public.social_dm_reports for insert to authenticated
with check(reporter_id=auth.uid() and exists(
 select 1 from public.social_dm_messages m
 join public.social_dm_threads t on t.id=m.thread_id
 where m.id=message_id and auth.uid() in(t.user_low,t.user_high) and m.sender_id<>auth.uid()
));
create policy "dm_reports_own" on public.social_dm_reports for select to authenticated using(reporter_id=auth.uid());
revoke all on public.social_dm_reports from anon,authenticated;
grant select,insert on public.social_dm_reports to authenticated;
