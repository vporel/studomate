-- ============================================================
-- 003_shares.sql — Studomate — Partage de projets par token
-- ============================================================

create table if not exists project_shares (
  token      text primary key,
  project_id text not null references projects(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table project_shares enable row level security;

-- Lecture publique : n'importe qui avec le token peut lire la ligne
create policy "shares select public"
  on project_shares for select using (true);

-- Insertion uniquement par le propriétaire du projet
create policy "shares insert by owner"
  on project_shares for insert
  with check (
    exists (select 1 from projects where id = project_id and owner_id = auth.uid())
  );

-- Suppression uniquement par le propriétaire du projet
create policy "shares delete by owner"
  on project_shares for delete
  using (
    exists (select 1 from projects where id = project_id and owner_id = auth.uid())
  );

-- Étendre la politique de lecture des projets : accessible aussi via un token de partage
drop policy if exists "own projects select" on projects;

create policy "projects select"
  on projects for select
  using (
    auth.uid() = owner_id
    or exists (select 1 from project_shares where project_id = id)
  );
