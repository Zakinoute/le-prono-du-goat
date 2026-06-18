"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { reactToMatch } from "./actions";
import { REACTION_EMOJIS } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * Barre de réactions emoji d'un match : compteurs + surbrillance de la réaction
 * de l'utilisateur. Toggle via server action puis refresh des compteurs.
 */
export function MatchReactions({
  matchId,
  counts,
  mine,
}: {
  matchId: string;
  counts: Record<string, number>;
  mine: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const toggle = (emoji: string) =>
    start(async () => {
      await reactToMatch(matchId, emoji);
      router.refresh();
    });

  return (
    <div className="flex flex-wrap gap-1">
      {REACTION_EMOJIS.map((emoji) => {
        const n = counts[emoji] ?? 0;
        const active = mine === emoji;
        return (
          <button
            key={emoji}
            type="button"
            onClick={() => toggle(emoji)}
            disabled={pending}
            className={cn(
              "flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors disabled:opacity-60",
              active
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border/60 text-muted-foreground hover:bg-accent/50"
            )}
            aria-pressed={active}
          >
            <span className="leading-none">{emoji}</span>
            {n > 0 && <span className="tabular-nums">{n}</span>}
          </button>
        );
      })}
    </div>
  );
}
