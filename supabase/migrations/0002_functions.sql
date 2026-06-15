-- ============================================================
-- 0002_functions.sql — Fonctions, triggers métier & vue classement
-- ============================================================

-- Code d'invitation court et unique (6 caractères) ------------
create or replace function gen_invite_code()
returns text language plpgsql as $$
declare
  alphabet text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  code text;
  i int;
begin
  loop
    code := '';
    for i in 1..6 loop
      code := code || substr(alphabet, floor(random() * length(alphabet))::int + 1, 1);
    end loop;
    exit when not exists (select 1 from leagues where invite_code = code);
  end loop;
  return code;
end;
$$;

alter table leagues alter column invite_code set default gen_invite_code();

-- Création auto du profil à l'inscription ---------------------
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'display_name',
             new.raw_user_meta_data->>'username')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Le créateur d'une ligue en devient automatiquement owner ----
create or replace function add_owner_membership()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.league_members (league_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict (league_id, user_id) do nothing;
  return new;
end;
$$;

create trigger trg_league_owner_member
  after insert on leagues
  for each row execute function add_owner_membership();

-- Scoring : 3 pts score exact, 1 pt bon résultat --------------
-- Déclenché quand un match passe à 'finished' avec un score.
create or replace function score_match_predictions()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'finished'
     and new.home_score is not null
     and new.away_score is not null
     and (old.status is distinct from 'finished') then

    update predictions p set
      is_exact = (p.home_score = new.home_score and p.away_score = new.away_score),
      is_correct_result =
        (sign(p.home_score - p.away_score) = sign(new.home_score - new.away_score)),
      points = case
        when p.home_score = new.home_score and p.away_score = new.away_score then 3
        when sign(p.home_score - p.away_score) = sign(new.home_score - new.away_score) then 1
        else 0
      end,
      updated_at = now()
    where p.match_id = new.id;
  end if;
  return new;
end;
$$;

create trigger trg_score_predictions
  after update of status, home_score, away_score on matches
  for each row execute function score_match_predictions();

-- Helpers SECURITY DEFINER (évitent la récursion RLS) ---------
create or replace function is_member_of(p_league_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from league_members
    where league_id = p_league_id and user_id = auth.uid()
  );
$$;

create or replace function shares_league_with(p_other uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1
    from league_members me
    join league_members them on them.league_id = me.league_id
    where me.user_id = auth.uid() and them.user_id = p_other
  );
$$;

-- Rejoindre une ligue via son code (renvoie l'id de la ligue) --
create or replace function join_league_by_code(p_code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_league leagues%rowtype;
  v_count int;
begin
  select * into v_league from leagues where invite_code = upper(p_code);
  if not found then
    raise exception 'Code de ligue invalide';
  end if;

  if v_league.max_members is not null then
    select count(*) into v_count from league_members where league_id = v_league.id;
    if v_count >= v_league.max_members then
      raise exception 'Cette ligue est complète';
    end if;
  end if;

  insert into league_members (league_id, user_id, role)
  values (v_league.id, auth.uid(), 'member')
  on conflict (league_id, user_id) do nothing;

  return v_league.id;
end;
$$;

-- Classement par ligue (vue) ----------------------------------
-- security_invoker : respecte la RLS de l'appelant (anti-triche inclus).
create or replace view league_standings
with (security_invoker = true) as
select
  lm.league_id,
  lm.user_id,
  pr.username,
  pr.display_name,
  pr.avatar_url,
  coalesce(sum(p.points), 0)::int                                      as total_points,
  count(p.id)::int                                                     as played,
  count(p.id) filter (where p.is_exact)::int                           as exact_count,
  count(p.id) filter (where p.is_correct_result and not p.is_exact)::int as correct_result_count,
  rank() over (
    partition by lm.league_id
    order by coalesce(sum(p.points), 0) desc
  )::int                                                               as rank
from league_members lm
join profiles pr on pr.id = lm.user_id
left join predictions p on p.user_id = lm.user_id
group by lm.league_id, lm.user_id, pr.username, pr.display_name, pr.avatar_url;
