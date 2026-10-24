-- ============================================================
-- 008_shares_rpc.sql — Studomate — Lecture d'un projet partagé via RPC
-- ============================================================
-- Les politiques de 003_shares.sql laissaient n'importe qui, avec la clé anon publique, lister
-- tous les tokens de partage et tous les projets partagés. La lecture passe désormais par
-- `get_shared_project(token)`, qui ne renvoie que le projet associé au token fourni.

-- Les tokens ne sont plus lisibles que par le propriétaire du projet
drop policy if exists "shares select public" on project_shares;
drop policy if exists "shares select by owner" on project_shares;

create policy "shares select by owner"
  on project_shares for select
  using (
    exists (select 1 from projects where id = project_id and owner_id = auth.uid())
  );

-- Les projets ne sont plus lisibles que par leur propriétaire
drop policy if exists "projects select" on projects;
drop policy if exists "own projects select" on projects;

create policy "own projects select"
  on projects for select using (auth.uid() = owner_id);

-- `security definer` : contourne le RLS pour lire le projet, uniquement pour le token donné.
create or replace function get_shared_project(share_token text)
returns table (data jsonb, version integer)
language sql
stable
security definer
set search_path = public
as $$
  select p.data, p.version
  from project_shares s
  join projects p on p.id = s.project_id
  where s.token = share_token;
$$;

revoke all on function get_shared_project(text) from public;
grant execute on function get_shared_project(text) to anon, authenticated;
