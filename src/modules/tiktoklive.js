/**
 * TikTok LIVE public chat reader for IyanTools.
 * Uses the unofficial tiktok-live-connector package; no login/cookies are used.
 */
export async function connectTikTokLive(inputUsername, callbacks = {}) {
  const username = String(inputUsername || "").trim().replace(/^@/, "");
  if (!/^[A-Za-z0-9._]{2,24}$/.test(username)) {
    throw new Error("Username TikTok tidak valid.");
  }

  let TikTokLiveConnection;
  let WebcastEvent;
  let ControlEvent;
  try {
    ({ TikTokLiveConnection, WebcastEvent, ControlEvent } = await import("tiktok-live-connector"));
  } catch {
    throw new Error("Library belum terpasang. Jalankan: npm install tiktok-live-connector");
  }

  const connection = new TikTokLiveConnection(username);
  const onStatus = typeof callbacks.onStatus === "function" ? callbacks.onStatus : () => {};
  const onError = typeof callbacks.onError === "function" ? callbacks.onError : () => {};
  const onChat = typeof callbacks.onChat === "function" ? callbacks.onChat : () => {};

  connection.on(WebcastEvent.CHAT, (data) => {
    try { onChat(data); } catch {}
  });

  if (ControlEvent?.ERROR) {
    connection.on(ControlEvent.ERROR, (error) => {
      try { onError(error); } catch {}
    });
  } else {
    connection.on("error", (error) => {
      try { onError(error); } catch {}
    });
  }

  if (ControlEvent?.DISCONNECTED) {
    connection.on(ControlEvent.DISCONNECTED, ({ code, reason } = {}) => {
      const detail = [code, reason].filter(Boolean).join(" - ");
      onStatus(`Koneksi terputus${detail ? ` (${detail})` : ""}. Tekan Esc untuk kembali.`);
    });
  }

  onStatus(`Mencari LIVE @${username}...`);
  try {
    const state = await connection.connect();
    onStatus(`Terhubung ke LIVE @${username}`);
    return { connection, state, username };
  } catch (error) {
    try { await connection.disconnect(); } catch {}
    const message = String(error?.message || "koneksi ditolak").slice(0, 240);
    throw new Error(`Tidak dapat terhubung ke @${username}: ${message}. Pastikan akun sedang LIVE dan coba lagi.`);
  }
}
