// team-app.js (team, rescue)

function escapeHtml(s){return String(s??"").replace(/[&<>"']/g,m=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[m]))}
const LS="molkky_team_rescue";
const def=()=>({teams:[],order:[],teamTurn:0,playerTurn:0,ended:false});
let T=load(); function load(){try{const r=localStorage.getItem(LS);return r?JSON.parse(r):def()}catch{ return def()}}
function save(){localStorage.setItem(LS,JSON.stringify(T))}
const $=id=>document.getElementById(id);
const el={grid:$("teamsGrid"),empty:$("emptyState"),name:$("teamName"),add:$("addTeam"),
  shuffle:$("shuffle"),shuffleAlt:$("shuffleAlt"),undo:$("undo"),undoAlt:$("undoAlt"),
  free:$("freeInput"),go:$("submitFree"),title:$("turnTitle"),toast:$("toast")};

function uid(){return Math.random().toString(36).slice(2,9)}
function getTeam(id){return T.teams.find(t=>t.id===id)}
function aliveTeams(){return T.teams.filter(t=>t.active!==false)}
function currTeam(){
  if(T.ended||!T.teams.length) return null;
  let i=T.teamTurn%T.order.length;
  for(let k=0;k<T.order.length;k++){
    const t=getTeam(T.order[(i+k)%T.order.length]); if(t?.active!==false){ T.teamTurn=(i+k)%T.order.length; return t; }
  } return null;
}
function currPlayerScoped(){
  const team=currTeam(); if(!team) return {team:null, player:null};
  if(!team.players?.length) return {team, player:null};
  let i=T.playerTurn%team.players.length;
  for(let k=0;k<team.players.length;k++){
    const p=team.players[(i+k)%team.players.length]; if(p?.active!==false){ T.playerTurn=(i+k)%team.players.length; return {team, player:p}; }
  } return {team, player:null};
}
function nextTurn(){
  const team=currTeam(); if(!team) return;
  if(team.players?.length){
    let c=0; do{ T.playerTurn=(T.playerTurn+1)%team.players.length; c++; if(team.players[T.playerTurn]?.active!==false) break; } while(c<=team.players.length);
  }
  let ct=0; do{ T.teamTurn=(T.teamTurn+1)%T.order.length; ct++; if(getTeam(T.order[T.teamTurn])?.active!==false) break; } while(ct<=T.order.length);
}
function rules(old,v){const n=(old||0)+(v||0); if(n===50) return {score:50,win:true,over:false}; if(n>50) return {score:25,win:false,over:true}; return {score:n,win:false,over:false};}

function render(){
  const cur=currPlayerScoped();
  el.title.textContent = T.ended ? "Peli päättynyt" : ("Vuorossa: " + (cur.team?.name||"–") + (cur.player?(" – "+cur.player.name):""));
  el.grid.innerHTML="";
  if(!T.teams.length){ el.empty?.classList.remove("hidden"); } else { el.empty?.classList.add("hidden"); }
  T.teams.forEach(t=>{
    const a=document.createElement("article"); a.className="team-card";
    a.innerHTML=`<div class="card__header"><div class="card__title">${escapeHtml(t.name)}</div>
      <div class="chips"><span class="chip">🥇 ${t.score||0}</span></div></div>
      <div class="card__body"><div class="card__score">Pisteet: ${t.score||0}</div>
      ${(t.players?.length? `<ul class="chips">${t.players.map(p=>`<li class="chip">${escapeHtml(p.name)}</li>`).join("")}</ul>` : `<p class="muted">Ei pelaajia.</p>`)}</div>`;
    el.grid.appendChild(a);
  });
  const canSh=T.teams.length>=2, canUn=T.teams.some(t=>t.players?.some(p=>p.hist?.length));
  [el.shuffle,el.shuffleAlt].forEach(b=>b&&(b.disabled=!canSh));
  [el.undo,el.undoAlt].forEach(b=>b&&(b.disabled=!canUn));
  save();
}

function addTeam(){
  const n=(el.name.value||"").trim(); if(!n) return toast("Anna tiimin nimi");
  T.teams.push({id:uid(),name:n,score:0,active:true,players:[{id:uid(),name:"P1",active:true,hist:[]},{id:uid(),name:"P2",active:true,hist:[]}]});
  T.order=T.teams.map(t=>t.id); el.name.value=""; render();
}
function shuffle(){
  if(T.teams.length<2) return;
  const a=[...T.teams.map(t=>t.id)];
  for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]];}
  T.order=a; T.teamTurn=0; T.playerTurn=0; render();
}
function throwV(v){
  if(T.ended) return;
  const {team,player}=currPlayerScoped(); if(!team||!player) return;
  v=Number(v)||0; player.hist=player.hist||[]; player.hist.push(v);
  if(v===0){ player.miss=(player.miss||0)+1; if(player.miss>=3){ player.active=false; toast(`${player.name} tippui`) } }
  else { player.miss=0; const r=rules(team.score||0,v); team.score=r.score; if(r.win){ T.ended=true; toast(`${team.name} voitti!`) } if(r.over){ toast(`Yli 50 → 25`) } }
  if(team.players.every(p=>p.active===false)) team.active=false;
  if(T.teams.every(t=>t.active===false)){ T.ended=true; toast("Kaikki tiimit tippuivat") }
  next(); render();
}
function undo(){
  for(let ti=T.teams.length-1; ti>=0; ti--){
    const t=T.teams[ti];
    for(let pi=(t.players?.length||0)-1; pi>=0; pi--){
      const p=t.players[pi];
      if(p.hist?.length){
        const v=p.hist.pop();
        if(v===0){ p.miss=Math.max(0,(p.miss||0)-1); p.active=true; }
        else{
          let s=0; t.players.forEach(pl=>{ (pl.hist||[]).forEach(x=>{ const r=rules(s===-1?0:s,x); s=r.score; })}); t.score=s;
        }
        T.ended=false; toast("Peruttu"); render(); return;
      }
    }
  }
}
function toast(t){ if(!el.toast) return; el.toast.textContent=t; el.toast.classList.add("show"); setTimeout(()=>el.toast.classList.remove("show"),1200); }

el.add?.addEventListener("click",addTeam);
el.shuffle?.addEventListener("click",shuffle);
el.shuffleAlt?.addEventListener("click",shuffle);
el.undo?.addEventListener("click",undo);
el.undoAlt?.addEventListener("click",undo);
el.go?.addEventListener("click",()=>{ const val=(el.free.value||"").trim(); if(val==="") return; const n=Number(val); if(n<0||n>12||Number.isNaN(n)) return toast("0–12"); throwV(n); el.free.value=""; });

const pad=document.getElementById("throwPad");
if(pad && !pad.dataset.bound){
  pad.addEventListener("click",(e)=>{ const b=e.target.closest("[data-score]"); if(!b) return; throwV(Number(b.dataset.score||0)); });
  pad.dataset.bound="1";
}

render();
