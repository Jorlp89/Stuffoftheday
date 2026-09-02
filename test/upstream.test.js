import test from "node:test";
import assert from "node:assert/strict";
import { historyFor, imageFor, japaneseFor, mathsFor, plain } from "../src/upstream.js";

const response = data => async () => ({ ok: true, text: async () => JSON.stringify(data) });

test("plain removes markup and limits untrusted text", () => {
  assert.equal(plain('<img src=x onerror=alert(1)> Hello &amp; <b>world</b>', 20), "Hello & world");
});

test("history adapter strips upstream markup", async () => {
  const item = await historyFor("2026-09-01", 100, response({ events: [{ year: 1923, text: "A <b>major</b> event", pages: [{ content_urls: { desktop: { page: "https://en.wikipedia.org/wiki/Test" } } }] }] }));
  assert.equal(item.text, "A major event");
  assert.equal(item.license, "CC BY-SA 4.0");
});

test("image adapter rejects missing or unexpected licences", async () => {
  const payload = { query: { pages: { 1: { imageinfo: [{
    thumburl: "https://upload.wikimedia.org/a.jpg",
    descriptionurl: "https://commons.wikimedia.org/a",
    extmetadata: { LicenseShortName: { value: "All rights reserved" } }
  }] } } } };
  await assert.rejects(imageFor("2026-09-01", 100, response(payload)));
});

test("Japanese daily adapter reads the public word payload", async () => {
  const html = '<div data-wordday="{&quot;date&quot;:&quot;2026-09-02&quot;,&quot;text&quot;:&quot;歯を磨く&quot;,&quot;english&quot;:&quot;brush one\'s teeth&quot;,&quot;kana&quot;:&quot;はをみがく&quot;,&quot;romanization&quot;:&quot;ha o migaku&quot;,&quot;samples&quot;:[]}" data-hintmode=""></div>';
  const item = await japaneseFor("2026-09-02", 100, async () => ({ ok: true, text: async () => html }));
  assert.equal(item.glyph, "歯を磨く");
  assert.equal(item.meaning, "brush one's teeth");
});

test("maths adapter preserves formula images and attribution", async () => {
  const html = '<p class="MuiTypography-root MuiTypography-body1 mui-1m5rh0e">What is <img src="https://vt-vtwa-assets.varsitytutors.com/formula.gif" alt=""/>?</p><button aria-label="![](https://vt-vtwa-assets.varsitytutors.com/answer.gif &quot;42&quot;)" data-testid="qotd-answer-choice"></button><li style="font-weight:800"><img src="https://vt-vtwa-assets.varsitytutors.com/answer.gif"/> (correct answer)</li><p><strong>Explanation: </strong>Work it out carefully.</p>';
  const item = await mathsFor("2026-09-02", 100, async () => ({ ok: true, text: async () => html }));
  assert.equal(item.questionImages.length, 1);
  assert.equal(item.answer, "42");
  assert.equal(item.sourceName, "Varsity Tutors");
});
