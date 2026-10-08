/*
 * Created by : febry.is-a.dev
 * GitHub     : vandebry10-star
 * Date       : 18-07-2026
 * Do not remove the creator's watermark.
 */

import axios from "axios";
import * as cheerio from "cheerio";

class AnichiScraper {
  constructor() {
    this.baseURL = "https://anichi.to";

    this.headers = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Referer: "https://anichi.to/",
    };
  }

  async request(url) {
    const { data } = await axios.get(url, {
      headers: this.headers,
      timeout: 15000,
    });

    return cheerio.load(data);
  }

  parseItems($) {
    const results = [];

    $(".ani.items .item, .aitem-wrapper .aitem").each(
      (_, element) => {
        const linkEl = $(element).find("a").first();

        const title = $(element)
          .find(".name, .title")
          .first()
          .text()
          .trim();

        const href = linkEl.attr("href") || "";

        const slug =
          href.replace(/.*\/anime\//, "") || "";

        const thumbnail =
          $(element).find("img").first().attr("src") ||
          "";

        const episode =
          $(element)
            .find(".ep-status span")
            .first()
            .text()
            .trim() || "";

        const type =
          $(element)
            .find(".right")
            .first()
            .text()
            .trim() || "";

        const id =
          $(element)
            .find("[data-id]")
            .first()
            .attr("data-id") || "";

        if (title) {
          results.push({
            id,
            title,
            slug,
            thumbnail,
            episode,
            type,
            url: slug
              ? `${this.baseURL}/anime/${slug}`
              : href,
          });
        }
      }
    );

    return results;
  }

  async search(query) {
    const url =
      `${this.baseURL}/filter?keyword=` +
      encodeURIComponent(query);

    try {
      const $ = await this.request(url);

      return this.parseItems($);
    } catch (error) {
      throw new Error(
        "Search failed: " + error.message
      );
    }
  }

  async detail(url) {
    try {
      const $ = await this.request(url);

      const root =
        $("#series-page, #watch-main").first();

      const id =
        root.attr("data-id") || "";

      const malId =
        root.attr("data-mal-id") || "";

      const title =
        $(".series-title, .media-title")
          .first()
          .text()
          .trim();

      const thumbnail =
        $(
          ".series-intro__poster img, " +
          ".media-info-poster img"
        )
          .first()
          .attr("src") || "";

      const synopsis =
        $(
          ".series-blurb__full, " +
          ".synopsis-full"
        )
          .first()
          .text()
          .trim() ||
        $(
          ".series-blurb__short, " +
          ".synopsis-short"
        )
          .first()
          .text()
          .trim();

      const rating =
        $(".series-score b, .score-line b")
          .first()
          .text()
          .trim();

      const info = {};

      $(".series-fact, .meta-row").each(
        (_, el) => {
          const label = $(el)
            .find(
              ".series-fact__label, .meta-label"
            )
            .text()
            .trim()
            .replace(":", "");

          const value = $(el)
            .find(
              ".series-fact__value, .meta-value"
            )
            .text()
            .trim();

          if (label && value) {
            info[label] = value;
          }
        }
      );

      const genres = [];

      $(
        ".series-genres__list a, " +
        ".meta-row:contains('Genre') a"
      ).each((_, el) => {
        const genre = $(el)
          .text()
          .trim();

        if (genre) {
          genres.push(genre);
        }
      });

      const titleEl =
        $(".series-title, .media-title")
          .first();

      const altTitle =
        titleEl.attr("data-en") ||
        titleEl.attr("data-jp") ||
        "";

      return {
        id,
        malId,
        title,
        altTitle,
        thumbnail,
        synopsis,
        rating,
        genres: [...new Set(genres)],
        info,
        url,
      };
    } catch (error) {
      throw new Error(
        "Detail failed: " + error.message
      );
    }
  }

  async latest() {
    const url =
      `${this.baseURL}/latest-updated`;

    try {
      const $ = await this.request(url);

      return this.parseItems($);
    } catch (error) {
      throw new Error(
        "Latest failed: " + error.message
      );
    }
  }

  async popular() {
    const url =
      `${this.baseURL}/most-viewed`;

    try {
      const $ = await this.request(url);

      return this.parseItems($);
    } catch (error) {
      throw new Error(
        "Popular failed: " + error.message
      );
    }
  }

  async genre(genre) {
    const url =
      `${this.baseURL}/genre/${encodeURIComponent(
        genre
      )}`;

    try {
      const $ = await this.request(url);

      return this.parseItems($);
    } catch (error) {
      throw new Error(
        "Genre failed: " + error.message
      );
    }
  }

  async watch(url) {
    try {
      const $ = await this.request(url);

      const root =
        $("#watch-main").first();

      const id =
        root.attr("data-id") || "";

      const malId =
        root.attr("data-mal-id") || "";

      const title =
        $(".media-title a")
          .first()
          .text()
          .trim();

      const thumbnail =
        $(".media-info-poster img")
          .first()
          .attr("src") || "";

      const synopsis =
        $(
          ".synopsis-full, .synopsis-short"
        )
          .first()
          .text()
          .trim();

      const rating =
        $(".score-line b")
          .first()
          .text()
          .trim();

      const episodeNum =
        root.attr("data-ep-num") || "";

      return {
        id,
        malId,
        title,
        thumbnail,
        synopsis,
        rating,
        episodeNum,
        url,
      };
    } catch (error) {
      throw new Error(
        "Watch failed: " + error.message
      );
    }
  }
}

const scraper = new AnichiScraper();

export async function anichiSearch(query) {
  return scraper.search(query);
}

export async function anichiDetail(url) {
  return scraper.detail(url);
}

export async function anichiLatest() {
  return scraper.latest();
}

export async function anichiPopular() {
  return scraper.popular();
}

export async function anichiGenre(genre) {
  return scraper.genre(genre);
}

export async function anichiWatch(url) {
  return scraper.watch(url);
}
