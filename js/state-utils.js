import { applyScoreRules } from "./rules.js";
import { sortByTimestamp } from "./shared.js";

export function getNextActivePlayerIndex(players, startIdx = 0){
  if(!players?.length) return -1;
  const len = players.length;
  const idx = ((startIdx % len) + len) % len;
  for(let i=0;i<len;i++){
    const candidate = (idx + i) % len;
    if(players[candidate]?.active) return candidate;
  }
  return -1;
}

export function recomputePlayerFromHistory(player){
  const next = { ...player };
  let score = 0;
  let misses = 0;
  let active = true;

  for(const h of sortByTimestamp(player.history)){
    const val = Number(h.score) || 0;
    if(val === 0){
      misses += 1;
      if(misses >= 3){
        if(h.missDecision === "continue"){
          misses = 0;
          continue;
        }
        active = false;
        misses = 3;
        break;
      }
      continue;
    }

    misses = 0;
    score = applyScoreRules(score, val).score;
  }

  next.score = score;
  next.misses = active ? misses : 3;
  next.active = active;
  return next;
}

export function recomputeTeamFromHistory(team){
  const players = (team.players ?? []).map(recomputePlayerFromHistory);
  const allThrows = sortByTimestamp(
    players.flatMap(player => (player.history ?? []).map(rec => ({ ...rec })))
  );

  let score = 0;
  allThrows.forEach(rec=>{
    score = applyScoreRules(score, Number(rec.score) || 0).score;
  });

  const active = players.some(player => player.active);
  const nextPlayerIdx = active
    ? Math.max(0, getNextActivePlayerIndex(players, team.nextPlayerIdx ?? 0))
    : 0;

  return {
    ...team,
    players,
    score,
    active,
    nextPlayerIdx
  };
}
