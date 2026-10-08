import axios from "axios";

const API = "https://en.wiktionary.org/api/rest_v1/page/definition";

function cleanText(value) {
  return String(value || "")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractDefinitions(data) {
  const results = [];

  for (const [language, entries] of Object.entries(data || {})) {
    if (!Array.isArray(entries)) continue;

    for (const entry of entries) {
      const partOfSpeech = entry?.partOfSpeech || "";

      for (const definition of entry?.definitions || []) {
        const text = cleanText(
          definition?.definition ||
            definition?.definitionText ||
            ""
        );

        if (!text) continue;

        results.push({
          language,
          partOfSpeech,
          definition: text,
          examples: (definition?.examples || [])
            .map((item) =>
              cleanText(
                typeof item === "string"
                  ? item
                  : item?.text || ""
              )
            )
            .filter(Boolean),
        });
      }
    }
  }

  return results;
}

async function requestDefinition(term) {
  const encoded = encodeURIComponent(term);

  const response = await axios.get(
    `${API}/${encoded}`,
    {
      timeout: 15000,
      headers: {
        "User-Agent": "IyanTools/2.1.1",
        Accept: "application/json",
      },
    }
  );

  return response.data;
}

export async function searchPsychology(term) {
  const query = String(term || "").trim();

  if (!query) {
    return {
      success: false,
      message: "Istilah tidak boleh kosong.",
      results: [],
    };
  }

  try {
    let data;

    try {
      data = await requestDefinition(query);
    } catch {
      const words = query.split(/\s+/);

      if (words.length <= 1) {
        throw new Error(
          `Istilah "${query}" tidak ditemukan.`
        );
      }

      const partialResults = [];

      for (const word of words) {
        try {
          const wordData = await requestDefinition(word);
          const definitions =
            extractDefinitions(wordData);

          partialResults.push(
            ...definitions.map((item) => ({
              ...item,
              word,
            }))
          );
        } catch {}
      }

      if (partialResults.length === 0) {
        throw new Error(
          `Tidak ditemukan informasi untuk "${query}".`
        );
      }

      return {
        success: true,
        term: query,
        results: partialResults,
        source: "Wiktionary",
        url: `https://en.wiktionary.org/wiki/${encodeURIComponent(query)}`,
      };
    }

    const definitions = extractDefinitions(data);

    if (definitions.length === 0) {
      return {
        success: false,
        message:
          `Definisi "${query}" tidak ditemukan.`,
        results: [],
      };
    }

    return {
      success: true,
      term: query,
      results: definitions,
      source: "Wiktionary",
      url: `https://en.wiktionary.org/wiki/${encodeURIComponent(query)}`,
    };
  } catch (error) {
    return {
      success: false,
      message:
        error?.response?.status === 404
          ? `Istilah "${query}" tidak ditemukan.`
          : error?.message ||
            "Gagal menghubungi Wiktionary API.",
      results: [],
    };
  }
}
