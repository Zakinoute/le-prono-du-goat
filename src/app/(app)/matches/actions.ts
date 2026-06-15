"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type PredictionState = { ok?: boolean; error?: string } | null;

/**
 * Enregistre (ou met à jour) le prono de l'utilisateur sur un match.
 * Le verrouillage au coup d'envoi est garanti par la RLS : si le match a
 * déjà commencé, l'insert/update est refusé et on renvoie une erreur lisible.
 */
export async function savePrediction(
  _prev: PredictionState,
  formData: FormData
): Promise<PredictionState> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Tu n'es pas connecté." };

  const matchId = String(formData.get("match_id") ?? "");
  const home = Number(formData.get("home_score"));
  const away = Number(formData.get("away_score"));

  if (!matchId) return { error: "Match introuvable." };
  if (
    !Number.isInteger(home) ||
    !Number.isInteger(away) ||
    home < 0 ||
    away < 0 ||
    home > 99 ||
    away > 99
  ) {
    return { error: "Score invalide." };
  }

  const { error } = await supabase.from("predictions").upsert(
    {
      user_id: user.id,
      match_id: matchId,
      home_score: home,
      away_score: away,
    },
    { onConflict: "user_id,match_id" }
  );

  if (error) {
    return {
      error: "Prono refusé — le match a peut-être déjà commencé (verrouillé).",
    };
  }

  // Rafraîchit toutes les pages qui dépendent des pronos.
  revalidatePath("/matches");
  revalidatePath("/dashboard");
  revalidatePath("/leaderboard");
  revalidatePath("/profile");
  return { ok: true };
}
