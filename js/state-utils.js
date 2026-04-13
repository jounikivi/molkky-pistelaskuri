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

export function applySoloThrowToPlayer(player, value, missDecision = null){
  const next = {
    ...player,
    history: [...(player.history ?? [])]
  };
  const val = Number(value) || 0;
  const isMiss = val === 0;

  if(isMiss){
    next.misses = (next.misses || 0) + 1;
    if(next.misses >= 3){
      if(missDecision === "continue"){
        next.misses = 0;
      } else if(missDecision === "eliminate"){
        next.active = false;
      }
    }
  } else {
    next.misses = 0;
  }

  next.history.push({ score: val, ts: Date.now(), missDecision });

  if(next.active){
    next.score = applyScoreRules(next.score || 0, val).score;
  }

  return next;
}

export function applyTeamThrowToTeam(team, playerId, value, missDecision = null){
  const val = Number(value) || 0;
  const next = {
    ...team,
    players: (team.players ?? []).map(player => ({
      ...player,
      history: [...(player.history ?? [])]
    }))
  };

  const playerIdx = next.players.findIndex(player => player.id === playerId);
  if(playerIdx < 0) return { team: next, playerIndex: -1 };

  const player = next.players[playerIdx];
  const isMiss = val === 0;

  if(isMiss){
    player.misses = (player.misses || 0) + 1;
    if(player.misses >= 3){
      if(missDecision === "continue"){
        player.misses = 0;
      } else if(missDecision === "eliminate"){
        player.active = false;
      }
    }
  } else {
    player.misses = 0;
  }

  player.history.push({ score: val, ts: Date.now(), missDecision });
  next.nextPlayerIdx = playerIdx;

  if(!next.players.some(item => item.active)){
    next.active = false;
  }

  if(next.active){
    next.score = applyScoreRules(next.score || 0, val).score;
  }

  return { team: next, playerIndex: playerIdx };
}

export function getNextSoloTurnIndex(players, order, currentTurnIndex){
  if(!order?.length) return currentTurnIndex ?? 0;
  let nextTurnIndex = currentTurnIndex ?? 0;
  let steps = 0;
  do{
    nextTurnIndex = (nextTurnIndex + 1) % order.length;
    steps += 1;
  }while(
    steps <= order.length &&
    !players.find(player => player.id === order[nextTurnIndex])?.active
  );
  return nextTurnIndex;
}

export function shouldEndSoloGame(players){
  return !!players.length && players.every(player => !player.active);
}

export function getNextTeamTurnIndex(teams, order, currentTeamTurnIdx){
  if(!order?.length) return currentTeamTurnIdx ?? 0;
  let nextTeamTurnIdx = currentTeamTurnIdx ?? 0;
  let steps = 0;
  do{
    nextTeamTurnIdx = (nextTeamTurnIdx + 1) % order.length;
    steps += 1;
  }while(
    steps <= order.length &&
    !teams.find(team => team.id === order[nextTeamTurnIdx])?.active
  );
  return nextTeamTurnIdx;
}

export function shouldEndTeamGame(teams){
  const aliveTeams = (teams ?? []).filter(team => team.active);
  return !aliveTeams.some(team => team.players?.some(player => player.active));
}
