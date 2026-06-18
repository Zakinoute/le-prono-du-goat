import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import type { Badge } from "@/types/database";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { AiProfile } from "./ai-profile";
import { ShareProfile } from "./share-profile";

export const metadata: Metadata = { title: "Profil" };

type PredRow = {
  points: number;
  is_exact: boolean;
  is_correct_result: boolean;
  home_score: number;
  away_score: number;
  match: { status: string; home_team: string; away_team: string } | null;
};

export default async function ProfilePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: profile }, { data: rawPreds }, { data: allBadges }, { data: earned }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("username, display_name, ai_profile, ai_profile_data, bio")
        .eq("id", user!.id)
        .single(),
      supabase
        .from("predictions")
        .select(
          "points, is_exact, is_correct_result, home_score, away_score, match:matches(status, home_team, away_team)"
        )
        .eq("user_id", user!.id),
      supabase.from("badges").select("*").order("created_at", { ascending: true }),
      supabase.from("user_badges").select("badge_id").eq("user_id", user!.id),
    ]);

  const preds = (rawPreds ?? []) as unknown as PredRow[];
  const totalPoints = preds.reduce((s, p) => s + (p.points ?? 0), 0);
  const pronos = preds.length;
  const exacts = preds.filter((p) => p.is_exact).length;
  const bons = preds.filter((p) => p.is_correct_result && !p.is_exact).length;
  const played = preds.filter((p) => p.match?.status === "finished").length;
  const rate = played > 0 ? Math.round(((exacts + bons) / played) * 100) : 0;

  // Tendances : équipe fétiche, buts moyens, répartition dom/ext/nul
  let homeWins = 0;
  let awayWins = 0;
  let draws = 0;
  let totalGoals = 0;
  const backed = new Map<string, number>();
  for (const p of preds) {
    totalGoals += (p.home_score ?? 0) + (p.away_score ?? 0);
    if (p.home_score > p.away_score) {
      homeWins++;
      if (p.match) backed.set(p.match.home_team, (backed.get(p.match.home_team) ?? 0) + 1);
    } else if (p.away_score > p.home_score) {
      awayWins++;
      if (p.match) backed.set(p.match.away_team, (backed.get(p.match.away_team) ?? 0) + 1);
    } else {
      draws++;
    }
  }
  let equipeFetiche: string | null = null;
  let maxBacked = 0;
  backed.forEach((n, team) => {
    if (n > maxBacked) {
      maxBacked = n;
      equipeFetiche = team;
    }
  });
  const avgGoals = pronos > 0 ? totalGoals / pronos : 0;
  const pct = (n: number) => (pronos > 0 ? Math.round((n / pronos) * 100) : 0);

  const badges = (allBadges ?? []) as Badge[];
  const earnedIds = new Set((earned ?? []).map((e) => e.badge_id));

  const name = profile?.display_name || profile?.username || "Joueur";
  const aiData = (profile?.ai_profile_data ?? {}) as {
    summary?: string;
    traits?: string[];
  };

  const STATS = [
    { label: "Points", value: totalPoints, icon: "⭐" },
    { label: "Pronos", value: pronos, icon: "🎯" },
    { label: "Scores exacts", value: exacts, icon: "🎰" },
    { label: "Réussite", value: `${rate}%`, icon: "📈" },
  ];

  return (
    <div className="space-y-8">
      {/* En-tête profil */}
      <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:items-center sm:text-left">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-muted text-xl font-bold">
          {name.slice(0, 2).toUpperCase()}
        </span>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">{name}</h1>
          <p className="text-sm text-muted-foreground">
            @{profile?.username}
            {profile?.ai_profile ? (
              <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                {profile.ai_profile}
              </span>
            ) : null}
          </p>
        </div>
        {profile?.username && (
          <div className="sm:ml-auto">
            <ShareProfile username={profile.username} />
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {STATS.map((s) => (
          <Card key={s.label}>
            <CardContent className="flex flex-col items-center gap-1 p-4 text-center">
              <span className="text-2xl">{s.icon}</span>
              <span className="text-2xl font-bold tabular-nums">{s.value}</span>
              <span className="text-xs text-muted-foreground">{s.label}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tendances */}
      {pronos > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Tes tendances
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">⭐ Équipe fétiche</p>
                <p className="mt-1 truncate text-lg font-bold">
                  {equipeFetiche ?? "—"}
                </p>
                {equipeFetiche && (
                  <p className="text-xs text-muted-foreground">
                    pronostiquée gagnante {maxBacked}×
                  </p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">⚽ Buts par prono</p>
                <p className="mt-1 text-lg font-bold tabular-nums">
                  {avgGoals.toFixed(1)}
                </p>
                <p className="text-xs text-muted-foreground">en moyenne</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">🎲 Ta tendance</p>
                <p className="mt-1 text-sm font-semibold">
                  {pct(homeWins)}% domicile
                </p>
                <p className="text-xs text-muted-foreground">
                  {pct(awayWins)}% extérieur · {pct(draws)}% nul
                </p>
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      {/* Profil IA */}
      <AiProfile
        profile={profile?.ai_profile ?? null}
        summary={aiData.summary ?? null}
        traits={Array.isArray(aiData.traits) ? aiData.traits : []}
      />

      {/* Badges */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Badges
          </h2>
          <span className="text-xs text-muted-foreground">
            {earnedIds.size} / {badges.length} débloqués
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {badges.map((b) => {
            const unlocked = earnedIds.has(b.id);
            return (
              <Card
                key={b.id}
                className={cn(
                  "transition-opacity",
                  !unlocked && "opacity-50 grayscale"
                )}
              >
                <CardContent className="flex items-start gap-3 p-4">
                  <span className="text-2xl">{unlocked ? b.icon : "🔒"}</span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{b.name}</p>
                    <p className="text-xs text-muted-foreground">{b.description}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
