/**
 * Shared Telegram bot: customers add OUR bot as an admin of their channel/group and post
 * `/connect CODE` there. The bot links the chat to their workspace and deletes the code message.
 * Telegram does not pass a start parameter when a bot is added to a channel, hence the code.
 */
import { randomInt } from "node:crypto";
import { db } from "../db";
import { effectivePlanId, planOf } from "../plans";

export const CODE_TTL_MIN = 30;
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I

export function sharedBotToken() {
  return process.env.TELEGRAM_BOT_TOKEN || "";
}
export function sharedBotUsername() {
  return (process.env.TELEGRAM_BOT_USERNAME || "").replace(/^@/, "");
}
export function sharedBotConfigured() {
  return !!(sharedBotToken() && sharedBotUsername());
}

export async function tgCall<T = unknown>(method: string, body: unknown, token = sharedBotToken()): Promise<T> {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as { ok: boolean; result?: T; description?: string };
  if (!json.ok) throw new Error(`Telegram ${method}: ${json.description ?? res.status}`);
  return json.result as T;
}

/** Links that open Telegram with "add this bot as admin" pre-filled. */
export function addBotLinks() {
  const u = sharedBotUsername();
  return {
    channel: `https://t.me/${u}?startchannel&admin=post_messages+edit_messages+delete_messages`,
    group: `https://t.me/${u}?startgroup&admin=post_messages+delete_messages`,
  };
}

export async function createConnectCode(workspaceId: string) {
  await db.telegramConnectCode.deleteMany({ where: { workspaceId, usedAt: null } });
  const code = Array.from({ length: 8 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
  const expiresAt = new Date(Date.now() + CODE_TTL_MIN * 60_000);
  await db.telegramConnectCode.create({ data: { code, workspaceId, expiresAt } });
  return { code, expiresAt };
}

type TgChat = { id: number; type: "private" | "group" | "supergroup" | "channel"; title?: string; username?: string };
type TgMessage = { message_id: number; chat: TgChat; text?: string };
type TgChatMemberUpdated = { chat: TgChat; new_chat_member: { status: string; can_post_messages?: boolean } };
export type TgUpdate = {
  update_id: number;
  message?: TgMessage;
  channel_post?: TgMessage;
  my_chat_member?: TgChatMemberUpdated;
};

const CONNECT_RE = /^\/connect(?:@\w+)?\s+([A-Za-z0-9]{6,12})\b/;

/** Processes one update from the webhook or long polling. Never throws on Telegram API errors. */
export async function handleUpdate(u: TgUpdate): Promise<string> {
  if (u.my_chat_member) return handleMembership(u.my_chat_member);
  const msg = u.channel_post ?? u.message;
  if (!msg?.text) return "ignored";
  const m = msg.text.trim().match(CONNECT_RE);
  if (!m) {
    if (msg.chat.type === "private" && msg.text.startsWith("/start")) await safeReply(msg.chat.id, START_TEXT);
    return "ignored";
  }
  if (msg.chat.type === "private") {
    await safeReply(msg.chat.id, PRIVATE_TEXT);
    return "private";
  }
  return connectChat(msg, m[1].toUpperCase());
}

async function connectChat(msg: TgMessage, code: string) {
  const row = await db.telegramConnectCode.findUnique({ where: { code } });
  const valid = row && !row.usedAt && row.expiresAt > new Date();
  // the code message is noise for subscribers — remove it either way
  await safeCall("deleteMessage", { chat_id: msg.chat.id, message_id: msg.message_id });
  if (!valid) return "bad_code";

  const ws = await db.workspace.findUnique({ where: { id: row.workspaceId } });
  if (!ws) return "bad_code";
  const plan = planOf(effectivePlanId(ws));
  const externalId = String(msg.chat.id);
  const name = msg.chat.title || (msg.chat.username ? `@${msg.chat.username}` : externalId);

  const existing = await db.channel.findFirst({ where: { workspaceId: ws.id, platform: "telegram", externalId } });
  if (existing) {
    await db.channel.update({ where: { id: existing.id }, data: { status: "active", name, accessToken: "" } });
  } else {
    const count = await db.channel.count({ where: { workspaceId: ws.id } });
    if (!plan.active || count >= plan.maxChannels) {
      await db.telegramConnectCode.update({ where: { code }, data: { usedAt: new Date() } });
      return "limit";
    }
    await db.channel.create({
      data: { workspaceId: ws.id, platform: "telegram", name, externalId, accessToken: "", color: "#0ea5e9" },
    });
  }
  await db.telegramConnectCode.update({ where: { code }, data: { usedAt: new Date() } });
  return existing ? "reconnected" : "connected";
}

/** Our bot was removed / demoted / re-added in some chat. */
async function handleMembership(upd: TgChatMemberUpdated) {
  const st = upd.new_chat_member.status;
  const externalId = String(upd.chat.id);
  const lost = st === "left" || st === "kicked" || (upd.chat.type === "channel" && st !== "administrator");
  const r = await db.channel.updateMany({
    where: { platform: "telegram", externalId, accessToken: "" }, // only channels using the shared bot
    data: { status: lost ? "disconnected" : "active" },
  });
  return r.count ? (lost ? "disconnected" : "reactivated") : "ignored";
}

async function safeCall(method: string, body: unknown) {
  if (!sharedBotToken()) return;
  try {
    await tgCall(method, body);
  } catch (e) {
    console.warn("[telegram]", e instanceof Error ? e.message : e);
  }
}
const safeReply = (chatId: number, text: string) => safeCall("sendMessage", { chat_id: chatId, text });

const START_TEXT =
  "👋 Я публікую пости з PostFlow у ваші Telegram-канали.\n\n1. Додайте мене адміністратором каналу (право «Публікація повідомлень» і «Видалення повідомлень»).\n2. У PostFlow → Канали натисніть «Підключити Telegram» і надішліть у канал команду /connect КОД.\n\nI publish posts from PostFlow to your Telegram channels: add me as a channel admin and post /connect CODE in the channel.";
const PRIVATE_TEXT =
  "Команду /connect треба надіслати в самому каналі або групі, куди ви додали мене адміністратором.\nSend /connect inside the channel or group where you added me as an admin.";
