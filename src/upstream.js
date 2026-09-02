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

async function getText(url, timeoutMs, fetcher = fetch) {
  const response = await fetcher(url, { signal: AbortSignal.timeout(timeoutMs), headers: { "User-Agent": "ThingOfTheDay/1.0 (public classroom display)", Accept: "text/html" } });
  if (!response.ok) throw new Error(`Upstream returned ${response.status}`);
  const text = await response.text();
  if (text.length > 2_500_000) throw new Error("Upstream response too large");
  return text;
}

function entities(value) {
  return String(value ?? "").replace(/&quot;/g, '"').replace(/&#x27;|&#39;|&apos;/g, "'").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}

export async function japaneseFor(date, timeoutMs, fetcher = fetch) {
  const html = await getText("https://www.japanesepod101.com/japanese-phrases/", timeoutMs, fetcher);
  const match = html.match(/data-wordday="([\s\S]*?)"\s+data-hintmode=/);
  if (!match) throw new Error("Japanese daily word data missing");
  const data = JSON.parse(entities(match[1]));
  if (!data.text || !data.english || !data.romanization) throw new Error("Japanese daily word incomplete");
  const sample = Array.isArray(data.samples) ? data.samples[0] : null;
  return { glyph: plain(data.text, 40), meaning: plain(data.english, 100), on: plain(data.romanization, 100), kun: plain(data.kana, 100), example: sample ? `${plain(sample.text, 160)} — ${plain(sample.english, 180)}` : "", source: "https://www.japanesepod101.com/japanese-phrases/", sourceName: "JapanesePod101", date: plain(data.date || date, 20), stale: false };
}

function imageSources(fragment) {
  return [...String(fragment).matchAll(/<img[^>]+src="([^"]+)"/g)].map(match => entities(match[1])).filter(url => /^https:\/\/vt-vtwa-assets\.varsitytutors\.com\//.test(url)).slice(0, 4);
}

export async function mathsFor(date, timeoutMs, fetcher = fetch) {
  const source = "https://www.varsitytutors.com/practice/subjects/math/question-of-the-day";
  const html = await getText(source, timeoutMs, fetcher);
  const questionMatch = html.match(/<p class="MuiTypography-root MuiTypography-body1 mui-1m5rh0e">([\s\S]*?)<\/p>/);
  const answerKey = html.match(/<li style="font-weight:800">([\s\S]*?)\s*\(correct answer\)<\/li>/);
  const explanationMatch = html.match(/<strong>Explanation:\s*<\/strong>([\s\S]*?)<\/p>/);
  if (!questionMatch || !answerKey) throw new Error("Daily maths data missing");
  const labels = [...html.matchAll(/aria-label="([^"]+)"[^>]*data-testid="qotd-answer-choice"/g)].map(match => entities(match[1]));
  const choices = labels.map(label => plain(label.match(/"([^"]+)"/)?.[1] || label.replace(/!\[\]\([^)]*\)/g, ""), 100)).filter(Boolean).slice(0, 6);
  const correctImages = imageSources(answerKey[1]);
  let answer = plain(answerKey[1], 100).replace(/\(correct answer\)$/i, "").trim();
  if (!answer && correctImages[0]) answer = plain(labels.find(label => label.includes(correctImages[0]))?.match(/"([^"]+)"/)?.[1] || "See the source answer", 100);
  return { question: plain(questionMatch[1], 300) || "Solve today's illustrated maths problem.", questionImages: imageSources(questionMatch[1]), choices, answer, explanation: plain(explanationMatch?.[1] || "See the full worked explanation at the source.", 500), source, sourceName: "Varsity Tutors", date, stale: false };
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
