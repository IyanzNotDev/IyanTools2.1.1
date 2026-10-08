export function checkNIK(input) {
  const nik = String(input).replace(/\D/g, "");

  if (!/^\d{16}$/.test(nik)) {
    return {
      valid: false,
      message: "NIK harus terdiri dari 16 digit.",
    };
  }

  const kodeWilayah = nik.slice(0, 6);
  const tanggalRaw = Number(nik.slice(6, 8));
  const bulan = Number(nik.slice(8, 10));
  const tahun = nik.slice(10, 12);
  const nomorUrut = nik.slice(12, 16);

  if (bulan < 1 || bulan > 12) {
    return {
      valid: false,
      message: "Bulan pada NIK tidak valid.",
    };
  }

  let jenisKelamin;
  let tanggal;

  if (tanggalRaw >= 1 && tanggalRaw <= 31) {
    jenisKelamin = "LAKI-LAKI";
    tanggal = tanggalRaw;
  } else if (tanggalRaw >= 41 && tanggalRaw <= 71) {
    jenisKelamin = "PEREMPUAN";
    tanggal = tanggalRaw - 40;
  } else {
    return {
      valid: false,
      message: "Tanggal pada NIK tidak valid.",
    };
  }

  const maxDays = new Date(
    2000,
    bulan,
    0
  ).getDate();

  if (tanggal > maxDays) {
    return {
      valid: false,
      message: "Tanggal pada NIK tidak valid.",
    };
  }

  const tanggalLahir =
    `${String(tanggal).padStart(2, "0")}/` +
    `${String(bulan).padStart(2, "0")}/` +
    `${tahun}`;

  return {
    valid: true,
    nik,
    maskedNik: `${nik.slice(0, 12)}****`,
    jenisKelamin,
    tanggalLahir,
    kodeWilayah: kodeWilayah.replace(
      /^(\d{2})(\d{2})(\d{2})$/,
      "$1.$2.$3"
    ),
    nomorUrut,
  };
}
