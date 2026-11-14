export type PublishInput = {
  text: string;
  mediaUrls: string[];
  link?: string | null;
};

export type ChannelCreds = { externalId: string; accessToken: string };

export type PublishResult = { externalPostId: string; url?: string };

export interface Publisher {
  platform: string;
  label: string;
  /** Max text length for the platform (used by UI counters and the AI agent). */
  maxLength: number;
  requiresMedia?: boolean;
  publish(ch: ChannelCreds, input: PublishInput): Promise<PublishResult>;
  /** Cheap credential check used when a channel is added. */
  verify?(ch: ChannelCreds): Promise<void>;
}

export class PublishError extends Error {}
