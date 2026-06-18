/**
 * Couche IA provider-agnostique — Le Prono du GOAT.
 *
 * On utilise **Groq** (API compatible OpenAI, gratuite/rapide) et/ou **Gemini**
 * (Google) plutôt que l'API Anthropic payante. Le provider est choisi selon les
 * clés présentes dans l'environnement :
 *   - GROQ_API_KEY   → Groq   (modèle par défaut: llama-3.3-70b-versatile)
 *   - GEMINI_API_KEY → Gemini (modèle par défaut: gemini-2.0-flash)
 *
 * Forcer un provider : AI_PROVIDER=groq|gemini. Forcer un modèle : GROQ_MODEL /
 * GEMINI_MODEL. Si aucune clé n'est configurée, `aiComplete` lève
 * `AiNotConfiguredError` — les appelants affichent un fallback propre.
 *
 * ⚠️ Serveur uniquement (les clés ne doivent jamais fuiter côté client).
 */

export type AiProviderName = "groq" | "gemini";

export class AiNotConfiguredError extends Error {
  constructor() {
    super(
      "Aucune clé IA configurée. Ajoute GROQ_API_KEY ou GEMINI_API_KEY dans .env.local."
    );
    this.name = "AiNotConfiguredError";
  }
}

/** Provider actif selon les variables d'environnement (null si aucun). */
export function aiProvider(): AiProviderName | null {
  const forced = process.env.AI_PROVIDER?.toLowerCase();
  if (forced === "groq") return process.env.GROQ_API_KEY ? "groq" : null;
  if (forced === "gemini") return process.env.GEMINI_API_KEY ? "gemini" : null;
  if (process.env.GROQ_API_KEY) return "groq";
  if (process.env.GEMINI_API_KEY) return "gemini";
  return null;
}

export function isAiConfigured(): boolean {
  return aiProvider() !== null;
}

export function groqModel(): string {
  return process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";
}

export function geminiModel(): string {
  return process.env.GEMINI_MODEL ?? "gemini-2.0-flash";
}

/** Modèle du provider actif (selon la priorité). */
export function aiModel(): string {
  return aiProvider() === "gemini" ? geminiModel() : groqModel();
}

/** Une clé est-elle présente pour ce provider précis ? */
export function providerConfigured(p: AiProviderName): boolean {
  return p === "groq"
    ? Boolean(process.env.GROQ_API_KEY)
    : Boolean(process.env.GEMINI_API_KEY);
}

/** Liste des providers réellement configurés (pour les appels comparatifs). */
export function configuredProviders(): AiProviderName[] {
  return (["groq", "gemini"] as AiProviderName[]).filter(providerConfigured);
}

/** Complète via un provider **imposé** (pour comparer Groq vs Gemini en parallèle). */
export async function aiCompleteWith(
  p: AiProviderName,
  opts: CompleteOptions
): Promise<string> {
  if (!providerConfigured(p)) throw new AiNotConfiguredError();
  return p === "groq" ? groqComplete(opts) : geminiComplete(opts);
}

interface CompleteOptions {
  system?: string;
  prompt: string;
  json?: boolean;
  maxTokens?: number;
  temperature?: number;
}

/** Renvoie le texte brut généré par le modèle. */
export async function aiComplete(opts: CompleteOptions): Promise<string> {
  const provider = aiProvider();
  if (!provider) throw new AiNotConfiguredError();
  return provider === "groq" ? groqComplete(opts) : geminiComplete(opts);
}

/** Génère puis parse une réponse JSON. */
export async function aiJson<T>(opts: CompleteOptions): Promise<T> {
  const raw = await aiComplete({ ...opts, json: true });
  return JSON.parse(extractJson(raw)) as T;
}

// --- Groq (compatible OpenAI) --------------------------------
async function groqComplete(opts: CompleteOptions): Promise<string> {
  const messages = [
    ...(opts.system ? [{ role: "system", content: opts.system }] : []),
    { role: "user", content: opts.prompt },
  ];
  const res = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
      body: JSON.stringify({
        model: groqModel(),
        messages,
        temperature: opts.temperature ?? 0.7,
        max_tokens: opts.maxTokens ?? 600,
        ...(opts.json ? { response_format: { type: "json_object" } } : {}),
      }),
    }
  );
  if (!res.ok) {
    throw new Error(`Groq a répondu ${res.status} : ${await res.text()}`);
  }
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}

// --- Gemini --------------------------------------------------
async function geminiComplete(opts: CompleteOptions): Promise<string> {
  const model = geminiModel();
  // Les modèles 2.5 (et `*-latest`) « réfléchissent » et consomment le budget de
  // tokens avant d'écrire → réponse tronquée. On coupe ce mode (thinkingBudget:0)
  // pour récupérer une réponse complète. Sans effet (ignoré) sur les autres.
  const supportsThinking = /2\.5|flash-latest|flash-lite-latest/.test(model);
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({
        ...(opts.system
          ? { systemInstruction: { parts: [{ text: opts.system }] } }
          : {}),
        contents: [{ role: "user", parts: [{ text: opts.prompt }] }],
        generationConfig: {
          temperature: opts.temperature ?? 0.7,
          maxOutputTokens: opts.maxTokens ?? 600,
          ...(supportsThinking ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
          ...(opts.json ? { responseMimeType: "application/json" } : {}),
        },
      }),
    }
  );
  if (!res.ok) {
    throw new Error(`Gemini a répondu ${res.status} : ${await res.text()}`);
  }
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  return (
    data.candidates?.[0]?.content?.parts
      ?.map((p) => p.text ?? "")
      .join("")
      .trim() ?? ""
  );
}

/** Extrait le premier bloc JSON d'une réponse (robuste aux ```json … ```). */
function extractJson(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const text = (fenced ? fenced[1] : raw).trim();
  const start = text.search(/[[{]/);
  if (start === -1) return text;
  const open = text[start];
  const close = open === "{" ? "}" : "]";
  const end = text.lastIndexOf(close);
  return end > start ? text.slice(start, end + 1) : text.slice(start);
}
