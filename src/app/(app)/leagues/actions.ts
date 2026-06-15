"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type LeagueState = { ok?: boolean; message?: string; error?: string } | null;

/** Crée une ligue (le créateur devient owner via trigger). */
export async function createLeague(
  _prev: LeagueState,
  formData: FormData
): Promise<LeagueState> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Tu n'es pas connecté." };

  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 3) return { error: "Le nom doit faire au moins 3 caractères." };

  const maxRaw = String(formData.get("max_members") ?? "").trim();
  const maxMembers = maxRaw ? Number(maxRaw) : null;
  if (maxMembers !== null && (!Number.isInteger(maxMembers) || maxMembers < 2)) {
    return { error: "Nombre max de membres invalide (≥ 2)." };
  }

  const isPublic = formData.get("is_public") === "on";

  const { data, error } = await supabase
    .from("leagues")
    .insert({
      name,
      owner_id: user.id,
      is_public: isPublic,
      max_members: maxMembers,
    })
    .select("invite_code")
    .single();

  if (error) return { error: "Création impossible. Réessaie." };

  revalidatePath("/leagues");
  revalidatePath("/leaderboard");
  revalidatePath("/dashboard");
  return { ok: true, message: `Ligue « ${name} » créée ! Code d'invitation : ${data.invite_code}` };
}

/** Rejoint une ligue via son code d'invitation (RPC SECURITY DEFINER). */
export async function joinLeague(
  _prev: LeagueState,
  formData: FormData
): Promise<LeagueState> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Tu n'es pas connecté." };

  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  if (!code) return { error: "Entre un code d'invitation." };

  const { error } = await supabase.rpc("join_league_by_code", { p_code: code });
  if (error) {
    return { error: error.message || "Impossible de rejoindre cette ligue." };
  }

  revalidatePath("/leagues");
  revalidatePath("/leaderboard");
  revalidatePath("/dashboard");
  return { ok: true, message: "Ligue rejointe ! 🎉" };
}
