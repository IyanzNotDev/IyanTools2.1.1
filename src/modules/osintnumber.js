// OSINT Number: analisis metadata nomor telepon tanpa mencoba mengakses akun pribadi.
// Provider yang ditampilkan untuk Indonesia adalah indikasi berdasarkan prefix.
// MNP tidak bisa dipastikan hanya dari prefix; hasil porting aktual memerlukan data operator/HLR.

const COUNTRY_DATA = [
  { code: "+1", country: "Amerika Serikat / Kanada (NANP)", coordinates: [39.0, -98.0] },
  { code: "+7", country: "Rusia / Kazakhstan", coordinates: [61.5, 105.3] },
  { code: "+20", country: "Mesir", coordinates: [26.8, 30.8] },
  { code: "+27", country: "Afrika Selatan", coordinates: [-30.6, 22.9] },
  { code: "+30", country: "Yunani", coordinates: [39.1, 21.8] },
  { code: "+31", country: "Belanda", coordinates: [52.1, 5.3] },
  { code: "+32", country: "Belgia", coordinates: [50.8, 4.4] },
  { code: "+33", country: "Prancis", coordinates: [46.2, 2.2] },
  { code: "+34", country: "Spanyol", coordinates: [40.5, -3.7] },
  { code: "+36", country: "Hungaria", coordinates: [47.2, 19.5] },
  { code: "+39", country: "Italia", coordinates: [41.9, 12.6] },
  { code: "+40", country: "Rumania", coordinates: [45.9, 24.9] },
  { code: "+41", country: "Swiss", coordinates: [46.8, 8.2] },
  { code: "+43", country: "Austria", coordinates: [47.5, 14.6] },
  { code: "+44", country: "Britania Raya", coordinates: [55.4, -3.4] },
  { code: "+45", country: "Denmark", coordinates: [56.0, 10.0] },
  { code: "+46", country: "Swedia", coordinates: [60.1, 18.6] },
  { code: "+47", country: "Norwegia", coordinates: [60.5, 8.5] },
  { code: "+48", country: "Polandia", coordinates: [52.1, 19.4] },
  { code: "+49", country: "Jerman", coordinates: [51.2, 10.5] },
  { code: "+51", country: "Peru", coordinates: [-9.2, -75.0] },
  { code: "+52", country: "Meksiko", coordinates: [23.6, -102.5] },
  { code: "+53", country: "Kuba", coordinates: [21.5, -77.8] },
  { code: "+54", country: "Argentina", coordinates: [-38.4, -63.6] },
  { code: "+55", country: "Brasil", coordinates: [-14.2, -51.9] },
  { code: "+56", country: "Chili", coordinates: [-33.4, -70.7] },
  { code: "+57", country: "Kolombia", coordinates: [4.6, -74.1] },
  { code: "+58", country: "Venezuela", coordinates: [7.1, -66.6] },
  { code: "+60", country: "Malaysia", coordinates: [4.2, 101.9] },
  { code: "+61", country: "Australia", coordinates: [-25.3, 133.8] },
  { code: "+62", country: "Indonesia", coordinates: [-2.5, 118.0] },
  { code: "+63", country: "Filipina", coordinates: [12.9, 121.8] },
  { code: "+64", country: "Selandia Baru", coordinates: [-40.9, 174.9] },
  { code: "+65", country: "Singapura", coordinates: [1.35, 103.82] },
  { code: "+66", country: "Thailand", coordinates: [15.9, 100.99] },
  { code: "+81", country: "Jepang", coordinates: [36.2, 138.3] },
  { code: "+82", country: "Korea Selatan", coordinates: [35.9, 127.8] },
  { code: "+84", country: "Vietnam", coordinates: [14.1, 108.3] },
  { code: "+86", country: "Tiongkok", coordinates: [35.9, 104.2] },
  { code: "+90", country: "Turki", coordinates: [38.9, 35.2] },
  { code: "+91", country: "India", coordinates: [22.6, 79.0] },
  { code: "+92", country: "Pakistan", coordinates: [30.4, 69.3] },
  { code: "+93", country: "Afganistan", coordinates: [33.9, 67.7] },
  { code: "+94", country: "Sri Lanka", coordinates: [7.9, 80.8] },
  { code: "+95", country: "Myanmar", coordinates: [21.9, 95.9] },
  { code: "+98", country: "Iran", coordinates: [32.4, 53.7] },
  { code: "+971", country: "Uni Emirat Arab", coordinates: [24.0, 54.0] },
  { code: "+972", country: "Israel", coordinates: [31.0, 35.0] },
  { code: "+973", country: "Bahrain", coordinates: [26.0, 50.5] },
  { code: "+974", country: "Qatar", coordinates: [25.4, 51.2] },
  { code: "+966", country: "Arab Saudi", coordinates: [23.9, 45.1] },
  { code: "+977", country: "Nepal", coordinates: [28.4, 84.1] },
  { code: "+880", country: "Bangladesh", coordinates: [23.7, 90.4] },
  { code: "+886", country: "Taiwan", coordinates: [23.7, 120.9] },
];

