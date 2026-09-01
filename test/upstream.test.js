import test from "node:test";
import assert from "node:assert/strict";
import { historyFor, imageFor, plain } from "../src/upstream.js";

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
