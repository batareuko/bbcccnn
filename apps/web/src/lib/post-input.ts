import { z } from "zod";

export const PostInput = z.object({
  title: z.string().max(300).default(""),
  content: z.string().min(1).max(70000),
  mediaUrls: z.array(z.string().url()).max(10).default([]),
  link: z.string().url().nullish(),
  status: z.enum(["draft", "scheduled"]).default("draft"),
  scheduledAt: z.coerce.date().nullish(),
  targets: z
    .array(z.object({ channelId: z.string(), contentOverride: z.string().max(70000).nullish() }))
    .default([]),
});
