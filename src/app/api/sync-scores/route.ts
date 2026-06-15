import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Synchronisation des matchs & scores de la Coupe du Monde 2026.
 *
 * Source : football-data.org (gratuit, Coupe du Monde incluse) — un seul appel
 * `GET /v4/competitions/WC/matches` renvoie les 104 matchs avec scores, statut,
 * équipes, codes et logos.
 *
 * Appelé périodiquement par Make (1 appel HTTP = 1 opération) ou un cron.
 * Upsert dans `matches` via la clé service role (contourne la RLS) ; le passage
 * d'un match à `finished` déclenche le trigger de scoring en base.
 *
 * Sécurité : exige `?secret=<CRON_SECRET>` (ou en-tête `x-sync-secret`).
 */

type FdStatus =
  | "SCHEDULED"
  | "TIMED"
  | "IN_PLAY"
  | "PAUSED"
  | "FINISHED"
  | "SUSPENDED"
  | "POSTPONED"
  | "CANCELLED"
  | "AWARDED";

interface FdTeam {
  name: string | null;
  tla: string | null;
  crest: string | null;
}

interface FdMatch {
  id: number;
  utcDate: string;
  status: FdStatus;
  matchday: number | null;
  stage: string;
  group: string | null;
  homeTeam: FdTeam;
  awayTeam: FdTeam;
  score: { fullTime: { home: number | null; away: number | null } };
}

type MatchStatus = "scheduled" | "live" | "finished" | "postponed" | "cancelled";

function mapStatus(s: FdStatus): MatchStatus {
  switch (s) {
    case "FINISHED":
    case "AWARDED":
      return "finished";
    case "IN_PLAY":
    case "PAUSED":
      return "live";
    case "POSTPONED":
    case "SUSPENDED":
      return "postponed";
    case "CANCELLED":
      return "cancelled";
    default:
      return "scheduled";
  }
}

const KNOCKOUT_LABELS: Record<string, string> = {
  LAST_32: "16es de finale",
  LAST_16: "8es de finale",
  QUARTER_FINALS: "Quarts de finale",
  SEMI_FINALS: "Demi-finales",
  THIRD_PLACE: "Match pour la 3e place",
  FINAL: "Finale",
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const secret =
    url.searchParams.get("secret") ?? request.headers.get("x-sync-secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = process.env.FOOTBALL_DATA_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "FOOTBALL_DATA_TOKEN manquant" },
      { status: 500 }
    );
  }

  // 1) Un seul appel : tous les matchs de la Coupe du Monde.
  const res = await fetch(
    "https://api.football-data.org/v4/competitions/WC/matches",
    { headers: { "X-Auth-Token": token }, cache: "no-store" }
  );
  if (!res.ok) {
    return NextResponse.json(
      { error: `football-data.org a répondu ${res.status}` },
      { status: 502 }
    );
  }
  const data = (await res.json()) as { matches: FdMatch[] };

  // 2) On ne garde que les matchs dont les deux équipes sont connues
  //    (les tours finaux à venir ont des équipes nulles).
  const rows = (data.matches ?? [])
    .filter((m) => m.homeTeam?.name && m.awayTeam?.name)
    .map((m) => {
      const isGroup = m.stage === "GROUP_STAGE";
      return {
        api_football_id: m.id,
        season: 2026,
        stage: isGroup ? "Group Stage" : "Knockout",
        group_name: m.group ? m.group.replace("GROUP_", "") : null,
        round: isGroup
          ? `Matchday ${m.matchday ?? 1}`
          : KNOCKOUT_LABELS[m.stage] ?? m.stage,
        home_team: m.homeTeam.name,
        away_team: m.awayTeam.name,
        home_team_code: m.homeTeam.tla,
        away_team_code: m.awayTeam.tla,
        home_team_logo: m.homeTeam.crest,
        away_team_logo: m.awayTeam.crest,
        home_score: m.score.fullTime.home,
        away_score: m.score.fullTime.away,
        status: mapStatus(m.status),
        kickoff_at: m.utcDate,
      };
    });

  // 3) Upsert (service role → contourne la RLS). Le trigger de scoring se
  //    déclenche pour chaque match qui passe à `finished`.
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("matches")
    .upsert(rows, { onConflict: "api_football_id" });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const finished = rows.filter((r) => r.status === "finished").length;
  const live = rows.filter((r) => r.status === "live").length;

  return NextResponse.json({
    synced: rows.length,
    finished,
    live,
    at: new Date().toISOString(),
  });
}
