"use client";

import { useFormState, useFormStatus } from "react-dom";
import { savePrediction, type PredictionState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button size="sm" type="submit" disabled={pending}>
      {pending ? "…" : "Valider"}
    </Button>
  );
}

export function PredictionForm({
  matchId,
  home,
  away,
}: {
  matchId: string;
  home: number | null;
  away: number | null;
}) {
  const [state, formAction] = useFormState<PredictionState, FormData>(
    savePrediction,
    null
  );

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="match_id" value={matchId} />
      <Input
        name="home_score"
        type="number"
        min={0}
        max={99}
        defaultValue={home ?? ""}
        required
        aria-label="Score domicile"
        className="h-9 w-14 text-center"
      />
      <span className="text-muted-foreground">-</span>
      <Input
        name="away_score"
        type="number"
        min={0}
        max={99}
        defaultValue={away ?? ""}
        required
        aria-label="Score extérieur"
        className="h-9 w-14 text-center"
      />
      <SaveButton />
      {state?.ok && <span className="text-xs font-medium text-primary">✓ Enregistré</span>}
      {state?.error && (
        <span className="text-xs font-medium text-destructive">{state.error}</span>
      )}
    </form>
  );
}
