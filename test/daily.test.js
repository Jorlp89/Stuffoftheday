import test from "node:test";
import assert from "node:assert/strict";
import { localDaily, maths, tokyoDate } from "../src/daily.js";

test("Tokyo date crosses midnight independently of UTC", () => {
  assert.equal(tokyoDate(new Date("2026-01-01T14:59:59Z")), "2026-01-01");
  assert.equal(tokyoDate(new Date("2026-01-01T15:00:00Z")), "2026-01-02");
});

test("daily selection is deterministic", () => {
  assert.deepEqual(localDaily("2026-09-01"), localDaily("2026-09-01"));
  assert.deepEqual(maths("2030-12-31"), maths("2030-12-31"));
});

test("daily content contains no private application fields", () => {
  const json = JSON.stringify(localDaily("2026-09-01")).toLowerCase();
  for (const forbidden of ["pupil", "studentid", "session", "cookie", "timetable", "week a", "week b", "garg"]) assert.equal(json.includes(forbidden), false);
});
