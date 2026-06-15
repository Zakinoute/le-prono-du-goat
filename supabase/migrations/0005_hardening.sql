-- ============================================================
-- 0005_hardening.sql — Durcissement sécurité (advisors Supabase)
-- ============================================================

-- 1) search_path fixe sur les fonctions qui en manquaient ------
create or replace function set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function gen_invite_code()
returns text language plpgsql set search_path = public as $$
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

-- 2) Fonctions de TRIGGER : jamais appelées en direct → on retire
--    leur exposition via l'API RPC (elles s'exécutent via les triggers,
--    qui tournent au nom du propriétaire, donc ça ne casse rien).
revoke execute on function handle_new_user()         from public, anon, authenticated;
revoke execute on function add_owner_membership()     from public, anon, authenticated;
revoke execute on function score_match_predictions()  from public, anon, authenticated;

-- 3) Helpers RLS : réservés aux utilisateurs connectés (nécessaires à
--    l'évaluation des policies), retirés pour anon.
revoke execute on function is_member_of(uuid)        from public, anon;
revoke execute on function shares_league_with(uuid)  from public, anon;
grant  execute on function is_member_of(uuid)        to authenticated;
grant  execute on function shares_league_with(uuid)  to authenticated;

-- 4) join_league_by_code : appelée en RPC par les membres CONNECTÉS.
revoke execute on function join_league_by_code(text) from public, anon;
grant  execute on function join_league_by_code(text) to authenticated;
