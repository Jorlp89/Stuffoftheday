import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("CSP permits both Wikimedia image delivery hosts", async () => {
  const server = await readFile(new URL("../src/server.js", import.meta.url), "utf8");
  assert.match(server, /https:\/\/upload\.wikimedia\.org/);
  assert.match(server, /https:\/\/thumb\.wikimedia\.org/);
});
