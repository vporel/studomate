-- ============================================================
-- 010_feedback_locale_es.sql — Studomate — Spanish interface language
-- ============================================================
-- The feedback form now records the interface language, which can be Spanish.

alter table feedback drop constraint if exists feedback_locale_check;

alter table feedback
  add constraint feedback_locale_check check (locale in ('fr', 'en', 'es'));
