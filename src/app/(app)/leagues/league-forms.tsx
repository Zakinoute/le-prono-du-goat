"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { createLeague, joinLeague, type LeagueState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "…" : label}
    </Button>
  );
}

function Feedback({ state }: { state: LeagueState }) {
  if (state?.ok) {
    return (
      <p className="rounded-md bg-primary/10 p-2 text-xs text-primary">
        {state.message}
      </p>
    );
  }
  if (state?.error) {
    return (
      <p className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">
        {state.error}
      </p>
    );
  }
  return null;
}

export function CreateLeagueForm() {
  const [state, action] = useFormState<LeagueState, FormData>(createLeague, null);
  return (
    <form action={action} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="name">Nom de la ligue</Label>
        <Input id="name" name="name" required minLength={3} placeholder="Les Experts du Ballon" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="max_members">Membres max (optionnel)</Label>
        <Input id="max_members" name="max_members" type="number" min={2} placeholder="illimité" />
      </div>
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <input type="checkbox" name="is_public" className="h-4 w-4 rounded border-input" />
        Ligue publique (visible par tous)
      </label>
      <SubmitButton label="Créer la ligue" />
      <Feedback state={state} />
    </form>
  );
}

export function CopyCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-muted/40 px-2 py-1 font-mono text-sm font-semibold tracking-widest transition-colors hover:bg-muted"
      title="Copier le code"
    >
      {code}
      <span className="text-[10px] font-sans font-normal text-muted-foreground">
        {copied ? "copié ✓" : "copier"}
      </span>
    </button>
  );
}

export function JoinLeagueForm() {
  const [state, action] = useFormState<LeagueState, FormData>(joinLeague, null);
  return (
    <form action={action} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="code">Code d&apos;invitation</Label>
        <Input
          id="code"
          name="code"
          required
          placeholder="ABC123"
          maxLength={6}
          className="uppercase tracking-widest"
        />
      </div>
      <SubmitButton label="Rejoindre" />
      <Feedback state={state} />
    </form>
  );
}
