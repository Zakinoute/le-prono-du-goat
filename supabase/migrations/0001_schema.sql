-- ============================================================
-- 0001_schema.sql — Schéma de base "Le Prono du GOAT"
-- ============================================================

create extension if not exists pgcrypto;

-- Enums --------------------------------------------------------
create type match_status as enum
  ('scheduled', 'live', 'finished', 'postponed', 'cancelled');
create type member_role as enum ('owner', 'admin', 'member');

-- Helper updated_at -------------------------------------------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- profiles (1-1 avec auth.users) ------------------------------
create table profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  username        text not null unique,
  display_name    text,
  avatar_url      text,
  ai_profile      text,
  ai_profile_data jsonb,
  bio             text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create trigger trg_profiles_updated before update on profiles
  for each row execute function set_updated_at();

-- leagues -----------------------------------------------------
create table leagues (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  description      text,
  invite_code      text not null unique,
  owner_id         uuid not null references profiles(id) on delete cascade,
  is_public        boolean not null default false,
  max_members      integer,
  prize_pool_cents integer not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index leagues_owner_idx on leagues(owner_id);
create trigger trg_leagues_updated before update on leagues
  for each row execute function set_updated_at();

-- league_members ----------------------------------------------
create table league_members (
  id         uuid primary key default gen_random_uuid(),
  league_id  uuid not null references leagues(id) on delete cascade,
  user_id    uuid not null references profiles(id) on delete cascade,
  role       member_role not null default 'member',
  joined_at  timestamptz not null default now(),
  unique (league_id, user_id)
);
create index league_members_user_idx on league_members(user_id);
create index league_members_league_idx on league_members(league_id);

-- matches -----------------------------------------------------
create table matches (
  id              uuid primary key default gen_random_uuid(),
  api_football_id integer unique,
  season          integer,
  stage           text,
  group_name      text,
  round           text,
  home_team       text not null,
  away_team       text not null,
  home_team_code  text,
  away_team_code  text,
  home_team_logo  text,
  away_team_logo  text,
  home_score      integer,
  away_score      integer,
  status          match_status not null default 'scheduled',
  kickoff_at      timestamptz not null,
  venue           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index matches_kickoff_idx on matches(kickoff_at);
create index matches_status_idx on matches(status);
create trigger trg_matches_updated before update on matches
  for each row execute function set_updated_at();

-- predictions (1 prono par user+match, valable dans toutes ses ligues) --
create table predictions (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references profiles(id) on delete cascade,
  match_id           uuid not null references matches(id) on delete cascade,
  home_score         integer not null check (home_score >= 0),
  away_score         integer not null check (away_score >= 0),
  points             integer not null default 0,
  is_exact           boolean not null default false,
  is_correct_result  boolean not null default false,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (user_id, match_id)
);
create index predictions_match_idx on predictions(match_id);
create index predictions_user_idx on predictions(user_id);
create trigger trg_predictions_updated before update on predictions
  for each row execute function set_updated_at();

-- badges ------------------------------------------------------
create table badges (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  name        text not null,
  description text,
  icon        text,
  created_at  timestamptz not null default now()
);

create table user_badges (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references profiles(id) on delete cascade,
  badge_id  uuid not null references badges(id) on delete cascade,
  earned_at timestamptz not null default now(),
  unique (user_id, badge_id)
);
create index user_badges_user_idx on user_badges(user_id);
