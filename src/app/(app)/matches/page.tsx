/* eslint-disable @next/next/no-img-element -- logos d'équipes servis par une source externe (TheSportsDB) */
import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import type { Match, Prediction } from "@/types/database";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { AutoRefresh } from "@/components/auto-refresh";
import { PredictionForm } from "./prediction-form";

export const metadata: Metadata = { title: "Matchs" };

const ROUNDS = ["Matchday 1", "Matchday 2", "Matchday 3"];

function fmtKickoff(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  }).format(new Date(iso));
}

function TeamSide({
  name,
  logo,
  align,
}: {
  name: string;
  logo: string | null;
  align: "left" | "right";
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 items-center gap-2",
        align === "right" && "flex-row-reverse text-right"
      )}
    >
      {logo ? (
        <img src={logo} alt="" className="h-6 w-6 shrink-0 object-contain" />
      ) : (
        <span className="h-6 w-6 shrink-0 rounded-full bg-muted" />
      )}
      <span className="truncate text-sm font-medium">{name}</span>
    </div>
  );
}

function MatchRow({
  match,
  prediction,
}: {
  match: Match;
  prediction?: Prediction;
}) {
  const locked = new Date(match.kickoff_at).getTime() <= Date.now();
  const finished = match.status === "finished";
  const hasResult = match.home_score !== null && match.away_score !== null;

  return (
    <Card className="p-3">
      <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {match.group_name ? `Groupe ${match.group_name}` : match.round} ·{" "}
          {fmtKickoff(match.kickoff_at)}
        </span>
        {finished ? (
          <span className="font-medium text-foreground">Terminé</span>
        ) : locked ? (
          <span>🔒 Verrouillé</span>
        ) : (
          <span className="text-primary">Ouvert</span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <TeamSide name={match.home_team} logo={match.home_team_logo} align="left" />
        <div className="shrink-0 text-center font-bold tabular-nums">
          {hasResult ? (
            <span className="text-lg">
              {match.home_score} <span className="text-muted-foreground">-</span>{" "}
              {match.away_score}
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">vs</span>
          )}
        </div>
        <TeamSide name={match.away_team} logo={match.away_team_logo} align="right" />
      </div>

      <div className="mt-3 border-t border-border/60 pt-3">
        {!locked ? (
          <PredictionForm
            matchId={match.id}
            home={prediction?.home_score ?? null}
            away={prediction?.away_score ?? null}
          />
        ) : prediction ? (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Ton prono :{" "}
              <span className="font-medium text-foreground">
                {prediction.home_score} - {prediction.away_score}
              </span>
            </span>
            {finished && (
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-semibold",
                  prediction.is_exact
                    ? "bg-primary/15 text-primary"
                    : prediction.points > 0
                    ? "bg-yellow-500/15 text-yellow-600"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {prediction.is_exact
                  ? "+3 · score exact 🎯"
                  : prediction.points > 0
                  ? "+1 · bon résultat"
                  : "0 pt"}
              </span>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Pas de prono — match verrouillé.
          </p>
        )}
      </div>
    </Card>
  );
}

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: { journee?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: matches }, { data: predictions }] = await Promise.all([
    supabase.from("matches").select("*").order("kickoff_at"),
    supabase.from("predictions").select("*").eq("user_id", user!.id),
  ]);

  const predByMatch = new Map(
    (predictions ?? []).map((p) => [p.match_id, p as Prediction])
  );

  const journee = searchParams.journee;
  const allMatches = (matches ?? []) as Match[];
  const shown = journee
    ? allMatches.filter((m) => m.round === `Matchday ${journee}`)
    : allMatches;

  const grouped = ROUNDS.map((round) => ({
    round,
    matches: shown.filter((m) => m.round === round),
  })).filter((g) => g.matches.length > 0);

  const filters = [
    { key: undefined, label: "Tous" },
    { key: "1", label: "J1" },
    { key: "2", label: "J2" },
    { key: "3", label: "J3" },
  ];

  return (
    <div className="space-y-6">
      <AutoRefresh />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">
            ⚽ Matchs
          </h1>
          <p className="text-sm text-muted-foreground">
            Pronostique le score exact. Verrouillage automatique au coup d&apos;envoi.
          </p>
        </div>
        <div className="flex gap-1">
          {filters.map((f) => {
            const active = journee === f.key || (!journee && f.key === undefined);
            return (
              <Link
                key={f.label}
                href={f.key ? `/matches?journee=${f.key}` : "/matches"}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                {f.label}
              </Link>
            );
          })}
        </div>
      </div>

      {grouped.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
          Aucun match à afficher.
        </p>
      ) : (
        grouped.map((g) => (
          <section key={g.round} className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {g.round.replace("Matchday", "Journée")}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {g.matches.map((m) => (
                <MatchRow
                  key={m.id}
                  match={m}
                  prediction={predByMatch.get(m.id)}
                />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
