// src/modules/kodepos.js

import axios from "axios";

const API = "https://iyanzinotdev.vercel.app/api/kodepos";

export async function checkKodePos(input) {
  const kodepos = String(input).replace(/\D/g, "");

  if (!/^\d{5}$/.test(kodepos)) {
    return {
      valid: false,
      message: "Kode pos harus terdiri dari 5 digit.",
    };
  }

  try {
    const response = await axios.get(API, {
      params: {
        kodepos,
      },
      timeout: 15000,
    });

    const data = response.data;

    return {
      valid: true,
      kodepos,
      data,
    };
  } catch (error) {
    return {
      valid: false,
      kodepos,
      message:
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "Gagal menghubungi API kode pos.",
    };
  }
}
