-- NØMIA Social / migration 003
-- Least-privilege grants for Social only, leaving existing Voyage tables unchanged.
revoke all privileges on public.social_profiles,public.social_posts,public.social_follows,public.social_likes,public.social_saved,public.social_comments,public.social_blocks,public.social_reports,public.social_notifications from anon;
revoke truncate,references,trigger on public.social_profiles,public.social_posts,public.social_follows,public.social_likes,public.social_saved,public.social_comments,public.social_blocks,public.social_reports,public.social_notifications from authenticated;
revoke update on public.social_follows,public.social_likes,public.social_saved,public.social_comments,public.social_blocks,public.social_reports from authenticated;
revoke insert,delete,update on public.social_notifications from authenticated;
grant update(read_at) on public.social_notifications to authenticated;
