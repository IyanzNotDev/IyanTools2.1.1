import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

function normalizeDomain(input) {
  let value = String(input || "").trim();
  if (!value) throw new Error("Masukkan domain atau URL target yang valid.");
  if (value.length > 2048 || /[\s\r\n\\]/.test(value)) {
    throw new Error("Input URL mengandung spasi atau karakter yang tidak valid.");
  }

  // Accept either a bare domain or a complete HTTP(S) URL, then pass only
  // the hostname to ParamSpider (it expects a domain, not a URL path/query).
  let hostname;
  if (/^https?:\/\//i.test(value)) {
    let parsed;
    try {
      parsed = new URL(value);
    } catch {
      throw new Error("URL tidak valid. Masukkan domainanda.id atau https://domainanda.id/path.");
    }
    if (!/^https?:$/.test(parsed.protocol) || parsed.username || parsed.password) {
      throw new Error("Gunakan URL HTTP/HTTPS tanpa username atau password.");
    }
    hostname = parsed.hostname;
  } else {
    // A pasted domain with a path/query is normalized by taking its host part.
    value = value.replace(/^\/\//, "");
    hostname = value.split(/[/?#]/, 1)[0];
    if (hostname.includes("@")) throw new Error("Format domain tidak valid.");
    // Strip an optional port for host:port input.
    if (/^[^:]+:\d+$/.test(hostname)) hostname = hostname.replace(/:\d+$/, "");
  }

  hostname = String(hostname || "").toLowerCase().replace(/\.$/, "");
  if (hostname.startsWith("www.")) hostname = hostname.slice(4);
  const valid = hostname.length <= 253 && /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(hostname);
  if (!valid) throw new Error("Domain tidak valid. Masukkan domain publik, misalnya domainanda.id.");
  return hostname;
}

export async function scanParamSpider(input) {
  const domain = normalizeDomain(input);
  const outputDir = path.resolve(process.cwd(), "output", "paramspider");
  await fs.mkdir(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, `${domain}.txt`);

  try {
    const { stdout, stderr } = await new Promise((resolve, reject) => {
      execFile(
        "paramspider",
        ["-d", domain, "-o", outputPath],
        { timeout: 4 * 60 * 1000, maxBuffer: 4 * 1024 * 1024, windowsHide: true },
        (error, stdout, stderr) => {
          if (error) {
            error.scanOutput = [stdout, stderr].filter(Boolean).join("\n").trim();
            reject(error);
            return;
          }
          resolve({ stdout: stdout || "", stderr: stderr || "" });
        }
      );
    });

    let fileOutput = "";
    try {
      fileOutput = await fs.readFile(outputPath, "utf8");
    } catch {
      const candidates = [
        path.join(process.cwd(), "output", `${domain}.txt`),
        path.join(process.cwd(), "output", path.basename(outputPath)),
      ];
      for (const candidate of candidates) {
        try {
          fileOutput = await fs.readFile(candidate, "utf8");
          break;
        } catch {}
      }
    }

    const rawOutput = (fileOutput || [stdout, stderr].filter(Boolean).join("\n")).trim();
    const urls = [...new Set(rawOutput.split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => /^https?:\/\//i.test(line) && line.includes("?")))];
    const finalOutput = urls.length ? urls.join("\n") : (rawOutput || "Tidak ada URL berparameter yang ditemukan.");
    return { domain, count: urls.length, output: finalOutput, outputPath };
  } catch (error) {
    if (error?.code === "ENOENT") {
      throw new Error("ParamSpider belum terpasang atau tidak ada di PATH. Repo: https://github.com/devanshbatham/ParamSpider");
    }
    if (error?.killed) throw new Error("ParamSpider melewati batas waktu 4 menit.");
    throw new Error(String(error?.scanOutput || error?.message || "Pencarian gagal.").slice(0, 1200));
  }
}
