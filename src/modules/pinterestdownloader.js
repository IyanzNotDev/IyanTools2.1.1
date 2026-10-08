import axios from "axios";
import fs from "fs";
import path from "path";
import { pipeline } from "stream/promises";

function cleanText(value = "") {
  return String(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function extractAttr(html, pattern) {
  const match = html.match(pattern);
  return match?.[1] || "";
}

function absoluteUrl(value, base) {
  if (!value) return "";
  try {
    return new URL(value, base).href;
  } catch {
    return "";
  }
}

function safeFilename(value) {
  return cleanText(value || "Pinterest Video")
    .replace(/[\\/:*?"<>|\x00-\x1F]/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120) || "Pinterest Video";
}

function validatePinterestUrl(input) {
  let url;
  try {
    url = new URL(String(input || "").trim());
  } catch {
    throw new Error("URL Pinterest tidak valid.");
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("URL harus menggunakan http atau https.");
  }

  const host = url.hostname.toLowerCase();
  if (!(host === "pinterest.com" || host.endsWith(".pinterest.com") || host === "pin.it" || host.endsWith(".pin.it"))) {
    throw new Error("URL harus berasal dari Pinterest atau pin.it.");
  }

  return url.href;
}

export async function pinterestDownloader(input) {
  const url = validatePinterestUrl(input);
  const headers = {
    "User-Agent": "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/140 Mobile Safari/537.36",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  };

  const response = await axios.get(url, {
    headers,
    timeout: 20000,
    maxRedirects: 5,
    responseType: "text",
    validateStatus: (status) => status >= 200 && status < 400,
  });

  const html = response.data || "";
  const base = response.request?.res?.responseUrl || url;

  // Pinterest pages commonly expose video URLs in JSON/meta data.
  const videoCandidates = [
    extractAttr(html, /property=["']og:video["'][^>]*content=["']([^"']+)["']/i),
    extractAttr(html, /content=["']([^"']+)["'][^>]*property=["']og:video["']/i),
    extractAttr(html, /<meta[^>]+name=["']twitter:player:stream["'][^>]+content=["']([^"']+)["']/i),
    extractAttr(html, /<video[^>]+src=["']([^"']+)["']/i),
    extractAttr(html, /"url":"(https?:\/\/[^"\\]+?\.(?:mp4|m3u8)[^"\\]*)"/i),
    extractAttr(html, /"contentUrl":"(https?:\/\/[^"\\]+?\.(?:mp4|m3u8)[^"\\]*)"/i),
  ].map((item) => absoluteUrl(item.replace(/\\\//g, "/"), base)).filter(Boolean);

  const uniqueVideos = [...new Set(videoCandidates)];
  const videoUrl = uniqueVideos.find((item) => /\.mp4(?:[?#]|$)/i.test(item)) || uniqueVideos[0];

  const title = cleanText(
    extractAttr(html, /property=["']og:title["'][^>]*content=["']([^"']*)["']/i) ||
    extractAttr(html, /content=["']([^"']*)["'][^>]*property=["']og:title["']/i)
  );

  const author = cleanText(
    extractAttr(html, /property=["']article:author["'][^>]*content=["']([^"']*)["']/i) ||
    extractAttr(html, /name=["']author["'][^>]*content=["']([^"']*)["']/i)
  );

  if (!videoUrl) {
    throw new Error("Video tidak ditemukan pada halaman Pinterest. Pin mungkin hanya berisi gambar atau halaman sudah berubah.");
  }

  if (/\.m3u8(?:[?#]|$)/i.test(videoUrl)) {
    throw new Error("Pinterest memberikan stream HLS (.m3u8), bukan file MP4 langsung. Downloader ini belum mengonversi HLS.");
  }

  return {
    title: title || "Pinterest Video",
    author: author || "-",
    source: "Pinterest",
    videoUrl,
    originalUrl: url,
  };
}

export async function downloadPinterestVideo(result, outputDir = path.resolve("downloads", "pinterest")) {
  if (!result?.videoUrl) {
    throw new Error("URL video Pinterest tidak tersedia.");
  }

  await fs.promises.mkdir(outputDir, { recursive: true });

  const filename = `${safeFilename(result.title)}.mp4`;
  const filePath = path.join(outputDir, filename);

  const response = await axios.get(result.videoUrl, {
    responseType: "stream",
    timeout: 30000,
    maxRedirects: 5,
    headers: {
      "User-Agent": "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/140 Mobile Safari/537.36",
      Referer: result.originalUrl,
    },
    validateStatus: (status) => status >= 200 && status < 400,
  });

  const contentType = String(response.headers["content-type"] || "").toLowerCase();
  if (contentType && !contentType.includes("video") && !contentType.includes("octet-stream")) {
    throw new Error(`Server tidak mengirim video (Content-Type: ${contentType}).`);
  }

  try {
    await pipeline(response.data, fs.createWriteStream(filePath));
  } catch (error) {
    await fs.promises.rm(filePath, { force: true }).catch(() => {});
    throw error;
  }

  const stat = await fs.promises.stat(filePath);
  if (!stat.size) {
    await fs.promises.rm(filePath, { force: true }).catch(() => {});
    throw new Error("File video kosong.");
  }

  return { path: filePath, size: stat.size };
}
