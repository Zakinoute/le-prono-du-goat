import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import type { League, LeagueStanding } from "@/types/database";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AutoRefresh } from "@/components/auto-refresh";

export const metadata: Metadata = { title: "Classement" };

const MEDALS: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

function initials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: { league?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: rawMemberships } = await supabase
    .from("league_members")
    .select("league:leagues(*)")
    .eq("user_id", user!.id)
    .order("joined_at", { ascending: true });

  const leagues = ((rawMemberships ?? []) as unknown as { league: League }[]).map(
    (m) => m.league
  );

  // Aucune ligue → invite à en créer/rejoindre.
  if (leagues.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">
          🏆 Classement
        </h1>
        <div className="rounded-xl border border-dashed border-border/60 p-8 text-center">
          <p className="mb-4 text-sm text-muted-foreground">
            Rejoins ou crée une ligue pour voir un classement.
          </p>
          <Button asChild>
            <Link href="/leagues">Aller aux ligues</Link>
          </Button>
        </div>
      </div>
    );
  }

  const selected =
    leagues.find((l) => l.id === searchParams.league) ?? leagues[0];

  const { data: rawStandings } = await supabase
    .from("league_standings")
    .select("*")
    .eq("league_id", selected.id)
    .order("rank", { ascending: true });

  const standings = (rawStandings ?? []) as LeagueStanding[];

  return (
    <div className="space-y-6">
      <AutoRefresh />
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">
          🏆 Classement
        </h1>
        <p className="text-sm text-muted-foreground">
          Mis à jour automatiquement après chaque match.
        </p>
      </div>

      {/* Sélecteur de ligue */}
      {leagues.length > 1 && (
        <div className="flex flex-wrap gap-1">
          {leagues.map((l) => {
            const active = l.id === selected.id;
            return (
              <Link
                key={l.id}
                href={`/leaderboard?league=${l.id}`}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                {l.name}
              </Link>
            );
          })}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border/60">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border/60 bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-3 text-left font-medium">#</th>
              <th className="px-3 py-3 text-left font-medium">Joueur</th>
              <th className="px-2 py-3 text-right font-medium" title="Scores exacts">
                <span className="hidden sm:inline">Exacts</span>
                <span className="sm:hidden">Ex.</span>
              </th>
              <th className="px-2 py-3 text-right font-medium" title="Bons résultats">
                <span className="hidden sm:inline">Bons</span>
                <span className="sm:hidden">Bn.</span>
              </th>
              <th className="hidden px-2 py-3 text-right font-medium sm:table-cell">
                Joués
              </th>
              <th className="px-3 py-3 text-right font-medium">Pts</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((s) => {
              const isMe = s.user_id === user!.id;
              const name = s.display_name || s.username;
              return (
                <tr
                  key={s.user_id}
                  className={cn(
                    "border-b border-border/40 last:border-0 transition-colors",
                    isMe ? "bg-primary/10" : "hover:bg-accent/40"
                  )}
                >
                  <td className="px-3 py-3 text-left font-bold tabular-nums">
                    {MEDALS[s.rank] ?? s.rank}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">
                        {initials(name)}
                      </span>
                      <span className="truncate font-medium">
                        {name}
                        {isMe && (
                          <span className="ml-1 text-xs font-normal text-primary">
                            (toi)
                          </span>
                        )}
                      </span>
                    </div>
                  </td>
                  <td className="px-2 py-3 text-right tabular-nums text-muted-foreground">
                    {s.exact_count}
                  </td>
                  <td className="px-2 py-3 text-right tabular-nums text-muted-foreground">
                    {s.correct_result_count}
                  </td>
                  <td className="hidden px-2 py-3 text-right tabular-nums text-muted-foreground sm:table-cell">
                    {s.played}
                  </td>
                  <td className="px-3 py-3 text-right font-bold tabular-nums text-primary">
                    {s.total_points}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
