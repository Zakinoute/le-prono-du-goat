"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { generateAiProfile } from "./actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Bloc « Profil IA » : déclenche la génération (Groq/Gemini) côté serveur, puis
 * rafraîchit la page pour afficher le profil enregistré.
 */
export function AiProfile({
  profile,
  summary,
  traits,
}: {
  profile: string | null;
  summary: string | null;
  traits: string[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = () => {
    setError(null);
    start(async () => {
      const res = await generateAiProfile();
      if (res?.error) setError(res.error);
      else router.refresh();
    });
  };

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Profil IA
      </h2>
      <Card>
        <CardContent className="space-y-3 p-4">
          {profile ? (
            <>
              <div className="flex items-center gap-2">
                <span className="text-2xl">🧠</span>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-bold text-primary">
                  {profile}
                </span>
              </div>
              {summary && <p className="text-sm text-foreground">{summary}</p>}
              {traits.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {traits.map((t) => (
                    <span
                      key={t}
                      className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Laisse l&apos;IA analyser tes pronos et te coller une étiquette
              (Le Flambeur, Le Statisticien…).
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button size="sm" onClick={run} disabled={pending}>
              {pending
                ? "Analyse en cours…"
                : profile
                ? "Regénérer"
                : "Générer mon profil IA"}
            </Button>
            {error && (
              <span className="text-xs font-medium text-destructive">{error}</span>
            )}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
