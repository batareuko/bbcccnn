"use client";

export async function api<T = any>(path: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { ...(init?.json !== undefined ? { "content-type": "application/json" } : {}), ...init?.headers },
    body: init?.json !== undefined ? JSON.stringify(init.json) : init?.body,
  });
  if (res.status === 401 && typeof window !== "undefined" && !path.startsWith("/api/auth")) {
    window.location.href = "/login";
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data as T;
}

export type Channel = { id: string; platform: string; name: string; externalId: string; color: string };
export type Target = {
  id: string;
  channelId: string;
  contentOverride: string | null;
  status: string;
  error: string | null;
  channel: Pick<Channel, "id" | "name" | "platform" | "color">;
};
export type Post = {
  id: string;
  title: string;
  content: string;
  mediaUrls: string;
  link: string | null;
  status: string;
  scheduledAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  targets: Target[];
};
export type Platform = { platform: string; label: string; maxLength: number; requiresMedia: boolean };
