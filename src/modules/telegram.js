import axios from "axios";

const TELEGRAM_API = "https://api.telegram.org/bot";

function apiUrl(token, method) {
  return `${TELEGRAM_API}${token}/${method}`;
}

function cleanToken(value) {
  return String(value || "").trim();
}

async function telegramRequest(token, method, params = {}) {
  const response = await axios.post(apiUrl(token, method), params, {
    timeout: 10000,
  });

  if (!response.data?.ok) {
    throw new Error(response.data?.description || "Telegram API menolak request.");
  }

  return response.data.result;
}

export async function getTelegramBotInfo(token) {
  token = cleanToken(token);
  if (!/^\d{6,}:AA[A-Za-z0-9_-]{20,}$/.test(token)) {
    throw new Error("Format Bot Token Telegram tidak valid.");
  }

  const [me, description, webhook] = await Promise.all([
    telegramRequest(token, "getMe"),
    telegramRequest(token, "getMyDescription").catch(() => ({ description: "Tidak tersedia" })),
    telegramRequest(token, "getWebhookInfo").catch(() => null),
  ]);

  return {
    id: me.id,
    name: me.first_name || "-",
    username: me.username ? `@${me.username}` : "-",
    description: description?.description || "-",
    canJoinGroups: me.can_join_groups,
    canReadAllGroupMessages: me.can_read_all_group_messages,
    supportsInlineQueries: me.supports_inline_queries,
    webhook,
  };
}

// Info chat via Bot API (getChat, getChatMemberCount, getChatAdministrators).
// Jumlah member dan daftar admin hanya bisa diambil kalau bot ada di grup/channel tersebut.
export async function getChatInfo(token, chatId) {
  token = cleanToken(token);
  chatId = String(chatId || "").trim();
  if (!chatId) throw new Error("Chat ID / @username wajib diisi.");

  const chat = await telegramRequest(token, "getChat", { chat_id: chatId });
  const isGroup = ["group", "supergroup", "channel"].includes(chat.type);

  let memberCount = null;
  let admins = null;

  if (isGroup) {
    memberCount = await telegramRequest(token, "getChatMemberCount", { chat_id: chatId }).catch(() => null);
    const adminList = await telegramRequest(token, "getChatAdministrators", { chat_id: chatId }).catch(() => null);
    if (Array.isArray(adminList)) {
      admins = adminList.map((a) => ({
        id: a.user?.id,
        name: a.user?.first_name || "-",
        username: a.user?.username ? `@${a.user.username}` : "-",
        status: a.status,
      }));
    }
  }

  return {
    id: chat.id,
    type: chat.type,
    title: chat.title || "-",
    username: chat.username ? `@${chat.username}` : "-",
    firstName: chat.first_name || "-",
    lastName: chat.last_name || "-",
    description: chat.description || "-",
    bio: chat.bio || "-",
    photoId: chat.photo?.big_file_id || "-",
    inviteLink: chat.invite_link || "-",
    memberCount,
    admins,
  };
}

export async function sendTelegramMessages(token, chatId, text, count = 1, onProgress) {
  token = cleanToken(token);
  chatId = String(chatId || "").trim();
  text = String(text || "");
  count = Number(count);

  if (!chatId) throw new Error("ID User / Chat ID wajib diisi.");
  if (!text.trim()) throw new Error("Text pesan wajib diisi.");
  if (!Number.isInteger(count) || count < 1 || count > 100) {
    throw new Error("Jumlah pesan harus 1–100.");
  }

  const results = [];
  for (let i = 1; i <= count; i++) {
    const result = await telegramRequest(token, "sendMessage", {
      chat_id: chatId,
      text,
    });
    results.push(result);
    if (onProgress) onProgress(i, count);
    if (i < count) await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return results;
}

export function isTelegramToken(value) {
  return /^\d{6,}:AA[A-Za-z0-9_-]{20,}$/.test(cleanToken(value));
}
