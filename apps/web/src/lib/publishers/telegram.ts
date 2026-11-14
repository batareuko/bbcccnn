import { Publisher, PublishError } from "./types";

async function tg(token: string, method: string, body: unknown) {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as { ok: boolean; result?: any; description?: string };
  if (!json.ok) throw new PublishError(`Telegram: ${json.description ?? res.status}`);
  return json.result;
}

const CAPTION_LIMIT = 1024;
const shared = () => process.env.TELEGRAM_BOT_TOKEN || "";

export const telegram: Publisher = {
  platform: "telegram",
  label: "Telegram",
  maxLength: 4096,
  async verify({ accessToken, externalId }) {
    await tg(accessToken || shared(), "getChat", { chat_id: externalId });
  },
  async publish({ accessToken: own, externalId }, { text, mediaUrls, link }) {
    // empty token = channel connected through our shared bot
    const accessToken = own || shared();
    if (!accessToken) throw new PublishError("Telegram bot is not configured");
    const body = link && !text.includes(link) ? `${text}\n\n${link}` : text;
    const chat_id = externalId;

    if (mediaUrls.length === 0) {
      const r = await tg(accessToken, "sendMessage", { chat_id, text: body });
      return { externalPostId: String(r.message_id) };
    }
    // Long text + media: send media first, then text as a separate message.
    const fitsCaption = body.length <= CAPTION_LIMIT;
    let firstId: number;
    if (mediaUrls.length === 1) {
      const r = await tg(accessToken, "sendPhoto", {
        chat_id,
        photo: mediaUrls[0],
        ...(fitsCaption ? { caption: body } : {}),
      });
      firstId = r.message_id;
    } else {
      const media = mediaUrls.slice(0, 10).map((url, i) => ({
        type: "photo",
        media: url,
        ...(i === 0 && fitsCaption ? { caption: body } : {}),
      }));
      const r = await tg(accessToken, "sendMediaGroup", { chat_id, media });
      firstId = r[0].message_id;
    }
    if (!fitsCaption) await tg(accessToken, "sendMessage", { chat_id, text: body });
    return { externalPostId: String(firstId) };
  },
};
