import fs from "fs";
import path from "path";
import crypto from "crypto";

const MAX_BYTES = 20 * 1024 * 1024;

function formatSize(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(2)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(2)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
}

function readable(s) {
  if (!s || s.length < 3) return false;
  const printable = s.replace(/[^\x20-\x7E\t\r\n]/g, "").length;
  return printable / s.length >= 0.85;
}

function decodeEscapes(s) {
  try {
    return s
      .replace(/\\x([0-9a-fA-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
      .replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
  } catch { return null; }
}

function decodeBase64(s) {
  const x = s.replace(/\s+/g, "");
  if (x.length < 8 || x.length % 4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(x)) return null;
  try {
    const out = Buffer.from(x, "base64").toString("utf8");
    return readable(out) ? out : null;
  } catch { return null; }
}

function detectTypes(text, ext) {
  const types = [];
  const add = (label, note) => types.push({ label, note });

  if (/eval\s*\(|Function\s*\(/i.test(text))
    add("Dynamic code execution", "Ditemukan pola eval() atau Function().");
  if (/atob\s*\(|btoa\s*\(/i.test(text))
    add("Base64 JavaScript API", "Ditemukan penggunaan atob()/btoa().");
  if (/(?:\\x[0-9a-fA-F]{2}){3,}/.test(text))
    add("Hex escape strings", "Ditemukan rangkaian escape \\xNN.");
  if (/(?:\\u[0-9a-fA-F]{4}){2,}/.test(text))
    add("Unicode escape strings", "Ditemukan rangkaian escape \\uNNNN.");
  if (/fromCharCode\s*\(|fromCodePoint\s*\(/i.test(text))
    add("Character-code construction", "Ditemukan konstruksi string menggunakan kode karakter.");
  if (ext === ".js" && /_0x[a-f0-9]{3,}/i.test(text))
    add("Hex-style JavaScript identifiers", "Ditemukan identifier bergaya _0x....");
  if (/javascript-obfuscator|obfuscator\.io|jscrambler/i.test(text))
    add("Known obfuscator markers", "Ditemukan marker tool obfuscation.");
  if (/(?:^|[^A-Za-z])(?:[A-Za-z0-9+/]{80,}={0,2})(?:[^A-Za-z]|$)/.test(text))
    add("Long Base64-like string", "Ditemukan string panjang yang menyerupai Base64.");

  if (!types.length)
    add("Tidak ada indikasi kuat", "Tidak ditemukan pola heuristik umum.");
  return types;
}

function decodeCommonStrings(text) {
  const out = [];
  const seen = new Set();
  const push = (kind, value) => {
    value = String(value || "").trim();
    if (!value || value.length < 3 || !readable(value)) return;
    const key = `${kind}:${value}`;
    if (seen.has(key) || out.length >= 8) return;
    seen.add(key);
    out.push({ kind, decoded: value });
  };

  for (const m of text.matchAll(/(?:\\x[0-9a-fA-F]{2}|\\u[0-9a-fA-F]{4}){3,}/g)) {
    push("escape", decodeEscapes(m[0]));
    if (out.length >= 8) return out;
  }

  for (const m of text.matchAll(/["'`]([A-Za-z0-9+/]{8,}={0,2})["'`]/g)) {
    push("base64", decodeBase64(m[1]));
    if (out.length >= 8) return out;
  }

  for (const m of text.matchAll(/(?:String\s*\.\s*)?fromCharCode\s*\(([0-9,\s]{3,})\)/gi)) {
    try {
      push("charCode", m[1].split(",").map(x => Number(x.trim()))
        .filter(x => Number.isInteger(x) && x >= 0 && x <= 0x10ffff)
        .map(x => String.fromCodePoint(x)).join(""));
    } catch {}
    if (out.length >= 8) break;
  }
  return out;
}

export async function analyzeObfuscatedFile(filePath) {
  const input = String(filePath || "").trim();
  if (!input) throw new Error("Path file tidak boleh kosong.");

  const absolutePath = path.resolve(input);
  let stat;
  try { stat = await fs.promises.stat(absolutePath); }
  catch { throw new Error(`File tidak ditemukan: ${absolutePath}`); }

  if (!stat.isFile()) throw new Error("Path yang diberikan bukan file.");

  const hash = crypto.createHash("sha256");
  const stream = fs.createReadStream(absolutePath);
  for await (const chunk of stream) hash.update(chunk);

  const bytes = stat.size;
  const sha256 = hash.digest("hex");
  const extension = path.extname(absolutePath).toLowerCase();

  let lines = null, types = [], decoded = [], reportPath = null;

  if (bytes <= MAX_BYTES) {
    const text = (await fs.promises.readFile(absolutePath)).toString("utf8");
    lines = text.length ? text.split(/\r?\n/).length : 0;
    const sample = text.slice(0, 2 * 1024 * 1024);
    types = detectTypes(sample, extension);
    decoded = decodeCommonStrings(sample);

    const report = {
      file: path.basename(absolutePath),
      path: absolutePath,
      extension: extension || null,
      bytes,
      size: formatSize(bytes),
      sha256,
      modified: stat.mtime.toISOString(),
      lines,
      types,
      decoded,
      generatedAt: new Date().toISOString(),
      note: "Static analysis only. The analyzed file was not executed."
    };

    reportPath = path.join(path.dirname(absolutePath),
      `${path.basename(absolutePath)}.obfuscator-report.json`);
    try {
      await fs.promises.writeFile(reportPath, JSON.stringify(report, null, 2), "utf8");
    } catch { reportPath = null; }
  }

  return {
    name: path.basename(absolutePath),
    path: absolutePath,
    extension,
    size: formatSize(bytes),
    bytes,
    lines,
    sha256,
    modified: stat.mtime.toISOString(),
    types,
    decoded,
    reportPath
  };
}
