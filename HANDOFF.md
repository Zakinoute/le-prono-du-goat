# 🐐 Le Prono du GOAT — Document de passation (handoff)

> **But de ce document** : permettre à une nouvelle session Claude (ou à un dev)
> de reprendre le projet **à froid**, sans contexte préalable. Lis-le en entier
> avant d'agir.
>
> **Date** : 2026-06-12 · **État** : Phase 1 (Fondations) terminée, **build vert**.

---

## 1. C'est quoi ce projet ?

App de pronostics pour la **Coupe du Monde 2026**, dans le cadre du **challenge
DEENCODE #02 « Le Prono du GOAT »** (brief complet : `Nouveau dossier/Deencode-Challenge-02-Prono-du-GOAT.pptx`).

Persona : « Karim », admin d'un Discord de ~2 000 fans, veut remplacer son
concours de pronos Google Sheets. Le challenge a **3 niveaux** :

- **Niveau 1 — « Karim respire »** : MVP. Auth, ligues privées (code d'invitation),
  liste des matchs, prono score exact, **verrouillage au coup d'envoi**, calcul de
  points auto, **classement temps réel**, dashboard perso, responsive + Vercel.
- **Niveau 2 — « Karim kiffe »** : scores live, réactions, notifs, badges, stats
  perso, **profils IA (Claude)**, résumé IA de la journée, page publique partageable.
- **Niveau 3 — « Karim scale »** : multi-ligue, dashboard admin, agent IA pré/post-match,
  images partageables, Stripe (cagnottes), PWA + edge functions + tests.
- **Bonus retenus par l'utilisateur** : **Bonus 1 (bot Discord)** + **Bonus 2 (IA vs Humains)**.
  (Bonus 3 « Mode Phase Finale » non retenu pour l'instant.)

**Langue** : tout en **français** (UI + échanges).

---

## 2. ⚠️ Historique des changements de cap (IMPORTANT pour ne pas se perdre)

Le projet a changé d'architecture **3 fois** en une seule session. État final = #3.

1. **Départ** : app Supabase (jamais commitée dans Git).
2. **Pivot Airtable** : dashboard de stats en lecture seule (Airtable + Make + Discord).
   → **ABANDONNÉ**.
3. **Choix FINAL de l'utilisateur** : **retour à la stack recommandée du brief =
   Supabase**, avec **Make** comme alternative à n8n, + les 2 bonus.

> Le code Supabase d'origine n'avait jamais été commité (`git log` ne montre qu'un
> « Initial commit from Create Next App »). Il a donc été **reconstruit de zéro**
> dans cette session. Ne cherche pas à le « restaurer » depuis Git : il n'y est pas.

---

## 3. Stack actuelle

- **Next.js 14** (App Router, TypeScript, dossier `src/`, alias `@/*`)
- **Supabase** (Auth + Postgres + RLS) via `@supabase/ssr`
- **Tailwind CSS** + **shadcn/ui** (style `new-york`, base `slate`, primary = vert)
- **Vercel** (déploiement visé)
- **Make** = orchestration (sync scores API-Football + notifs) — *alternative à n8n*
- **API-Football** (données + scores), **Claude API** (profils IA + Bonus 2),
  **discord.js** (Bonus 1)

> ❓ **À clarifier avec l'utilisateur** : il a mentionné un **« Hermes Agent »**
> en plus de Make pour l'orchestration. On ne sait pas ce que c'est. En attendant,
> Make est l'orchestrateur de référence.

---

## 4. Ce qui est FAIT (Phase 1 — Fondations) ✅

**Build vérifié vert** (`npm run build`, 13 routes, middleware actif). Le warning
« Edge Runtime / process.version » de `@supabase/ssr` dans le middleware est
**bénin et connu** — il ne casse rien.

### Base de données — `supabase/migrations/`
- `0001_schema.sql` — enums (`match_status`, `member_role`) + tables : `profiles`,
  `leagues`, `league_members`, `matches`, `predictions`, `badges`, `user_badges` + index.
- `0002_functions.sql` — `gen_invite_code()` (défaut sur `leagues.invite_code`),
  `handle_new_user()` (crée le profil à l'inscription via trigger sur `auth.users`),
  `add_owner_membership()` (créateur = owner), **`score_match_predictions()`**
  (trigger scoring), helpers `is_member_of` / `shares_league_with` (security definer),
  `join_league_by_code(p_code)`, **vue `league_standings`** (security_invoker).
- `0003_rls.sql` — RLS sur toutes les tables : verrouillage au coup d'envoi
  (insert/update `predictions` exigent `kickoff_at > now()`), anti-triche
  (pronos des autres visibles seulement après le coup d'envoi).
- `0004_seed_badges.sql` — 7 badges de départ.

### Code applicatif — `src/`
- `lib/supabase/client.ts` — client navigateur.
- `lib/supabase/server.ts` — client RSC/actions + **`createServiceClient()`**
  (clé service role, pour les jobs serveur, contourne la RLS).
- `lib/supabase/middleware.ts` + `middleware.ts` — refresh session + protection
  des routes (`PROTECTED_ROUTES`).
- `lib/constants.ts` — `APP_NAME`, `POINTS` (barème), `PROTECTED_ROUTES`, `AI_PROFILES`.
- `lib/utils.ts` — `cn()`.
- `types/database.ts` — types TS de la base (maintenus à la main, collent aux migrations).
- `app/(auth)/` — `login`, `register`, `actions.ts` (login/signup/signout), `layout.tsx`.
- `app/auth/callback/route.ts` — échange du code Supabase (confirmation e-mail).
- `app/(app)/layout.tsx` — layout **protégé** (redirige `/login` si pas connecté) + navbar.
- `app/(app)/dashboard/page.tsx` — dashboard perso (points / pronos / ligues, vrais counts).
- `app/(app)/{matches,leagues,leaderboard,profile}/page.tsx` — **placeholders**
  `ComingSoon` (à remplacer en Phase 2).
- `app/page.tsx` — landing publique. `components/layout/navbar.tsx`,
  `components/ui/` (button, card, input, label), `components/coming-soon.tsx`.

---

## 5. Décisions techniques clés (à respecter)

- **1 seul prono par (user, match)**, valable dans toutes ses ligues
  (`unique (user_id, match_id)`).
- **Barème** : score exact = **3 pts**, bon résultat (1N2) = **1 pt**, sinon 0.
  Calculé **côté base** par le trigger `score_match_predictions` quand un match
  passe à `finished`. Ne pas dupliquer cette logique côté front.
- **Verrouillage au coup d'envoi** appliqué en **RLS** (la base est la source de
  vérité, pas seulement le front).
- **Classement = vue `league_standings`** (`security_invoker`), pas de table
  dénormalisée. Elle reste correcte sous RLS car les points n'existent que sur des
  matchs terminés (donc déjà visibles).
- **Anti-récursion RLS** : les policies sur `league_members` passent par les
  fonctions `security definer` `is_member_of` / `shares_league_with`.
- **Jobs serveur** (sync scores via Make, scoring, badges) → **clé service role**
  (`createServiceClient`), **jamais** côté client.

---

## 6. Ce qu'il RESTE à faire

### Supabase — DÉJÀ EN LIGNE ✅ (fait via le connecteur MCP le 2026-06-12)
- Projet **« GOAT deencode »**, ref **`vtnasdcxgkyddezjwqor`**, région eu-central-2, Postgres 17.
- URL : `https://vtnasdcxgkyddezjwqor.supabase.co`.
- **Migrations 0001 → 0005 appliquées** (vérifiées : 7 tables, RLS active partout, 7 badges).
- Durcissement `0005` appliqué (search_path + retrait exposition RPC). Restent 3 advisors
  WARN **intentionnels** (`is_member_of`, `shares_league_with`, `join_league_by_code` —
  doivent rester exécutables par `authenticated` pour la RLS / le RPC de join).
- `.env.local` rempli avec `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Connexion testée en live : `/login` rend (200), `/dashboard` redirige (307, middleware OK).

### Seule action restante de l'utilisateur
- Ajouter **`SUPABASE_SERVICE_ROLE_KEY`** dans `.env.local` (Dashboard → Project Settings
  → API → `service_role`, secret). **Non exposé par le connecteur MCP** pour raison de
  sécurité. Pas bloquant pour l'app de base (auth, dashboard, pronos) — utile seulement
  pour les jobs serveur (sync Make, scoring côté service role).
- (Optionnel) Désactiver « Confirm email » dans Auth pour des tests locaux plus rapides.
- ~~Insérer des matchs~~ ✅ **FAIT** : 72 vrais matchs de phase de groupes CDM 2026
  (12 groupes, 48 équipes, 11→28 juin) insérés via le connecteur. Source TheSportsDB
  (`supabase/seed_wc2026.sql`, idempotent). Les 32 matchs à élimination directe restent
  à ajouter quand les équipes seront connues (clé API-Football `cd25f29…` dispo mais
  plan Free bloqué sur 2026 ; utiliser TheSportsDB `eventsround` ou football-data.org).

### Phase 2 — MVP Niveau 1
1. ✅ **`/matches`** — FAIT & vérifié. Liste des vrais matchs (filtres J1/J2/J3, logos,
   verrouillage, résultats+pronos) + saisie via server action (`matches/actions.ts`,
   `matches/prediction-form.tsx`, upsert sur `predictions`). Testé : prono sur match
   ouvert OK, sur match verrouillé refusé par RLS (403). Trigger profil confirmé.
2. ✅ **`/leagues`** — FAIT & vérifié. Créer une ligue (owner auto via trigger),
   rejoindre via code (`rpc('join_league_by_code')`), liste avec code copiable
   (`leagues/actions.ts`, `leagues/league-forms.tsx`). Testé : création + owner + vue
   standings + code invalide refusé. Ligue de test « Les Experts du Ballon » existe.
3. ✅ **`/leaderboard`** — FAIT & vérifié. Lit `league_standings`, sélecteur de ligue
   (`?league=<id>`), médailles top 3, surbrillance « toi ». **Scoring testé end-to-end**
   (match jetable : prono 2-1 + résultat 2-1 → trigger → 3 pts → classement à jour →
   nettoyé). ⚠️ Le scoring se déclenche sur UPDATE d'un match vers `finished`.
4. **`/profile`** — stats perso, badges, (profil IA = Niveau 2). ← DERNIER de la Phase 2

### Compte démo (pour tester sans confirmation e-mail)
- **`demo@prono-goat.test`** / **`GoatDemo2026!`** (username DemoGoat). Créé en SQL dans
  `auth.users` (confirmé). A déjà un prono (Germany 3-0 Curaçao). Supprimable plus tard.

Il faudra aussi **insérer des matchs de test** (table `matches`) pour pouvoir
pronostiquer — soit à la main, soit via la Phase 3 (Make + API-Football).

### Phases suivantes
- **Phase 3** : scénarios **Make** — sync scores API-Football (passe les matchs en
  `finished` avec le score → déclenche le scoring), notifications.
- **Bonus 1** : bot **Discord** (discord.js) — commandes slash (`/pronostic`,
  `/classement`), embeds résultats, rappels avant match.
- **Bonus 2** : **IA vs Humains** — Claude pose ses propres pronos, comparaison finale.

---

## 7. Commandes

```bash
npm run dev          # http://localhost:3000
npm run build        # build de prod (doit rester vert)
npm run lint         # ESLint (attention : react/no-unescaped-entities sur les apostrophes en JSX)
npm run typecheck    # tsc --noEmit
```

> ⚠️ Le projet est sur un chemin avec espaces et accents :
> `C:\Users\PC\Documents\goat deen code`. Sous PowerShell, le `Set-Location` ne
> persiste pas toujours entre commandes — préfixe `Set-Location "<path>"; <cmd>`.

---

## 8. Infos diverses / pièges

- **Git** : 1 seul commit (« Initial commit from Create Next App »). Tout le travail
  ci-dessus est **non commité** (working tree). Penser à commiter.
- **Airtable (abandonné)** : une base `appH3J2KqEY0GWxLR` existe (5 tables : Matches,
  Ligues, Membres, Pronos, Classement) avec un token (scopes `data.records:read` +
  `schema.bases:read`). Mise de côté au profit de Supabase ; réutilisable seulement
  si on veut migrer des données. *(Le token secret n'est pas reproduit ici — demander
  à l'utilisateur si besoin.)*
- Docs internes : `README.md` (démarrage + état), `CLAUDE.md` (architecture +
  conventions), `supabase/README.md` (comment appliquer les migrations).
- `.env.local.example` liste **toutes** les variables (Supabase, API-Football,
  Claude, Make, Discord, Cron).
