import axios from "axios";
import { isIP } from "node:net";

/**
 * Looks up public IP metadata using ipwho.is.
 * Pass an empty string to look up the current public IP.
 */
export async function lookupIP(input = "") {
  const ip = String(input || "").trim();

  if (ip && isIP(ip) === 0) {
    return {
      success: false,
      message: "Format IP tidak valid. Masukkan IPv4/IPv6 atau kosongkan untuk IP publik sendiri.",
    };
  }

  const url = ip
    ? `https://ipwho.is/${encodeURIComponent(ip)}`
    : "https://ipwho.is/";

  const response = await axios.get(url, {
    timeout: 12000,
    headers: { Accept: "application/json", "User-Agent": "IyanTools/2.1.1" },
    validateStatus: (status) => status >= 200 && status < 500,
  });

  const data = response.data;
  if (response.status < 200 || response.status >= 300 || !data || data.success === false) {
    return {
      success: false,
      message: data?.message || `Layanan lookup merespons HTTP ${response.status}. IP privat/lokal tidak dapat dicari lewat layanan publik.`,
    };
  }

  return { success: true, data };
}
