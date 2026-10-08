import axios from "axios";

const API = "https://api.xposedornot.com/v1/check-email";

export async function checkBreach(email) {
  const value = String(email || "").trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return {
      valid: false,
      found: false,
      email: value,
      breaches: [],
      message: "Format email tidak valid.",
    };
  }

  try {
    const response = await axios.get(
      `${API}/${encodeURIComponent(value)}`,
      {
        timeout: 15000,
        headers: {
          Accept: "application/json",
          "User-Agent": "IyanTools/2.1.1 (email breach lookup)",
        },
        validateStatus: (status) => status >= 200 && status < 500,
      }
    );

    if (response.status === 403) {
      throw new Error(
        "API mengembalikan HTTP 403 (akses ditolak). Ini biasanya pembatasan dari layanan/API atau jaringan; bukan berarti email aman. Coba lagi nanti atau gunakan layanan resmi lain."
      );
    }

    if (response.status === 429) {
      throw new Error(
        "API membatasi permintaan (HTTP 429). Tunggu sebelum mencoba lagi; jangan melakukan retry berulang."
      );
    }

    if (response.status >= 400) {
      throw new Error(
        `API mengembalikan HTTP ${response.status}. Email belum bisa diverifikasi.`
      );
    }

    const data = response.data;

    if (data?.Error === "Not found" || !data?.breaches || data.breaches.length === 0) {
      return {
        valid: true,
        found: false,
        email: value,
        breaches: [],
        message: "Email tidak ditemukan pada database breach yang diperiksa.",
      };
    }

    const breaches = [
      ...new Set(
        data.breaches
          .flat(Infinity)
          .filter((item) => typeof item === "string" && item.trim())
      ),
    ];

    return {
      valid: true,
      found: breaches.length > 0,
      email: value,
      breaches,
      message: `Email ditemukan pada ${breaches.length} sumber breach.`,
    };
  } catch (error) {
    if (error?.response?.status === 403) {
      throw new Error(
        "API mengembalikan HTTP 403 (akses ditolak). Ini biasanya pembatasan dari layanan/API atau jaringan; bukan berarti email aman."
      );
    }

    if (error?.response?.status === 429) {
      throw new Error(
        "API membatasi permintaan (HTTP 429). Tunggu sebelum mencoba lagi."
      );
    }

    throw new Error(
      error?.message || "Gagal menghubungi breach API."
    );
  }
}
