const $ = id => document.getElementById(id);
const setLink = (id, url) => { $(id).href = url; };

function render(data) {
  const date = new Date(`${data.date}T12:00:00+09:00`);
  $("weekday").textContent = new Intl.DateTimeFormat("en", { weekday: "long", timeZone: "Asia/Tokyo" }).format(date);
  $("date").textContent = new Intl.DateTimeFormat("en", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Tokyo" }).format(date);
  $("word").textContent = data.word.word; $("part").textContent = data.word.part; $("meaning").textContent = data.word.meaning; $("example").textContent = `“${data.word.example}”`; setLink("word-source", data.word.source);
  $("kanji").textContent = data.kanji.glyph; $("kanji-meaning").textContent = data.kanji.meaning; $("on").textContent = data.kanji.on; $("kun").textContent = data.kanji.kun; $("kanji-example").textContent = data.kanji.example; $("kanji-source").textContent = `${data.kanji.sourceName || "Check source"} ↗`; setLink("kanji-source", data.kanji.source);
  $("year").textContent = data.history.year; $("history").textContent = data.history.text; $("history-source").textContent = `${data.history.sourceName}${data.history.license ? ` · ${data.history.license}` : ""} ↗`; setLink("history-source", data.history.url);
  $("daily-image").src = data.image.url; $("daily-image").alt = data.image.alt; $("image-title").textContent = data.image.title; $("image-credit").textContent = `${data.image.creator} · ${data.image.license}`; setLink("image-source", data.image.pageUrl);
  $("question").replaceChildren(document.createTextNode(data.maths.question)); for (const url of data.maths.questionImages || []) { const image = document.createElement("img"); image.src = url; image.alt = "Maths expression"; image.className = "math-expression"; $("question").append(" ", image); } $("answer").replaceChildren(document.createTextNode(data.maths.answer)); for (const url of data.maths.answerImages || []) { const image = document.createElement("img"); image.src = url; image.alt = "Answer expression"; image.className = "math-expression"; $("answer").append(image); } $("explanation").textContent = data.maths.explanation; $("math-source").textContent = `${data.maths.sourceName || "Generated locally"} ↗`; if (data.maths.source) setLink("math-source", data.maths.source);
  $("fact-label").textContent = data.fact.label === "Quotation" ? "Verified quotation" : "Verified fact"; $("fact").textContent = data.fact.text; $("fact-credit").textContent = data.fact.credit || data.fact.sourceName; $("fact-source").textContent = `${data.fact.sourceName} ↗`; setLink("fact-source", data.fact.source);
  $("status").textContent = data.image.fallback || data.history.fallback || data.history.unavailable ? "Fallback content in use · Tokyo time" : "Updates daily at midnight · Tokyo time";
  document.querySelector("main").setAttribute("aria-busy", "false");
}

async function load() {
  $("refresh").disabled = true;
  try { const response = await fetch("/api/today", { cache: "no-cache" }); if (!response.ok) throw new Error(); render(await response.json()); }
  catch { document.body.classList.add("error"); $("status").textContent = "Unable to refresh · try again shortly"; }
  finally { $("refresh").disabled = false; }
}

$("refresh").addEventListener("click", load);
document.addEventListener("visibilitychange", () => { if (!document.hidden) load(); });
load();
const now = new Date();
const tokyo = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
const next = new Date(tokyo); next.setHours(24, 0, 8, 0);
setTimeout(() => { load(); setInterval(load, 24 * 60 * 60 * 1000); }, Math.max(1000, next - tokyo));
