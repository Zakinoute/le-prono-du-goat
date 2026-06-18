import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Snapshot quotidien des classements + attribution des badges « du jour ».
 *
 * À appeler 1×/jour (Make ou Vercel Cron), après la fin des matchs de la
 * journée. Protégé par `?secret=<CRON_SECRET>` (ou en-tête `x-sync-secret`).
 *
 * Fige le classement de chaque ligue dans `standings_snapshots`, puis attribue :
 *   • 👑 top_of_the_day  — 1er d'une ligue (avec au moins un match joué)
 *   • 🚀 comeback        — +5 places vs le snapshot précédent
 *   • 🌟 perfect_day     — tous ses pronos des matchs finis aujourd'hui corrects
 *
 * Les notifications « nouveau badge » sont créées automatiquement par le
 * trigger `trg_notify_on_badge` en base.
 */

/** Date au format YYYY-MM-DD dans le fuseau de Paris. */
function parisDate(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(d);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const secret =
    url.searchParams.get("secret") ?? request.headers.get("x-sync-secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Date cible (override possible pour rejouer un jour précis : ?date=YYYY-MM-DD).
  const today = url.searchParams.get("date") ?? parisDate();
  const supabase = createServiceClient();

  // 1) Classement courant de toutes les ligues (service role → toutes lignes).
  const { data: standings, error: stErr } = await supabase
    .from("league_standings")
    .select("league_id, user_id, total_points, played, rank");
  if (stErr) {
    return NextResponse.json({ error: stErr.message }, { status: 500 });
  }
  const rows = standings ?? [];

  // 2) Snapshots précédents (jours antérieurs) → dernier rang connu par joueur.
  const { data: prevSnaps } = await supabase
    .from("standings_snapshots")
    .select("league_id, user_id, captured_on, rank")
    .lt("captured_on", today)
    .order("captured_on", { ascending: false });
  const prevRank = new Map<string, number>(); // clé league|user → rang le + récent
  for (const s of prevSnaps ?? []) {
    const k = `${s.league_id}|${s.user_id}`;
    if (!prevRank.has(k)) prevRank.set(k, s.rank);
  }

  // 3) Upsert du snapshot du jour.
  if (rows.length > 0) {
    const snapRows = rows.map((r) => ({
      league_id: r.league_id,
      user_id: r.user_id,
      captured_on: today,
      rank: r.rank,
      total_points: r.total_points,
    }));
    const { error: upErr } = await supabase
      .from("standings_snapshots")
      .upsert(snapRows, { onConflict: "league_id,user_id,captured_on" });
    if (upErr) {
      return NextResponse.json({ error: upErr.message }, { status: 500 });
    }
  }

  // 4) Badges « top du jour » et « remontada ».
  const toAward: { user_id: string; code: string }[] = [];
  for (const r of rows) {
    if (r.rank === 1 && r.played > 0) {
      toAward.push({ user_id: r.user_id, code: "top_of_the_day" });
    }
    const prev = prevRank.get(`${r.league_id}|${r.user_id}`);
    if (prev !== undefined && prev - r.rank >= 5) {
      toAward.push({ user_id: r.user_id, code: "comeback" });
    }
  }

  // 5) Badge « journée parfaite » : tous les pronos sur des matchs finis
  //    aujourd'hui sont corrects (au moins un).
  const { data: finishedMatches } = await supabase
    .from("matches")
    .select("id, kickoff_at")
    .eq("status", "finished");
  const todayMatchIds = (finishedMatches ?? [])
    .filter((m) => parisDate(new Date(m.kickoff_at)) === today)
    .map((m) => m.id);

  let perfectDays = 0;
  if (todayMatchIds.length > 0) {
    const { data: preds } = await supabase
      .from("predictions")
      .select("user_id, is_correct_result")
      .in("match_id", todayMatchIds);
    const tally = new Map<string, { total: number; ok: number }>();
    for (const p of preds ?? []) {
      const t = tally.get(p.user_id) ?? { total: 0, ok: 0 };
      t.total += 1;
      if (p.is_correct_result) t.ok += 1;
      tally.set(p.user_id, t);
    }
    tally.forEach((t, userId) => {
      if (t.total > 0 && t.ok === t.total) {
        toAward.push({ user_id: userId, code: "perfect_day" });
        perfectDays += 1;
      }
    });
  }

  // 6) Insertion des badges (dédoublonnée). Le trigger crée les notifs.
  let awarded = 0;
  if (toAward.length > 0) {
    const { data: badges } = await supabase.from("badges").select("id, code");
    const idByCode = new Map((badges ?? []).map((b) => [b.code, b.id]));
    const userBadges = toAward
      .map((a) => ({ user_id: a.user_id, badge_id: idByCode.get(a.code) }))
      .filter((ub): ub is { user_id: string; badge_id: string } =>
        Boolean(ub.badge_id)
      );
    if (userBadges.length > 0) {
      const { error: ubErr, count } = await supabase
        .from("user_badges")
        .upsert(userBadges, {
          onConflict: "user_id,badge_id",
          ignoreDuplicates: true,
          count: "exact",
        });
      if (ubErr) {
        return NextResponse.json({ error: ubErr.message }, { status: 500 });
      }
      awarded = count ?? 0;
    }
  }

  return NextResponse.json({
    captured_on: today,
    leagues_rows: rows.length,
    perfect_days: perfectDays,
    badges_awarded: awarded,
    at: new Date().toISOString(),
  });
}