const INDONESIA_PREFIXES = new Map([
  ["0811", "Telkomsel"],
  ["0812", "Telkomsel"],
  ["0813", "Telkomsel"],
  ["0821", "Telkomsel"],
  ["0822", "Telkomsel"],
  ["0823", "Telkomsel"],
  ["0851", "Telkomsel / by.U (indikasi prefix)"],
  ["0852", "Telkomsel"],
  ["0853", "Telkomsel"],
  ["0814", "Indosat"],
  ["0815", "Indosat"],
  ["0816", "Indosat"],
  ["0855", "Indosat"],
  ["0856", "Indosat"],
  ["0857", "Indosat"],
  ["0858", "Indosat"],
  ["0817", "XL"],
  ["0818", "XL"],
  ["0819", "XL"],
  ["0859", "XL"],
  ["0877", "XL"],
  ["0878", "XL"],
  ["0831", "AXIS"],
  ["0832", "AXIS"],
  ["0833", "AXIS"],
  ["0838", "AXIS"],
  ["0895", "Tri (3)"],
  ["0896", "Tri (3)"],
  ["0897", "Tri (3)"],
  ["0898", "Tri (3)"],
  ["0899", "Tri (3)"],
]);

function digitsOnly(value) {
  return String(value || "").replace(/\D/g, "");
}

function normalizeNumber(input) {
  const raw = String(input || "").trim();
  if (!raw) return null;
  if (/[A-Za-z]/.test(raw)) return null;

  let digits = digitsOnly(raw);
  if (!digits) return null;

  if (raw.startsWith("00")) digits = digits.slice(2);

  // Format lokal Indonesia: 08xxxxxxxxxx -> +628xxxxxxxxxx.
  if (raw.startsWith("0")) {
    digits = `62${digits.slice(1)}`;
  }

  // Format Indonesia tanpa tanda +: 628xxxxxxxxxx.
  if (digits.startsWith("8") && digits.length >= 9 && digits.length <= 12) {
    digits = `62${digits}`;
  }

  return digits;
}

function findCountry(normalizedDigits) {
  const matches = COUNTRY_DATA
    .filter((item) => normalizedDigits.startsWith(item.code.slice(1)))
    .sort((a, b) => b.code.length - a.code.length);
  return matches[0] || null;
}

function getIndonesiaPrefix(nationalNumber) {
  if (!nationalNumber.startsWith("8") || nationalNumber.length < 4) return null;
  return `0${nationalNumber.slice(0, 3)}`;
}

function getProvider(countryCode, nationalNumber) {
  if (countryCode !== "+62") {
    return "Database prefix Indonesia tidak berlaku untuk negara ini";
  }

  const localPrefix = getIndonesiaPrefix(nationalNumber);
  if (!localPrefix) return "Tidak terdeteksi";
  return INDONESIA_PREFIXES.get(localPrefix) || "Tidak terdeteksi dari prefix";
}

export function analyzeNumber(input) {
  const normalizedDigits = normalizeNumber(input);
  if (!normalizedDigits) {
    return { valid: false, message: "Nomor hanya boleh berisi angka dengan format +62..., 62..., atau 08... untuk Indonesia." };
  }

  if (normalizedDigits.length < 7 || normalizedDigits.length > 15) {
    return { valid: false, message: "Panjang nomor tidak wajar. Gunakan nomor internasional yang valid (maksimal 15 digit)." };
  }

  const country = findCountry(normalizedDigits);
  if (!country) {
    return {
      valid: true,
      countryCode: `+${normalizedDigits.slice(0, Math.min(3, normalizedDigits.length - 1))}`,
      nationalNumber: normalizedDigits.slice(1),
      prefix: normalizedDigits.slice(0, 4),
      suffix: normalizedDigits.slice(-4),
      totalDigits: normalizedDigits.length,
      country: "Tidak terdeteksi dari database lokal",
      coordinates: null,
      provider: "Tidak terdeteksi",
      mnpStatus: "Tidak dapat dipastikan tanpa data carrier/HLR",
      manual: {
        whatsapp: "Cek manual di aplikasi WhatsApp.",
        telegram: "Cek manual di aplikasi Telegram; hasil bergantung pengaturan privasi akun.",
        truecaller: "Cek manual di Truecaller Reverse Phone Lookup.",
        whoscall: "Cek manual di fitur Check / Phone Number Whoscall.",
      },
      note: "Analisis ini hanya memproses metadata nomor. Tidak mencoba masuk, mengambil kontak, atau mengungkap akun pribadi.",
    };
  }

  const nationalNumber = normalizedDigits.slice(country.code.length - 1);
  let localPrefix = nationalNumber.slice(0, 4);
  if (country.code === "+62" && nationalNumber.startsWith("8")) {
    localPrefix = `0${nationalNumber.slice(0, 3)}`;
  }

  return {
    valid: true,
    countryCode: country.code,
    nationalNumber,
    prefix: localPrefix,
    suffix: normalizedDigits.slice(-4),
    totalDigits: normalizedDigits.length,
    country: country.country,
    coordinates: country.coordinates,
    provider: getProvider(country.code, nationalNumber),
    mnpStatus: country.code === "+62"
      ? "Tidak dapat dipastikan dari prefix saja (nomor bisa pindah operator)."
      : "Tidak dicek otomatis; perlu data carrier/MNP negara terkait.",
    manual: {
      whatsapp: "Cek manual di WhatsApp dengan nomor internasional lengkap.",
      telegram: "Cek manual di Telegram; nomor bisa tidak dapat ditemukan karena pengaturan privasi.",
      truecaller: "Cek manual di Truecaller untuk Caller ID dan laporan spam/scam.",
      whoscall: "Cek manual di Whoscall untuk identifikasi dan peringatan spam/scam.",
    },
    note: country.code === "+62"
      ? "Provider di atas adalah indikasi berdasarkan prefix, bukan bukti operator saat ini. MNP dapat membuat operator aktual berbeda. Koordinat adalah perkiraan pusat negara, bukan lokasi pemilik nomor."
      : "Koordinat adalah perkiraan pusat negara, bukan lokasi pemilik nomor. Provider/MNP tidak ditentukan dari nomor saja pada modul ini.",
  };
}
