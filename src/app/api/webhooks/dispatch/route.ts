import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Flux sortant pour Make → Discord (Niveau 2 : notifs).
 *
 * Make appelle cette route à intervalle régulier (scénario planifié) et reçoit
 * deux listes prêtes à formater en embeds Discord :
 *   • reminders — matchs qui débutent dans la fenêtre à venir (rappel « pose
 *     ton prono ! ») ;
 *   • results   — matchs récemment passés à `finished` (annonce des scores).
 *
 * L'idempotence (ne pas reposter le même message) est gérée côté Make en
 * filtrant sur `match_id`. Protégé par `?secret=<MAKE_WEBHOOK_SECRET>`
 * (ou `CRON_SECRET` en repli), ou l'en-tête `x-webhook-secret`.
 *
 * Paramètres : `?within=<min>` (fenêtre rappels, défaut 60) ·
 *              `?since=<min>` (fraîcheur résultats, défaut 180).
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const secret =
    url.searchParams.get("secret") ?? request.headers.get("x-webhook-secret");
  const expected = process.env.MAKE_WEBHOOK_SECRET || process.env.CRON_SECRET;
  if (!expected || secret !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const within = Number(url.searchParams.get("within") ?? "60"); // minutes
  const since = Number(url.searchParams.get("since") ?? "180"); // minutes
  const now = Date.now();
  const supabase = createServiceClient();

  // Rappels : matchs à venir dans la fenêtre [maintenant, +within].
  const { data: upcoming } = await supabase
    .from("matches")
    .select("id, home_team, away_team, kickoff_at, round, group_name")
    .eq("status", "scheduled")
    .gte("kickoff_at", new Date(now).toISOString())
    .lte("kickoff_at", new Date(now + within * 60_000).toISOString())
    .order("kickoff_at");

  // Résultats : matchs terminés et mis à jour récemment.
  const { data: recent } = await supabase
    .from("matches")
    .select(
      "id, home_team, away_team, home_score, away_score, round, group_name, updated_at"
    )
    .eq("status", "finished")
    .gte("updated_at", new Date(now - since * 60_000).toISOString())
    .order("updated_at", { ascending: false });

  return NextResponse.json({
    reminders: (upcoming ?? []).map((m) => ({
      match_id: m.id,
      label: `${m.home_team} – ${m.away_team}`,
      kickoff_at: m.kickoff_at,
      round: m.round,
      group: m.group_name,
    })),
    results: (recent ?? []).map((m) => ({
      match_id: m.id,
      label: `${m.home_team} ${m.home_score}–${m.away_score} ${m.away_team}`,
      round: m.round,
      group: m.group_name,
      finished_at: m.updated_at,
    })),
    at: new Date().toISOString(),
  });
}
