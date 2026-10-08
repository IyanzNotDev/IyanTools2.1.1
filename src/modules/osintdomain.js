// OSINT Domain: hanya recon pasif dari data publik.
// DNS record, subdomain dari Certificate Transparency (crt.sh), dan info HTTP dasar.
import dns from "node:dns/promises";

const RECORD_TYPES = ["A", "AAAA", "MX", "NS", "TXT", "CNAME", "SOA"];

export function normalizeDomain(input) {
  let d = String(input || "").trim().toLowerCase();
  d = d.replace(/^https?:\/\//, "").split("/")[0].split("?")[0].split(":")[0];

  if (!/^(?=.{1,253}$)([a-z0-9-]{1,63}\.)+[a-z]{2,63}$/.test(d)) {
    throw new Error("Format domain tidak valid. Contoh: example.com");
  }
  return d;
}

function formatRecord(type, value) {
  if (type === "MX") return `${value.exchange} (prioritas ${value.priority})`;
  if (type === "SOA") return `${value.nsname} / ${value.hostmaster}`;
  if (type === "TXT") return value.map((part) => part.join("")).join(" ");
  return String(value);
}

export async function getDnsRecords(domain) {
  const result = {};

  for (const type of RECORD_TYPES) {
    try {
      const records = await dns.resolve(domain, type);
      const list = Array.isArray(records) ? records : [records];
      result[type] = list.map((r) => formatRecord(type, r));
    } catch {
      result[type] = [];
    }
  }

  return result;
}

export async function getSubdomains(domain) {
  const res = await fetch(`https://crt.sh/?q=%25.${domain}&output=json`, {
    signal: AbortSignal.timeout(20000),
  });

  if (!res.ok) throw new Error(`crt.sh merespons status ${res.status}.`);

  const data = await res.json();
  const found = new Set();

  for (const row of data) {
    for (const name of String(row.name_value || "").split("\n")) {
      const n = name.trim().toLowerCase();
      if (n && !n.includes("*") && (n === domain || n.endsWith("." + domain))) {
        found.add(n);
      }
    }
  }

  return [...found].sort();
}

export async function getHttpInfo(domain) {
  try {
    const res = await fetch(`https://${domain}`, {
      method: "HEAD",
      redirect: "follow",
      signal: AbortSignal.timeout(10000),
    });
    return {
      status: res.status,
      finalUrl: res.url,
      server: res.headers.get("server") || "-",
      poweredBy: res.headers.get("x-powered-by") || "-",
    };
  } catch (error) {
    return { error: error.message };
  }
}

export async function scanDomain(input) {
  const domain = normalizeDomain(input);
  const [dnsRecords, subdomains, http] = await Promise.all([
    getDnsRecords(domain),
    getSubdomains(domain).catch((e) => ({ error: e.message })),
    getHttpInfo(domain),
  ]);

  return { domain, dnsRecords, subdomains, http };
}
