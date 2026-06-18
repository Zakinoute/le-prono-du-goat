-- ============================================================
-- 0008 — Analyses IA par match (Groq vs Gemini)
-- Remplace le « résumé IA de la journée » (table daily_summaries, désormais
-- inutilisée) par une analyse **par match** générée par chaque provider IA :
--   - match terminé  → résumé + joueur du match (estimation) + fait marquant
--   - match à venir   → forces/forme des équipes + joueurs clés + pronostic
-- Un enregistrement par (match, provider) pour comparer les avis côte à côte.
-- ============================================================

create table if not exists match_summaries (
  match_id     uuid not null references matches (id) on delete cascade,
  provider     text not null check (provider in ('groq', 'gemini')),
  kind         text not null check (kind in ('recap', 'preview')),
  content      text not null,
  model        text,
  generated_at timestamptz not null default now(),
  primary key (match_id, provider)
);

alter table match_summaries enable row level security;

-- Lecture pour tout utilisateur connecté ; écriture réservée à la clé service
-- role (les analyses sont générées côté serveur, jamais par le client).
create policy "match_summaries_select_auth" on match_summaries
  for select to authenticated using (true);
