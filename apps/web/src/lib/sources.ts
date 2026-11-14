import { db } from "./db";
import { isAiConfigured, rewrite } from "./ai/agents";
import { chargeCredits, refundCredits } from "./ai/credits";
import { effectivePlanId, planOf } from "./plans";

type WpPost = {
  id: number;
  date_gmt: string;
  link: string;
  title: { rendered: string };
  excerpt: { rendered: string };
  _embedded?: { "wp:featuredmedia"?: { source_url?: string }[] };
};

const stripHtml = (s: string) =>
  s
    .replace(/<[^>]+>/g, "")
    .replace(/\[[^\]]*\]/g, "")
    .replace(/&#8217;/g, "’")
    .replace(/&#8211;/g, "–")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#\d+;/g, "")
    .trim();

export function renderTemplate(tpl: string, v: { title: string; excerpt: string; link: string }) {
  return tpl.replaceAll("{title}", v.title).replaceAll("{excerpt}", v.excerpt).replaceAll("{link}", v.link);
}

/** Fetches recent WordPress posts via the public REST API. */
async function fetchWordPress(siteUrl: string, after: Date): Promise<WpPost[]> {
  const base = siteUrl.replace(/\/+$/, "");
  const url = `${base}/wp-json/wp/v2/posts?per_page=20&_embed=wp:featuredmedia&orderby=date&order=desc&after=${encodeURIComponent(after.toISOString())}`;
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`WordPress ${res.status} for ${url}`);
  return (await res.json()) as WpPost[];
}

type FeedItem = { id: string; title: string; excerpt: string; link: string; image?: string };

async function fetchWordPressItems(siteUrl: string, after: Date): Promise<FeedItem[]> {
  const posts = await fetchWordPress(siteUrl, after);
  return posts.map((p) => ({
    id: String(p.id),
    title: stripHtml(p.title.rendered),
    excerpt: stripHtml(p.excerpt.rendered),
    link: p.link,
    image: p._embedded?.["wp:featuredmedia"]?.[0]?.source_url,
  }));
}

const tag = (xml: string, name: string) => {
  const m = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"));
  return m ? m[1].replace(/^<!\[CDATA\[|\]\]>$/g, "").trim() : "";
};

/** Minimal RSS 2.0 / Atom reader — works for most blogs, news sites, YouTube, etc. */
async function fetchRssItems(feedUrl: string, after: Date): Promise<FeedItem[]> {
  const res = await fetch(feedUrl, { headers: { accept: "application/rss+xml, application/atom+xml, text/xml" } });
  if (!res.ok) throw new Error(`Feed ${res.status} for ${feedUrl}`);
  const xml = await res.text();
  const blocks = xml.match(/<(item|entry)[\s>][\s\S]*?<\/(item|entry)>/gi) ?? [];
  const items: FeedItem[] = [];
  for (const b of blocks) {
    const atomLink = b.match(/<link[^>]*href="([^"]+)"/i)?.[1];
    const link = tag(b, "link") || atomLink || "";
    const dateStr = tag(b, "pubDate") || tag(b, "published") || tag(b, "updated");
    const date = dateStr ? new Date(dateStr) : new Date();
    if (date <= after) continue;
    const image =
      b.match(/<media:(?:content|thumbnail)[^>]*url="([^"]+)"/i)?.[1] ??
      b.match(/<enclosure[^>]*url="([^"]+)"[^>]*type="image/i)?.[1];
    items.push({
      id: tag(b, "guid") || tag(b, "id") || link,
      title: stripHtml(tag(b, "title")),
      excerpt: stripHtml(tag(b, "description") || tag(b, "summary")).slice(0, 500),
      link,
      image,
    });
  }
  return items;
}

/** Checks one source for new items and turns them into scheduled posts. */
export async function syncSource(sourceId: string) {
  const src = await db.source.findUniqueOrThrow({ where: { id: sourceId }, include: { workspace: true } });
  const channelIds: string[] = JSON.parse(src.channelIds || "[]");
  const channels = await db.channel.findMany({ where: { id: { in: channelIds }, workspaceId: src.workspaceId } });
  const items =
    src.type === "rss" ? await fetchRssItems(src.url, src.sinceDate) : await fetchWordPressItems(src.url, src.sinceDate);
  const plan = planOf(effectivePlanId(src.workspace));
  if (!plan.active) return { created: 0 };
  const useAi = src.aiRewrite && isAiConfigured();

  let created = 0;
  for (const item of items.reverse()) {
    const exists = await db.post.findUnique({
      where: { sourceId_sourceItemId: { sourceId: src.id, sourceItemId: item.id } },
    });
    if (exists) continue;

    const { title, excerpt, image } = item;
    const content = renderTemplate(src.template, { title, excerpt, link: item.link });

    let overrides: Record<string, string> = {};
    if (useAi && channels.length) {
      let charged = false;
      try {
        await chargeCredits(src.workspaceId, 1, "source_rewrite");
        charged = true;
        const variants = await rewrite({ text: content, platforms: channels.map((c) => c.platform) });
        overrides = Object.fromEntries(variants.map((v) => [v.platform, v.text]));
      } catch (e) {
        // no credits or AI failed: publish the template text as-is
        if (charged) await refundCredits(src.workspaceId, 1);
        console.error("AI rewrite skipped for source item", item.id, e instanceof Error ? e.message : e);
      }
    }

    await db.post.create({
      data: {
        workspaceId: src.workspaceId,
        title,
        content,
        link: item.link,
        mediaUrls: JSON.stringify(image ? [image] : []),
        status: channels.length ? "scheduled" : "draft",
        scheduledAt: new Date(Date.now() + src.delayMinutes * 60_000),
        sourceId: src.id,
        sourceItemId: item.id,
        targets: {
          create: channels.map((c) => ({ channelId: c.id, contentOverride: overrides[c.platform] ?? null })),
        },
      },
    });
    created++;
  }
  await db.source.update({ where: { id: src.id }, data: { lastCheckedAt: new Date() } });
  return { created };
}

export async function syncAllSources() {
  const sources = await db.source.findMany({ where: { enabled: true }, select: { id: true, name: true } });
  // inactive (expired) workspaces are skipped inside syncSource
  const out = [];
  for (const s of sources) {
    try {
      out.push({ id: s.id, ...(await syncSource(s.id)) });
    } catch (e) {
      out.push({ id: s.id, error: e instanceof Error ? e.message : String(e) });
    }
  }
  return out;
}
