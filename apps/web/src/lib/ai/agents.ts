import { z } from "zod";
import { PUBLISHERS } from "../publishers";
import { AiError, generateJson } from "./providers";

export { AiError, AiUpstreamError, isAiConfigured, aiKeyEnvName, aiProvider } from "./providers";

// ─── Rewrite agent ───────────────────────────────────────────────────

const REWRITE_SYSTEM = `You are an expert social media copywriter working inside a content scheduling app.
You rewrite a source text into ready-to-publish posts, one per requested platform.
Rules:
- Keep facts, numbers, names and links from the source exactly; never invent facts.
- Make the wording genuinely new (not a light paraphrase) while keeping the meaning.
- Write in the requested language (default: the language of the source text).
- Respect each platform's character limit and native style:
  telegram: scannable, short paragraphs, emojis ok, no hashtag spam;
  facebook: conversational, a hook in the first line, a clear call to action;
  instagram: hook first line, line breaks, 5-15 relevant hashtags at the end, no clickable links (say "link in bio");
  mock: neutral.
- Output only the post text in "text", no commentary.`;

const RewriteSchema = z.object({
  variants: z.array(z.object({ platform: z.string(), text: z.string() })),
});

export type RewriteRequest = {
  text: string;
  platforms: string[];
  tone?: string;
  language?: string;
  instructions?: string;
};

export async function rewrite(req: RewriteRequest) {
  const platforms = [...new Set(req.platforms)].filter((p) => p in PUBLISHERS);
  if (platforms.length === 0) platforms.push("telegram");
  const limits = platforms.map((p) => `- ${p}: max ${PUBLISHERS[p].maxLength} characters`).join("\n");

  const result = await generateJson({
    system: REWRITE_SYSTEM,
    effort: "light",
    maxTokens: 8000,
    schema: RewriteSchema,
    prompt: `Source text:
<source>
${req.text}
</source>

Platforms (return exactly one variant per platform, in this order, "platform" must be the exact id):
${limits}

Tone: ${req.tone || "keep the tone of the source"}
Language: ${req.language || "same as source"}
${req.instructions ? `Extra instructions from the user: ${req.instructions}` : ""}`,
  });

  return result.variants
    .filter((v) => platforms.includes(v.platform))
    .map((v) => ({ platform: v.platform, text: v.text.slice(0, PUBLISHERS[v.platform].maxLength) }));
}

// ─── Content-plan / promotion agent ───────────────────────────────

const PLAN_SYSTEM = `You are a senior SMM strategist and SEO-minded copywriter.
You build social media content plans that grow awareness and bring traffic and sign-ups.
Principles:
- Mix content pillars: education/tips, product value & use cases, social proof, behind the scenes, engagement (questions, polls), and soft promotion. Hard selling at most 1 in 5 posts.
- Every post has a strong first-line hook, one clear idea and a call to action that fits the goal.
- Use the keywords naturally (search inside social networks and Google indexes posts); add 3-8 relevant hashtags when the platforms use them.
- Vary formats and days; post at times that suit the audience (local time).
- Never invent statistics, customer names or testimonials; use placeholders like [client quote] when needed.
- Write in the requested language.`;

const PlanSchema = z.object({
  posts: z.array(
    z.object({
      day: z.number().int().describe("0-based day offset from the start date"),
      time: z.string().describe("local time HH:MM"),
      pillar: z.string().describe("content pillar, e.g. education, social proof"),
      title: z.string().describe("short internal title"),
      text: z.string().describe("ready-to-publish post text, with hashtags at the end if appropriate"),
    }),
  ),
});

export type ContentPlanRequest = {
  product: string;
  audience?: string;
  goal?: string;
  keywords?: string;
  platforms: string[];
  days: number;
  postsPerWeek: number;
  language?: string;
  tone?: string;
};

export async function generateContentPlan(req: ContentPlanRequest) {
  const total = Math.max(1, Math.round((req.days / 7) * req.postsPerWeek));
  const platforms = [...new Set(req.platforms)].filter((p) => p in PUBLISHERS);
  const shortest = Math.min(...platforms.map((p) => PUBLISHERS[p].maxLength), 2200);

  const result = await generateJson({
    system: PLAN_SYSTEM,
    effort: "deep",
    maxTokens: 32000,
    schema: PlanSchema,
    prompt: `Create a content plan.

<product>
${req.product}
</product>
Target audience: ${req.audience || "infer from the product"}
Goal: ${req.goal || "grow awareness and sign-ups"}
SEO keywords to weave in: ${req.keywords || "choose relevant ones yourself"}
Platforms: ${platforms.join(", ") || "telegram"} (keep each text under ${shortest} characters so it fits all of them)
Period: ${req.days} days starting at day 0, exactly ${total} posts, spread evenly.
Language: ${req.language || "Ukrainian"}
Tone: ${req.tone || "friendly expert"}`,
  });

  const posts = result.posts
    .filter((p) => p.day >= 0 && p.day < req.days && /^\d{1,2}:\d{2}$/.test(p.time))
    .map((p) => ({ ...p, text: p.text.slice(0, shortest) }));
  if (!posts.length) throw new AiError("The AI returned an empty plan, please try again.");
  return posts;
}
