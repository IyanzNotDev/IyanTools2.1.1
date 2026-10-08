import axios from "axios";
import crypto from "crypto";

class TempMail {
  constructor() {
    this.domains = [
      "@gmail10p.com",
      "@oletters.com",
      "@oemails.com",
      "@oegmail.com",
      "@suiemail.com",
      "@voewo.com",
      "@yanemail.com",
    ];

    this.baseUrl =
      "https://mail-server.1timetech.com/api/email";

    this.headers = {
      "User-Agent": "okhttp/4.9.2",
      Accept: "application/json, text/plain, */*",
      "Content-Type": "application/json",
      "x-app-key":
        "f07bed4503msh719c2010df3389fp1d6048jsn411a41a84a3c",
      Connection: "Keep-Alive",
    };
  }

  _enc(obj) {
    try {
      return Buffer.from(
        JSON.stringify(obj),
        "utf8"
      )
        .toString("base64")
        .split("")
        .reverse()
        .join("");
    } catch {
      return "";
    }
  }

  _dec(str) {
    try {
      const reversed = String(str || "")
        .split("")
        .reverse()
        .join("");

      return JSON.parse(
        Buffer.from(
          reversed,
          "base64"
        ).toString("utf8")
      );
    } catch {
      return {};
    }
  }

  _snake(obj) {
    if (Array.isArray(obj)) {
      return obj.map((v) => this._snake(v));
    }

    if (
      obj !== null &&
      typeof obj === "object"
    ) {
      return Object.keys(obj).reduce(
        (acc, key) => {
          const snakeKey = key.replace(
            /[A-Z]/g,
            (letter) =>
              `_${letter.toLowerCase()}`
          );

          acc[snakeKey] = this._snake(
            obj[key]
          );

          return acc;
        },
        {}
      );
    }

    return obj;
  }

  _random(min, max) {
    return crypto.randomInt(
      min,
      max + 1
    );
  }

  _syllable() {
    const kon = "bdjklmnprst";
    const vok = "aiueo";

    return (
      kon[this._random(0, kon.length - 1)] +
      vok[this._random(0, vok.length - 1)]
    );
  }

  _generateName() {
    const count = this._random(2, 8);
    let name = "";

    for (let i = 0; i < count; i++) {
      name += this._syllable();
    }

    return (
      name.charAt(0).toUpperCase() +
      name.slice(1)
    );
  }

  async create({ name, ...rest } = {}) {
    try {
      const fixName =
        name ||
        this._generateName().toLowerCase() +
          this._random(100, 1000);

      const fixDomain =
        this.domains[
          this._random(
            0,
            this.domains.length - 1
          )
        ];

      const email =
        `${fixName}${fixDomain}`;

      const payload = this._enc({
        email,
        ...rest,
      });

      const response = await axios.post(
        this.baseUrl,
        {
          data: payload,
        },
        {
          headers: this.headers,
          timeout: 15000,
        }
      );

      const decoded = this._dec(
        response.data?.data
      );

      return {
        status: true,
        email,
        result: this._snake(decoded),
      };
    } catch (error) {
      return {
        status: false,
        result:
          error?.response?.data ||
          error?.message ||
          "Gagal membuat email.",
      };
    }
  }

  async message({ email } = {}) {
    try {
      const safeEmail = String(email || "")
        .replace(/@/g, "_")
        .replace(/\./g, "_");

      const params = this._enc({});

      const listUrl =
        `${this.baseUrl}/${safeEmail}/messages` +
        `?params=${params}`;

      const listRes = await axios.get(
        listUrl,
        {
          headers: this.headers,
          timeout: 15000,
        }
      );

      const messages = this._dec(
        listRes.data?.data || "[]"
      );

      const fullMessages = [];

      if (!Array.isArray(messages)) {
        return {
          status: true,
          result: [],
        };
      }

      for (const msg of messages) {
        const id = msg?.id;

        if (!id) continue;

        const detailUrl =
          `${this.baseUrl}/${safeEmail}/messages/${id}` +
          `?params=${params}`;

        try {
          const detailRes =
            await axios.get(
              detailUrl,
              {
                headers: this.headers,
                timeout: 15000,
              }
            );

          const detail =
            this._dec(
              detailRes.data?.data
            );

          fullMessages.push(detail);
        } catch {
          // Skip pesan yang detail-nya gagal
        }
      }

      return {
        status: true,
        result: this._snake(
          fullMessages
        ),
      };
    } catch (error) {
      return {
        status: false,
        result:
          error?.response?.data ||
          error?.message ||
          "Gagal mengambil inbox.",
      };
    }
  }
}

function extractContent(message) {
  if (!message || typeof message !== "object") {
    return "";
  }

  const fields = [
    "text_body",
    "textBody",
    "body",
    "content",
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
    const value = message[field];

    if (
      typeof value === "string" &&
      value.trim()
    ) {
      return value.trim();
    }
  }

  return "";
}

function normalizeMessage(message) {
  if (!message || typeof message !== "object") {
    return message;
  }

  return {
    ...message,

    from:
      message.from ||
      message.sender ||
      message.sender_email ||
      message.senderEmail ||
      "Unknown",

    subject:
      message.subject ||
      message.title ||
      "No Subject",

    content: extractContent(message),
  };
}

export async function createTempEmail(
  name = ""
) {
  const mailer = new TempMail();

  return mailer.create({
    ...(name ? { name } : {}),
  });
}

export async function checkTempEmail(
  email
) {
  const mailer = new TempMail();

  const result =
    await mailer.message({
      email,
    });

  if (
    result?.status &&
    Array.isArray(result.result)
  ) {
    result.result =
      result.result.map(
        normalizeMessage
      );
  }

  return result;
}
