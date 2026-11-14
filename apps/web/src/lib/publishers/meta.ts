import { Publisher, PublishError } from "./types";

const GRAPH = "https://graph.facebook.com/v21.0";

async function graph(path: string, params: Record<string, string>) {
  const res = await fetch(`${GRAPH}/${path}`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params),
  });
  const json = (await res.json()) as any;
  if (json.error) throw new PublishError(`Meta: ${json.error.message}`);
  return json;
}

/** Facebook Page. accessToken = Page access token, externalId = Page id. */
export const facebook: Publisher = {
  platform: "facebook",
  label: "Facebook Page",
  maxLength: 63206,
  async verify({ accessToken, externalId }) {
    const res = await fetch(`${GRAPH}/${externalId}?fields=id,name&access_token=${accessToken}`);
    const json = (await res.json()) as any;
    if (json.error) throw new PublishError(`Meta: ${json.error.message}`);
  },
  async publish({ accessToken, externalId }, { text, mediaUrls, link }) {
    if (mediaUrls.length === 1) {
      const msg = link && !text.includes(link) ? `${text}\n\n${link}` : text;
      const r = await graph(`${externalId}/photos`, {
        url: mediaUrls[0],
        caption: msg,
        access_token: accessToken,
      });
      return { externalPostId: r.post_id ?? r.id };
    }
    if (mediaUrls.length > 1) {
      // Upload photos unpublished, then attach to one feed post.
      const ids: string[] = [];
      for (const url of mediaUrls.slice(0, 10)) {
        const r = await graph(`${externalId}/photos`, {
          url,
          published: "false",
          access_token: accessToken,
        });
        ids.push(r.id);
      }
      const params: Record<string, string> = { message: text, access_token: accessToken };
      ids.forEach((id, i) => (params[`attached_media[${i}]`] = JSON.stringify({ media_fbid: id })));
      const r = await graph(`${externalId}/feed`, params);
      return { externalPostId: r.id };
    }
    const params: Record<string, string> = { message: text, access_token: accessToken };
    if (link) params.link = link;
    const r = await graph(`${externalId}/feed`, params);
    return { externalPostId: r.id, url: `https://facebook.com/${r.id}` };
  },
};

/** Instagram Business/Creator account via Graph API. externalId = IG user id. Requires an image. */
export const instagram: Publisher = {
  platform: "instagram",
  label: "Instagram",
  maxLength: 2200,
  requiresMedia: true,
  async publish({ accessToken, externalId }, { text, mediaUrls }) {
    if (mediaUrls.length === 0) throw new PublishError("Instagram requires at least one image");
    let creationId: string;
    if (mediaUrls.length === 1) {
      const c = await graph(`${externalId}/media`, {
        image_url: mediaUrls[0],
        caption: text,
        access_token: accessToken,
      });
      creationId = c.id;
    } else {
      const children: string[] = [];
      for (const url of mediaUrls.slice(0, 10)) {
        const c = await graph(`${externalId}/media`, {
          image_url: url,
          is_carousel_item: "true",
          access_token: accessToken,
        });
        children.push(c.id);
      }
      const c = await graph(`${externalId}/media`, {
        media_type: "CAROUSEL",
        children: children.join(","),
        caption: text,
        access_token: accessToken,
      });
      creationId = c.id;
    }
    const r = await graph(`${externalId}/media_publish`, {
      creation_id: creationId,
      access_token: accessToken,
    });
    return { externalPostId: r.id };
  },
};
