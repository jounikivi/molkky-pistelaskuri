import test from "node:test";
import assert from "node:assert/strict";

import { canonName, getLatestHistoryEntry, sanitizeName, sortByTimestamp } from "../js/shared.js";

test("sanitizeName trims, collapses whitespace and removes angle brackets", () => {
  assert.equal(sanitizeName('  <Teppo>   Testaaja  '), "Teppo Testaaja");
});

test("canonName normalizes case for duplicate checks", () => {
  assert.equal(canonName("  MIKKO  "), canonName("mikko"));
});

test("sortByTimestamp returns entries in ascending timestamp order", () => {
  const input = [{ ts: 30 }, { ts: 10 }, { ts: 20 }];
  const result = sortByTimestamp(input);

  assert.deepEqual(result.map(item => item.ts), [10, 20, 30]);
});

test("getLatestHistoryEntry returns latest item across groups", () => {
  const result = getLatestHistoryEntry([
    { id: "a", history: [{ ts: 100, score: 1 }] },
    { id: "b", history: [{ ts: 200, score: 0 }] }
  ]);

  assert.equal(result.id, "b");
  assert.equal(result.rec.score, 0);
});
