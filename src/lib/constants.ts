/** Constantes métier — Le Prono du GOAT */

export const APP_NAME = "Le Prono du GOAT";
export const APP_DESCRIPTION =
  "L'app de pronostics de la Coupe du Monde 2026. Ligues privées, classements temps réel et profils IA.";

/** Barème de points (appliqué par le trigger SQL `score_match_predictions`). */
export const POINTS = {
  EXACT_SCORE: 3, // score exact
  CORRECT_RESULT: 1, // bon résultat (1N2) sans le score exact
  WRONG: 0,
} as const;

/** Préfixes de routes protégées (cohérent avec le middleware). */
export const PROTECTED_ROUTES = [
  "/dashboard",
  "/leagues",
  "/matches",
  "/leaderboard",
  "/profile",
] as const;

/** Profils IA possibles générés par Claude. */
export const AI_PROFILES = [
  "L'Optimiste",
  "Le Réaliste",
  "Le Pessimiste",
  "Le Statisticien",
  "Le Chauvin",
  "L'Outsider",
  "Le Prudent",
  "Le Flambeur",
] as const;

export type AiProfile = (typeof AI_PROFILES)[number];
