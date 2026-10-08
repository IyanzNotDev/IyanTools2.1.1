// OSINT Gmail: hanya data publik yang memang bisa diakses.
// Gravatar: foto dan profil publik yang dipasang pemilik email di gravatar.com.
// Catatan: Gmail tidak punya profil publik, jadi data yang bisa didapat terbatas.
import crypto from "node:crypto";
import axios from "axios";

export function normalizeGmail(input) {
  const email = String(input || "").trim().toLowerCase();

  if (!/^[a-z0-9._%+-]{3,}@(gmail\.com|googlemail\.com)$/.test(email)) {
    throw new Error("Masukkan alamat Gmail yang valid. Contoh: nama@gmail.com");
  }
  return email;
}

export async function getGravatar(email) {
  const hash = crypto.createHash("md5").update(email).digest("hex");

  const res = await axios.get(`https://www.gravatar.com/${hash}.json`, {
    timeout: 10000,
    validateStatus: (s) => s === 200 || s === 404,
  });

  if (res.status === 404) return null;

  const entry = res.data?.entry?.[0] || {};
  return {
    hash,
    profileUrl: `https://gravatar.com/${hash}`,
    avatarUrl: `https://www.gravatar.com/avatar/${hash}?s=200`,
    displayName: entry.displayName || "-",
    username: entry.preferredUsername || "-",
    about: entry.aboutMe || "-",
    location: entry.currentLocation || "-",
    urls: (entry.urls || []).map((u) => u.value),
    accounts: (entry.accounts || []).map((a) => `${a.shortname}: ${a.url}`),
  };
}

export async function scanGmail(input) {
  const email = normalizeGmail(input);
  const gravatar = await getGravatar(email);
  return { email, gravatar };
}
