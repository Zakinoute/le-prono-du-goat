-- ============================================================
-- 0003_rls.sql — Row Level Security
-- ============================================================

alter table profiles       enable row level security;
alter table leagues        enable row level security;
alter table league_members enable row level security;
alter table matches        enable row level security;
alter table predictions    enable row level security;
alter table badges         enable row level security;
alter table user_badges    enable row level security;

-- profiles : lecture publique, écriture de son propre profil ---
create policy "profiles_select_all" on profiles
  for select using (true);
create policy "profiles_update_own" on profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- leagues : visible si publique, owner ou membre ---------------
create policy "leagues_select" on leagues
  for select using (is_public or owner_id = auth.uid() or is_member_of(id));
create policy "leagues_insert_owner" on leagues
  for insert with check (owner_id = auth.uid());
create policy "leagues_update_owner" on leagues
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "leagues_delete_owner" on leagues
  for delete using (owner_id = auth.uid());

-- league_members : visible aux membres ; on rejoint soi-même ---
create policy "members_select" on league_members
  for select using (is_member_of(league_id));
create policy "members_insert_self" on league_members
  for insert with check (user_id = auth.uid());
create policy "members_delete_self_or_owner" on league_members
  for delete using (
    user_id = auth.uid()
    or exists (select 1 from leagues l
               where l.id = league_id and l.owner_id = auth.uid())
  );

-- matches : lecture pour les utilisateurs authentifiés ---------
-- (écriture réservée à la clé service role, qui contourne la RLS)
create policy "matches_select_auth" on matches
  for select using (auth.role() = 'authenticated');

-- predictions : son prono toujours ; ceux des autres uniquement
-- APRÈS le coup d'envoi (anti-triche) -------------------------
create policy "predictions_select" on predictions
  for select using (
    user_id = auth.uid()
    or (
      shares_league_with(user_id)
      and exists (select 1 from matches m
                  where m.id = match_id and m.kickoff_at <= now())
    )
  );
create policy "predictions_insert" on predictions
  for insert with check (
    user_id = auth.uid()
    and exists (select 1 from matches m
                where m.id = match_id and m.kickoff_at > now())
  );
create policy "predictions_update" on predictions
  for update using (
    user_id = auth.uid()
    and exists (select 1 from matches m
                where m.id = match_id and m.kickoff_at > now())
  ) with check (user_id = auth.uid());
create policy "predictions_delete" on predictions
  for delete using (
    user_id = auth.uid()
    and exists (select 1 from matches m
                where m.id = match_id and m.kickoff_at > now())
  );

-- badges : lecture publique -----------------------------------
create policy "badges_select_all" on badges
  for select using (true);
create policy "user_badges_select" on user_badges
  for select using (user_id = auth.uid() or shares_league_with(user_id));
