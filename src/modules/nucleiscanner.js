import { execFile } from "node:child_process";

function normalizeTarget(input) {
  const raw = String(input || "").trim();
  if (!raw || raw.length > 2048 || /[\s\r\n]/.test(raw)) {
    throw new Error("Masukkan satu domain, IP, atau URL saja.");
  }
  if (raw.startsWith("-")) throw new Error("Target tidak valid.");

  let candidate = raw;
  if (!/^https?:\/\//i.test(candidate)) candidate = `https://${candidate}`;

  let parsed;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new Error("Format target tidak valid. Contoh: https://example.com");
  }
  if (!["http:", "https:"].includes(parsed.protocol) || !parsed.hostname || parsed.username || parsed.password) {
    throw new Error("Gunakan URL HTTP/HTTPS atau domain/IP yang valid.");
  }
  if (parsed.hostname.includes("/") || parsed.hostname.startsWith("-")) {
    throw new Error("Hostname tidak valid.");
  }
  return parsed.toString();
}

export function scanNuclei(input) {
  let target;
  try {
    target = normalizeTarget(input);
  } catch (error) {
    return Promise.reject(error);
  }

  return new Promise((resolve, reject) => {
    const args = [
      "-u", target,
      "-severity", "critical,high,medium",
      "-rl", "5",
      "-c", "5",
      "-timeout", "5",
      "-retries", "1",
      "-silent",
      "-no-interactsh",
      "-exclude-tags", "dos,fuzz,intrusive,bruteforce",
    ];

    execFile(
      "nuclei",
      args,
      { timeout: 10 * 60 * 1000, maxBuffer: 4 * 1024 * 1024, windowsHide: true },
      (error, stdout, stderr) => {
        const output = [stdout, stderr].filter(Boolean).join("\n").trim();
        if (error) {
          if (error.code === "ENOENT") {
            reject(new Error("Nuclei belum terpasang atau tidak ada di PATH. Install Nuclei terlebih dahulu."));
            return;
          }
          if (error.killed) {
            reject(new Error("Scan melewati batas waktu 10 menit. Coba lagi atau periksa koneksi/target."));
            return;
          }
          if (output) {
            resolve({ target, output, exitCode: error.code ?? error.signal ?? 1 });
            return;
          }
          reject(new Error(String(error.message || "Scan Nuclei gagal.")));
          return;
        }
        resolve({ target, output: output || "Tidak ada temuan pada template/severity yang dipilih. Ini bukan jaminan target bebas kerentanan.", exitCode: 0 });
      }
    );
  });
}
