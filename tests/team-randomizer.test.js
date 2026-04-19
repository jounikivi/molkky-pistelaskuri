import test from "node:test";
import assert from "node:assert/strict";

import {
  buildRandomTeams,
  parseTeamRandomizerNames,
  shuffleItems
} from "../js/team-randomizer.js";

test("parseTeamRandomizerNames accepts line breaks, commas and semicolons", () => {
  const names = parseTeamRandomizerNames(" Matti \nLiisa, Teemu; <Aino> \n\n");
  assert.deepEqual(names, ["Matti", "Liisa", "Teemu", "Aino"]);
});

test("shuffleItems returns a new array with all original items", () => {
  const original = ["A", "B", "C", "D"];
  const shuffled = shuffleItems(original, () => 0.5);

  assert.notEqual(shuffled, original);
  assert.deepEqual([...shuffled].sort(), [...original].sort());
});

test("buildRandomTeams distributes players as evenly as possible", () => {
  const teams = buildRandomTeams(["A", "B", "C", "D", "E"], 2, {
    random: () => 0
  });

  assert.equal(teams.length, 2);
  assert.deepEqual(teams.map((team) => team.players.length).sort((a, b) => a - b), [2, 3]);
  assert.deepEqual(
    teams.flatMap((team) => team.players).sort(),
    ["A", "B", "C", "D", "E"]
  );
});

test("buildRandomTeams names generated teams in order", () => {
  const teams = buildRandomTeams(["A", "B", "C", "D"], 3, {
    random: () => 0
  });

  assert.deepEqual(teams.map((team) => team.name), ["Tiimi 1", "Tiimi 2", "Tiimi 3"]);
});

test("buildRandomTeams rejects invalid team counts", () => {
  assert.throws(() => buildRandomTeams(["A", "B"], 1), /Team count/);
  assert.throws(() => buildRandomTeams(["A", "B"], 3), /cannot exceed player count/);
});
