import axios from "axios";
import { URL } from "url";

const API_ENDPOINT_PATTERNS = [
  /["'`](\/api\/[^"'`\s<>]+)/gi,
  /["'`](\/api\/v\d+\/[^"'`\s<>]+)/gi,
  /["'`](\/graphql[^"'`\s<>]*)/gi,
  /["'`](\/swagger(?:\.json|\/)?[^"'`\s<>]*)/gi,
  /["'`](\/openapi(?:\.json|\/)?[^"'`\s<>]*)/gi,
  /["'`](\/api-docs[^"'`\s<>]*)/gi,
  /["'`](\/rest\/[^"'`\s<>]+)/gi,
];

function unique(values) {
  return [...new Set(values)];
}

function normalizeUrl(input) {
  let value = String(input).trim();

  if (!/^https?:\/\//i.test(value)) {
    value = `https://${value}`;
  }

  return new URL(value);
}

function extractEmails(text) {
  return unique(
    text.match(
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
    ) || []
  );
}

function extractPhones(text) {
  const matches =
    text.match(
      /(?:\+62|62|0)(?:[\s.-]?\d){8,13}/g
    ) || [];

  return unique(
    matches
      .map((phone) => phone.trim())
      .filter((phone) => phone.replace(/\D/g, "").length >= 10)
  );
}

function extractUrls(html, baseUrl) {
  const results = [];

  const regex =
    /(?:href|src|action)\s*=\s*["']([^"']+)["']/gi;

  let match;

  while ((match = regex.exec(html)) !== null) {
    try {
      const resolved = new URL(match[1], baseUrl);
      results.push(resolved.href);
    } catch {}
  }

  return unique(results);
}

function extractApiEndpoints(html, baseUrl) {
  const endpoints = [];

  for (const pattern of API_ENDPOINT_PATTERNS) {
    let match;

    while ((match = pattern.exec(html)) !== null) {
      try {
        endpoints.push(
          new URL(match[1], baseUrl).href
        );
      } catch {
        endpoints.push(match[1]);
      }
    }
  }

  return unique(endpoints);
}

function extractPorts(urls, baseUrl) {
  const ports = new Set();

  for (const value of [baseUrl, ...urls]) {
    try {
      const parsed = new URL(value);

      if (parsed.port) {
        ports.add(parsed.port);
      } else if (parsed.protocol === "https:") {
        ports.add("443");
      } else if (parsed.protocol === "http:") {
        ports.add("80");
      }
    } catch {}
  }

  return [...ports];
}

export async function scrapeWebsite(input) {
  const target = normalizeUrl(input);

  const response = await axios.get(target.href, {
    timeout: 15000,
    maxRedirects: 5,
    headers: {
      "User-Agent": "IyanTools-Scraper/2.1.1",
      Accept: "text/html,application/xhtml+xml",
    },
  });

  const html = String(response.data);
  const finalUrl = response.request?.res?.responseUrl || target.href;

  const emails = extractEmails(html);
  const phones = extractPhones(html);
  const urls = extractUrls(html, finalUrl);
  const endpoints = extractApiEndpoints(html, finalUrl);
  const ports = extractPorts(urls, finalUrl);

  return {
    target: finalUrl,
    status: response.status,
    contentType: response.headers["content-type"] || "-",
    emails,
    phones,
    urls,
    endpoints,
    ports,
    source: html,
  };
}
