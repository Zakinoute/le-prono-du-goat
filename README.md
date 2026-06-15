# 🐐 Le Prono du GOAT

App de pronostics pour la **Coupe du Monde 2026**. Ligues privées, pronos
verrouillés au coup d'envoi, classements temps réel, profils IA et plus.

> Remplace un concours de pronos sur Google Sheets pour un Discord de ~2 000 membres.
> Challenge DEENCODE #02.

## Stack

Next.js 14 (App Router, TS) · **Supabase** (Auth + Postgres + RLS) · Tailwind +
shadcn/ui · Vercel · API-Football · Claude API · **Make** (orchestration) ·
discord.js (bot — bonus).

## Démarrage

```bash
# 1. Dépendances
npm install

# 2. Variables d'environnement
cp .env.local.example .env.local   # puis remplir les clés Supabase

# 3. Base de données — appliquer les migrations
#    Voir supabase/README.md (SQL Editor ou `supabase db push`)

# 4. Lancer le dev
npm run dev
```

Ouvrir http://localhost:3000.

> ⚠️ Sans les clés Supabase dans `.env.local`, le middleware échoue sur les
> routes protégées (appel `getUser`). Renseigne-les avant de lancer `npm run dev`.

## État d'avancement

| Phase | Contenu | État |
|-------|---------|------|
| **1. Fondations** | Schéma Supabase (RLS + scoring + vue classement), Auth, shell app, dashboard | ✅ |
| **2. MVP Niveau 1** | Matchs, ligues (créer/rejoindre), pronos + verrouillage, classement live, profil | 🚧 |
| **3. Orchestration** | Sync scores API-Football + notifs (Make) | ⬜ |
| **4. Bonus 1** | Bot Discord (slash commands, embeds, rappels) | ⬜ |
| **5. Bonus 2** | IA vs Humains (pronos Claude) | ⬜ |

## Pages

| Route | Contenu | État |
|-------|---------|------|
| `/` | Landing publique | ✅ |
| `/login`, `/register` | Authentification Supabase | ✅ |
| `/dashboard` | Tableau de bord perso (points, pronos, ligues) | ✅ |
| `/matches` | Liste des matchs + saisie pronos | 🚧 |
| `/leagues` | Créer / rejoindre une ligue | 🚧 |
| `/leaderboard` | Classement temps réel | 🚧 |
| `/profile` | Stats, profil IA, badges | 🚧 |

## Scripts

| Commande | Rôle |
|----------|------|
| `npm run dev` | Serveur de dev |
| `npm run build` | Build de production |
| `npm run lint` | ESLint |
| `npm run typecheck` | Typecheck (`tsc --noEmit`) |

## Structure

Voir [`CLAUDE.md`](./CLAUDE.md) pour l'architecture détaillée et les conventions,
et [`supabase/README.md`](./supabase/README.md) pour le schéma de la base.
