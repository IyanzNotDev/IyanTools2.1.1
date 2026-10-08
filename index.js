import blessed from "blessed";
import { execSync, execFile } from "child_process";
import axios from "axios";
import fs from "fs";
import path from "path";
import crypto from "crypto";

import { checkNIK } from "./src/modules/nik.js";
import { checkKodePos } from "./src/modules/kodepos.js";
import { checkBreach } from "./src/modules/breach.js";
import { scrapeWebsite } from "./src/modules/scraper.js";
import {
  createTempEmail,
  checkTempEmail,
} from "./src/modules/tempemail.js";
import { searchPsychology } from "./src/modules/psychology.js";
import { askAI } from "./src/modules/ai.js";
import { lookupIP } from "./src/modules/iplookup.js";
import { checkUsername } from "./src/modules/usernamechecker.js";
import { scanSqlmap } from "./src/modules/sqlmapscanner.js";
import { scanParamSpider } from "./src/modules/paramspider.js";
import { connectTikTokLive } from "./src/modules/tiktoklive.js";
import { analyzeObfuscatedFile } from "./src/modules/obfuscator.js";
import { analyzeNumber } from "./src/modules/osintnumber.js";
import { getTeka, checkJawaban } from "./src/modules/hafefun.js";
import { scanDomain } from "./src/modules/osintdomain.js";
import { scanGmail } from "./src/modules/osintgmail.js";
import {
  anichiSearch,
  anichiDetail,
} from "./src/modules/anichi.js";
import {
  getTelegramBotInfo,
  sendTelegramMessages,
  getChatInfo,
} from "./src/modules/telegram.js";

/* =========================
   SCREEN
========================= */

const screen = blessed.screen({
  smartCSR: true,
  fullUnicode: true,
  title: "IyanTools 2.1.1",
});

/* =========================
   MENU
========================= */

const menuItems = [
  "OSINT Number",
  "OSINT Telegram",
  "OSINT Domain",
  "OSINT Gmail",
  "Check NIK",
  "Check Kode Pos",
  "BreachGmail",
  "Scrape Website",
  "Temp Email",
  "Anichi",
  "Psychology Search",
  "AI Assisten",
  "Stalker",
  "Username Checker",
  "API Checker",
  "IP Lookup",
  "Nmap Port Scanner",
  "SQLmap SQL Injection Check",
  "ParamSpider Parameter Discovery",
  "TikTok LIVE Chat",
  "Message Telegram",
  "Custom Color Menu",
  "Obfuscator Analyzer / Decoder",
  "Hafe Fun",
  "History",
  "Help",
  "Exit",
];

/* =========================
   AI MODELS
========================= */

const AI_MODELS = [
  {
    id: "xiaomi/mimo-v2.5",
    name: "MiMo V2.5",
    provider: "Xiaomi",
  },
  {
    id: "xiaomi/mimo-v2-flash",
    name: "MiMo V2 Flash",
    provider: "Xiaomi",
  },
  {
    id: "deepseek/deepseek-v4-flash",
    name: "DeepSeek v4 Flash",
    provider: "DeepSeek",
  },
  {
    id: "google/gemini-2.5-flash-lite",
    name: "Gemini 2.5 Flash Lite",
    provider: "Google",
  },
  {
    id: "google/gemma-4-26b-a4b-it",
    name: "Gemma 4 26B",
    provider: "Google",
  },
  {
    id: "google/gemma-4-31b-it",
    name: "Gemma 4 31B",
    provider: "Google",
  },
  {
    id: "openai/gpt-oss-120b",
    name: "GPT OSS 120B",
    provider: "OpenAI",
  },
  {
    id: "openai/gpt-oss-20b",
    name: "GPT OSS 20B",
    provider: "OpenAI",
  },
  {
    id: "z-ai/glm-4.7-flash",
    name: "GLM 4.7 Flash",
    provider: "Z.AI",
  },
  {
    id: "ibm-granite/granite-4.1-8b",
    name: "Granite 4.1 8B",
    provider: "IBM",
  },
  {
    id: "qwen/qwen3.6-35b-a3b",
    name: "Qwen3.6 35B",
    provider: "Qwen",
  },
];

/* =========================
   STATE
========================= */

let tempEmailSession = {
  email: null,
  messages: [],
};

let tempEmailInterval = null;
let tempEmailActive = false;

/* =========================
   CUSTOM MENU COLOR
========================= */
const MENU_COLOR_CONFIG = path.join(
  process.env.HOME || process.cwd(),
  ".config",
  "iyantools",
  "menu-color.json"
);

const NAMED_MENU_COLORS = new Set([
  "black", "red", "green", "yellow", "blue", "magenta", "cyan", "white",
  "gray", "grey", "lightblack", "lightred", "lightgreen", "lightyellow",
  "lightblue", "lightmagenta", "lightcyan", "lightwhite"
]);

