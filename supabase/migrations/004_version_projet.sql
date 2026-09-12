-- ============================================================
-- 004_version.sql — Studomate — version de concurrence optimiste
-- ============================================================
-- Détecte qu'un projet cloud a été modifié par un autre appareil entre le chargement et
-- l'enregistrement, avant d'écraser silencieusement ces modifications.

alter table projects add column if not exists version integer not null default 1;
