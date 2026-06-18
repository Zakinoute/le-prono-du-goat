-- ============================================================
-- 0007_niveau2.sql — Niveau 2 « Karim kiffe »
--   • notifications in-app (+ triggers badge / match scoré)
--   • snapshots de classement (badges « Meilleur du jour », « Remontada »)
--   • réactions emoji sur les matchs
--   • cache des résumés IA de la journée
-- ============================================================

-- 1) NOTIFICATIONS ===========================================
create table notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  type       text not null,            -- badge | match_scored | reminder | rank | system
  title      text not null,
  body       text,
  icon       text,
  link       text,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on notifications(user_id, read, created_at desc);

alter table notifications enable row level security;

-- On ne voit / ne modifie que SES notifications. L'écriture passe par des
-- fonctions SECURITY DEFINER (triggers) ou la clé service role → pas de policy
-- insert pour les clients.
create policy "notifications_select_own" on notifications
  for select using (user_id = auth.uid());
create policy "notifications_update_own" on notifications
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "notifications_delete_own" on notifications
  for delete using (user_id = auth.uid());

-- Helper d'insertion (contourne la RLS via SECURITY DEFINER).
create or replace function notify(
  p_user  uuid,
  p_type  text,
  p_title text,
  p_body  text default null,
  p_icon  text default null,
  p_link  text default null
) returns void language sql security definer set search_path = public as $$
  insert into notifications (user_id, type, title, body, icon, link)
  values (p_user, p_type, p_title, p_body, p_icon, p_link);
$$;
revoke execute on function notify(uuid, text, text, text, text, text)
  from public, anon, authenticated;

-- Notif à chaque badge décroché (quelle que soit la source d'attribution).
create or replace function notify_on_badge()
returns trigger language plpgsql security definer set search_path = public as $$
declare b badges%rowtype;
begin
  select * into b from badges where id = new.badge_id;
  perform notify(
    new.user_id, 'badge',
    'Nouveau badge : ' || coalesce(b.name, 'récompense'),
    b.description, coalesce(b.icon, '🏅'), '/profile'
  );
  return new;
end;
$$;
revoke execute on function notify_on_badge() from public, anon, authenticated;

drop trigger if exists trg_notify_on_badge on user_badges;
create trigger trg_notify_on_badge
  after insert on user_badges
  for each row execute function notify_on_badge();

-- Notif à chaque joueur quand un de ses matchs est scoré.
-- Nommé « trg_zz_… » pour passer APRÈS le trigger de scoring
-- (« trg_score_predictions ») : les points sont déjà calculés.
create or replace function notify_match_scored()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'finished'
     and (old.status is distinct from 'finished')
     and new.home_score is not null and new.away_score is not null then
    insert into notifications (user_id, type, title, body, icon, link)
    select
      p.user_id, 'match_scored',
      new.home_team || ' ' || new.home_score || '–' || new.away_score
        || ' ' || new.away_team,
      case
        when p.points = 3 then 'Score exact ! +3 pts 🎯'
        when p.points = 1 then 'Bon résultat, +1 pt'
        else 'Raté cette fois (ton prono : ' || p.home_score || '–'
             || p.away_score || ')'
      end,
      case when p.points > 0 then '✅' else '❌' end,
      '/matches'
    from predictions p
    where p.match_id = new.id;
  end if;
  return new;
end;
$$;
revoke execute on function notify_match_scored() from public, anon, authenticated;

drop trigger if exists trg_zz_notify_match_scored on matches;
create trigger trg_zz_notify_match_scored
  after update of status, home_score, away_score on matches
  for each row execute function notify_match_scored();

-- 2) SNAPSHOTS DE CLASSEMENT =================================
-- Photo quotidienne du classement de chaque ligue : base des badges
-- « Meilleur du jour » (rang 1) et « Remontada » (+5 places vs veille).
create table standings_snapshots (
  id           uuid primary key default gen_random_uuid(),
  league_id    uuid not null references leagues(id) on delete cascade,
  user_id      uuid not null references profiles(id) on delete cascade,
  captured_on  date not null,
  rank         integer not null,
  total_points integer not null,
  created_at   timestamptz not null default now(),
  unique (league_id, user_id, captured_on)
);
create index standings_snapshots_league_idx
  on standings_snapshots(league_id, captured_on desc);

alter table standings_snapshots enable row level security;
-- Lisible par les membres de la ligue (l'écriture est faite par la clé
-- service role depuis la route /api/snapshot-standings).
create policy "snapshots_select_members" on standings_snapshots
  for select using (is_member_of(league_id));

-- 3) RÉACTIONS EMOJI SUR LES MATCHS ==========================
create table match_reactions (
  id         uuid primary key default gen_random_uuid(),
  match_id   uuid not null references matches(id) on delete cascade,
  user_id    uuid not null references profiles(id) on delete cascade,
  emoji      text not null,
  created_at timestamptz not null default now(),
  unique (match_id, user_id)
);
create index match_reactions_match_idx on match_reactions(match_id);

alter table match_reactions enable row level security;
-- Compteurs publics (entre utilisateurs connectés) ; chacun gère la sienne.
create policy "reactions_select_auth" on match_reactions
  for select using (auth.role() = 'authenticated');
create policy "reactions_insert_own" on match_reactions
  for insert with check (user_id = auth.uid());
create policy "reactions_update_own" on match_reactions
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "reactions_delete_own" on match_reactions
  for delete using (user_id = auth.uid());

-- 4) RÉSUMÉS IA DE LA JOURNÉE (cache) ========================
create table daily_summaries (
  id           uuid primary key default gen_random_uuid(),
  round        text not null unique,
  content      text not null,
  model        text,
  generated_at timestamptz not null default now()
);

alter table daily_summaries enable row level security;
-- Lecture pour tous les connectés ; écriture via la clé service role
-- (server action générant le résumé IA).
create policy "summaries_select_auth" on daily_summaries
  for select using (auth.role() = 'authenticated');
