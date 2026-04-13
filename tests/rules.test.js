import test from "node:test";
import assert from "node:assert/strict";

import { ThrowType, applyScoreRules, applyThrow, createPlayerState, throwFromRawInput } from "../js/rules.js";

test("applyScoreRules wins at exactly 50", () => {
  const result = applyScoreRules(38, 12);
  assert.deepEqual(result, { score: 50, win: true, bounced: false });
});

test("applyScoreRules bounces to 25 when score goes over 50", () => {
  const result = applyScoreRules(49, 2);
  assert.deepEqual(result, { score: 25, win: false, bounced: true });
});

test("applyThrow eliminates player after three misses", () => {
  const player = createPlayerState("Matti");

  let current = applyThrow(player, ThrowType.MISS, 0).player;
  current = applyThrow(current, ThrowType.MISS, 0).player;
  current = applyThrow(current, ThrowType.MISS, 0).player;

  assert.equal(current.active, false);
});

test("applyThrow resets misses after a hit", () => {
  const player = { ...createPlayerState("Liisa"), misses: 2 };
  const result = applyThrow(player, ThrowType.SINGLE_PIN, 5).player;

  assert.equal(result.misses, 0);
  assert.equal(result.score, 5);
});

test("throwFromRawInput accepts 0 and 1..12", () => {
  assert.deepEqual(throwFromRawInput("0"), { type: ThrowType.MISS, value: 0 });
  assert.deepEqual(throwFromRawInput("12"), { type: ThrowType.SINGLE_PIN, value: 12 });
});

test("throwFromRawInput accepts explicit S and M prefixes", () => {
  assert.deepEqual(throwFromRawInput("S7"), { type: ThrowType.SINGLE_PIN, value: 7 });
  assert.deepEqual(throwFromRawInput("M8"), { type: ThrowType.MULTI_PINS, value: 8 });
});
