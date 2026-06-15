update matches m set home_score = v.hs, away_score = v.aw, status = v.st::match_status, updated_at = now()
from (values
(1489369, 2, 0, 'finished'),
(1538999, 2, 1, 'finished'),
(1539000, 1, 1, 'finished'),
(1489370, 4, 1, 'finished'),
(1489371, 1, 1, 'finished')
) as v(afid, hs, aw, st)
where m.api_football_id = v.afid
  and (m.status is distinct from v.st::match_status or m.home_score is distinct from v.hs or m.away_score is distinct from v.aw);
