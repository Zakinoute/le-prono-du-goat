"use server";

import { revalidatePath } from "next/cache";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import {
  aiCompleteWith,
  configuredProviders,
  groqModel,
  geminiModel,
  type AiProviderName,
} from "@/lib/ai";
import { REACTION_EMOJIS } from "@/lib/constants";

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

/**
 * Pose / change / retire la réaction de l'utilisateur sur un match (une seule
 * par match). Recliquer le même emoji la retire (toggle).
 */
export async function reactToMatch(
  matchId: string,
  emoji: string
): Promise<void> {
  if (!(REACTION_EMOJIS as readonly string[]).includes(emoji)) return;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: existing } = await supabase
    .from("match_reactions")
    .select("emoji")
    .eq("match_id", matchId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing?.emoji === emoji) {
    await supabase
      .from("match_reactions")
      .delete()
      .eq("match_id", matchId)
      .eq("user_id", user.id);
  } else {
    await supabase
      .from("match_reactions")
      .upsert(
        { match_id: matchId, user_id: user.id, emoji },
        { onConflict: "match_id,user_id" }
      );
  }

  revalidatePath("/matches");
}

/** Avis d'un provider sur un match : soit du contenu, soit une erreur lisible. */
export type ProviderInsight = { content?: string; error?: string };

/** Résultat d'une analyse comparative (Groq vs Gemini) sur un match. */
export type MatchInsightState =
  | {
      groq?: ProviderInsight;
      gemini?: ProviderInsight;
      error?: string; // erreur globale (non connecté, aucune clé, match absent)
    }
  | null;

type InsightMatch = {
  home_team: string;
  away_team: string;
  home_score: number | null;
  away_score: number | null;
  status: string;
  group_name: string | null;
  round: string;
  kickoff_at: string;
};

const INSIGHT_SYSTEM =
  "Tu es consultant foot pour « Le Prono du GOAT » (Coupe du Monde 2026). " +
  "Tu écris en français, ton vif et concis, tutoiement. Tu n'as PAS les détails " +
  "du match (buteurs, compositions, stats live) : appuie-toi sur le score, la " +
  "réputation et les cadres connus des deux sélections. Présente le joueur du " +
  "match et la forme comme des estimations plausibles, jamais comme des faits " +
  "certains. Garde chaque section sur 1 à 2 phrases.";

function insightPrompt(m: InsightMatch): { prompt: string; kind: "recap" | "preview" } {
  const grp = m.group_name ? ` (Groupe ${m.group_name})` : "";
  const finished =
    m.status === "finished" && m.home_score !== null && m.away_score !== null;

  if (finished) {
    return {
      kind: "recap",
      prompt: `Match TERMINÉ — ${m.home_team} ${m.home_score}–${m.away_score} ${m.away_team}${grp}.

Réponds avec exactement ces 3 intitulés :
📝 Résumé : le déroulé probable vu le score.
⭐ Joueur du match (estimation) : un nom plausible de l'équipe qui s'est illustrée + pourquoi.
🔑 Fait marquant : un point fort à retenir.`,
    };
  }

  const when = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  }).format(new Date(m.kickoff_at));

  return {
    kind: "preview",
    prompt: `Match À VENIR — ${m.home_team} vs ${m.away_team}${grp}, ${when}.

Réponds avec exactement ces intitulés :
📊 ${m.home_team} : forces et forme générale.
📊 ${m.away_team} : forces et forme générale.
⭐ À surveiller : 1 ou 2 joueurs clés par équipe.
🔮 Pronostic : ton résultat probable + un score plausible.`,
  };
}

function insightError(p: AiProviderName, e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (/\b429\b|quota|RESOURCE_EXHAUSTED|rate.?limit/i.test(msg)) {
    return "Quota dépassé — clé à renouveler.";
  }
  return `Indisponible (${msg.slice(0, 90)})`;
}

/**
 * Génère l'analyse IA d'un match avec **tous les providers configurés en
 * parallèle** (Groq et/ou Gemini) pour comparer leurs avis. Match terminé →
 * résumé + joueur du match ; match à venir → forme des équipes + pronostic.
 * Chaque avis est mis en cache (service role) ; les erreurs d'un provider
 * n'empêchent pas l'autre de s'afficher.
 */
export async function generateMatchInsight(
  matchId: string
): Promise<MatchInsightState> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Tu n'es pas connecté." };
  if (!matchId) return { error: "Match introuvable." };

  const providers = configuredProviders();
  if (providers.length === 0) {
    return {
      error:
        "IA non configurée — ajoute GROQ_API_KEY ou GEMINI_API_KEY dans .env.local.",
    };
  }

  const { data: match } = await supabase
    .from("matches")
    .select(
      "home_team, away_team, home_score, away_score, status, group_name, round, kickoff_at"
    )
    .eq("id", matchId)
    .maybeSingle();
  if (!match) return { error: "Match introuvable." };

  const { prompt, kind } = insightPrompt(match as InsightMatch);
  const models: Record<AiProviderName, string> = {
    groq: groqModel(),
    gemini: geminiModel(),
  };
  const admin = createServiceClient();
  const result: { groq?: ProviderInsight; gemini?: ProviderInsight } = {};

  await Promise.all(
    providers.map(async (p) => {
      try {
        const content = await aiCompleteWith(p, {
          system: INSIGHT_SYSTEM,
          prompt,
          maxTokens: 380,
          temperature: 0.75,
        });
        if (!content) {
          result[p] = { error: "Réponse vide, réessaie." };
          return;
        }
        result[p] = { content };
        await admin.from("match_summaries").upsert(
          {
            match_id: matchId,
            provider: p,
            kind,
            content,
            model: models[p],
            generated_at: new Date().toISOString(),
          },
          { onConflict: "match_id,provider" }
        );
      } catch (e) {
        result[p] = { error: insightError(p, e) };
      }
    })
  );

  revalidatePath("/matches");
  return result;
}
