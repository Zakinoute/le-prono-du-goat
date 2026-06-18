# CLAUDE.md — Le Prono du GOAT

App de pronostics pour la Coupe du Monde 2026 (remplace un concours Google Sheets
sur un Discord de ~2 000 membres géré par « Karim »). Challenge DEENCODE #02.

## Architecture du système

| Brique | Rôle |
|--------|------|
| **Next.js + Supabase** | L'app (Auth + Postgres + RLS) — source de vérité & interface web |
| **Make** | Orchestration : sync scores API-Football, notifications (alternative à n8n) |
| **API-Football** | Données matchs + scores live (consommée par Make) |
| **IA (Groq / Gemini)** | Profils IA des joueurs · analyses IA par match (Groq ; comparaison Gemini optionnelle, activée si `GEMINI_API_KEY` présente) · Bonus 2 (IA vs Humains). **Pas Anthropic** (clé payante) — voir `src/lib/ai.ts` |
| **discord.js** | Bonus 1 : bot Discord (commandes slash, embeds, rappels) |
| **Vercel** | Déploiement (PWA mobile-first) |

## Stack

- **Next.js 14** (App Router, TypeScript, dossier `src/`, alias `@/*`)
- **Supabase** (Auth + Postgres + RLS) via `@supabase/ssr`
- **Tailwind CSS** + **shadcn/ui** (style `new-york`, base `slate`, primary = vert)

## Architecture du code

```
src/
  app/
    (auth)/            login, register, actions.ts (server actions)  — non protégé
    (app)/             dashboard, matches, leagues, leaderboard, profile — PROTÉGÉ
    auth/callback/     échange du code Supabase (confirmation e-mail / OAuth)
    page.tsx           landing publique
  components/ui/        composants shadcn (button, card, input, label)
  components/layout/    navbar
  components/coming-soon.tsx  placeholder des pages Phase 2
  lib/supabase/        client.ts (browser), server.ts (RSC/actions + service role), middleware.ts
  lib/constants.ts     barème, routes protégées, profils IA
  types/database.ts    types de la base (maintenus à la main, voir migrations)
  middleware.ts        refresh de session + protection des routes
supabase/migrations/   0001 schéma · 0002 fonctions/triggers/vue · 0003 RLS · 0004 seed badges
```

## Conventions & décisions

- **Un seul prono par (utilisateur, match)** — valable dans toutes ses ligues
  (contrainte `unique (user_id, match_id)`).
- **Barème** : score exact = **3 pts**, bon résultat = **1 pt**, sinon 0.
  Calculé par le trigger `score_match_predictions` quand un match passe à `finished`.
- **Verrouillage au coup d'envoi** appliqué au niveau **RLS** (policies insert/update
  sur `predictions` exigent `matches.kickoff_at > now()`). La base est la source de vérité.
- **Classement = vue SQL `league_standings`** (`security_invoker`), pas de table dénormalisée.
- **Anti-triche** : on ne voit les pronos des co-membres qu'**après** le coup d'envoi
  (policy select sur `predictions`).
- Les **policies RLS qui interrogent la même table** passent par des fonctions
  `security definer` (`is_member_of`, `shares_league_with`) pour éviter la récursion infinie.
- Les **jobs serveur** (sync scores via Make, scoring, badges) utilisent la **clé
  service role** (`createServiceClient`, contourne la RLS) — jamais côté client.
- **IA provider-agnostique** (`src/lib/ai.ts`) : Groq (compatible OpenAI) et/ou
  Gemini selon les clés présentes ; `isAiConfigured()` + fallback propre si aucune.
  **Pas Anthropic** (clé payante). Les features IA tournent une fois `GROQ_API_KEY`
  ou `GEMINI_API_KEY` renseignée. Pour les vues **comparatives** (analyse d'un match),
  `aiCompleteWith(provider, …)` + `configuredProviders()` appellent Groq **et** Gemini
  en parallèle ; l'erreur d'un provider (ex. quota) n'empêche pas l'affichage de l'autre.
- **Notifications in-app** : table `notifications` alimentée par des triggers
  (`trg_notify_on_badge`, `trg_zz_notify_match_scored`) via la fonction
  `security definer` `notify()`. Le webhook `GET /api/webhooks/dispatch` fournit à
  Make le flux rappels/résultats à pousser sur Discord.
- **Badges « du jour »** (`top_of_the_day`, `comeback`, `perfect_day`) : calculés
  par `GET /api/snapshot-standings` (cron quotidien, `CRON_SECRET`) qui fige le
  classement dans `standings_snapshots`.
- **Analyses IA par match** (`match_summaries`, un avis par match × provider,
  migration `0008`) : `generateMatchInsight()` appelle Groq + Gemini en parallèle —
  match terminé → résumé + joueur du match (estimation) + fait marquant ; match à
  venir → forces/forme + joueurs clés + pronostic. Pas de data joueurs en base : les
  estimations viennent de la connaissance du modèle + le score, pas du play-by-play.
- Réponses & UI **en français**.

## État d'avancement

- ✅ **Phase 1 — Fondations** : schéma Supabase complet (migrations + RLS + triggers
  de scoring + vue classement), auth (login/register/callback/middleware), shell app
  protégé + navbar, dashboard perso (points/pronos/ligues). **Build vert.**
- ✅ **Niveau 1 — « Karim respire »** : pages `matches` (saisie pronos verrouillés),
  `leagues` (créer/rejoindre via code), `leaderboard` (vue standings), `profile`.
- ✅ **Niveau 2 — « Karim kiffe »** : scores live (auto-refresh 60s + `/api/sync-scores`),
  badges auto (7/7), stats perso enrichies, **profils IA** + **analyses IA par match**
  (Groq ; colonne Gemini ajoutée automatiquement si une clé Gemini est présente —
  l'UI s'adapte aux providers configurés), **notifs in-app** (cloche) + webhook
  Make/Discord, **réactions emoji** sur les matchs, **page publique partageable** `/u/[username]`.
  ⚠️ Nécessite les migrations `0007_niveau2.sql` + `0008_match_insights.sql` appliquées
  + une clé IA (`GROQ_API_KEY` et/ou `GEMINI_API_KEY`).
- ⬜ **Niveau 3 — « Karim scale »** : multi-ligue avancé, dashboard admin, Stripe, tests.
- ⬜ **Bonus 1** : bot Discord. ⬜ **Bonus 2** : IA vs Humains (pronos Groq/Gemini).

## Commandes

```bash
npm run dev          # dev local (http://localhost:3000)
npm run build        # build de prod
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
```

Migrations Supabase : voir `supabase/README.md`.

## Variables d'environnement

Copier `.env.local.example` → `.env.local`. **Sans les clés Supabase, le
middleware (`getUser`) échoue sur les routes protégées.** Voir `.env.local.example`
pour la liste (Supabase, API-Football, **IA : Groq/Gemini**, Make, Discord, Cron).
