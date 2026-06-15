import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import type { League, MemberRole } from "@/types/database";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CreateLeagueForm, JoinLeagueForm, CopyCode } from "./league-forms";

export const metadata: Metadata = { title: "Ligues" };

type Membership = { role: MemberRole; league: League };

export default async function LeaguesPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: rawMemberships } = await supabase
    .from("league_members")
    .select("role, league:leagues(*)")
    .eq("user_id", user!.id)
    .order("joined_at", { ascending: true });

  const memberships = (rawMemberships ?? []) as unknown as Membership[];
  const ids = memberships.map((m) => m.league.id);

  // Compte des membres par ligue (RLS : visible pour les ligues dont on est membre).
  const counts = new Map<string, number>();
  if (ids.length > 0) {
    const { data: members } = await supabase
      .from("league_members")
      .select("league_id")
      .in("league_id", ids);
    for (const m of members ?? []) {
      counts.set(m.league_id, (counts.get(m.league_id) ?? 0) + 1);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">
          🏆 Mes ligues
        </h1>
        <p className="text-sm text-muted-foreground">
          Crée ta ligue privée ou rejoins tes potes avec un code.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Créer une ligue</CardTitle>
            <CardDescription>Tu en deviens automatiquement l&apos;admin.</CardDescription>
          </CardHeader>
          <CardContent>
            <CreateLeagueForm />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Rejoindre une ligue</CardTitle>
            <CardDescription>Avec le code partagé par un ami.</CardDescription>
          </CardHeader>
          <CardContent>
            <JoinLeagueForm />
          </CardContent>
        </Card>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Mes ligues ({memberships.length})
        </h2>

        {memberships.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
            Tu n&apos;es dans aucune ligue pour l&apos;instant. Crée la tienne ou
            rejoins-en une ci-dessus.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {memberships.map(({ role, league }) => {
              const count = counts.get(league.id) ?? 1;
              return (
                <Card key={league.id} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link
                        href={`/leaderboard?league=${league.id}`}
                        className="truncate font-semibold hover:text-primary hover:underline"
                      >
                        {league.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {count}
                        {league.max_members ? ` / ${league.max_members}` : ""} membre
                        {count > 1 ? "s" : ""}
                        {role === "owner" && " · 👑 admin"}
                      </p>
                    </div>
                    {league.is_public && (
                      <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                        publique
                      </span>
                    )}
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <CopyCode code={league.invite_code} />
                    <Link
                      href={`/leaderboard?league=${league.id}`}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      Voir le classement →
                    </Link>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
