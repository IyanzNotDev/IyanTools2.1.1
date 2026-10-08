import { execFile } from "node:child_process";

function validateTarget(input) {
  const raw = String(input || "").trim();
  if (!raw || raw.length > 2048 || /[\s\r\n]/.test(raw) || raw.startsWith("-")) {
    throw new Error("Masukkan satu URL HTTP/HTTPS yang valid, tanpa spasi.");
  }

  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error("URL harus lengkap, contoh: https://localhost/item.php?id=1");
  }
  if (!["http:", "https:"].includes(parsed.protocol) || !parsed.hostname || parsed.username || parsed.password) {
    throw new Error("Gunakan URL HTTP/HTTPS tanpa username/password.");
  }
  if (!parsed.search || parsed.search === "?") {
    throw new Error("URL harus memiliki parameter untuk diuji, contoh: https://localhost/item.php?id=1");
  }
  return parsed.toString();
}

export function scanSqlmap(input) {
  let target;
  try {
    target = validateTarget(input);
  } catch (error) {
    return Promise.reject(error);
  }

  return new Promise((resolve, reject) => {
    // Conservative detection only: no database enumeration, dumping, file access,
    // OS shell, crawling, forms, or tamper scripts.
    const args = [
      "-u", target,
      "--batch",
      "--smart",
      "--level=1",
      "--risk=1",
      "--threads=1",
      "--timeout=5",
      "--retries=0",
      "--technique=BEUSTQ",
      "--disable-coloring",
    ];

    execFile(
      "sqlmap",
      args,
      { timeout: 5 * 60 * 1000, maxBuffer: 4 * 1024 * 1024, windowsHide: true },
      (error, stdout, stderr) => {
        const output = [stdout, stderr].filter(Boolean).join("\n").trim();
        if (error?.code === "ENOENT") {
          reject(new Error("SQLmap belum terpasang atau tidak ada di PATH. Termux: pkg install sqlmap | Debian/Ubuntu: apt install sqlmap"));
          return;
        }
        if (error?.killed) {
          reject(new Error("Pemeriksaan melewati batas waktu 5 menit."));
          return;
        }
        if (error && !output) {
          reject(new Error(String(error.message || "Pemeriksaan SQLmap gagal.")));
          return;
        }
        resolve({ target, output: output || "SQLmap selesai tanpa output yang bisa ditampilkan.", exitCode: error?.code ?? 0 });
      }
    );
  });
}
