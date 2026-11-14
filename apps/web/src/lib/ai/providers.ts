/**
 * Provider-agnostic JSON generation for the AI agents (rewrite, content plan).
 * Pick the provider with AI_PROVIDER = gemini (default) | deepseek | anthropic.
 */
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

export type ProviderId = "gemini" | "deepseek" | "anthropic";

export class AiError extends Error {}
/** Upstream provider failure (network, quota, 5xx). `status` is the HTTP status we should answer with. */
export class AiUpstreamError extends Error {
  constructor(message: string, public status = 502) {
    super(message);
  }
}

export function aiProvider(): ProviderId {
  const p = (process.env.AI_PROVIDER || "gemini").toLowerCase();
  return p === "deepseek" || p === "anthropic" ? p : "gemini";
}

const KEY_ENV: Record<ProviderId, string> = {
  gemini: "GEMINI_API_KEY",
  deepseek: "DEEPSEEK_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
};

export function isAiConfigured() {
  return !!process.env[KEY_ENV[aiProvider()]];
}

export function aiKeyEnvName() {
  return KEY_ENV[aiProvider()];
}

type GenerateOpts<T extends z.ZodType> = {
  system: string;
  prompt: string;
  schema: T;
  /** rough output budget */
  maxTokens: number;
  /** "light" for quick rewrites, "deep" for planning */
  effort: "light" | "deep";
};

/** Asks the configured model for JSON that matches `schema` and validates it. */
export async function generateJson<T extends z.ZodType>(opts: GenerateOpts<T>): Promise<z.infer<T>> {
  const jsonSchema = JSON.stringify(z.toJSONSchema(opts.schema));
  const provider = aiProvider();
  const raw =
    provider === "anthropic"
      ? await callAnthropic(opts)
      : provider === "deepseek"
        ? await callDeepSeek(opts, jsonSchema)
        : await callGemini(opts, jsonSchema);

  let data: unknown;
  try {
    data = JSON.parse(stripFences(raw ?? ""));
  } catch {
    throw new AiError("The AI response was not valid JSON, please try again.");
  }
  const parsed = opts.schema.safeParse(data);
  if (!parsed.success) throw new AiError("The AI response had an unexpected shape, please try again.");
  return parsed.data;
}

const stripFences = (s: string) => s.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");

const jsonInstruction = (schema: string) =>
  `\n\nRespond with a single JSON object only (no markdown, no commentary) that validates against this JSON Schema:\n${schema}`;

async function readError(res: Response) {
  const text = await res.text().catch(() => "");
  try {
    const j = JSON.parse(text);
    return j.error?.message || j.message || text.slice(0, 300);
  } catch {
    return text.slice(0, 300);
  }
}

// ─── Google Gemini (the model family behind Google Antigravity) ────────
async function callGemini(opts: GenerateOpts<z.ZodType>, schema: string) {
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY ?? "" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: opts.system }] },
        contents: [{ role: "user", parts: [{ text: opts.prompt + jsonInstruction(schema) }] }],
        generationConfig: {
          responseMimeType: "application/json",
          maxOutputTokens: opts.maxTokens,
          temperature: opts.effort === "deep" ? 0.9 : 0.7,
        },
      }),
    },
  );
  if (!res.ok) console.error("[ai] gemini", res.status, await readError(res));
    throw new AiUpstreamError(res.status === 429 ? "AI is busy, try again in a minute" : "AI service error, please try again", res.status === 429 ? 429 : 502);
  const json = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
    promptFeedback?: { blockReason?: string };
  };
  const blocked = json.promptFeedback?.blockReason;
  if (blocked) throw new AiError(`The AI declined this request (${blocked}).`);
  const cand = json.candidates?.[0];
  if (cand?.finishReason === "MAX_TOKENS") throw new AiError("The AI response was cut off — try a shorter request.");
  if (cand?.finishReason === "SAFETY") throw new AiError("The AI declined this request.");
  const text = cand?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  if (!text) throw new AiError("Empty AI response, please try again.");
  return text;
}

// ─── DeepSeek (OpenAI-compatible chat completions) ─────────────────────
async function callDeepSeek(opts: GenerateOpts<z.ZodType>, schema: string) {
  const model = process.env.DEEPSEEK_MODEL || "deepseek-chat";
  const res = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${process.env.DEEPSEEK_API_KEY ?? ""}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: opts.system },
        { role: "user", content: opts.prompt + jsonInstruction(schema) },
      ],
      response_format: { type: "json_object" },
      max_tokens: Math.min(opts.maxTokens, 8192),
    }),
  });
  if (!res.ok) console.error("[ai] deepseek", res.status, await readError(res));
    throw new AiUpstreamError(res.status === 429 ? "AI is busy, try again in a minute" : "AI service error, please try again", res.status === 429 ? 429 : 502);
  const json = (await res.json()) as { choices?: { message?: { content?: string }; finish_reason?: string }[] };
  const c = json.choices?.[0];
  if (c?.finish_reason === "length") throw new AiError("The AI response was cut off — try a shorter request.");
  const content = c?.message?.content;
  if (!content) throw new AiError("Empty AI response, please try again.");
  return content;
}

// ─── Anthropic Claude ──────────────────────────────────────────────────
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || "unset" });

async function callAnthropic(opts: GenerateOpts<z.ZodType>) {
  try {
    const stream = anthropic.beta.messages.stream({
      model: process.env.ANTHROPIC_MODEL || "claude-opus-5-5",
      max_tokens: Math.max(opts.maxTokens, 16000),
      output_config: {
        effort: opts.effort === "deep" ? "medium" : "low",
        format: { type: "json_schema", schema: z.toJSONSchema(opts.schema) as Record<string, unknown> },
      },
      // Server-side fallback if the primary model declines on a policy classifier.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: opts.system,
      messages: [{ role: "user", content: opts.prompt }],
    });
    const msg = await stream.finalMessage();
    if (msg.stop_reason === "refusal") throw new AiError("The AI declined this request.");
    if (msg.stop_reason === "max_tokens") throw new AiError("The AI response was cut off — try a shorter request.");
    const text = msg.content.find((b) => b.type === "text");
    if (!text || text.type !== "text") throw new AiError("Empty AI response, please try again.");
    return text.text;
  } catch (e) {
    if (e instanceof AiError) throw e;
    if (e instanceof Anthropic.RateLimitError) throw new AiUpstreamError("AI is busy, try again in a minute", 429);
    if (e instanceof Anthropic.APIError) {
      console.error("[ai] anthropic", e.status, e.message);
      throw new AiUpstreamError("AI service error, please try again");
    }
    throw e;
  }
}
