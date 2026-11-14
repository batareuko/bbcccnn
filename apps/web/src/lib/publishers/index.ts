import { facebook, instagram } from "./meta";
import { telegram } from "./telegram";
import type { Publisher } from "./types";

/** Test channel: does not call any network, useful for demos and local dev. */
const mock: Publisher = {
  platform: "mock",
  label: "Test (mock)",
  maxLength: 5000,
  async publish(_ch, input) {
    console.log("[mock publish]", input.text.slice(0, 80));
    return { externalPostId: `mock_${Date.now()}` };
  },
};

export const PUBLISHERS: Record<string, Publisher> = { telegram, facebook, instagram, mock };

export function getPublisher(platform: string) {
  const p = PUBLISHERS[platform];
  if (!p) throw new Error(`Unknown platform: ${platform}`);
  return p;
}

export const PLATFORM_LIST = Object.values(PUBLISHERS).map(({ platform, label, maxLength, requiresMedia }) => ({
  platform,
  label,
  maxLength,
  requiresMedia: !!requiresMedia,
}));
