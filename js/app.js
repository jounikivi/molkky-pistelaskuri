// app.js (solo, rescue)

function escapeHtml(s){return String(s??"").replace(/[&<>"']/g,m=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[m]))}
const LS="molkky_solo_rescue";
const def=()=>({players:[],order:[],turnIndex:0,ended:false});
let S=load(); function load(){try{const r=localStorage.getItem(LS);return r?JSON.parse(r):def()}catch{ return def()}}
function save(){localStorage.setItem(LS,JSON.stringify(S))}
const $=id=>document.getElementById(id);
const els={grid:$("playersGrid"),empty:$("emptyState"),name:$("playerName"),add:$("addPlayer"),shuffle:$("shuffle"),undo:$("undo"),
  shuffleAlt:$("shuffleAlt"),undoAlt:$("undoAlt"),free:$("freeInput"),go:$("submitFree"),title:$("turnTitle"),toast:$("toast")};

function uid(){return Math.random().toString(36).slice(2,9)}
function getP(id){return S.players.find(p=>p.id===id)}
function curr(){
  if(S.ended||!S.players.length) return null;
  let i=S.turnIndex%S.order.length;
  for(let k=0;k<S.order.length;k++){
    const p=getP(S.order[(i+k)%S.order.length]); if(p?.active!==false){ S.turnIndex=(i+k)%S.order.length; return p; }
  } return null;
}
function next(){ if(!S.order.length) return; let c=0; do{ S.turnIndex=(S.turnIndex+1)%S.order.length; c++; if(getP(S.order[S.turnIndex])?.active!==false) break; } while(c<=S.order.length); }

function applyRules(old,v){const n=(old||0)+(v||0); if(n===50) return {score:50,win:true,over:false}; if(n>50) return {score:25,win:false,over:true}; return {score:n,win:false,over:false};}

function render(){
  // title
  const p=curr(); $("turnTitle").textContent = S.ended? "Peli päättynyt" : ("Vuorossa: " + (p?.name||"–"));
  // players
  els.grid.innerHTML="";
  if(!S.players.length){ els.empty?.classList.remove("hidden"); } else { els.empty?.classList.add("hidden"); }
  S.players.forEach(p=>{
    const a=document.createElement("article"); a.className="player-card";
    a.innerHTML=`<div class="card__header"><div class="card__title">${escapeHtml(p.name)}</div>
      <div class="chips"><span class="chip">🥇 ${p.score||0}</span></div></div>
      <div class="card__body"><div class="card__score">Pisteet: ${p.score||0}</div></div>`;
    els.grid.appendChild(a);
  });
  // buttons
  const canSh=S.players.length>=2, canUn=S.players.some(p=>p.hist?.length);
  [els.shuffle,els.shuffleAlt].forEach(b=>b&&(b.disabled=!canSh));
  [els.undo,els.undoAlt].forEach(b=>b&&(b.disabled=!canUn));
  save();
}

function addPlayer(){
  const n=(els.name.value||"").trim(); if(!n) return toast("Anna nimi");
  S.players.push({id:uid(),name:n,score:0,hist:[],active:true});
  S.order=S.players.map(p=>p.id); els.name.value=""; render();
}
function shuffle(){
  if(S.players.length<2) return;
  const a=[...S.players.map(p=>p.id)];
  for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]];}
  S.order=a; S.turnIndex=0; render();
}
function throwV(v){
  if(S.ended) return;
  const p=curr(); if(!p) return;
  v=Number(v)||0;
  p.hist=p.hist||[]; p.hist.push(v);
  if(v===0){ p.miss=(p.miss||0)+1; if(p.miss>=3){ p.active=false; toast(`${p.name} tippui`) } }
  else { p.miss=0; const r=applyRules(p.score||0,v); p.score=r.score; if(r.win){ S.ended=true; toast(`${p.name} voitti!`) } if(r.over){ toast(`Yli 50 → 25`) } }
  if(S.players.every(x=>x.active===false)){ S.ended=true; toast("Kaikki tippuivat") }
  next(); render();
}
function undo(){
  const last=[...S.players].reverse().find(p=>p.hist?.length);
  if(!last) return;
  const v=last.hist.pop();
  if(v===0){ last.miss=Math.max(0,(last.miss||0)-1); last.active=true; }
  else{
    last.score=0;
    (last.hist||[]).forEach(s=>{ const r=applyRules(last.score,s); last.score=r.score; });
  }
  S.ended=false; toast("Peruttu"); render();
}
function toast(t){ if(!els.toast) return; els.toast.textContent=t; els.toast.classList.add("show"); setTimeout(()=>els.toast.classList.remove("show"),1200); }

// events
els.add?.addEventListener("click",addPlayer);
els.shuffle?.addEventListener("click",shuffle);
els.shuffleAlt?.addEventListener("click",shuffle);
els.undo?.addEventListener("click",undo);
els.undoAlt?.addEventListener("click",undo);
els.go?.addEventListener("click",()=>{ const val=(els.free.value||"").trim(); if(val==="") return; const n=Number(val); if(n<0||n>12||Number.isNaN(n)) return toast("0–12"); throwV(n); els.free.value="";});

// delegoitu heittoruudukko (EI tuplia)
const pad=document.getElementById("throwPad");
if(pad && !pad.dataset.bound){
  pad.addEventListener("click",(e)=>{ const b=e.target.closest("[data-score]"); if(!b) return; throwV(Number(b.dataset.score||0)); });
  pad.dataset.bound="1";
}

render();
