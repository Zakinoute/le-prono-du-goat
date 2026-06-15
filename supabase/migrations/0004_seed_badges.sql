-- ============================================================
-- 0004_seed_badges.sql — Badges de départ
-- ============================================================

insert into badges (code, name, description, icon) values
  ('first_prono',   'Premier prono',    'Tu as posé ton tout premier pronostic.',      '🎯'),
  ('exact_score',   'Dans le mille',    'Un score exact pronostiqué.',                 '🎰'),
  ('hot_streak',    'En feu',           '3 bons résultats d''affilée.',                '🔥'),
  ('perfect_day',   'Journée parfaite', 'Tous tes pronos du jour étaient corrects.',   '🌟'),
  ('top_of_the_day','Meilleur du jour', '1er au classement de la journée.',            '👑'),
  ('comeback',      'Remontada',        '+5 places au classement en une seule journée.', '🚀'),
  ('full_house',    'Carton plein',     'Au moins un prono sur tous les matchs d''une journée.', '🃏')
on conflict (code) do nothing;
