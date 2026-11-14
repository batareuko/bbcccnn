import { z } from "zod";
import { HttpError, requireAuth, assertActive } from "@/lib/auth";
import { handler } from "@/lib/api";
import { AiError, AiUpstreamError, aiKeyEnvName, isAiConfigured, rewrite } from "@/lib/ai/agents";
import { withCredits } from "@/lib/ai/credits";

const Body = z.object({
  text: z.string().min(1).max(20000),
  platforms: z.array(z.string()).min(1).max(10),
  tone: z.string().max(200).optional(),
  language: z.string().max(50).optional(),
  instructions: z.string().max(2000).optional(),
});

export const POST = handler(async (req: Request) => {
  const a = await requireAuth();
  assertActive(a);
  if (!isAiConfigured()) throw new HttpError(503, `AI is not configured (${aiKeyEnvName()})`);
  const b = Body.parse(await req.json());
  try {
    const variants = await withCredits(a.workspaceId, 1, "rewrite", () => rewrite(b));
    return { variants };
  } catch (e) {
    if (e instanceof AiError) throw new HttpError(422, e.message);
    if (e instanceof AiUpstreamError) throw new HttpError(e.status, e.message);
    throw e;
  }
});
