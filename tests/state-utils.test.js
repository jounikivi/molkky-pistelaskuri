import test from "node:test";
import assert from "node:assert/strict";

import { getNextActivePlayerIndex, recomputePlayerFromHistory, recomputeTeamFromHistory } from "../js/state-utils.js";

test("recomputePlayerFromHistory handles continue decision after third miss", () => {
  const player = {
    id: "p1",
    name: "Aki",
    score: 0,
    misses: 0,
    active: true,
    history: [
      { score: 0, ts: 1 },
      { score: 0, ts: 2 },
      { score: 0, ts: 3, missDecision: "continue" },
      { score: 5, ts: 4 }
    ]
  };

  const result = recomputePlayerFromHistory(player);
  assert.equal(result.active, true);
  assert.equal(result.misses, 0);
  assert.equal(result.score, 5);
});

test("recomputePlayerFromHistory eliminates after third miss without continue decision", () => {
  const player = {
    id: "p1",
    name: "Aki",
    score: 0,
    misses: 0,
    active: true,
    history: [
      { score: 0, ts: 1 },
      { score: 0, ts: 2 },
      { score: 0, ts: 3, missDecision: "eliminate" }
    ]
  };

  const result = recomputePlayerFromHistory(player);
  assert.equal(result.active, false);
  assert.equal(result.misses, 3);
});

test("recomputeTeamFromHistory recalculates score in timestamp order", () => {
  const team = {
    id: "t1",
    name: "Tiimi",
    score: 0,
    active: true,
    nextPlayerIdx: 0,
    players: [
      {
        id: "p1",
        name: "A",
        score: 0,
        misses: 0,
        active: true,
        history: [{ score: 30, ts: 2 }]
      },
      {
        id: "p2",
        name: "B",
        score: 0,
        misses: 0,
        active: true,
        history: [{ score: 25, ts: 1 }]
      }
    ]
  };

  const result = recomputeTeamFromHistory(team);
  assert.equal(result.score, 25);
});

test("getNextActivePlayerIndex skips inactive players", () => {
  const players = [
    { active: false },
    { active: false },
    { active: true }
  ];

  assert.equal(getNextActivePlayerIndex(players, 0), 2);
});
