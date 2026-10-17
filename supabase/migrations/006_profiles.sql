-- ============================================================
-- 006_profiles.sql — Studomate — Self-declared user profile
-- ============================================================
-- One optional row per user: what they use Studomate for (`user_type`) and, for students,
-- the kind of school (`school_type`). Both columns are null when the user chose not to say.
-- The allowed values mirror `UserType` / `SchoolType` in `src/user-profile/`.

create table if not exists profiles (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  user_type   text check (user_type in ('student', 'teacher', 'professional', 'self_learner', 'other')),
  school_type text check (school_type in ('high_school', 'bts', 'iut', 'university', 'engineering_school', 'other')),
  updated_at  timestamptz not null default now(),
  constraint profiles_school_type_only_for_students
    check (school_type is null or user_type = 'student')
);

alter table profiles enable row level security;

create policy "own profile select"
  on profiles for select using (auth.uid() = user_id);

create policy "own profile insert"
  on profiles for insert with check (auth.uid() = user_id);

create policy "own profile update"
  on profiles for update using (auth.uid() = user_id);
