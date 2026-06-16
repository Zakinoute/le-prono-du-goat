-- ============================================================
-- 0006_badges_awarding.sql — Attribution automatique des badges
-- ============================================================

-- Helper : attribue un badge (par code) à un utilisateur, sans doublon.
create or replace function award_badge(p_user uuid, p_code text)
returns void language sql security definer set search_path = public as $$
  insert into user_badges (user_id, badge_id)
  select p_user, b.id from badges b where b.code = p_code
  on conflict (user_id, badge_id) do nothing;
$$;

-- À l'insertion d'un prono : "Premier prono" + "Carton plein" (journée complète).
create or replace function award_on_prediction()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_round text;
  v_total int;
  v_done  int;
begin
  -- Premier prono de l'utilisateur
  if (select count(*) from predictions where user_id = new.user_id) = 1 then
    perform award_badge(new.user_id, 'first_prono');
  end if;

  -- Carton plein : a pronostiqué tous les matchs de la journée de ce match
  select round into v_round from matches where id = new.match_id;
  if v_round is not null then
    select count(*) into v_total from matches where round = v_round;
    select count(*) into v_done
      from predictions p join matches m on m.id = p.match_id
      where p.user_id = new.user_id and m.round = v_round;
    if v_total > 0 and v_done >= v_total then
      perform award_badge(new.user_id, 'full_house');
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_award_on_prediction on predictions;
create trigger trg_award_on_prediction
  after insert on predictions
  for each row execute function award_on_prediction();

-- Scoring (3 pts exact / 1 pt bon résultat) + badges quand un match se termine.
create or replace function score_match_predictions()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'finished'
     and new.home_score is not null and new.away_score is not null
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

    -- Badge "Dans le mille" : score exact
    insert into user_badges (user_id, badge_id)
    select p.user_id, (select id from badges where code = 'exact_score')
    from predictions p
    where p.match_id = new.id and p.is_exact
    on conflict (user_id, badge_id) do nothing;

    -- Badge "En feu" : 3 bons résultats consécutifs (par ordre de coup d'envoi)
    insert into user_badges (user_id, badge_id)
    select t.user_id, (select id from badges where code = 'hot_streak')
    from (
      select p.user_id, p.is_correct_result,
             row_number() over (partition by p.user_id order by m.kickoff_at desc) rn
      from predictions p
      join matches m on m.id = p.match_id
      where m.status = 'finished'
        and p.user_id in (select user_id from predictions where match_id = new.id)
    ) t
    where t.rn <= 3
    group by t.user_id
    having count(*) = 3 and bool_and(t.is_correct_result)
    on conflict (user_id, badge_id) do nothing;
  end if;
  return new;
end;
$$;

-- Durcissement : helpers/triggers non exposés en RPC.
revoke execute on function award_badge(uuid, text) from public, anon, authenticated;
revoke execute on function award_on_prediction() from public, anon, authenticated;
