import axios from "axios";

// Public profile URL patterns. Availability can vary by region, login state,
// anti-bot protection, and platform changes. A 2xx response means the URL
// responded; it does not prove that the username belongs to a person.
const PLATFORMS = [
  // Social networks
  { platform: "Instagram", url: (u) => `https://www.instagram.com/${encodeURIComponent(u)}/` },
  { platform: "TikTok", url: (u) => `https://www.tiktok.com/@${encodeURIComponent(u)}` },
  { platform: "X", url: (u) => `https://x.com/${encodeURIComponent(u)}` },
  { platform: "Facebook", url: (u) => `https://www.facebook.com/${encodeURIComponent(u)}` },
  { platform: "Threads", url: (u) => `https://www.threads.com/@${encodeURIComponent(u)}` },
  { platform: "Reddit", url: (u) => `https://www.reddit.com/user/${encodeURIComponent(u)}/` },
  { platform: "Pinterest", url: (u) => `https://www.pinterest.com/${encodeURIComponent(u)}/` },
  { platform: "Tumblr", url: (u) => `https://${encodeURIComponent(u)}.tumblr.com/`, hostBased: true },
  { platform: "VK", url: (u) => `https://vk.com/${encodeURIComponent(u)}` },
  { platform: "Quora", url: (u) => `https://www.quora.com/profile/${encodeURIComponent(u)}` },
  { platform: "Telegram", url: (u) => `https://t.me/${encodeURIComponent(u)}` },
  { platform: "Bluesky", url: (u) => `https://bsky.app/profile/${encodeURIComponent(u)}` },
  { platform: "Flickr", url: (u) => `https://www.flickr.com/people/${encodeURIComponent(u)}/` },
  { platform: "DeviantArt", url: (u) => `https://www.deviantart.com/${encodeURIComponent(u)}` },

  // Video / live / audio
  { platform: "YouTube", url: (u) => `https://www.youtube.com/@${encodeURIComponent(u)}` },
  { platform: "Twitch", url: (u) => `https://www.twitch.tv/${encodeURIComponent(u)}` },
  { platform: "Vimeo", url: (u) => `https://vimeo.com/${encodeURIComponent(u)}` },
  { platform: "Dailymotion", url: (u) => `https://www.dailymotion.com/${encodeURIComponent(u)}` },
  { platform: "SoundCloud", url: (u) => `https://soundcloud.com/${encodeURIComponent(u)}` },
  { platform: "Mixcloud", url: (u) => `https://www.mixcloud.com/${encodeURIComponent(u)}/` },
  { platform: "Last.fm", url: (u) => `https://www.last.fm/user/${encodeURIComponent(u)}` },

  // Developer / creator communities
  { platform: "GitHub", url: (u) => `https://github.com/${encodeURIComponent(u)}` },
  { platform: "GitLab", url: (u) => `https://gitlab.com/${encodeURIComponent(u)}` },
  { platform: "Bitbucket", url: (u) => `https://bitbucket.org/${encodeURIComponent(u)}/` },
  { platform: "CodePen", url: (u) => `https://codepen.io/${encodeURIComponent(u)}` },
  { platform: "DEV", url: (u) => `https://dev.to/${encodeURIComponent(u)}` },
  { platform: "Medium", url: (u) => `https://medium.com/@${encodeURIComponent(u)}` },
  { platform: "Replit", url: (u) => `https://replit.com/@${encodeURIComponent(u)}` },
  { platform: "Hugging Face", url: (u) => `https://huggingface.co/${encodeURIComponent(u)}` },
  { platform: "Kaggle", url: (u) => `https://www.kaggle.com/${encodeURIComponent(u)}` },
  { platform: "Behance", url: (u) => `https://www.behance.net/${encodeURIComponent(u)}` },
  { platform: "Dribbble", url: (u) => `https://dribbble.com/${encodeURIComponent(u)}` },
  { platform: "Gravatar", url: (u) => `https://gravatar.com/${encodeURIComponent(u)}` },

  // Gaming
  { platform: "Steam", url: (u) => `https://steamcommunity.com/id/${encodeURIComponent(u)}` },
  { platform: "Roblox", url: (u) => `https://www.roblox.com/users/profile?username=${encodeURIComponent(u)}` },
  { platform: "itch.io", url: (u) => `https://${encodeURIComponent(u)}.itch.io/`, hostBased: true },

  // Support / creator identity pages
  { platform: "Patreon", url: (u) => `https://www.patreon.com/${encodeURIComponent(u)}` },
  { platform: "Ko-fi", url: (u) => `https://ko-fi.com/${encodeURIComponent(u)}` },
  { platform: "Buy Me a Coffee", url: (u) => `https://buymeacoffee.com/${encodeURIComponent(u)}` },
  { platform: "Linktree", url: (u) => `https://linktr.ee/${encodeURIComponent(u)}` },
  { platform: "About.me", url: (u) => `https://about.me/${encodeURIComponent(u)}` },

  // Professional / identity directories
  { platform: "LinkedIn", url: (u) => `https://www.linkedin.com/in/${encodeURIComponent(u)}/` },
];

function normalizeUsername(input) {
  return String(input ?? "").trim().replace(/^@/, "");
}

async function checkOne(item, username) {
  const url = item.url(username);
  try {
    const response = await axios.get(url, {
      timeout: 9000,
      maxRedirects: 5,
      validateStatus: () => true,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; IyanTools/2.1.1; public-profile-check)",
        Accept: "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
      },
    });

    const statusCode = response.status;
    const finalUrl = response.request?.res?.responseUrl || url;

    if (statusCode >= 200 && statusCode < 300) {
      return {
        platform: item.platform,
        url: finalUrl,
        status: "found",
        code: statusCode,
        note: "Halaman merespons; perlu verifikasi manual.",
      };
    }

    if (statusCode === 404 || statusCode === 410) {
      return {
        platform: item.platform,
        url,
        status: "not_found",
        code: statusCode,
        note: "Server mengembalikan halaman tidak ditemukan.",
      };
    }

    return {
      platform: item.platform,
      url,
      status: "unknown",
      code: statusCode,
      note: `Server membatasi atau menolak pemeriksaan (HTTP ${statusCode}).`,
    };
  } catch (error) {
    const code = error?.code || "NETWORK";
    return {
      platform: item.platform,
      url,
      status: "unknown",
      code,
      note: "Tidak dapat memeriksa karena timeout, jaringan, atau perlindungan anti-bot.",
    };
  }
}

/** Check publicly accessible profile URLs only; this does not confirm identity. */
export async function checkUsername(username) {
  const value = normalizeUsername(username);
  if (!/^[a-zA-Z0-9._-]{1,50}$/.test(value)) {
    throw new Error("Format username tidak valid.");
  }

  const results = await Promise.all(
    PLATFORMS.map((item) => checkOne(item, value))
  );

  return results;
}

export function getUsernamePlatformCount() {
  return PLATFORMS.length;
}
