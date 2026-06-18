"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  generateMatchInsight,
  type ProviderInsight,
} from "./actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type InsightInitial = { groq: string | null; gemini: string | null };

const PROVIDERS = [
  { key: "groq" as const, label: "Groq", dot: "bg-orange-500" },
  { key: "gemini" as const, label: "Gemini", dot: "bg-blue-500" },
];

/**
 * Analyse IA d'un match, **Groq et Gemini côte à côte** pour comparer leurs
 * avis. Match terminé → résumé + joueur du match ; match à venir → forme des
 * équipes + pronostic. Génère à la demande puis met en cache.
 */
export function MatchInsight({
  matchId,
  finished,
  initial,
  providers,
}: {
  matchId: string;
  finished: boolean;
  initial: InsightInitial;
  providers: Array<"groq" | "gemini">;
}) {
  const router = useRouter();
  const [groq, setGroq] = useState<ProviderInsight | null>(
    initial.groq ? { content: initial.groq } : null
  );
  const [gemini, setGemini] = useState<ProviderInsight | null>(
    initial.gemini ? { content: initial.gemini } : null
  );
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(Boolean(initial.groq || initial.gemini));
  const [pending, start] = useTransition();

  const byKey = { groq, gemini };
  const shown = PROVIDERS.filter((p) => providers.includes(p.key));
  const compare = shown.length > 1;
  const hasContent = Boolean(groq?.content || gemini?.content);

  const run = () => {
    setError(null);
    setOpen(true);
    start(async () => {
      const res = await generateMatchInsight(matchId);
      if (res?.error) {
        setError(res.error);
        return;
      }
      setGroq(res?.groq ?? null);
      setGemini(res?.gemini ?? null);
      router.refresh();
    });
  };

  const cta = finished ? "🧠 Analyse IA du match" : "🔮 Aperçu IA du match";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">{cta}</span>
        <Button size="sm" variant="ghost" onClick={run} disabled={pending}>
          {pending
            ? "…"
            : hasContent
            ? "Regénérer"
            : compare
            ? "Comparer Groq vs Gemini"
            : "Générer l'analyse"}
        </Button>
      </div>

      {error && (
        <p className="text-xs font-medium text-destructive">{error}</p>
      )}

      {(open || hasContent) && (
        <div className={cn("grid gap-2", compare && "sm:grid-cols-2")}>
          {shown.map((p) => {
            const state = byKey[p.key];
            return (
              <div
                key={p.key}
                className="rounded-lg border border-border/60 bg-muted/20 p-3"
              >
                <div className="mb-1.5 flex items-center gap-1.5">
                  <span className={cn("h-2 w-2 rounded-full", p.dot)} />
                  <span className="text-xs font-semibold">{p.label}</span>
                </div>
                {pending && !state ? (
                  <p className="text-xs text-muted-foreground">Génération…</p>
                ) : state?.content ? (
                  <p className="whitespace-pre-line text-xs leading-relaxed text-foreground">
                    {state.content}
                  </p>
                ) : state?.error ? (
                  <p className="text-xs text-muted-foreground">⚠️ {state.error}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Pas encore d&apos;avis.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
