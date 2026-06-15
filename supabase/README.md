# Supabase — Le Prono du GOAT

Schéma de la base (Postgres + RLS) sous forme de migrations SQL.

## Appliquer les migrations

### Option A — SQL Editor (le plus simple)
1. Crée un projet sur [supabase.com](https://supabase.com).
2. Ouvre **SQL Editor** et exécute les fichiers de `migrations/` **dans l'ordre** :
   `0001` → `0002` → `0003` → `0004`.
3. Récupère tes clés dans **Project Settings → API** et remplis `.env.local`.

### Option B — CLI Supabase
```bash
npx supabase link --project-ref <ref>
npx supabase db push
```

## Contenu

| Fichier | Rôle |
|---------|------|
| `0001_schema.sql` | Enums, tables (profiles, leagues, league_members, matches, predictions, badges, user_badges), index |
| `0002_functions.sql` | Code d'invitation, création auto du profil, **scoring** (trigger), helpers RLS, `join_league_by_code`, vue `league_standings` |
| `0003_rls.sql` | Politiques Row Level Security (verrouillage au coup d'envoi, anti-triche) |
| `0004_seed_badges.sql` | Badges de départ |

## Décisions clés

- **1 prono par (user, match)** valable dans toutes ses ligues (`unique (user_id, match_id)`).
- **Barème** : score exact = 3 pts, bon résultat = 1 pt — calculé par le trigger
  `score_match_predictions` quand un match passe à `finished`.
- **Verrouillage au coup d'envoi** appliqué en **RLS** (insert/update sur `predictions`
  exigent `matches.kickoff_at > now()`).
- **Anti-triche** : les pronos des autres ne sont visibles qu'**après** le coup d'envoi.
- **Classement** = vue `league_standings` (`security_invoker`), pas de table dénormalisée.
- Les helpers `is_member_of` / `shares_league_with` sont **security definer** pour
  éviter la récursion infinie des policies sur `league_members`.
- Les jobs serveur (sync scores via Make, scoring, badges) utilisent la **clé service role**.
