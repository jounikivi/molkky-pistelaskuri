import { sanitizeName } from "./shared.js";

export function parseTeamRandomizerNames(raw) {
  return String(raw ?? "")
    .split(/[\r\n,;]+/)
    .map(sanitizeName)
    .filter(Boolean);
}

export function shuffleItems(items, random = Math.random) {
  const arr = [...(items ?? [])];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function buildRandomTeams(playerNames, teamCount, options = {}) {
  const names = Array.isArray(playerNames)
    ? playerNames.map(sanitizeName).filter(Boolean)
    : parseTeamRandomizerNames(playerNames);
  const normalizedTeamCount = Number(teamCount);
  const teamNamePrefix = String(options.teamNamePrefix ?? "Tiimi ");
  const random = typeof options.random === "function" ? options.random : Math.random;

  if (names.length < 2) {
    throw new Error("At least two players are required");
  }
  if (!Number.isInteger(normalizedTeamCount) || normalizedTeamCount < 2) {
    throw new Error("Team count must be an integer >= 2");
  }
  if (normalizedTeamCount > names.length) {
    throw new Error("Team count cannot exceed player count");
  }

  const shuffledNames = shuffleItems(names, random);
  const teams = Array.from({ length: normalizedTeamCount }, (_, index) => ({
    name: `${teamNamePrefix}${index + 1}`,
    players: []
  }));

  shuffledNames.forEach((name, index) => {
    teams[index % normalizedTeamCount].players.push(name);
  });

  return teams.filter((team) => team.players.length > 0);
}
