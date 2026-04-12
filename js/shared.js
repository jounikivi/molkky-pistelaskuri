export function sanitizeName(raw){
  return String(raw ?? "")
    .replace(/[<>"]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 40);
}

export function canonName(name){
  return sanitizeName(name).toLowerCase();
}

export function sortByTimestamp(items){
  return [...(items ?? [])].sort((a,b)=>(a?.ts ?? 0) - (b?.ts ?? 0));
}

export function getLatestHistoryEntry(collections){
  let latest = null;

  for(const group of (collections ?? [])){
    const history = group?.history ?? [];
    const rec = history[history.length - 1];
    if(!rec) continue;

    if(!latest || (rec.ts ?? 0) > (latest.rec.ts ?? 0)){
      latest = { ...group, rec };
    }
  }

  return latest;
}
