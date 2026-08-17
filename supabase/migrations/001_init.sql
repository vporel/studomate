-- ============================================================
-- 001_init.sql — Studomate — Table des projets cloud + RLS
-- ============================================================
-- Chaque projet est stocké tel quel (JSON versionné, cf. Project.schemaVersion) : c'est
-- l'application qui sait migrer une forme ancienne, jamais le SQL.

create table if not exists projects (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table projects enable row level security;

create policy "own projects select"
  on projects for select using (auth.uid() = owner_id);

create policy "own projects insert"
  on projects for insert with check (auth.uid() = owner_id);

create policy "own projects update"
  on projects for update using (auth.uid() = owner_id);

create policy "own projects delete"
  on projects for delete using (auth.uid() = owner_id);
