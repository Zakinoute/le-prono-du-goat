import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Tableau de bord" };

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, display_name, ai_profile")
    .eq("id", user!.id)
    .single();

  const { count: leaguesCount } = await supabase
    .from("league_members")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user!.id);

  const { data: predictions } = await supabase
    .from("predictions")
    .select("points")
    .eq("user_id", user!.id);

  const totalPoints = (predictions ?? []).reduce((s, p) => s + (p.points ?? 0), 0);
  const pronosCount = predictions?.length ?? 0;

  const STATS = [
    { label: "Points", value: totalPoints, icon: "⭐" },
    { label: "Pronos", value: pronosCount, icon: "🎯" },
    { label: "Ligues", value: leaguesCount ?? 0, icon: "🏆" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">
          Salut {profile?.display_name || profile?.username || "champion"} 👋
        </h1>
        <p className="text-sm text-muted-foreground">
          {profile?.ai_profile
            ? `Ton profil IA : ${profile.ai_profile}`
            : "Bienvenue sur ton tableau de bord."}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {STATS.map((s) => (
          <Card key={s.label}>
            <CardContent className="flex flex-col items-center gap-1 p-4 text-center sm:p-6">
              <span className="text-2xl">{s.icon}</span>
              <span className="text-2xl font-bold tabular-nums">{s.value}</span>
              <span className="text-xs text-muted-foreground">{s.label}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Pronostiquer</CardTitle>
            <CardDescription>Les matchs à venir t&apos;attendent.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/matches">Voir les matchs</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Mes ligues</CardTitle>
            <CardDescription>Crée une ligue ou rejoins tes potes.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/leagues">Gérer mes ligues</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
