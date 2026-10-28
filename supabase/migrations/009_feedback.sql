-- ============================================================
-- 009_feedback.sql — Studomate — User feedback
-- ============================================================
-- One row per opinion left from the app: a rating out of 5 and an optional comment.
-- `user_id` is null for visitors without an account.
-- Rows are written by the `/api/feedback` route with the visitor's own session (or none).
-- A signed-in user can read their own rows (to know they already answered); nobody else's, and
-- no anonymous row, can be read through the API: the owner reads them from the Supabase dashboard.

create table if not exists feedback (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete set null,
  rating     smallint not null check (rating between 1 and 5),
  comment    text check (comment is null or char_length(comment) <= 2000),
  locale     text check (locale in ('fr', 'en')),
  created_at timestamptz not null default now()
);

alter table feedback enable row level security;

create policy "anyone can leave feedback"
  on feedback for insert
  to anon, authenticated
  with check (user_id is null or user_id = auth.uid());

create policy "own feedback select"
  on feedback for select
  to authenticated
  using (auth.uid() = user_id);
