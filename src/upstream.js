import { commonsFiles, historyFallbacks } from "./content.js";
import { pick } from "./daily.js";

const allowedLicense = /^(CC0|Public domain|CC BY(?:-SA)?(?: |$))/i;

export function plain(value, max = 500) {
  return String(value ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, " ").trim().slice(0, max);
}

async function getJson(url, timeoutMs, fetcher = fetch) {
  const response = await fetcher(url, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: { "User-Agent": "ThingOfTheDay/1.0 (public classroom display)", Accept: "application/json" }
  });
  if (!response.ok) throw new Error(`Upstream returned ${response.status}`);
  const text = await response.text();
  if (text.length > 1_500_000) throw new Error("Upstream response too large");
  return JSON.parse(text);
}

export async function historyFor(date, timeoutMs, fetcher = fetch) {
  const mmdd = date.slice(5);
  try {
    const [month, day] = mmdd.split("-");
    const data = await getJson(`https://api.wikimedia.org/feed/v1/wikipedia/en/onthisday/events/${month}/${day}`, timeoutMs, fetcher);
    const events = Array.isArray(data.events) ? data.events.filter(e => e?.text && e?.pages?.[0]?.content_urls?.desktop?.page) : [];
    if (!events.length) throw new Error("No usable history event");
    const event = pick(events, date, "history");
    return {
      year: plain(event.year, 20), text: plain(event.text, 420),
      url: event.pages[0].content_urls.desktop.page,
      sourceName: "Wikipedia contributors", license: "CC BY-SA 4.0", stale: false
    };
  } catch {
    const fallback = historyFallbacks[mmdd];
    if (fallback) return { ...fallback, sourceName: "Curated source", license: null, fallback: true };
    return { year: "Today", text: "The date-specific history source is temporarily unavailable. Try a discreet refresh shortly.", url: "https://en.wikipedia.org/wiki/Wikipedia:On_this_day/Today", sourceName: "Local fallback", license: null, unavailable: true };
  }
}

export async function imageFor(date, timeoutMs, fetcher = fetch) {
  const title = pick(commonsFiles, date, "image");
  const params = new URLSearchParams({ action: "query", format: "json", origin: "*", prop: "imageinfo", titles: title, iiprop: "url|extmetadata", iiurlwidth: "1400" });
  const data = await getJson(`https://commons.wikimedia.org/w/api.php?${params}`, timeoutMs, fetcher);
  const page = Object.values(data?.query?.pages ?? {})[0];
  const info = page?.imageinfo?.[0], meta = info?.extmetadata;
  const license = plain(meta?.LicenseShortName?.value, 80);
  if (!info?.thumburl || !info?.descriptionurl || !allowedLicense.test(license)) throw new Error("Image has no accepted license metadata");
  return {
    url: info.thumburl, pageUrl: info.descriptionurl, title: plain(meta?.ObjectName?.value || page.title?.replace(/^File:/, ""), 140),
    creator: plain(meta?.Artist?.value || meta?.Credit?.value || "Wikimedia Commons contributor", 180),
    license, licenseUrl: meta?.LicenseUrl?.value || info.descriptionurl,
    alt: plain(meta?.ImageDescription?.value || meta?.ObjectName?.value || "Daily educational image", 240), stale: false
  };
}

export function fallbackImage() {
  return { url: "/fallback-image.svg", pageUrl: "/about", title: "Patterns of learning", creator: "Thing of the Day", license: "CC0 1.0", licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/", alt: "Abstract geometric pattern inspired by books, planets, and mathematical curves", fallback: true };
}