function normalizeMenuColor(value) {
  const color = String(value || "").trim().toLowerCase();
  if (NAMED_MENU_COLORS.has(color)) return color;
  if (/^#[0-9a-f]{6}$/i.test(color)) return color;
  return null;
}

function loadMenuColor() {
  try {
    const saved = JSON.parse(fs.readFileSync(MENU_COLOR_CONFIG, "utf8"));
    return normalizeMenuColor(saved.color) || "cyan";
  } catch {
    return "cyan";
  }
}

let menuColor = loadMenuColor();

function saveMenuColor(color) {
  try {
    fs.mkdirSync(path.dirname(MENU_COLOR_CONFIG), { recursive: true });
    fs.writeFileSync(MENU_COLOR_CONFIG, JSON.stringify({ color }, null, 2) + "\n");
    return true;
  } catch {
    return false;
  }
}

function applyMenuColor(color) {
  menuColor = color;
  menu.style.border.fg = color;
  menu.style.item.fg = color;
  menu.style.selected.bg = color;
  menu.style.selected.fg = "black";
  header.style.border.fg = color;
  main.style.border.fg = color;
  screen.render();
}

/* =========================
   HEADER
========================= */

const header = blessed.box({
  top: 0,
  left: 0,
  width: "100%",
  height: 5,
  border: {
    type: "line",
  },
  style: {
    border: {
      fg: menuColor,
    },
  },
  tags: true,
  padding: {
    left: 1,
    top: 1,
  },
  content: "",
});

const TZ = "Asia/Jakarta";

function renderHeader() {
  const now = new Date();
  const jam = now.toLocaleTimeString("id-ID", { timeZone: TZ, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  const tanggal = now.toLocaleDateString("id-ID", { timeZone: TZ, day: "2-digit", month: "long", year: "numeric" });

  header.setContent(
    `{bold}{cyan-fg} IyanTools 2.1.1{/cyan-fg}{/bold}  {gray-fg}|{/gray-fg}  ${jam}  {gray-fg}|{/gray-fg}  ${tanggal}\n` +
      "{gray-fg} Developer : IyanzNotDev{/gray-fg}"
  );
}

renderHeader();
setInterval(() => {
  renderHeader();
  screen.render();
}, 1000);

/* =========================
   MENU
========================= */

const menu = blessed.list({
  top: 5,
  left: 0,
  width: "32%",
  height: "100%-5",
  keys: true,
  vi: true,
  mouse: true,
  border: {
    type: "line",
  },
  style: {
    border: {
      fg: menuColor,
    },
    selected: {
      fg: "black",
      bg: menuColor,
    },
    item: {
      fg: menuColor,
    },
  },
  items: menuItems,
  padding: {
    left: 1,
    right: 1,
  },
});

/* =========================
   MAIN
========================= */

const main = blessed.box({
  top: 5,
  left: "32%",
  width: "68%",
  height: "100%-5",
  border: {
    type: "line",
  },
  style: {
    border: {
      fg: menuColor,
    },
  },
  tags: true,
  padding: {
    left: 2,
    right: 2,
    top: 1,
    bottom: 1,
  },
  scrollable: true,
  alwaysScroll: true,
  keys: true,
  mouse: true,
});

screen.append(header);
screen.append(menu);
screen.append(main);

/* =========================
   HOME
========================= */

function showHome() {
  main.setContent(
    `{bold}{cyan-fg}Developer :{/cyan-fg} IyanzNotDev{/bold}\n` +
      `{bold}{cyan-fg}Version   :{/cyan-fg} 2.1.1{/bold}`
  );

  menu.focus();
  screen.render();
}

/* =========================
   LOADING
========================= */

function showLoading(feature) {
  main.setContent(
    `{bold}{cyan-fg}${feature}{/cyan-fg}{/bold}\n\n` +
      `{yellow-fg}Loading...{/yellow-fg}\n\n` +
      `{gray-fg}Please wait{/gray-fg}`
  );

  screen.render();
}

/* =========================
   INPUT
========================= */

function createInput(label, width = "60%", height = 7) {
  const box = blessed.textbox({
    top: "center",
    left: "center",
    width,
    height,
    border: {
      type: "line",
    },
    label,
    inputOnFocus: true,
    keys: true,
    mouse: true,
    style: {
      border: {
        fg: "cyan",
      },
      focus: {
        border: {
          fg: "cyan",
        },
      },
    },
    padding: {
      left: 1,
      right: 1,
    },
  });

  screen.append(box);
  box.focus();
  screen.render();

  return box;
}

/* =========================
   RESULT
========================= */

function showResult(title, content) {
  main.setContent(
    `{bold}{cyan-fg}${title}{/cyan-fg}{/bold}\n\n` +
      `${content}\n\n` +
      `{gray-fg}Press Esc to return{/gray-fg}`
  );

  menu.focus();
  screen.render();
}

/* =========================
   OSINT NUMBER
========================= */

function osintNumberUI() {
  const box = createInput(
    " OSINT Number - analisis nomor telepon ",
    "72%",
    8
  );

  box.on("submit", async (value) => {
    box.destroy();

    const input = String(value || "").trim();

    if (!input) {
      showResult(
        "OSINT Number",
        "{red-fg}Nomor tidak boleh kosong.{/red-fg}"
      );
      return;
    }

    showLoading("OSINT Number - menganalisis nomor");

    try {
      const result = analyzeNumber(input);
      if (!result.valid) {
        showResult(
          "OSINT Number",
          `{red-fg}${result.message}{/red-fg}`
        );
        return;
      }

      const safe = (value) => String(value ?? "-").replace(/[{}]/g, "");
      const coordinateText = result.coordinates
        ? `${result.coordinates[0]}, ${result.coordinates[1]}`
        : "Tidak tersedia";

      showResult(
        "OSINT Number",
        `{cyan-fg}Analisis Nomor{/cyan-fg}\n\n` +
          `Kode negara                         : ${safe(result.countryCode)}\n` +
          `Nomor tanpa kode negara & 0 depan : ${safe(result.nationalNumber)}\n` +
          `Nomor depan                        : ${safe(result.prefix)}\n` +
          `Nomor belakang                     : ${safe(result.suffix)}\n` +
          `Total digit                        : ${safe(result.totalDigits)}\n` +
          `Negara                              : ${safe(result.country)}\n` +
          `Koordinat negara                    : ${safe(coordinateText)}\n` +
          `Provider (indikasi prefix)          : {cyan-fg}${safe(result.provider)}{/cyan-fg}\n` +
          `Status MNP                         : ${safe(result.mnpStatus)}\n\n` +
          `{cyan-fg}Pemeriksaan manual{/cyan-fg}\n` +
          `WhatsApp                            : ${safe(result.manual.whatsapp)}\n` +
          `Telegram                            : ${safe(result.manual.telegram)}\n` +
          `Spam / Penipuan (Truecaller)        : ${safe(result.manual.truecaller)}\n` +
          `Spam / Penipuan (Whoscall)          : ${safe(result.manual.whoscall)}\n\n` +
          `{gray-fg}${safe(result.note)}{/gray-fg}`
      );
    } catch (error) {
      showResult(
        "OSINT Number",
        `{red-fg}Error:{/red-fg} ${String(error?.message || "Analisis gagal.").replace(/[{}]/g, "")}`
      );
    }
  });

  box.key("escape", () => {
    box.destroy();
    showHome();
  });
}

/* =========================
   NIK
========================= */

function checkNIKUI() {
  const box = createInput(
    " Check NIK ",
    "65%",
    8
  );

  box.on("submit", async (value) => {
    box.destroy();

    const input = value.trim();

    if (!input) {
      showResult(
        "Check NIK",
        "{red-fg}NIK tidak boleh kosong.{/red-fg}"
      );
      return;
    }

    showLoading("Check NIK");

    try {
      const result = checkNIK(input);

      if (!result.valid) {
        showResult(
          "Check NIK",
          `{red-fg}${result.message}{/red-fg}`
        );
        return;
      }

      showResult(
        "Check NIK",
        `NIK           : ${result.maskedNik}\n` +
          `Kode Wilayah  : ${result.kodeWilayah}\n` +
          `Jenis Kelamin : ${result.jenisKelamin}\n` +
          `Tanggal Lahir : ${result.tanggalLahir}\n` +
          `Nomor Urut    : ${result.nomorUrut}\n\n` +
          `{gray-fg}Analisis dilakukan secara lokal.{/gray-fg}`
      );
    } catch (error) {
      showResult(
        "Check NIK",
        `{red-fg}Error:{/red-fg} ${error.message}`
      );
    }
  });

  box.key("escape", () => {
    box.destroy();
    showHome();
  });
}

/* =========================
   KODE POS
========================= */

function checkKodePosUI() {
  const box = createInput(
    " Check Kode Pos ",
    "65%",
    8
  );

  box.on("submit", async (value) => {
    box.destroy();

    const input = value.trim();

    if (!input) {
      showResult(
        "Check Kode Pos",
        "{red-fg}Kode pos tidak boleh kosong.{/red-fg}"
      );
      return;
    }

    showLoading("Check Kode Pos");

    try {
      const result = await checkKodePos(input);

      if (!result.valid) {
        showResult(
          "Check Kode Pos",
          `{red-fg}${result.message}{/red-fg}`
        );
        return;
      }

      showResult(
        "Check Kode Pos",
        `Kode Pos : {cyan-fg}${result.kodepos}{/cyan-fg}\n\n` +
          JSON.stringify(result.data, null, 2)
      );
    } catch (error) {
      showResult(
        "Check Kode Pos",
        `{red-fg}Error:{/red-fg} ${error.message}`
      );
    }
  });

  box.key("escape", () => {
    box.destroy();
    showHome();
  });
}

/* =========================
   BREACH
========================= */

function breachGmailUI() {
  const box = createInput(
    " BreachGmail ",
    "65%",
    8
  );

  box.on("submit", async (value) => {
    box.destroy();

    const email = value.trim();

    if (!email) {
      showResult(
        "BreachGmail",
        "{red-fg}Email tidak boleh kosong.{/red-fg}"
      );
      return;
    }

    showLoading("BreachGmail");

    try {
      const result = await checkBreach(email);

      if (!result.valid) {
        showResult(
          "BreachGmail",
          `{red-fg}${result.message}{/red-fg}`
        );
        return;
      }

      if (!result.found) {
        showResult(
          "BreachGmail",
          `{green-fg}Tidak ditemukan breach pada database yang diperiksa.{/green-fg}\n\n` +
            `Email : ${result.email}`
        );
        return;
      }

      let output =
        `Email : ${result.email}\n\n` +
        `{red-fg}Breach ditemukan: ${result.breaches.length}{/red-fg}\n\n`;

      for (const breach of result.breaches) {
        output += `• ${breach}\n`;
      }

      showResult(
        "BreachGmail",
        output
      );
    } catch (error) {
      showResult(
        "BreachGmail",
        `{red-fg}Gagal menghubungi API.{/red-fg}\n\n${error.message}`
      );
    }
  });

  box.key("escape", () => {
    box.destroy();
    showHome();
  });
}

/* =========================
   SCRAPER
========================= */

function scrapeWebsiteUI() {
  const box = createInput(
    " Scrape Website ",
    "70%",
    8
  );

  box.on("submit", async (value) => {
    box.destroy();

    const input = value.trim();

    if (!input) {
      showResult(
        "Scrape Website",
        "{red-fg}URL tidak boleh kosong.{/red-fg}"
      );
      return;
    }

    showLoading("Scrape Website");

    try {
      const result =
        await scrapeWebsite(input);

      let output =
        `Target  : ${result.target}\n` +
        `Status  : ${result.status}\n` +
        `Content : ${result.contentType}\n\n`;

      output +=
        `{cyan-fg}Emails{/cyan-fg}\n`;

      output += result.emails.length
        ? result.emails
            .map((x) => `• ${x}`)
            .join("\n")
        : "Tidak ditemukan.";

      output +=
        `\n\n{cyan-fg}Phones{/cyan-fg}\n`;

      output += result.phones.length
        ? result.phones
            .map((x) => `• ${x}`)
            .join("\n")
        : "Tidak ditemukan.";

      output +=
        `\n\n{cyan-fg}API Endpoints{/cyan-fg}\n`;

      output += result.endpoints.length
        ? result.endpoints
            .map((x) => `• ${x}`)
            .join("\n")
        : "Tidak ditemukan.";

      output +=
        `\n\n{cyan-fg}Ports{/cyan-fg}\n`;

      output += result.ports.length
        ? result.ports
            .map((x) => `• ${x}`)
            .join("\n")
        : "Tidak ditemukan.";

      showResult(
        "Scrape Website",
        output
      );
    } catch (error) {
      showResult(
        "Scrape Website",
        `{red-fg}Gagal melakukan scraping.{/red-fg}\n\n${error.message}`
      );
    }
  });

  box.key("escape", () => {
    box.destroy();
    showHome();
  });
}

/* =========================
   TEMP EMAIL
========================= */

async function createTempEmailSession() {
  const result = await createTempEmail();

  if (!result?.status) {
    throw new Error(
      typeof result?.result === "string"
        ? result.result
        : JSON.stringify(
            result?.result ||
              "Gagal membuat email."
          )
    );
  }

  tempEmailSession.email =
    result.email;

  tempEmailSession.messages = [];

  return result;
}

function extractMessageContent(msg) {
  if (!msg || typeof msg !== "object") {
    return "";
  }

  const fields = [
    "content",
    "text_body",
    "textBody",
    "body",
    "message",
    "text",
    "body_text",
    "plain_text",
    "plainText",
    "html_body",
    "htmlBody",
    "body_html",
    "bodyHtml",
  ];

  for (const field of fields) {
    if (
      typeof msg[field] === "string" &&
      msg[field].trim()
    ) {
      return msg[field].trim();
    }
  }

  return "";
}

function formatTempMessages(messages) {
  if (!messages.length) {
    return "{gray-fg}Inbox masih kosong.{/gray-fg}";
  }

  return messages
    .map((msg, index) => {
      const from =
        msg.from ||
        msg.sender ||
        msg.sender_email ||
        msg.senderEmail ||
        "Unknown";

      const subject =
        msg.subject ||
        msg.title ||
        "No Subject";

      const content =
        extractMessageContent(msg) ||
        "No Content";

      return (
        `{bold}[ ${index + 1} ]{/bold}\n` +
        `{cyan-fg}From    :{/cyan-fg} ${from}\n` +
        `{cyan-fg}Subject :{/cyan-fg} ${subject}\n` +
        `{cyan-fg}Content :{/cyan-fg} ${content}\n\n` +
        `────────────────────────`
      );
    })
    .join("\n\n");
}

function renderTempEmail(notification = "") {
  if (!tempEmailSession.email) {
    return;
  }

  main.setContent(
    `{bold}{cyan-fg}Temp Email{/cyan-fg}{/bold}\n\n` +
      `Email : {cyan-fg}${tempEmailSession.email}{/cyan-fg}\n\n` +
      (notification
        ? `${notification}\n\n`
        : "") +
      `{cyan-fg}Inbox{/cyan-fg}\n\n` +
      `${formatTempMessages(
        tempEmailSession.messages
      )}\n\n` +
      `{white-fg}R = Refresh\nN = New Email\nEsc = Back{/white-fg}`
  );

  main.focus();
  screen.render();
}

async function refreshTempEmail(
  showNotification = false
) {
  if (!tempEmailSession.email) {
    return;
  }

  try {
    const result =
      await checkTempEmail(
        tempEmailSession.email
      );

    if (!result?.status) {
      return;
    }

    const messages =
      Array.isArray(result.result)
        ? result.result
        : [];

    const oldCount =
      tempEmailSession.messages.length;

    tempEmailSession.messages =
      messages;

    if (
      showNotification &&
      messages.length > oldCount
    ) {
      renderTempEmail(
        "{green-fg}New message received!{/green-fg}"
      );
    } else if (showNotification) {
      renderTempEmail(
        "{gray-fg}Inbox berhasil diperbarui.{/gray-fg}"
      );
    }
  } catch (error) {
    if (showNotification) {
      renderTempEmail(
        `{red-fg}Refresh gagal: ${error.message}{/red-fg}`
      );
    }
  }
}

function startTempEmailPolling() {
  if (tempEmailInterval) {
    clearInterval(
      tempEmailInterval
    );
  }

  tempEmailActive = true;

  tempEmailInterval =
    setInterval(() => {
      refreshTempEmail(true);
    }, 5000);
}

function stopTempEmailPolling() {
  tempEmailActive = false;

  if (tempEmailInterval) {
    clearInterval(
      tempEmailInterval
    );

    tempEmailInterval = null;
  }
}

async function tempEmailUI() {
  if (tempEmailSession.email) {
    renderTempEmail();
    startTempEmailPolling();
    return;
  }

  showLoading("Temp Email");

  try {
    await createTempEmailSession();

    renderTempEmail(
      "{green-fg}Email berhasil dibuat.{/green-fg}"
    );

    startTempEmailPolling();
  } catch (error) {
    showResult(
      "Temp Email",
      `{red-fg}${error.message}{/red-fg}`
    );
  }
}

main.key("r", async () => {
  if (!tempEmailActive) {
    return;
  }

  showLoading("Temp Email");

  await refreshTempEmail(true);
});

main.key("n", async () => {
  if (!tempEmailActive) {
    return;
  }

  try {
    showLoading("Temp Email");

    await createTempEmailSession();

    renderTempEmail(
      "{green-fg}Email baru berhasil dibuat.{/green-fg}"
    );

    startTempEmailPolling();
  } catch (error) {
    renderTempEmail(
      `{red-fg}${error.message}{/red-fg}`
    );
  }
});

/* =========================
   ANICHI
========================= */

function anichiUI() {
  const box = createInput(
    " Anichi Search ",
    "70%",
    8
  );

  box.on("submit", async (value) => {
    box.destroy();

    const query = value.trim();

    if (!query) {
      showResult(
        "Anichi",
        "{red-fg}Masukkan judul anime yang ingin dicari.{/red-fg}"
      );
      return;
    }

    showLoading("Anichi - Search");

    try {
      const results = await anichiSearch(query);

      if (!Array.isArray(results) || results.length === 0) {
        showResult(
          "Anichi",
          `Tidak ada hasil untuk: ${query}\n\n` +
            "Coba judul lain atau periksa koneksi ke situs sumber."
        );
        return;
      }

      const items = results.slice(0, 20);
      const resultList = blessed.list({
        top: "center",
        left: "center",
        width: "85%",
        height: "80%",
        keys: true,
        vi: true,
        mouse: true,
        border: { type: "line" },
        label: ` Anichi Results: ${query} `,
        style: {
          border: { fg: "cyan" },
          selected: { fg: "black", bg: "cyan" },
          item: { fg: "white" },
        },
        items: items.map((item, index) => {
          const title = item.title || "Untitled";
          const episode = item.episode ? ` | ${item.episode}` : "";
          const type = item.type ? ` | ${item.type}` : "";
          return `${index + 1}. ${title}${episode}${type}`;
        }),
        padding: { left: 1, right: 1 },
      });

      screen.append(resultList);
      resultList.focus();
      screen.render();

      resultList.on("select", async (_, index) => {
        const selected = items[index];
        resultList.destroy();
        showLoading("Anichi - Detail");

        try {
          const detail = await anichiDetail(selected.url);
          const title = detail.title || selected.title || "Untitled";
          const synopsis = detail.synopsis || "Deskripsi tidak tersedia dari halaman sumber.";
          const genres = Array.isArray(detail.genres) && detail.genres.length
            ? detail.genres.join(", ")
            : "Tidak tersedia";
          const rating = detail.rating || "Tidak tersedia";
          const episode = selected.episode || detail.episodeNum || "Tidak tersedia";
          const pageUrl = detail.url || selected.url || "Tidak tersedia";
          const altTitle = detail.altTitle || "Tidak tersedia";
          const info = detail.info && Object.keys(detail.info).length
            ? Object.entries(detail.info).map(([key, val]) => `${key}: ${val}`).join("\n")
            : "Tidak tersedia";

          showResult(
            "Anichi - Detail Anime",
            `{bold}${title}{/bold}\n` +
              `Judul alternatif : ${altTitle}\n` +
              `Episode/status   : ${episode}\n` +
              `Rating            : ${rating}\n` +
              `Genre             : ${genres}\n\n` +
              `{cyan-fg}Deskripsi{/cyan-fg}\n${synopsis}\n\n` +
              `{cyan-fg}Informasi{/cyan-fg}\n${info}\n\n` +
              `{cyan-fg}URL halaman anime{/cyan-fg}\n${pageUrl}\n\n` +
              `{gray-fg}URL di atas adalah halaman sumber anime, bukan jaminan tautan video langsung. Jika halaman menyediakan fitur menonton, buka URL tersebut di browser.{/gray-fg}`
          );
        } catch (error) {
          showResult(
            "Anichi",
            `{red-fg}Gagal mengambil detail anime.{/red-fg}\n\n` +
              `Judul: ${selected.title || "Untitled"}\n` +
              `URL halaman: ${selected.url || "Tidak tersedia"}\n\n` +
              `${error.message}`
          );
        }
      });

      resultList.key("escape", () => {
        resultList.destroy();
        showHome();
      });
    } catch (error) {
      showResult(
        "Anichi",
        `{red-fg}Pencarian gagal.{/red-fg}\n\n${error.message}`
      );
    }
  });

  box.key("escape", () => {
    box.destroy();
    showHome();
  });
}

/* =========================
   PSYCHOLOGY
========================= */

function psychologyUI() {
  const box = createInput(
    " Psychology Search ",
    "70%",
    8
  );

  box.on("submit", async (value) => {
    box.destroy();

    const term = value.trim();

    if (!term) {
      showResult(
        "Psychology Search",
        "{red-fg}Istilah tidak boleh kosong.{/red-fg}"
      );
      return;
    }

    showLoading(
      "Psychology Search"
    );

    try {
      const data =
        await searchPsychology(term);

      if (!data.success) {
        showResult(
          "Psychology Search",
          `{red-fg}${data.message}{/red-fg}`
        );
        return;
      }

      let output =
        `Term   : {cyan-fg}${data.term}{/cyan-fg}\n` +
        `Source : ${
          data.source || "Wiktionary"
        }\n\n`;

      for (
        const item of data.results.slice(
          0,
          10
        )
      ) {
        output +=
          `{bold}${
            item.language || ""
          }{/bold}` +
          `${
            item.partOfSpeech
              ? ` - ${item.partOfSpeech}`
              : ""
          }\n`;

        if (item.word) {
          output +=
            `Word : ${item.word}\n`;
        }

        output +=
          `${item.definition}\n`;

        if (item.examples?.length) {
          output +=
            `Example:\n` +
            item.examples
              .map(
                (x) => `  • ${x}`
              )
              .join("\n") +
            "\n";
        }

        output +=
          `────────────────────────\n`;
      }

      output +=
        `\n{gray-fg}${
          data.url || ""
        }{/gray-fg}`;

      showResult(
        "Psychology Search",
        output
      );
    } catch (error) {
      showResult(
        "Psychology Search",
        `{red-fg}Gagal mencari istilah.{/red-fg}\n\n${error.message}`
      );
    }
  });

  box.key("escape", () => {
    box.destroy();
    showHome();
  });
}

/* =========================
   AI MODEL
========================= */

function selectAIModelUI() {
  const modelList =
    blessed.list({
      top: "center",
      left: "center",
      width: "72%",
      height: "75%",
      keys: true,
      vi: true,
      mouse: true,
      border: {
        type: "line",
      },
      label: " AI Model ",
      style: {
        border: {
          fg: "cyan",
        },
        selected: {
          fg: "black",
          bg: "cyan",
        },
        item: {
          fg: "white",
        },
      },
      items: AI_MODELS.map(
        (model) =>
          `${model.name} - ${model.provider}`
      ),
      padding: {
        left: 1,
        right: 1,
      },
    });

  screen.append(modelList);

  modelList.focus();

  screen.render();

  modelList.on(
    "select",
    (_, index) => {
      const model =
        AI_MODELS[index];

      modelList.destroy();

      aiPromptUI(model);
    }
  );

  modelList.key(
    "escape",
    () => {
      modelList.destroy();
      showHome();
    }
  );
}

/* =========================
   AI PROMPT
========================= */

function aiPromptUI(model) {
  const box = createInput(
    ` ${model.name} `,
    "75%",
    10
  );

  box.on("submit", async (value) => {
    box.destroy();

    const question =
      value.trim();

    if (!question) {
      showResult(
        "AI Assisten",
        "{red-fg}Pesan tidak boleh kosong.{/red-fg}"
      );
      return;
    }

    showLoading(
      `AI - ${model.name}`
    );

    try {
      const answer =
        await askAI(
          question,
          model.id
        );

      showResult(
        "AI Assisten",
        `Model    : {cyan-fg}${model.name}{/cyan-fg}\n` +
          `Provider : ${model.provider}\n\n` +
          `{cyan-fg}Q:{/cyan-fg} ${question}\n\n` +
          `{green-fg}AI:{/green-fg}\n${answer}`
      );
    } catch (error) {
      showResult(
        "AI Assisten",
        `{red-fg}Gagal menghubungi API.{/red-fg}\n\n${error.message}`
      );
    }
  });

  box.key("escape", () => {
    box.destroy();
    selectAIModelUI();
  });
}

/* =========================
   API CHECKER
========================= */

async function apiCheckerUI() {
  const checks = [
    {
      name: "Stalker GitHub",
      url: "https://danxyofficial-api.vercel.app/stalk/github",
      params: { username: "octocat" },
    },
    {
      name: "Stalker TikTok",
      url: "https://danxyofficial-api.vercel.app/stalk/tiktok",
      params: { username: "tiktok" },
    },
    {
      name: "Stalker Roblox",
      url: "https://api.azbry.com/api/stalk/roblox",
      params: { username: "Roblox" },
    },
    {
      name: "Stalker YouTube",
      url: "https://api.azbry.com/api/stalk/youtube",
      params: { username: "MrBeast" },
    },
    {
      name: "Stalker Minecraft",
      url: "https://api.azbry.com/api/stalk/minecraft",
      params: { username: "notch" },
    },
    {
      name: "BreachGmail",
      url: "https://api.xposedornot.com/v1/check-email/test@example.com",
    },
    {
      name: "Public IP (ipify)",
      url: "https://api.ipify.org",
      params: { format: "json" },
    },
  ];

  showLoading("API Checker - Mengecek endpoint");

  const results = await Promise.all(
    checks.map(async (api) => {
      const started = Date.now();
      try {
        const response = await axios.get(api.url, {
          params: api.params,
          timeout: 8000,
          headers: { Accept: "application/json" },
          // Tetap baca HTTP 4xx/5xx agar status endpoint bisa ditampilkan.
          validateStatus: (status) => status >= 200 && status < 600,
        });
        const elapsed = Date.now() - started;
        const ok = response.status >= 200 && response.status < 300;
        return {
          name: api.name,
          status: ok ? "AKTIF" : "ERROR HTTP " + response.status,
          color: ok ? "green" : "yellow",
          detail: `${response.status} • ${elapsed} ms`,
        };
      } catch (error) {
        const elapsed = Date.now() - started;
        let detail = error?.code || error?.message || "Request gagal";
        if (error?.code === "ECONNABORTED" || error?.code === "ETIMEDOUT") {
          detail = "Timeout setelah 8 detik";
        }
        return {
          name: api.name,
          status: "ERROR",
          color: "red",
          detail: `${detail} • ${elapsed} ms`,
        };
      }
    })
  );

  const active = results.filter((item) => item.status === "AKTIF").length;
  const content = results
    .map((item) =>
      `{bold}${item.name}{/bold}\n` +
      `Status : {${item.color}-fg}${item.status}{/${item.color}-fg}\n` +
      `Detail : ${item.detail}`
    )
    .join("\n\n");

  showResult(
    "API Checker",
    `{cyan-fg}Hasil: ${active}/${results.length} endpoint mengembalikan HTTP 2xx{/cyan-fg}\n\n` +
      content +
      "\n\n{gray-fg}Catatan: HTTP 4xx berarti server merespons tetapi request/route ditolak atau bermasalah. Hasil cek adalah kondisi saat ini.{/gray-fg}"
  );
}

/* =========================
   STALKER
========================= */

function stalkerUI() {
  const options = blessed.list({
    top: "center",
    left: "center",
    width: "65%",
    height: 12,
    keys: true,
    vi: true,
    mouse: true,
    border: { type: "line" },
    label: " Stalker - Pilih Platform ",
    style: {
      border: { fg: "cyan" },
      selected: { fg: "black", bg: "cyan" },
      item: { fg: "white" },
    },
    items: ["GitHub", "TikTok", "Roblox", "YouTube", "Minecraft", "Kembali"],
    padding: { left: 1, right: 1 },
  });

  screen.append(options);
  options.focus();
  screen.render();

  options.on("select", (_, index) => {
    options.destroy();
    if (index === 0) stalkerGitHubUI();
    else if (index === 1) stalkerTikTokUI();
    else if (index === 2) stalkerRobloxUI();
    else if (index === 3) stalkerYouTubeUI();
    else if (index === 4) stalkerMinecraftUI();
    else showHome();
  });

  options.key("escape", () => {
    options.destroy();
    showHome();
  });
}

function stalkerGitHubUI() {
  const box = createInput(" Stalker GitHub - Username ", "70%", 8);

  box.on("submit", async (value) => {
    box.destroy();
    const username = value.trim().replace(/^@/, "");

    if (!username) {
      showResult("Stalker GitHub", "{red-fg}Username tidak boleh kosong.{/red-fg}");
      return;
    }

    showLoading("Stalker GitHub");

    try {
      const response = await axios.get(
        "https://danxyofficial-api.vercel.app/stalk/github",
        {
          params: { username },
          timeout: 15000,
          headers: { Accept: "application/json" },
        }
      );
      const data = response.data;
      const user = data?.result;

      if (!data?.status || !user) {
        showResult(
          "Stalker GitHub",
          "{yellow-fg}Profil tidak ditemukan atau API tidak memberikan hasil.{/yellow-fg}"
        );
        return;
      }

      const field = (value) => value === null || value === undefined || value === "" ? "Tidak tersedia" : String(value);
      const content =
        `Username       : ${field(user.username)}\n` +
        `Nickname       : ${field(user.nickname)}\n` +
        `Bio            : ${field(user.bio)}\n` +
        `ID             : ${field(user.id)}\n` +
        `Tipe akun      : ${field(user.type)}\n` +
        `Admin          : ${field(user.admin)}\n` +
        `Public repo    : ${field(user.public_repo)}\n` +
        `Public gists   : ${field(user.public_gists)}\n` +
        `Followers      : ${field(user.followers)}\n` +
        `Following      : ${field(user.following)}\n` +
        `Perusahaan     : ${field(user.company)}\n` +
        `Lokasi         : ${field(user.location)}\n` +
        `Email publik   : ${field(user.email)}\n` +
        `Dibuat         : ${field(user.created_at || user.ceated_at)}\n` +
        `Diperbarui     : ${field(user.updated_at)}\n\n` +
        `Profil         : ${field(user.url)}\n` +
        `Foto profil    : ${field(user.profile_pic)}`;

      showResult("Stalker GitHub", content);
    } catch (error) {
      const status = error?.response?.status;
      showResult(
        "Stalker GitHub",
        `{red-fg}Gagal mengambil data profil publik.${status ? ` HTTP ${status}.` : ""}{/red-fg}\n\n${error.message}`
      );
    }
  });

  box.key("escape", () => {
    box.destroy();
    stalkerUI();
  });
}

function stalkerTikTokUI() {
  const box = createInput(" Stalker TikTok - Username ", "70%", 8);

  box.on("submit", async (value) => {
    box.destroy();
    const username = value.trim().replace(/^@/, "");

    if (!username) {
      showResult("Stalker TikTok", "{red-fg}Username tidak boleh kosong.{/red-fg}");
      return;
    }

    showLoading("Stalker TikTok");

    try {
      const response = await axios.get(
        "https://danxyofficial-api.vercel.app/stalk/tiktok",
        {
          params: { username },
          timeout: 15000,
          headers: { Accept: "application/json" },
        }
      );
      const data = response.data;
      const user = data?.result;

      if (!data?.status || !user) {
        showResult(
          "Stalker TikTok",
          "{yellow-fg}Profil tidak ditemukan atau API tidak memberikan hasil.{/yellow-fg}"
        );
        return;
      }

      const field = (value) => value === null || value === undefined || value === "" ? "Tidak tersedia" : String(value);
      const profileUrl = user.uniqueId
        ? `https://www.tiktok.com/@${user.uniqueId}`
        : "Tidak tersedia";
      const content =
        `Username       : ${field(user.uniqueId)}\n` +
        `Nickname       : ${field(user.nickname)}\n` +
        `ID             : ${field(user.id)}\n` +
        `Bio            : ${field(user.signature)}\n` +
        `Terverifikasi  : ${field(user.verified)}\n` +
        `Followers      : ${field(user.followers)}\n` +
        `Following      : ${field(user.following)}\n` +
        `Likes          : ${field(user.likes)}\n` +
        `Video          : ${field(user.videos)}\n\n` +
        `Profil         : ${profileUrl}\n` +
        `Foto profil    : ${field(user.avatar)}`;

      showResult("Stalker TikTok", content);
    } catch (error) {
      const status = error?.response?.status;
      showResult(
        "Stalker TikTok",
        `{red-fg}Gagal mengambil data profil publik.${status ? ` HTTP ${status}.` : ""}{/red-fg}\n\n${error.message}`
      );
    }
  });

  box.key("escape", () => {
    box.destroy();
    stalkerUI();
  });
}


function stalkerRobloxUI() {
  const box = createInput(" Stalker Roblox - Username ", "70%", 8);

  box.on("submit", async (value) => {
    box.destroy();
    const username = value.trim().replace(/^@/, "");

    if (!username) {
      showResult("Stalker Roblox", "{red-fg}Username tidak boleh kosong.{/red-fg}");
      return;
    }

    showLoading("Stalker Roblox");

    try {
      const response = await axios.get(
        "https://api.azbry.com/api/stalk/roblox",
        {
          params: { username },
          timeout: 15000,
          headers: { Accept: "application/json" },
        }
      );
      const data = response.data;
      const user = data?.result;

      if (!data?.status || !user) {
        showResult(
          "Stalker Roblox",
          "{yellow-fg}Profil tidak ditemukan atau API tidak memberikan hasil.{/yellow-fg}"
        );
        return;
      }

      const field = (value) => value === null || value === undefined || value === "" ? "Tidak tersedia" : String(value);
      const presence = user.presence || {};
      const social = user.social || {};
      const profileUrl = user.profileUrl || (user.username
        ? `https://www.roblox.com/users/${encodeURIComponent(user.id)}/profile`
        : "Tidak tersedia");
      const content =
        `Username       : ${field(user.username)}\n` +
        `Display name   : ${field(user.displayName)}\n` +
        `User ID        : ${field(user.id)}\n` +
        `Dibuat         : ${field(user.created)}\n` +
        `Akun dibanned  : ${field(user.isBanned)}\n` +
        `Status         : ${field(presence.status)}\n` +
        `Terakhir online: ${field(presence.lastOnline)}\n` +
        `Friends        : ${field(social.friends)}\n` +
        `Followers      : ${field(social.followers)}\n` +
        `Following      : ${field(social.following)}\n\n` +
        `Profil         : ${profileUrl}\n` +
        `Avatar         : ${field(user.avatar)}`;

      showResult("Stalker Roblox", content);
    } catch (error) {
      const status = error?.response?.status;
      showResult(
        "Stalker Roblox",
        `{red-fg}Gagal mengambil data profil publik.${status ? ` HTTP ${status}.` : ""}{/red-fg}\n\n${error.message}`
      );
    }
  });

  box.key("escape", () => {
    box.destroy();
    stalkerUI();
  });
}


function stalkerYouTubeUI() {
  const box = createInput(" Stalker YouTube - Username / Handle ", "70%", 8);

  box.on("submit", async (value) => {
    box.destroy();
    const username = value.trim().replace(/^@/, "");

    if (!username) {
      showResult("Stalker YouTube", "{red-fg}Username tidak boleh kosong.{/red-fg}");
      return;
    }

    showLoading("Stalker YouTube");

    try {
      const response = await axios.get(
        "https://api.azbry.com/api/stalk/youtube",
        {
          params: { username },
          timeout: 15000,
          headers: { Accept: "application/json" },
        }
      );
      const data = response.data;
      const channel = data?.result;

      if (!data?.status || !channel) {
        showResult(
          "Stalker YouTube",
          "{yellow-fg}Channel tidak ditemukan atau API tidak memberikan hasil.{/yellow-fg}"
        );
        return;
      }

      const field = (value) => value === null || value === undefined || value === "" ? "Tidak tersedia" : String(value);
      const content =
        `Nama channel   : ${field(channel.name)}\n` +
        `Channel ID     : ${field(channel.id)}\n` +
        `Video          : ${field(channel.video_count)}\n` +
        `Terverifikasi  : ${field(channel.verified)}\n` +
        `Tentang        : ${field(channel.about)}\n\n` +
        `Channel        : ${field(channel.url)}\n` +
        `Thumbnail      : ${field(channel.thumbnail)}`;

      showResult("Stalker YouTube", content);
    } catch (error) {
      const status = error?.response?.status;
      showResult(
        "Stalker YouTube",
        `{red-fg}Gagal mengambil data channel publik.${status ? ` HTTP ${status}.` : ""}{/red-fg}\n\n${error.message}`
      );
    }
  });

  box.key("escape", () => {
    box.destroy();
    stalkerUI();
  });
}


function stalkerMinecraftUI() {
  const box = createInput(" Stalker Minecraft - Username ", "70%", 8);

  box.on("submit", async (value) => {
    box.destroy();
    const username = value.trim().replace(/^@/, "");

    if (!username) {
      showResult("Stalker Minecraft", "{red-fg}Username tidak boleh kosong.{/red-fg}");
      return;
    }

    showLoading("Stalker Minecraft");

    try {
      const response = await axios.get(
        "https://api.azbry.com/api/stalk/minecraft",
        {
          params: { username },
          timeout: 15000,
          headers: { Accept: "application/json" },
        }
      );
      const data = response.data;
      const player = data?.result;

      if (!data?.status || !player) {
        showResult(
          "Stalker Minecraft",
          "{yellow-fg}Player tidak ditemukan atau API tidak memberikan hasil.{/yellow-fg}"
        );
        return;
      }

      const field = (value) => value === null || value === undefined || value === "" ? "Tidak tersedia" : String(value);
      const nameHistory = Array.isArray(player.name_history) && player.name_history.length
        ? player.name_history.map((entry) => typeof entry === "string" ? entry : JSON.stringify(entry)).join(", ")
        : "Tidak ada data riwayat";
      const content =
        `Username       : ${field(player.username)}\n` +
        `UUID           : ${field(player.uuid)}\n` +
        `Total perubahan: ${field(player.total_name_changes)}\n` +
        `Riwayat nama   : ${nameHistory}\n\n` +
        `Skin           : ${field(player.skin)}\n` +
        `Avatar         : ${field(player.avatar)}\n` +
        `Cape           : ${field(player.cape)}\n` +
        `Render         : ${field(player.render)}`;

      showResult("Stalker Minecraft", content);
    } catch (error) {
      const status = error?.response?.status;
      showResult(
        "Stalker Minecraft",
        `{red-fg}Gagal mengambil data profil Minecraft.${status ? ` HTTP ${status}.` : ""}{/red-fg}\n\n${error.message}`
      );
    }
  });

  box.key("escape", () => {
    box.destroy();
    stalkerUI();
  });
}

/* =========================
   USERNAME CHECKER
========================= */

function usernameCheckerUI() {
  const box = createInput(" Username Checker - username tanpa URL ", "70%", 8);

  box.on("submit", async (value) => {
    box.destroy();
    const username = value.trim().replace(/^@/, "");

    if (!username) {
      showResult("Username Checker", "{red-fg}Username tidak boleh kosong.{/red-fg}");
      return;
    }

    if (!/^[a-zA-Z0-9._-]{1,50}$/.test(username)) {
      showResult(
        "Username Checker",
        "{red-fg}Format username tidak valid. Gunakan huruf, angka, titik, garis bawah, atau strip.{/red-fg}"
      );
      return;
    }

    showLoading("Username Checker - memeriksa profil publik");

    try {
      const results = await checkUsername(username);
      const lines = results.map((item) => {
        const safe = (v) => String(v ?? "-").replace(/[{}\n\r]/g, " ");
        let status;
        if (item.status === "found") status = "{green-fg}MUNGKIN ADA{/green-fg}";
        else if (item.status === "not_found") status = "{red-fg}TIDAK DITEMUKAN{/red-fg}";
        else status = "{yellow-fg}TIDAK PASTI{/yellow-fg}";
        return `${safe(item.platform).padEnd(12)} ${status}
  ${safe(item.url)}${item.note ? `\n  {gray-fg}${safe(item.note)}{/gray-fg}` : ""}`;
      });

      const found = results.filter((x) => x.status === "found").length;
      const missing = results.filter((x) => x.status === "not_found").length;
      showResult(
        "Username Checker",
        `{cyan-fg}Username: ${username}{/cyan-fg}\n` +
          `Dugaan profil ditemukan: ${found} | Tidak ditemukan: ${missing} | Tidak pasti: ${results.length - found - missing}\n\n` +
          lines.join("\n\n") +
          "\n\n{gray-fg}Hasil berbasis respons HTTP publik, bukan bukti identitas. Situs bisa membatasi bot, menyembunyikan profil, atau mengubah halaman; status TIDAK PASTI bukan berarti akun tidak ada.{/gray-fg}"
      );
    } catch (error) {
      showResult(
        "Username Checker",
        `{red-fg}Pemeriksaan gagal: ${String(error?.message || "Request gagal").replace(/[{}\n\r]/g, " ")}{/red-fg}`
      );
    }
  });

  box.key("escape", () => {
    box.destroy();
    showHome();
  });
}

/* =========================
   IP LOOKUP
========================= */

function ipLookupUI() {
  const box = createInput(
    " IP Lookup - kosongkan untuk IP publik sendiri ",
    "70%",
    8
  );

  box.on("submit", async (value) => {
    box.destroy();
    const input = value.trim();

    showLoading("IP Lookup - mengambil informasi IP");

    try {
      const result = await lookupIP(input);
      if (!result.success) {
        showResult(
          "IP Lookup",
          `{red-fg}${result.message || "Lookup IP gagal."}{/red-fg}`
        );
        return;
      }

      const d = result.data;
      const connection = d.connection || {};
      const timezone = d.timezone || {};
      const flag = d.flag || {};
      const safe = (value) => String(value ?? "-").replace(/[{}]/g, "");
      const output =
        `IP Address : {cyan-fg}${safe(d.ip)}{/cyan-fg}\n` +
        `Version    : ${safe(d.type)}\n` +
        `Hostname   : ${safe(d.hostname)}\n\n` +
        `{bold}LOCATION{/bold}\n` +
        `Country    : ${safe(d.country)} ${safe(flag.emoji)}\n` +
        `Region     : ${safe(d.region)}\n` +
        `City       : ${safe(d.city)}\n` +
        `Postal     : ${safe(d.postal)}\n` +
        `Continent  : ${safe(d.continent)}\n` +
        `Coordinates: ${safe(d.latitude)}, ${safe(d.longitude)}\n` +
        `Timezone   : ${safe(timezone.id)} (${safe(timezone.utc)})\n\n` +
        `{bold}NETWORK{/bold}\n` +
        `ISP        : ${safe(connection.isp)}\n` +
        `Organization: ${safe(connection.org)}\n` +
        `ASN        : ${safe(connection.asn)}\n\n` +
        `{gray-fg}Geolokasi IP hanya perkiraan dan biasanya menunjukkan jaringan/ISP, bukan alamat rumah yang pasti.{/gray-fg}`;

      showResult("IP Lookup", output);
    } catch (error) {
      showResult(
        "IP Lookup",
        `{red-fg}Error: ${String(error?.message || "Request gagal").replace(/[{}]/g, "")}{/red-fg}`
      );
    }
  });

  box.key("escape", () => {
    box.destroy();
    showHome();
  });
}

/* =========================
   NMAP PORT SCANNER
========================= */

function nmapPortScannerUI() {
  const box = createInput(
    " Nmap - IP/domain milik sendiri atau yang diizinkan ",
    "70%",
    8
  );

  box.on("submit", async (value) => {
    box.destroy();
    const target = value.trim();

    if (!target) {
      showResult("Nmap Port Scanner", "{red-fg}Target tidak boleh kosong.{/red-fg}");
      return;
    }

    // Accept one hostname or one IP only; reject URLs, CIDR ranges, options,
    // shell metacharacters, and multi-target input.
    const isIPv4 = /^(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)$/.test(target);
    const isIPv6 = /^[0-9a-fA-F:]+$/.test(target) && target.includes(":") && target.length <= 45;
    const isDomain = /^(?=.{1,253}$)(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,63}$/.test(target);

    if (!(isIPv4 || isIPv6 || isDomain) || target.startsWith("-")) {
      showResult(
        "Nmap Port Scanner",
        "{red-fg}Target tidak valid. Masukkan satu IP atau domain saja, tanpa URL, port, atau CIDR.{/red-fg}"
      );
      return;
    }

    showLoading("Nmap - memindai 100 port umum; tunggu hingga selesai");

    try {
      const args = ["-n", "-Pn", "-sT", "--top-ports", "100", "--open", "--reason", "-T3", target];
      const output = await new Promise((resolve, reject) => {
        execFile("nmap", args, { timeout: 120000, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
          if (error) {
            error.scanOutput = [stdout, stderr].filter(Boolean).join("\n").trim();
            reject(error);
            return;
          }
          resolve(stdout || stderr || "Nmap tidak mengembalikan output.");
        });
      });

      const safeOutput = String(output).replace(/[{}]/g, "");
      showResult(
        "Nmap Port Scanner",
        `{cyan-fg}Target: ${target}{/cyan-fg}\n` +
        "Mode: TCP connect scan | 100 port umum\n\n" +
        safeOutput +
        "\n\n{gray-fg}Hanya pindai sistem yang lu miliki atau yang secara eksplisit mengizinkan pengujian.{/gray-fg}"
      );
    } catch (error) {
      const details = String(error?.scanOutput || error?.message || "Pemindaian gagal.").replace(/[{}]/g, "");
      const hint = error?.code === "ENOENT"
        ? "Nmap belum terpasang/ tidak ada di PATH. Termux: pkg install nmap | Debian/Ubuntu: sudo apt install nmap"
        : error?.killed
          ? "Pemindaian melewati batas waktu 120 detik."
          : details;
      showResult("Nmap Port Scanner", `{red-fg}${hint}{/red-fg}`);
    }
  });

  box.key("escape", () => {
    box.destroy();
    showHome();
  });
}

/* =========================
   SQLMAP SQL INJECTION CHECK
========================= */

function sqlmapScannerUI() {
  const box = createInput(
    " SQLmap - URL dengan parameter milik sendiri/berizin ",
    "75%",
    8
  );

  box.on("submit", async (value) => {
    box.destroy();
    const target = String(value || "").trim();

    if (!target) {
      showResult("SQLmap SQL Injection Check", "{red-fg}URL tidak boleh kosong.{/red-fg}");
      return;
    }

    showLoading("SQLmap - pemeriksaan dasar; tunggu sebentar");
    try {
      const result = await scanSqlmap(target);
      const output = String(result.output || "Tidak ada output dari SQLmap.").slice(0, 24000).replace(/[{}]/g, "");
      showResult(
        "SQLmap SQL Injection Check",
        `{cyan-fg}Target: ${result.target}{/cyan-fg}\n` +
        "Mode: basic detection | level 1 | risk 1 | no database dumping\n\n" +
        output +
        "\n\n{gray-fg}Gunakan hanya pada aplikasi milik sendiri atau yang memberi izin eksplisit. Hasil perlu diverifikasi.{/gray-fg}"
      );
    } catch (error) {
      const message = String(error?.message || "Scan gagal.").replace(/[{}]/g, "");
      showResult("SQLmap SQL Injection Check", `{red-fg}${message}{/red-fg}`);
    }
  });

  box.key("escape", () => {
    box.destroy();
    showHome();
  });
}

/* =========================
   PARAMSPIDER PARAMETER DISCOVERY
========================= */

function paramSpiderUI() {
  const box = createInput(
    " ParamSpider - domain/URL milik sendiri (misal: domainanda.id) ",
    "75%",
    8
  );

  box.on("submit", async (value) => {
    box.destroy();
    const domain = String(value || "").trim();
    if (!domain) {
      showResult("ParamSpider Parameter Discovery", "{red-fg}Domain tidak boleh kosong.{/red-fg}");
      return;
    }

    showLoading("ParamSpider - mengambil URL historis dari web archive");
    try {
      const result = await scanParamSpider(domain);
      const output = String(result.output || "Tidak ditemukan URL berparameter.")
        .slice(0, 24000)
        .replace(/[{}]/g, "");
      showResult(
        "ParamSpider Parameter Discovery",
        `{cyan-fg}Domain: ${result.domain}{/cyan-fg}\n` +
        `URL berparameter ditemukan: ${result.count}\n` +
        `Output disimpan: ${result.outputPath}\n\n` +
        output +
        "\n\n{gray-fg}ParamSpider mencari URL historis; hasil bukan bukti kerentanan. Gunakan hanya untuk domain milik sendiri atau yang memberi izin.{/gray-fg}"
      );
    } catch (error) {
      const message = String(error?.message || "Pencarian parameter gagal.").replace(/[{}]/g, "");
      showResult("ParamSpider Parameter Discovery", `{red-fg}${message}{/red-fg}`);
    }
  });

  box.key("escape", () => {
    box.destroy();
    showHome();
  });
}

/* =========================
   TIKTOK LIVE CHAT
========================= */

let activeTikTokConnection = null;
let activeTikTokChatBox = null;
let activeTikTokChatLines = [];

function safeChatText(value, max = 180) {
  return String(value ?? "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/[{}]/g, "()")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function renderTikTokChat(status = "Menghubungkan...") {
  if (!activeTikTokChatBox) return;
  const username = activeTikTokChatBox._tiktokUsername || "";
  const content = [
    `TikTok LIVE Chat Reader`,
    `Streamer: @${username}`,
    `Status: ${safeChatText(status, 100)}`,
    `Chat diterima: ${activeTikTokChatLines.length}`,
    "-".repeat(48),
    ...activeTikTokChatLines,
    "",
    "Tekan Esc untuk memutuskan koneksi dan kembali ke menu."
  ].join("\n");
  activeTikTokChatBox.setContent(content);
  activeTikTokChatBox.setScrollPerc(100);
  screen.render();
}

async function stopTikTokLiveChat() {
  const connection = activeTikTokConnection;
  const box = activeTikTokChatBox;
  activeTikTokConnection = null;
  activeTikTokChatBox = null;
  activeTikTokChatLines = [];
  if (connection) {
    try { await connection.disconnect(); } catch {}
  }
  if (box && !box.destroyed) box.destroy();
  showHome();
}

function tiktokLiveChatUI() {
  const input = createInput(
    " TikTok LIVE Chat - username streamer (tanpa @) ",
    "75%",
    8
  );

  input.on("submit", async (value) => {
    input.destroy();
    const username = String(value || "").trim().replace(/^@/, "");
    if (!/^[A-Za-z0-9._]{2,24}$/.test(username)) {
      showResult("TikTok LIVE Chat", "Username tidak valid. Masukkan username TikTok tanpa @.");
      return;
    }

    activeTikTokChatLines = [];
    const box = blessed.box({
      top: 5,
      left: "32%",
      width: "68%",
      height: "100%-5",
      border: { type: "line" },
      style: { border: { fg: "cyan" }, fg: "white" },
      padding: { left: 1, right: 1, top: 1, bottom: 1 },
      scrollable: true,
      alwaysScroll: true,
      mouse: true,
      keys: true,
      tags: false,
      content: "Menyiapkan koneksi TikTok LIVE..."
    });
    box._tiktokUsername = username;
    screen.append(box);
    activeTikTokChatBox = box;
    renderTikTokChat("Mencoba terhubung...");

    box.key("escape", () => { void stopTikTokLiveChat(); });

    try {
      const result = await connectTikTokLive(username, {
        onChat: (data) => {
          if (!activeTikTokChatBox || activeTikTokChatBox !== box) return;
          const uniqueId = safeChatText(data?.user?.uniqueId || data?.uniqueId || "unknown", 40);
          const nickname = safeChatText(data?.user?.nickname || "", 40);
          const comment = safeChatText(data?.comment || "", 220);
          const displayName = nickname && nickname !== uniqueId ? `${nickname} (@${uniqueId})` : `@${uniqueId}`;
          activeTikTokChatLines.push(`${displayName}: ${comment}`);
          if (activeTikTokChatLines.length > 120) activeTikTokChatLines.shift();
          renderTikTokChat("Terhubung - menerima chat real-time");
        },
        onStatus: (status) => {
          if (activeTikTokChatBox === box) renderTikTokChat(status);
        },
        onError: (error) => {
          if (activeTikTokChatBox === box) {
            const message = safeChatText(error?.message || error || "koneksi mengalami error", 160);
            renderTikTokChat(`Error: ${message}`);
          }
        }
      });
      if (activeTikTokChatBox === box) {
        activeTikTokConnection = result.connection;
        renderTikTokChat(`Terhubung ke LIVE @${username}`);
      } else {
        try { await result.connection.disconnect(); } catch {}
      }
    } catch (error) {
      if (activeTikTokChatBox === box) {
        const message = safeChatText(error?.message || "Gagal terhubung. Pastikan streamer sedang LIVE dan koneksi internet tersedia.", 240);
        renderTikTokChat(`Gagal: ${message}`);
        activeTikTokChatLines.push("Periksa username, status LIVE, koneksi internet, dan versi library.");
        renderTikTokChat(`Gagal terhubung: ${message}`);
      }
    }
  });

  input.key("escape", () => {
    input.destroy();
    showHome();
  });
}


/* =========================
   TELEGRAM MESSAGE CENTER
========================= */

async function telegramTokenUI() {
  return askBotTokenUI((token, info) => telegramMessageMenu(token, info));
}

// Dipakai OSINT Telegram: setelah token valid, langsung masuk ke Info Chat.
function osintTelegramUI() {
  return askBotTokenUI((token) => telegramInfoUI(token));
}

async function askBotTokenUI(onValid) {
  const box = createInput(" Telegram Bot Token ", "72%", 8);
  box.on("submit", async (value) => {
    box.destroy();
    const token = String(value || "").trim();
    if (!token) {
      showResult("Telegram", "{red-fg}Bot Token wajib diisi.{/red-fg}");
      return;
    }

    showLoading("Telegram - Verifikasi Bot Token");
    try {
      const info = await getTelegramBotInfo(token);
      onValid(token, info);
    } catch (error) {
      showResult("Telegram", `{red-fg}Token tidak valid atau Telegram API gagal.{/red-fg}\n\n${error.message}`);
    }
  });
  box.key("escape", () => { box.destroy(); menu.focus(); screen.render(); });
}

function telegramMessageMenu(token, info) {
  main.setContent(
    `{bold}{cyan-fg}Telegram Bot{/cyan-fg}{/bold}\n\n` +
    `Nama          : ${info.name}\n` +
    `Username      : ${info.username}\n` +
    `Bot ID        : ${info.id}\n` +
    `Deskripsi     : ${info.description}\n` +
    `Join Groups   : ${info.canJoinGroups ? "Ya" : "Tidak"}\n` +
    `Inline Query  : ${info.supportsInlineQueries ? "Ya" : "Tidak"}\n\n` +
    `{yellow-fg}Riwayat ID user yang pernah /start tidak tersedia dari Telegram Bot API.{/yellow-fg}`
  );

  const list = blessed.list({
    top: "center", left: "center", width: "65%", height: 9,
    border: { type: "line" }, label: " Telegram ",
    keys: true, vi: true, mouse: true,
    items: ["Mulai Chat", "Kembali"],
    style: { border: { fg: "cyan" }, selected: { fg: "black", bg: "cyan" }, item: { fg: "white" } },
  });
  screen.append(list);
  list.focus();
  screen.render();

  const close = () => { list.destroy(); menu.focus(); screen.render(); };
  list.on("select", (_, index) => {
    if (index === 1) return close();
    list.destroy();
    telegramStartChatUI(token);
  });
  list.key("escape", close);
}

async function telegramInfoUI(token) {
  const chatId = await telegramPrompt("Telegram Info Chat", "Masukkan Chat ID atau @username (chat/grup/channel tempat bot ada)");
  if (chatId === null) return showHome();
  if (!chatId) {
    await telegramMessage("Telegram", "Chat ID / @username wajib diisi.", "red");
    return telegramInfoUI(token);
  }

  showLoading("Telegram - Ambil Info Chat");
  try {
    const info = await getChatInfo(token, chatId);
    const adminText = info.admins
      ? (info.admins.map((a) => `  - ${a.name} (${a.username}) [${a.status}] ID: ${a.id}`).join("\n") || "  -")
      : "  Tidak tersedia (bot harus ada di grup/channel)";

    showResult(
      "Telegram - Info Chat",
      `Tipe         : ${info.type}\n` +
      `ID           : ${info.id}\n` +
      `Nama/Judul   : ${info.title !== "-" ? info.title : info.firstName}\n` +
      `Username     : ${info.username}\n` +
      `Bio          : ${info.bio}\n` +
      `Deskripsi    : ${info.description}\n` +
      `Foto ID      : ${info.photoId}\n` +
      `Jumlah member: ${info.memberCount ?? "Tidak tersedia"}\n` +
      `Invite link  : ${info.inviteLink}\n` +
      `Admin:\n${adminText}`
    );
  } catch (error) {
    showResult("Telegram - Info Chat", `{red-fg}Gagal ambil info chat.{/red-fg}\n\n${error.message}`);
  }
}

async function telegramStartChatUI(token) {
  const chatId = await telegramPrompt("Telegram Chat ID", "Masukkan ID user / chat Telegram");
  if (chatId === null) return telegramTokenUI();
  if (!/^-?\d+$/.test(chatId)) {
    await telegramMessage("Telegram", "Chat ID harus berupa angka.", "red");
    return telegramStartChatUI(token);
  }

  const text = await telegramPrompt("Telegram Message", "Masukkan text yang akan dikirim");
  if (text === null) return telegramMessageMenu(token, await getTelegramBotInfo(token));
  if (!text.trim()) {
    await telegramMessage("Telegram", "Text tidak boleh kosong.", "red");
    return telegramStartChatUI(token);
  }

  const countText = await telegramPrompt("Jumlah Pesan", "Masukkan jumlah pesan (1–100)");
  if (countText === null) return telegramMessageMenu(token, await getTelegramBotInfo(token));
  const count = Number(countText);
  if (!Number.isInteger(count) || count < 1 || count > 100) {
    await telegramMessage("Telegram", "Jumlah pesan harus 1–100.", "red");
    return telegramStartChatUI(token);
  }

  showLoading("Telegram - Mengirim Pesan");
  try {
    await sendTelegramMessages(token, chatId, text, count, (sent, total) => {
      main.setContent(`{bold}{cyan-fg}Telegram - Mengirim Pesan{/cyan-fg}{/bold}\n\nTerkirim: ${sent}/${total}\nChat ID: ${chatId}`);
      screen.render();
    });
    await telegramMessage("Telegram", `Berhasil mengirim ${count} pesan ke Chat ID ${chatId}.`, "green");
    telegramMessageMenu(token, await getTelegramBotInfo(token));
  } catch (error) {
    await telegramMessage("Telegram", `{red-fg}Pengiriman gagal.{/red-fg}\n\n${error.message}`, "red");
    telegramMessageMenu(token, await getTelegramBotInfo(token));
  }
}

function telegramPrompt(title, label) {
  return new Promise((resolve) => {
    const box = createInput(` ${title} `, "72%", 8);
    box.setContent(`{cyan-fg}${label}{/cyan-fg}\n\n{gray-fg}Enter untuk lanjut • Esc untuk kembali{/gray-fg}`);
    box.on("submit", (value) => { box.destroy(); screen.render(); resolve(String(value || "").trim()); });
    box.key("escape", () => { box.destroy(); screen.render(); resolve(null); });
  });
}

function telegramMessage(title, message, color = "yellow") {
  return new Promise((resolve) => {
    const box = blessed.box({
      top: "center", left: "center", width: "72%", height: 9,
      border: { type: "line" }, label: ` ${title} `, tags: true,
      align: "center", valign: "middle", keys: true, mouse: true,
      style: { border: { fg: color === "red" ? "red" : color === "green" ? "green" : "cyan" } },
      content: `${message}\n\n{gray-fg}Tekan Enter atau Esc{/gray-fg}`,
    });
    screen.append(box); box.focus(); screen.render();
    box.key(["enter", "escape", "space"], () => { box.destroy(); screen.render(); resolve(); });
  });
}

/* =========================
   HISTORY
========================= */

function obfuscatorAnalyzerUI() {
  const box = createInput(
    " Obfuscator Analyzer - path file kode/teks lokal ",
    "78%",
    8
  );

  box.on("submit", async (value) => {
    box.destroy();
    const filePath = String(value || "").trim();
    if (!filePath) {
      showResult("Obfuscator Analyzer / Decoder", "{red-fg}Path file tidak boleh kosong.{/red-fg}");
      return;
    }

    showLoading("Menganalisis file secara statis; file tidak akan dieksekusi");
    try {
      const result = await analyzeObfuscatedFile(filePath);
      const types = result.types.map((item, i) => `${i + 1}. ${item.label}\n   ${item.note}`).join("\n");
      const decoded = result.decoded.length
        ? result.decoded.slice(0, 8).map((item, i) => `${i + 1}. [${item.kind}] ${item.decoded.slice(0, 220)}`).join("\n")
        : "Tidak ada string umum yang berhasil di-decode.";
      const safe = (text) => String(text ?? "").replace(/[{}]/g, "");
      const content =
        `{cyan-fg}File:{/cyan-fg} ${safe(result.name)}\n` +
        `Path: ${safe(result.path)}\n` +
        `Ekstensi: ${safe(result.extension || "(tanpa ekstensi)")}\n` +
        `Ukuran: ${safe(result.size)} (${result.bytes} bytes)\n` +
        `Baris: ${result.lines == null ? "tidak dihitung (>20 MB)" : result.lines}\n` +
        `SHA-256: ${result.sha256}\n` +
        `Diubah: ${result.modified}\n\n` +
        `{cyan-fg}Indikasi obfuscator / format{/cyan-fg}\n${safe(types)}\n\n` +
        `{cyan-fg}String hasil decode statis{/cyan-fg}\n${safe(decoded)}\n\n` +
        `Laporan: ${safe(result.reportPath || "tidak dibuat karena file lebih dari 20 MB")}\n\n` +
        `{yellow-fg}Catatan:{/yellow-fg} deteksi hanya heuristik. File tidak dieksekusi; decoder ini hanya menangani pola string umum, bukan membongkar semua obfuscator sepenuhnya.`;
      showResult("Obfuscator Analyzer / Decoder", content);
    } catch (error) {
      const message = String(error?.message || "Analisis gagal.").replace(/[{}]/g, "");
      showResult("Obfuscator Analyzer / Decoder", `{red-fg}${message}{/red-fg}`);
    }
  });

  box.key("escape", () => {
    box.destroy();
    showHome();
  });
}

function showHistory() {
  showResult(
    "History",
    "{gray-fg}History belum tersedia.{/gray-fg}"
  );
}

/* =========================
   HELP
========================= */

/* =========================
   HAFE FUN
========================= */

function hafeFunUI() {
  const teka = getTeka();

  main.setContent(
    `{bold}{cyan-fg}Hafe Fun - Teka-Teki{/cyan-fg}{/bold}\n\n` +
      `${teka.soal}\n\n` +
      `{gray-fg}Ketik jawaban lalu Enter. Esc untuk kembali.{/gray-fg}`
  );
  screen.render();

  const box = createInput(" Jawabanmu ", "72%", 3);
  box.setValue("");
  box.on("submit", (value) => {
    box.destroy();
    const benar = checkJawaban(teka, value);
    const jawabanBenar = teka.jawaban[0];

    showResult(
      "Hafe Fun - Teka-Teki",
      benar
        ? `{green-fg}Benar!{/green-fg}\n\nSoal: ${teka.soal}\nJawaban kamu: ${String(value).trim()}`
        : `{red-fg}Belum tepat.{/red-fg}\n\nSoal: ${teka.soal}\nJawaban kamu: ${String(value || "-").trim()}\nJawaban benar: ${jawabanBenar}`
    );
  });
  box.key("escape", () => {
    box.destroy();
    showHome();
    menu.focus();
    screen.render();
  });
  screen.render();
}

/* =========================
   OSINT DOMAIN
========================= */

function osintDomainUI() {
  main.setContent(
    `{bold}{cyan-fg}OSINT Domain{/cyan-fg}{/bold}\n\n` +
      `Masukkan domain target (contoh: example.com).\n` +
      `Hanya data publik: DNS, subdomain dari crt.sh, dan info HTTP dasar.\n\n` +
      `{gray-fg}Enter untuk scan, Esc untuk kembali.{/gray-fg}`
  );
  screen.render();

  const box = createInput(" Domain ", "60%", 3);
  box.setValue("");
  box.on("submit", async (value) => {
    box.destroy();
    showLoading("OSINT Domain - Scan");

    try {
      const r = await scanDomain(value);

      const dnsText = Object.entries(r.dnsRecords)
        .map(([type, list]) => `${type.padEnd(6)}: ${list.length ? list.join(", ") : "-"}`)
        .join("\n");

      let subText;
      if (Array.isArray(r.subdomains)) {
        const shown = r.subdomains.slice(0, 25);
        subText = `Total: ${r.subdomains.length}\n` +
          (shown.map((s) => `  - ${s}`).join("\n") || "  -") +
          (r.subdomains.length > shown.length ? `\n  ... dan ${r.subdomains.length - shown.length} lainnya` : "");
      } else {
        subText = `  Gagal: ${r.subdomains.error}`;
      }

      const httpText = r.http.error
        ? `  Gagal: ${r.http.error}`
        : `  Status : ${r.http.status}\n  URL    : ${r.http.finalUrl}\n  Server : ${r.http.server}\n  Powered: ${r.http.poweredBy}`;

      showResult(
        "OSINT Domain - " + r.domain,
        `{cyan-fg}DNS Records:{/cyan-fg}\n${dnsText}\n\n` +
          `{cyan-fg}Subdomain (crt.sh):{/cyan-fg}\n${subText}\n\n` +
          `{cyan-fg}HTTP:{/cyan-fg}\n${httpText}`
      );
    } catch (error) {
      showResult("OSINT Domain", `{red-fg}${error.message}{/red-fg}`);
    }
  });
  box.key("escape", () => {
    box.destroy();
    showHome();
    menu.focus();
    screen.render();
  });
  screen.render();
}

/* =========================
   OSINT GMAIL
========================= */

function osintGmailUI() {
  main.setContent(
    `{bold}{cyan-fg}OSINT Gmail{/cyan-fg}{/bold}\n\n` +
      `Masukkan alamat Gmail (contoh: nama@gmail.com).\n` +
      `Hanya data publik dari Gravatar (foto dan profil yang dipasang pemiliknya).\n\n` +
      `{gray-fg}Enter untuk cari, Esc untuk kembali.{/gray-fg}`
  );
  screen.render();

  const box = createInput(" Gmail ", "60%", 3);
  box.setValue("");
  box.on("submit", async (value) => {
    box.destroy();
    showLoading("OSINT Gmail - Cari");

    try {
      const r = await scanGmail(value);

      if (!r.gravatar) {
        showResult("OSINT Gmail - " + r.email,
          "Tidak ada profil Gravatar publik untuk email ini.\n\n" +
          "{gray-fg}Cek kebocoran data lewat menu BreachGmail.{/gray-fg}");
        return;
      }

      const g = r.gravatar;
      const urlText = g.urls.length ? g.urls.map((u) => `  - ${u}`).join("\n") : "  -";
      const accText = g.accounts.length ? g.accounts.map((a) => `  - ${a}`).join("\n") : "  -";

      showResult(
        "OSINT Gmail - " + r.email,
        `{cyan-fg}Profil Gravatar:{/cyan-fg}\n` +
          `Nama    : ${g.displayName}\n` +
          `Username: ${g.username}\n` +
          `Lokasi  : ${g.location}\n` +
          `Bio     : ${g.about}\n` +
          `Profil  : ${g.profileUrl}\n` +
          `Foto    : ${g.avatarUrl}\n\n` +
          `{cyan-fg}Link:{/cyan-fg}\n${urlText}\n\n` +
          `{cyan-fg}Akun terhubung:{/cyan-fg}\n${accText}`
      );
    } catch (error) {
      showResult("OSINT Gmail", `{red-fg}${error.message}{/red-fg}`);
    }
  });
  box.key("escape", () => {
    box.destroy();
    showHome();
    menu.focus();
    screen.render();
  });
  screen.render();
}

function showHelp() {
  showResult(
    "Help",
    `{cyan-fg}Navigation{/cyan-fg}\n` +
      `↑ ↓ / j k  Navigate\n` +
      `Enter      Select\n` +
      `Esc        Back\n` +
      `Q          Exit\n\n` +
      `{cyan-fg}Features{/cyan-fg}\n` +
      `OSINT Number    : Analisis format nomor, negara, koordinat, indikasi provider, MNP, dan cek manual layanan publik.\n` +
      `Check NIK       : Analisis struktur NIK.\n` +
      `Check Kode Pos  : Cek kode pos.\n` +
      `BreachGmail     : Cek email pada database breach.\n` +
      `Scrape Website  : Ambil informasi publik.\n` +
      `Temp Email      : Email sementara.\n` +
      `Anichi          : Pencarian anime.\n` +
      `Psychology      : Cari istilah psikologi.\n` +
      `AI Assisten     : Gunakan model AI.\n` +
      `Stalker         : Cari informasi profil publik.\n` +
      `Username Checker: Periksa username di beberapa platform publik.\n` +
      `API Checker     : Cek status endpoint API yang dipakai tools.\n` +
      `IP Lookup       : Info publik IP, ISP, lokasi perkiraan, dan timezone.\n` +
      `Nmap Port Scanner: Pindai 100 port TCP umum pada satu host yang diizinkan.\n` +
      `SQLmap          : Pemeriksaan dasar SQL injection pada URL berparameter; tanpa database dumping.\n` +
      `ParamSpider     : Menemukan URL berparameter dari arsip web historis.\n` +
      `TikTok LIVE Chat: Membaca komentar LIVE publik secara real-time. Tekan Esc untuk berhenti.\n` +
      `OSINT Telegram  : Info chat publik (Chat ID / @username) lewat Bot API. Bot harus ada di grup/channel untuk jumlah member dan admin.\n` +
      `Message Telegram: Verifikasi Bot Token, lihat info bot, lalu kirim pesan ke Chat ID.\n` +
      `OSINT Gmail     : Cari profil publik Gravatar dari alamat Gmail.\n` +
      `OSINT Domain    : DNS, subdomain (crt.sh), dan info HTTP dasar dari domain publik.\n` +
      `Hafe Fun        : Teka-teki (soal MTK acak dan tebak-tebakan).\n` +
      `Custom Color Menu: Ubah warna teks/highlight menu dengan nama warna atau HEX #RRGGBB; tersimpan otomatis.\n` +
      `Obfuscator Analyzer: Analisis ukuran, SHA-256, indikasi obfuscator, dan decode statis string escape/Base64 tanpa mengeksekusi file.`
  );
}

function customColorMenuUI() {
  const input = blessed.textbox({
    parent: screen,
    top: "center",
    left: "center",
    width: "76%",
    height: 9,
    border: { type: "line" },
    label: " Custom Color Menu ",
    inputOnFocus: true,
    keys: true,
    mouse: true,
    tags: true,
    padding: { left: 1, right: 1 },
    style: {
      border: { fg: menuColor },
      focus: { border: { fg: menuColor } },
      fg: "white",
      bg: "black",
    },
  });

  input.setContent(
    `{${menuColor}-fg}Masukkan nama warna atau HEX (#RRGGBB){/${menuColor}-fg}\n\n` +
    `{gray-fg}Contoh: cyan, magenta, lightgreen, #ff0055{/gray-fg}\n` +
    `{gray-fg}Tekan Enter untuk menerapkan, Esc untuk batal.{/gray-fg}`
  );
  input.focus();
  screen.render();

  input.on("submit", (rawValue) => {
    const value = String(rawValue || "").trim();
    input.destroy();

    if (!value) {
      menu.focus();
      screen.render();
      return;
    }

    const color = normalizeMenuColor(value);
    if (!color) {
      showColorMessage(
        "Warna tidak valid. Gunakan nama warna terminal atau HEX #RRGGBB.\nContoh: cyan, magenta, lightgreen, #ff0055",
        "red"
      );
      return;
    }

    applyMenuColor(color);
    const saved = saveMenuColor(color);
    showColorMessage(
      `Warna menu diubah menjadi: ${color}\n` +
      (saved
        ? "Pengaturan disimpan dan dipakai lagi saat IyanTools dibuka kembali."
        : "Warna diterapkan, tetapi gagal disimpan ke file konfigurasi."),
      color
    );
  });

  input.key("escape", () => {
    input.destroy();
    menu.focus();
    screen.render();
  });
}

function showColorMessage(message, color = "cyan") {
  const box = blessed.box({
    parent: screen,
    top: "center",
    left: "center",
    width: "76%",
    height: 9,
    border: { type: "line" },
    label: " Custom Color Menu ",
    tags: true,
    keys: true,
    mouse: true,
    align: "center",
    valign: "middle",
    padding: { left: 1, right: 1 },
    content: `{${color}-fg}${message}{/${color}-fg}\n\n{gray-fg}Tekan Enter atau Esc untuk kembali.{/gray-fg}`,
    style: {
      border: { fg: menuColor },
      focus: { border: { fg: menuColor } },
      fg: "white",
      bg: "black",
    },
  });
  box.focus();
  screen.render();
  const close = () => {
    box.destroy();
    menu.focus();
    screen.render();
  };
  box.key(["enter", "escape", "space"], close);
}

/* =========================
   MENU EVENT
========================= */

menu.on(
  "select",
  (_, index) => {
    switch (index) {
      case 0: osintNumberUI(); break;
      case 1: osintTelegramUI(); break;
      case 2: osintDomainUI(); break;
      case 3: osintGmailUI(); break;
      case 4: checkNIKUI(); break;
      case 5: checkKodePosUI(); break;
      case 6: breachGmailUI(); break;
      case 7: scrapeWebsiteUI(); break;
      case 8: tempEmailUI(); break;
      case 9: anichiUI(); break;
      case 10: psychologyUI(); break;
      case 11: selectAIModelUI(); break;
      case 12: stalkerUI(); break;
      case 13: usernameCheckerUI(); break;
      case 14: apiCheckerUI(); break;
      case 15: ipLookupUI(); break;
      case 16: nmapPortScannerUI(); break;
      case 17: sqlmapScannerUI(); break;
      case 18: paramSpiderUI(); break;
      case 19: tiktokLiveChatUI(); break;
      case 20: telegramTokenUI(); break;
      case 21: customColorMenuUI(); break;
      case 22: obfuscatorAnalyzerUI(); break;
      case 23: hafeFunUI(); break;
      case 24: showHistory(); break;
      case 25: showHelp(); break;
      case 26:
        stopTempEmailPolling();
        process.exit(0);
        break;
    }
  }
);

menu.key("escape", () => {
  showHome();
});

screen.key(
  ["q", "C-c"],
  () => {
    stopTempEmailPolling();
    process.exit(0);
  }
);

screen.key(
  "escape",
  () => {
    if (tempEmailActive) {
      stopTempEmailPolling();
    }

    showHome();
  }
);

/* =========================================================
   VERIFICATION
========================================================= */

// Ambil ID dari command `id`.
function getTermuxID() {
  try {
    return execSync(
      "id",
      {
        encoding: "utf8",
        timeout: 3000,
      }
    ).trim();
  } catch {
    return null;
  }
}

// Sensor sebagian data.
function maskHalf(value) {
  const text =
    String(value || "");

  if (!text) {
    return "-";
  }

  const visible =
    Math.ceil(
      text.length / 2
    );

  return (
    text.slice(0, visible) +
    "*".repeat(
      Math.max(
        1,
        text.length - visible
      )
    )
  );
}

// Ambil IP publik.
async function getPublicIP() {
  try {
    const response =
      await axios.get(
        "https://api.ipify.org?format=json",
        {
          timeout: 8000,
        }
      );

    return (
      response.data?.ip ||
      "-"
    );
  } catch {
    return "-";
  }
}

/* =========================
   ACCESS DENIED
========================= */

// Tolak ID yang tidak cocok.
function showAccessDenied(
  reason
) {
  const box =
    blessed.box({
      top: "center",
      left: "center",
      width: "70%",
      height: 9,
      border: {
        type: "line",
      },
      label: " Access Denied ",
      style: {
        border: {
          fg: "red",
        },
      },
      tags: true,
      align: "center",
      valign: "middle",
      content:
        `{bold}{red-fg}✕ AKSES DITOLAK{/red-fg}{/bold}\n\n` +
        `${reason}\n\n` +
        `{gray-fg}Program akan keluar...{/gray-fg}`,
    });

  screen.append(box);

  screen.render();

  setTimeout(
    () => {
      process.exit(1);
    },
    2500
  );
}

/* =========================
   VERIFICATION RESULT
========================= */

// Tampilan ID, IP, Lanjut dan Cancel.
function showVerificationResult(
  actualID,
  ip
) {
  const box =
    blessed.box({
      top: "center",
      left: "center",
      width: "78%",
      height: 12,
      border: {
        type: "line",
      },
      label:
        " Verification Result ",
      style: {
        border: {
          fg: "green",
        },
      },
      tags: true,
      padding: {
        left: 2,
        right: 2,
        top: 1,
      },
    });

  screen.append(box);

  let idVisible = false;
  let ipVisible = false;

  /* =========================
     ID
  ========================= */

  const idButton =
    blessed.button({
      parent: box,
      top: 1,
      left: 2,
      width: "92%",
      height: 1,
      keys: true,
      mouse: true,
      tags: true,
      content: "",
      style: {
        fg: "white",
        focus: {
          fg: "black",
          bg: "cyan",
        },
      },
    });

  /* =========================
     IP
  ========================= */

  const ipButton =
    blessed.button({
      parent: box,
      top: 3,
      left: 2,
      width: "92%",
      height: 1,
      keys: true,
      mouse: true,
      tags: true,
      content: "",
      style: {
        fg: "white",
        focus: {
          fg: "black",
          bg: "cyan",
        },
      },
    });

  /* =========================
     LANJUT
  ========================= */

  const lanjut =
    blessed.button({
      parent: box,
      top: 7,
      left: 2,
      width: "42%",
      height: 1,
      keys: true,
      mouse: true,
      tags: true,
      content: "Lanjut",
      style: {
        fg: "white",
        focus: {
          fg: "black",
          bg: "cyan",
        },
      },
    });

  /* =========================
     CANCEL
  ========================= */

  const cancel =
    blessed.button({
      parent: box,
      top: 7,
      left: "52%",
      width: "40%",
      height: 1,
      keys: true,
      mouse: true,
      tags: true,
      content: "Cancel",
      style: {
        fg: "white",
        focus: {
          fg: "black",
          bg: "cyan",
        },
      },
    });

  function update() {
    idButton.setContent(
      `{cyan-fg}ID{/cyan-fg} : ${
        idVisible
          ? actualID
          : maskHalf(actualID)
      } 👁`
    );

    ipButton.setContent(
      `{cyan-fg}IP{/cyan-fg} : ${
        ipVisible
          ? ip
          : maskHalf(ip)
      } 👁`
    );

    screen.render();
  }

  /* =========================
     NAVIGATION
  ========================= */

  idButton.key(
    "down",
    () => {
      ipButton.focus();
      screen.render();
    }
  );

  idButton.key(
    "up",
    () => {
      cancel.focus();
      screen.render();
    }
  );

  ipButton.key(
    "up",
    () => {
      idButton.focus();
      screen.render();
    }
  );

  ipButton.key(
    "down",
    () => {
      lanjut.focus();
      screen.render();
    }
  );

  lanjut.key(
    "up",
    () => {
      ipButton.focus();
      screen.render();
    }
  );

  lanjut.key(
    "right",
    () => {
      cancel.focus();
      screen.render();
    }
  );

  cancel.key(
    "up",
    () => {
      ipButton.focus();
      screen.render();
    }
  );

  cancel.key(
    "left",
    () => {
      lanjut.focus();
      screen.render();
    }
  );

  cancel.key(
    "down",
    () => {
      idButton.focus();
      screen.render();
    }
  );

  /* =========================
     TOGGLE ID
  ========================= */

  idButton.on(
    "press",
    () => {
      idVisible =
        !idVisible;

      update();

      idButton.focus();
    }
  );

  /* =========================
     TOGGLE IP
  ========================= */

  ipButton.on(
    "press",
    () => {
      ipVisible =
        !ipVisible;

      update();

      ipButton.focus();
    }
  );

  /* =========================
     LANJUT
  ========================= */

  lanjut.on(
    "press",
    () => {
      box.destroy();
      showHome();
    }
  );

  /* =========================
     CANCEL
  ========================= */

  cancel.on(
    "press",
    () => {
      stopTempEmailPolling();
      process.exit(0);
    }
  );

  box.key(
    "escape",
    () => {
      box.destroy();
      process.exit(0);
    }
  );

  idButton.focus();

  update();
}

/* =========================
   VERIFY ID
========================= */

// Minta ID dan cocokkan.
function verifyID() {
  const actualID =
    getTermuxID();

  if (!actualID) {
    showAccessDenied(
      "Tidak dapat membaca ID Termux."
    );
    return;
  }

  const box =
    blessed.textbox({
      top: "center",
      left: "center",
      width: "75%",
      height: 8,
      border: {
        type: "line",
      },
      label:
        " ID Verification ",
      inputOnFocus: true,
      keys: true,
      mouse: true,
      style: {
        border: {
          fg: "cyan",
        },
        focus: {
          border: {
            fg: "cyan",
          },
        },
      },
      tags: true,
      padding: {
        left: 1,
        right: 1,
      },
    });

  screen.append(box);

  box.setContent(
    `{cyan-fg}Masukkan ID Termux{/cyan-fg}\n\n` +
      `{gray-fg}ID harus sama dengan output command: id{/gray-fg}`
  );

  box.focus();

  screen.render();

  box.on(
    "submit",
    async (value) => {
      box.destroy();

      const enteredID =
        value.trim();

      if (
        enteredID !== actualID
      ) {
        showAccessDenied(
          "ID tidak cocok dengan ID Termux."
        );
        return;
      }

      await verificationLoading(
        actualID
      );
    }
  );

  box.key(
    "escape",
    () => {
      process.exit(0);
    }
  );
}

/* =========================
   VERIFICATION LOADING
========================= */

// Loading verifikasi 4.5 detik.
async function verificationLoading(
  actualID
) {
  const loading =
    blessed.box({
      top: "center",
      left: "center",
      width: "65%",
      height: 9,
      border: {
        type: "line",
      },
      label: " Verification ",
      style: {
        border: {
          fg: "cyan",
        },
      },
      tags: true,
      align: "center",
      valign: "middle",
    });

  screen.append(loading);

  const frames = [
    "Verifikasi ID",
    "Verifikasi ID.",
    "Verifikasi ID..",
    "Verifikasi ID...",
  ];

  let index = 0;

  const start =
    Date.now();

  loading.setContent(
    `{bold}{cyan-fg}IyanTools 2.1.1{/cyan-fg}{/bold}\n\n` +
      `${frames[index]}\n\n` +
      `{gray-fg}Memeriksa koneksi...{/gray-fg}`
  );

  screen.render();

  const animation =
    setInterval(
      () => {
        index =
          (index + 1) %
          frames.length;

        loading.setContent(
          `{bold}{cyan-fg}IyanTools 2.1.1{/cyan-fg}{/bold}\n\n` +
            `${frames[index]}\n\n` +
            `{gray-fg}Memeriksa koneksi...{/gray-fg}`
        );

        screen.render();
      },
      300
    );

  const ip =
    await getPublicIP();

  const elapsed =
    Date.now() - start;

  if (elapsed < 4500) {
    await new Promise(
      (resolve) =>
        setTimeout(
          resolve,
          4500 - elapsed
        )
    );
  }

  clearInterval(animation);

  loading.destroy();

  showVerificationResult(
    actualID,
    ip
  );
}


/* =========================
   LOCAL ACCOUNTS
========================= */

// Akun disimpan lokal di folder kerja; password disimpan sebagai hash scrypt.
const ACCOUNT_FILE = path.join(process.cwd(), ".iyantools-accounts.json");
let activeAccount = null;

function readAccounts() {
  try {
    const data = JSON.parse(fs.readFileSync(ACCOUNT_FILE, "utf8"));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function saveAccounts(accounts) {
  fs.writeFileSync(ACCOUNT_FILE, JSON.stringify(accounts, null, 2), { mode: 0o600 });
  try { fs.chmodSync(ACCOUNT_FILE, 0o600); } catch {}
}

function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString("hex");
}

function safeEqualHex(a, b) {
  try {
    const left = Buffer.from(a, "hex");
    const right = Buffer.from(b, "hex");
    return left.length === right.length && crypto.timingSafeEqual(left, right);
  } catch {
    return false;
  }
}

function accountPrompt(title, label, options = {}) {
  return new Promise((resolve) => {
    const box = blessed.textbox({
      top: "center", left: "center", width: "68%", height: 8,
      border: { type: "line" }, label: ` ${title} `,
      inputOnFocus: true, keys: true, mouse: true,
      censor: Boolean(options.password),
      style: { border: { fg: "cyan" }, focus: { border: { fg: "cyan" } } },
      tags: true, padding: { left: 1, right: 1 },
    });
    screen.append(box);
    box.setContent(`{cyan-fg}${label}{/cyan-fg}\n\n{gray-fg}Enter untuk lanjut • Esc untuk kembali{/gray-fg}`);
    box.focus();
    screen.render();
    box.on("submit", (value) => {
      box.destroy(); screen.render(); resolve(String(value || "").trim());
    });
    box.key("escape", () => { box.destroy(); screen.render(); resolve(null); });
  });
}

function accountMessage(title, message, color = "yellow") {
  return new Promise((resolve) => {
    const box = blessed.box({
      top: "center", left: "center", width: "70%", height: 9,
      border: { type: "line" }, label: ` ${title} `,
      style: { border: { fg: color === "red" ? "red" : "cyan" } },
      tags: true, align: "center", valign: "middle",
      content: `{${color}-fg}${message}{/${color}-fg}\n\n{gray-fg}Tekan Enter untuk lanjut{/gray-fg}`,
      keys: true, mouse: true,
    });
    screen.append(box); box.focus(); screen.render();
    box.key(["enter", "escape", "space"], () => { box.destroy(); screen.render(); resolve(); });
  });
}

async function registerAccount() {
  const id = await accountPrompt("Register Account", "Buat Account ID (3–24 karakter: huruf, angka, _ atau -)");
  if (id === null) return accountLanding();
  if (!/^[A-Za-z0-9_-]{3,24}$/.test(id)) {
    await accountMessage("Register gagal", "Account ID tidak valid.", "red");
    return accountLanding();
  }
  const accounts = readAccounts();
  if (accounts.some((account) => account.id.toLowerCase() === id.toLowerCase())) {
    await accountMessage("Register gagal", "Account ID sudah digunakan.", "red");
    return accountLanding();
  }
  const password = await accountPrompt("Register Account", "Buat password (minimal 6 karakter)", { password: true });
  if (password === null) return accountLanding();
  if (password.length < 6) {
    await accountMessage("Register gagal", "Password minimal 6 karakter.", "red");
    return accountLanding();
  }
  const salt = crypto.randomBytes(16).toString("hex");
  accounts.push({ id, salt, passwordHash: hashPassword(password, salt), createdAt: new Date().toISOString() });
  try {
    saveAccounts(accounts);
    await accountMessage("Register berhasil", `Account ${id} berhasil dibuat. Sekarang pilih account untuk login.`, "green");
  } catch {
    await accountMessage("Register gagal", "Tidak bisa menyimpan file akun. Periksa izin folder.", "red");
  }
  accountLanding();
}

async function loginAccount(id) {
  const accounts = readAccounts();
  const account = accounts.find((item) => item.id === id);
  if (!account) return accountLanding();
  const password = await accountPrompt("Login", `Masukkan password untuk account: ${id}`, { password: true });
  if (password === null) return accountLanding();
  const candidate = hashPassword(password, account.salt);
  if (!safeEqualHex(candidate, account.passwordHash)) {
    await accountMessage("Login gagal", "Password salah.", "red");
    return accountLanding();
  }
  activeAccount = account.id;
  accountLanding(true);
}

function accountLanding(authenticated = false) {
  if (authenticated) {
    const overlays = screen.children.filter((child) => child._iyanAccountOverlay);
    for (const overlay of overlays) { try { overlay.destroy(); } catch {} }
    screen.render();
    loadingPage();
    return;
  }

  // Bersihkan overlay akun sebelumnya agar layar tidak menumpuk.
  for (const child of [...screen.children]) {
    if (child._iyanAccountOverlay) { try { child.destroy(); } catch {} }
  }
  const accounts = readAccounts();
  const options = ["+ Register account baru", ...accounts.map((account) => `Login: ${account.id}`), "Keluar"];
  const panel = blessed.box({
    top: "center", left: "center", width: "76%", height: Math.min(18, Math.max(12, options.length + 7)),
    border: { type: "line" }, label: " IyanTools • Account Center ",
    style: { border: { fg: "cyan" } }, tags: true,
    content: "{bold}{cyan-fg}IyanTools 2.1.1{/cyan-fg}{/bold}\n{gray-fg}Pilih account atau register account baru{/gray-fg}",
    padding: { left: 1, right: 1, top: 1 },
  });
  panel._iyanAccountOverlay = true;
  const list = blessed.list({
    parent: panel, top: 4, left: 1, right: 1, bottom: 1,
    width: "100%-2", height: "100%-5", items: options,
    keys: true, vi: true, mouse: true, interactive: true,
    style: {
      selected: { fg: "black", bg: "cyan", bold: true },
      item: { fg: "white" }, border: { fg: "cyan" },
    },
    scrollbar: { ch: " ", inverse: true },
  });
  list._iyanAccountOverlay = true;
  screen.append(panel);
  list.focus();
  list.on("select", (_, index) => {
    if (index === 0) return registerAccount();
    if (index === options.length - 1) {
      stopTempEmailPolling();
      process.exit(0);
    }
    const accountId = accounts[index - 1]?.id;
    if (accountId) loginAccount(accountId);
  });
  list.key("escape", () => { stopTempEmailPolling(); process.exit(0); });
  screen.render();
}


/* =========================
   START
========================= */

// Halaman awal.
function loadingPage() {
  const loading =
    blessed.box({
      top: "center",
      left: "center",
      width: "60%",
      height: 9,
      border: {
        type: "line",
      },
      style: {
        border: {
          fg: "cyan",
        },
      },
      tags: true,
      align: "center",
      valign: "middle",
    });

  screen.append(loading);

  const frames = [
    "Verifikasi ID",
    "Verifikasi ID.",
    "Verifikasi ID..",
    "Verifikasi ID...",
  ];

  let index = 0;

  loading.setContent(
    `{cyan-fg}{bold}IyanTools 2.1.1{/bold}{/cyan-fg}\n\n` +
      `{white-fg}${frames[index]}{/white-fg}`
  );

  screen.render();

  const interval =
    setInterval(
      () => {
        index =
          (index + 1) %
          frames.length;

        loading.setContent(
          `{cyan-fg}{bold}IyanTools 2.1.1{/bold}{/cyan-fg}\n\n` +
            `{white-fg}${frames[index]}{/white-fg}`
        );

        screen.render();
      },
      300
    );

  setTimeout(
    () => {
      clearInterval(interval);
      loading.destroy();

      // Verifikasi ID otomatis: ambil hasil command `id` tanpa input manual.
      const actualID = getTermuxID();
      if (!actualID) {
        showAccessDenied("Tidak dapat membaca ID perangkat.");
        return;
      }
      verificationLoading(actualID);
    },
    1000
  );
}

/* =========================
   RUN
========================= */

accountLanding();
