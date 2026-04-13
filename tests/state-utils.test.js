import test from "node:test";
import assert from "node:assert/strict";

import {
  applySoloThrowToPlayer,
  applyTeamThrowToTeam,
  getNextActivePlayerIndex,
  getNextSoloTurnIndex,
  getNextTeamTurnIndex,
  recomputePlayerFromHistory,
  recomputeTeamFromHistory,
  shouldEndSoloGame,
  shouldEndTeamGame
} from "../js/state-utils.js";

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

test("applySoloThrowToPlayer records throw and resets misses on continue decision", () => {
  const player = {
    id: "p1",
    name: "Aki",
    score: 0,
    misses: 2,
    active: true,
    history: []
  };

  const result = applySoloThrowToPlayer(player, 0, "continue");
  assert.equal(result.active, true);
  assert.equal(result.misses, 0);
  assert.equal(result.history.length, 1);
  assert.equal(result.history[0].missDecision, "continue");
});

test("applySoloThrowToPlayer eliminates player on third miss", () => {
  const player = {
    id: "p1",
    name: "Aki",
    score: 0,
    misses: 2,
    active: true,
    history: []
  };

  const result = applySoloThrowToPlayer(player, 0, "eliminate");
  assert.equal(result.active, false);
});

test("applyTeamThrowToTeam updates team score and player history", () => {
  const team = {
    id: "t1",
    name: "Tiimi",
    score: 10,
    active: true,
    nextPlayerIdx: 0,
    players: [
      { id: "p1", name: "A", score: 0, misses: 0, active: true, history: [] }
    ]
  };

  const result = applyTeamThrowToTeam(team, "p1", 7);
  assert.equal(result.team.score, 17);
  assert.equal(result.team.players[0].history.length, 1);
  assert.equal(result.playerIndex, 0);
});

test("getNextSoloTurnIndex skips eliminated players", () => {
  const players = [
    { id: "a", active: true },
    { id: "b", active: false },
    { id: "c", active: true }
  ];
  const order = ["a", "b", "c"];

  assert.equal(getNextSoloTurnIndex(players, order, 0), 2);
});

test("shouldEndSoloGame returns true when all players are inactive", () => {
  assert.equal(shouldEndSoloGame([{ active: false }, { active: false }]), true);
  assert.equal(shouldEndSoloGame([{ active: true }, { active: false }]), false);
});

test("getNextTeamTurnIndex skips inactive teams", () => {
  const teams = [
    { id: "t1", active: true },
    { id: "t2", active: false },
    { id: "t3", active: true }
  ];
  const order = ["t1", "t2", "t3"];

  assert.equal(getNextTeamTurnIndex(teams, order, 0), 2);
});

test("shouldEndTeamGame returns true when no active players remain in active teams", () => {
  const ended = shouldEndTeamGame([
    { active: true, players: [{ active: false }] },
    { active: false, players: [{ active: false }] }
  ]);
  const notEnded = shouldEndTeamGame([
    { active: true, players: [{ active: true }] }
  ]);

  assert.equal(ended, true);
  assert.equal(notEnded, false);
});
