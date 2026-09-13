-- ============================================================
-- 005_training_progress.sql — Studomate — Reprise de progression (module Formations)
-- ============================================================
-- Mémorise, par utilisateur et par module de formation, la dernière étape atteinte
-- (`step_id`, un identifiant stable défini côté code — voir `ModuleStepper.tsx` —, pas une
-- position dans un tableau qui peut changer si des étapes sont ajoutées/réordonnées).

create table if not exists training_progress (
  user_id    uuid not null references auth.users(id) on delete cascade,
  module_id  text not null,
  step_id    text not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, module_id)
);

alter table training_progress enable row level security;

create policy "own training progress select"
  on training_progress for select using (auth.uid() = user_id);

create policy "own training progress insert"
  on training_progress for insert with check (auth.uid() = user_id);

create policy "own training progress update"
  on training_progress for update using (auth.uid() = user_id);
