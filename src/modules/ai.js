import axios from "axios";

const APIS = [
  {
    name: "Claude",
    url: "https://api.azbry.com/api/ai/claude",
  },
  {
    name: "GPTFree",
    url: "https://api.azbry.com/api/ai/gptfree",
  },
];

export async function askAI(question) {
  let lastError = null;

  for (const api of APIS) {
    try {
      const response = await axios.get(api.url, {
        params: {
          q: question,
        },
        timeout: 30000,
      });

      const data = response.data;

      if (typeof data === "string") {
        return data;
      }

      if (data?.result) {
        return data.result;
      }

      if (data?.response) {
        return data.response;
      }

      if (data?.answer) {
        return data.answer;
      }

      if (data?.message) {
        return data.message;
      }

      return JSON.stringify(data, null, 2);
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(
    lastError?.response?.data?.message ||
    lastError?.message ||
    "Semua API AI gagal digunakan."
  );
}
