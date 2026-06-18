import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import type { Badge } from "@/types/database";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/constants";

export const dynamic = "force-dynamic";

type PredRow = {
  points: number;
  is_exact: boolean;
  is_correct_result: boolean;
  match: { status: string } | null;
};

export async function generateMetadata({
  params,
}: {
  params: { username: string };
}): Promise<Metadata> {
  return {
    title: `@${params.username} — ${APP_NAME}`,
    description: `Le profil de pronostiqueur de @${params.username} sur ${APP_NAME}.`,
  };
}

/**
 * Page publique partageable d'un joueur (hors zone authentifiée).
 * Lue via la clé service role : les pronos ne sont pas exposés par la RLS, mais
 * on n'en publie que des **agrégats** (points, taux), jamais les pronos en clair.
 */
export default async function PublicProfilePage({
  params,
}: {
  params: { username: string };
}) {
  const supabase = createServiceClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name, ai_profile, ai_profile_data")
    .eq("username", params.username)
    .maybeSingle();

  if (!profile) notFound();

  const [{ data: rawPreds }, { data: allBadges }, { data: earned }] =
    await Promise.all([
      supabase
        .from("predictions")
        .select("points, is_exact, is_correct_result, match:matches(status)")
        .eq("user_id", profile.id),
      supabase.from("badges").select("*").order("created_at", { ascending: true }),
      supabase.from("user_badges").select("badge_id").eq("user_id", profile.id),
    ]);

  const preds = (rawPreds ?? []) as unknown as PredRow[];
  const totalPoints = preds.reduce((s, p) => s + (p.points ?? 0), 0);
  const pronos = preds.length;
  const exacts = preds.filter((p) => p.is_exact).length;
  const bons = preds.filter((p) => p.is_correct_result && !p.is_exact).length;
  const played = preds.filter((p) => p.match?.status === "finished").length;
  const rate = played > 0 ? Math.round(((exacts + bons) / played) * 100) : 0;

  const earnedIds = new Set((earned ?? []).map((e) => e.badge_id));
  const badges = ((allBadges ?? []) as Badge[]).filter((b) =>
    earnedIds.has(b.id)
  );

  const aiData = (profile.ai_profile_data ?? {}) as { summary?: string };
  const name = profile.display_name || profile.username;

  const STATS = [
    { label: "Points", value: totalPoints, icon: "⭐" },
    { label: "Pronos", value: pronos, icon: "🎯" },
    { label: "Scores exacts", value: exacts, icon: "🎰" },
    { label: "Réussite", value: `${rate}%`, icon: "📈" },
  ];

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-10">
      <div className="mb-8 flex items-center gap-2 text-sm font-bold">
        <span className="text-xl">🐐</span>
        <span>{APP_NAME}</span>
      </div>

      {/* En-tête */}
      <div className="mb-8 flex flex-col items-center gap-3 text-center sm:flex-row sm:text-left">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-muted text-xl font-bold">
          {name.slice(0, 2).toUpperCase()}
        </span>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">{name}</h1>
          <p className="text-sm text-muted-foreground">
            @{profile.username}
            {profile.ai_profile ? (
              <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                {profile.ai_profile}
              </span>
            ) : null}
          </p>
        </div>
      </div>

      {aiData.summary && (
        <p className="mb-8 rounded-xl border border-border/60 bg-muted/30 p-4 text-sm">
          🧠 {aiData.summary}
        </p>
      )}

      {/* Stats */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
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

      {/* Badges débloqués */}
      {badges.length > 0 && (
        <section className="mb-8 space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Badges débloqués ({badges.length})
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {badges.map((b) => (
              <Card key={b.id}>
                <CardContent className="flex items-start gap-3 p-4">
                  <span className="text-2xl">{b.icon}</span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{b.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {b.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* CTA */}
      <div className="rounded-xl border border-dashed border-border/60 p-6 text-center">
        <p className="mb-4 text-sm text-muted-foreground">
          Tu penses faire mieux ? Rejoins {APP_NAME} et défie {name}.
        </p>
        <Button asChild>
          <Link href="/register">Créer mon compte</Link>
        </Button>
      </div>
    </div>
  );
}
