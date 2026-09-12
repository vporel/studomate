-- ============================================================
-- 002_id_text.sql — Studomate — id des projets en text, pas uuid
-- ============================================================
-- À exécuter si 001_init.sql a déjà été appliqué avec `id uuid` : les ids de Studomate sont
-- générés par nanoid (voir src/ids.ts), pas des UUID — la colonne doit pouvoir les stocker
-- tels quels. Sans effet si la table est vide, comme prévu à ce stade.

alter table projects alter column id type text;
