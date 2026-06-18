"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { AI_PROFILES } from "@/lib/constants";
import { aiJson, isAiConfigured, aiModel } from "@/lib/ai";

export type AiProfileState =
  | { ok?: boolean; profile?: string; error?: string }
  | null;

type PredRow = {
  is_correct_result: boolean;
  is_exact: boolean;
  home_score: number;
  away_score: number;
  match: { home_team: string; away_team: string; status: string } | null;
};

/**
 * Génère le « profil IA » du joueur à partir de ses tendances de pronos
 * (Groq/Gemini). Écrit `profiles.ai_profile` (un libellé de AI_PROFILES) et
 * `profiles.ai_profile_data` (résumé + traits). Fallback propre si l'IA n'est
 * pas configurée ou si le joueur n'a pas assez de pronos.
 */
export async function generateAiProfile(): Promise<AiProfileState> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Tu n'es pas connecté." };

  if (!isAiConfigured()) {
    return {
      error:
        "IA non configurée — ajoute GROQ_API_KEY ou GEMINI_API_KEY dans .env.local.",
    };
  }

  const { data: rawPreds } = await supabase
    .from("predictions")
    .select(
      "is_correct_result, is_exact, home_score, away_score, match:matches(home_team, away_team, status)"
    )
    .eq("user_id", user.id);
  const preds = (rawPreds ?? []) as unknown as PredRow[];

  if (preds.length < 3) {
    return {
      error: "Pose au moins 3 pronos pour débloquer ton profil IA.",
    };
  }

  // Tendances (mêmes calculs que la page profil).
  let homeWins = 0;
  let awayWins = 0;
  let draws = 0;
  let totalGoals = 0;
  const backed = new Map<string, number>();
  for (const p of preds) {
    totalGoals += (p.home_score ?? 0) + (p.away_score ?? 0);
    if (p.home_score > p.away_score) {
      homeWins++;
      if (p.match) backed.set(p.match.home_team, (backed.get(p.match.home_team) ?? 0) + 1);
    } else if (p.away_score > p.home_score) {
      awayWins++;
      if (p.match) backed.set(p.match.away_team, (backed.get(p.match.away_team) ?? 0) + 1);
    } else {
      draws++;
    }
  }
  let equipeFetiche = "—";
  let maxBacked = 0;
  backed.forEach((n, team) => {
    if (n > maxBacked) {
      maxBacked = n;
      equipeFetiche = team;
    }
  });
  const n = preds.length;
  const played = preds.filter((p) => p.match?.status === "finished").length;
  const exacts = preds.filter((p) => p.is_exact).length;
  const bons = preds.filter((p) => p.is_correct_result).length;
  const stats = {
    pronos: n,
    joues: played,
    exacts,
    bons_resultats: bons,
    buts_moyens: +(totalGoals / n).toFixed(2),
    pct_domicile: Math.round((homeWins / n) * 100),
    pct_exterieur: Math.round((awayWins / n) * 100),
    pct_nul: Math.round((draws / n) * 100),
    equipe_fetiche: equipeFetiche,
  };

  const system =
    "Tu es un analyste sportif fun pour une app de pronostics de la Coupe du " +
    "Monde 2026. Tu réponds UNIQUEMENT en JSON valide, en français, en tutoyant.";
  const prompt = `Voici les tendances de pronostics d'un joueur :
${JSON.stringify(stats, null, 2)}

Choisis EXACTEMENT un profil parmi cette liste : ${AI_PROFILES.join(", ")}.
Renvoie un JSON de la forme :
{
  "profile": "<un libellé EXACT de la liste>",
  "summary": "<2 phrases punchy max 200 caractères, ton Discord, tutoiement>",
  "traits": ["<trait 1>", "<trait 2>", "<trait 3>"]
}`;

  let result: { profile: string; summary: string; traits: string[] };
  try {
    result = await aiJson<{
      profile: string;
      summary: string;
      traits: string[];
    }>({ system, prompt, maxTokens: 400, temperature: 0.8 });
  } catch (e) {
    return {
      error:
        "L'IA n'a pas répondu correctement. Réessaie dans un instant." +
        (e instanceof Error ? ` (${e.message.slice(0, 120)})` : ""),
    };
  }

  // Sécurise le libellé renvoyé.
  const profile =
    (AI_PROFILES as readonly string[]).find(
      (p) => p.toLowerCase() === (result.profile ?? "").toLowerCase()
    ) ?? AI_PROFILES[0];

  const { error } = await supabase
    .from("profiles")
    .update({
      ai_profile: profile,
      ai_profile_data: {
        summary: result.summary ?? "",
        traits: Array.isArray(result.traits) ? result.traits.slice(0, 3) : [],
        stats,
        model: aiModel(),
        generated_at: new Date().toISOString(),
      },
    })
    .eq("id", user.id);

  if (error) return { error: "Impossible d'enregistrer le profil. Réessaie." };

  revalidatePath("/profile");
  revalidatePath("/dashboard");
  return { ok: true, profile };
}
