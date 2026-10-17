-- Travel Photo OS — final collaborative sync upgrade
-- Run once in Supabase SQL Editor.

-- Allow any trip member to update the shared trip payload.
drop policy if exists "owner can update trip" on public.trips;
drop policy if exists "members can update trips" on public.trips;

create policy "members can update trips"
on public.trips
for update
to authenticated
using (
  owner_id = auth.uid()
  or public.is_trip_member(id)
)
with check (
  owner_id = auth.uid()
  or public.is_trip_member(id)
);

-- Make trip payload changes available through Supabase Realtime.
do $$
begin
  alter publication supabase_realtime add table public.trips;
exception
  when duplicate_object then null;
end $$;
