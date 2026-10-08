const providers = {
  Telkomsel: [
    "0811",
    "0812",
    "0813",
    "0821",
    "0822",
    "0823",
    "0851",
    "0852",
    "0853",
  ],

  Indosat: [
    "0814",
    "0815",
    "0816",
    "0855",
    "0856",
    "0857",
    "0858",
  ],

  XL: [
    "0817",
    "0818",
    "0819",
    "0859",
    "0877",
    "0878",
  ],

  AXIS: [
    "0831",
    "0832",
    "0833",
    "0838",
  ],

  Tri: [
    "0895",
    "0896",
    "0897",
    "0898",
    "0899",
  ],

  Smartfren: [
    "0881",
    "0882",
    "0883",
    "0884",
    "0885",
    "0886",
    "0887",
    "0888",
    "0889",
  ],
};

function normalizeNumber(input) {
  let number = String(input).trim();

  number = number.replace(/[\s-]/g, "");

  if (number.startsWith("+62")) {
    number = "0" + number.slice(3);
  }

  if (number.startsWith("62")) {
    number = "0" + number.slice(2);
  }

  return number;
}

export function checkProvider(input) {
  const number = normalizeNumber(input);

  if (!/^08\d{8,12}$/.test(number)) {
    return {
      valid: false,
      provider: null,
      number,
      message: "Format nomor Indonesia tidak valid.",
    };
  }

  const prefix = number.slice(0, 4);

  for (const [provider, prefixes] of Object.entries(providers)) {
    if (prefixes.includes(prefix)) {
      return {
        valid: true,
        provider,
        prefix,
        number,
        message: `Nomor terdeteksi sebagai ${provider}.`,
      };
    }
  }

  return {
    valid: true,
    provider: "Tidak diketahui",
    prefix,
    number,
    message: "Prefix tidak ditemukan dalam database lokal.",
  };
}
