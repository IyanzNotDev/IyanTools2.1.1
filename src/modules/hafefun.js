// Teka-teki: soal MTK acak + tebak-tebakan (riddle) sederhana.

const RIDDLES = [
  { soal: "Semakin diambil, semakin besar. Apa itu?", jawaban: ["lubang"] },
  { soal: "Punya leher tapi tidak punya kepala. Apa itu?", jawaban: ["botol"] },
  { soal: "Punya kaki tapi tidak bisa berjalan. Apa itu?", jawaban: ["meja", "kursi"] },
  { soal: "Selalu ada di depanmu tapi tidak pernah bisa kamu lihat. Apa itu?", jawaban: ["masa depan"] },
];

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function soalMTK() {
  const tipe = randInt(0, 2);

  if (tipe === 0) {
    const a = randInt(10, 99);
    const b = randInt(10, 99);
    return { soal: `${a} + ${b} = ?`, jawaban: [String(a + b)] };
  }

  if (tipe === 1) {
    const a = randInt(2, 12);
    const b = randInt(2, 12);
    const c = randInt(1, 20);
    return { soal: `${a} × ${b} − ${c} = ?`, jawaban: [String(a * b - c)] };
  }

  const start = randInt(1, 20);
  const step = randInt(2, 9);
  const deret = [0, 1, 2, 3].map((i) => start + i * step);
  return {
    soal: `Lanjutkan deret: ${deret.join(", ")}, ?`,
    jawaban: [String(start + 4 * step)],
  };
}

export function getTeka() {
  if (Math.random() < 0.5) return soalMTK();
  return RIDDLES[randInt(0, RIDDLES.length - 1)];
}

export function checkJawaban(teka, input) {
  const v = String(input || "").trim().toLowerCase();
  return teka.jawaban.some((j) => j.toLowerCase() === v);
}
