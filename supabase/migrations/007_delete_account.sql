-- ============================================================
-- 007_delete_account.sql — Studomate — Self-service account deletion
-- ============================================================
-- Lets an authenticated user delete their own account. Deleting the `auth.users` row cascades
-- to `projects`, `project_shares`, `training_progress` and `profiles`.
-- `security definer` is required: the `authenticated` role cannot delete from `auth.users`.

create or replace function delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function delete_my_account() from public, anon;
grant execute on function delete_my_account() to authenticated;
