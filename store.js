const Store={K:'fubb5x5_torneo',
get(){try{const t=JSON.parse(localStorage.getItem(this.K));if(t)(t.games||[]).forEach(g=>(g.plays||[]).forEach(p=>{if(p.tags&&p.tags.doubleWhistle){p.tags.crossedCallDw='neg';delete p.tags.doubleWhistle}}));return t}catch(e){return null}},
set(t){try{localStorage.setItem(this.K,JSON.stringify(t))}catch(e){alert('El navegador no tiene más espacio para guardar los datos. Descargá un respaldo y borrá juegos que ya no necesites.');throw e}},
cur(t){return t.games.find(g=>!g.closed)},
newGame(t){const g={id:Date.now(),n:t.games.length+1,closed:false,plays:[],evaluator:t.evaluator||'',tournament:t.name||''};t.games.push(g);return g},
name(t){const d=new Date(),p=n=>String(n).padStart(2,'0');return `${t.name} Datos ${p(d.getDate())}${p(d.getMonth()+1)}${d.getFullYear()} ${p(d.getHours())}${p(d.getMinutes())}.txt`.replace(/[\\/:*?"<>|]/g,'-')},
download(t){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(t,null,1)],{type:'text/plain'}));a.download=this.name(t);a.click()},
async load(f){const t=JSON.parse(await f.text());if(!t.games||!t.referees)throw new Error('archivo inválido');this.set(t);return t},
/* Consolidación: une los .txt exportados por cada evaluador en un solo conjunto de juegos.
   - Un juego se identifica por su id interno + fecha + equipos; si el mismo juego llega en varios archivos
     se guarda una sola vez (si sus jugadas cambiaron, queda la versión del archivo más reciente).
   - Los juegos sin jugadas se ignoran. Todos los juegos cargados quedan cerrados.
   - Cada juego guarda el evaluador, el torneo y el archivo de origen. */
async merge(files,onStep){let T=this.get();const fresh=!T;
 if(!T)T={name:'Consolidado de evaluaciones',date:'',days:1,referees:[],games:[],consolidated:true};
 const nk=x=>String(x||'').trim().toLowerCase(),key=g=>[g.id,g.date||'',nk(g.teamA),nk(g.teamB)].join('|');
 const idx=new Map(T.games.map((g,i)=>[g.src||key(g),i]));
 const sum={files:0,newG:0,upd:0,same:0,empty:0,bad:[],plays:0};let i=0;
 for(const f of files){i++;onStep&&onStep(i,files.length);let t;
  try{t=JSON.parse(await f.text());if(!Array.isArray(t.games)||!Array.isArray(t.referees))throw 0}catch(e){sum.bad.push(f.name);continue}
  sum.files++;const cat={};t.referees.forEach(r=>{cat[r.name]=r.cat;if(!T.referees.some(x=>x.name==r.name))T.referees.push({name:r.name,cat:r.cat})});
  for(const g of t.games){if(!g.plays||!g.plays.length){if(g.closed)sum.empty++;continue}
   g.plays.forEach(p=>{if(p.referee&&!T.referees.some(x=>x.name==p.referee))T.referees.push({name:p.referee,cat:cat[p.referee]||'–'})});
   const k=key(g),ng={...g,closed:true,evaluator:g.evaluator||t.evaluator||'',tournament:g.tournament||t.name||'',file:f.name,fileTime:f.lastModified||0,src:k};
   if(idx.has(k)){const j=idx.get(k),old=T.games[j];
    if(JSON.stringify(old.plays)===JSON.stringify(ng.plays)&&(old.difficulty||'')==(ng.difficulty||'')){sum.same++;continue}
    if((ng.fileTime||0)>=(old.fileTime||0)){ng.n=old.n;T.games[j]=ng;sum.upd++}else sum.same++}
   else{ng.n=T.games.length+1;idx.set(k,T.games.length);T.games.push(ng);sum.newG++;sum.plays+=ng.plays.length}}}
 T.days=Math.max(T.days||1,...T.games.map(g=>+g.day||1));this.set(T);return{T,sum,fresh}}};
if(navigator.storage&&navigator.storage.persist)navigator.storage.persist();
if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js');
const roleName=r=>(ROLES[r]||[r])[0],roleAb=r=>(ROLES[r]||[r,r])[1];
const okCall=c=>c=='CC'||c=='CNC',allPlays=t=>t.games.flatMap(g=>g.plays),nOk=a=>a.filter(p=>okCall(p.call)).length,nKo=a=>a.filter(p=>!okCall(p.call)).length;
const lbl0=k=>{for(const c of PANEL_BUTTONS){const b=c.buttons.find(b=>b.key==k);if(b)return b.label}return k};

const lbl=k=>{const l=lbl0(k);return k=='other'?'Otro':l},nm=k=>plain(lbl(k));
const svg=p=>`<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
const TH='<path d="M7 11v9H4v-9zM7 11l4-8c1.8 0 3 1.2 3 3l-1 4h6a2 2 0 012 2l-1.4 6a2 2 0 01-2 1.6H7"/>';
const IC={home:svg('<path d="M3 11l9-8 9 8"/><path d="M5 10v10h5v-6h4v6h5V10"/>'),stats:svg('<path d="M4 20v-9M10 20V4M16 20v-6M2 20h20"/>'),
play:svg('<circle cx="12" cy="12" r="9"/><path d="M10 8.5l5 3.5-5 3.5z"/>'),list:svg('<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>'),
eval:svg('<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4h6v3H9zM9 14l2 2 4-4"/>'),book:svg('<path d="M5 4h11a3 3 0 013 3v13H8a3 3 0 01-3-3zM5 17a3 3 0 013-3h11"/>'),
ok:svg('<circle cx="12" cy="12" r="9"/><path d="M8 12.5l3 3 5-6"/>'),no:svg('<circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/>'),
info:svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5h.01"/>'),star:svg('<path d="M12 3l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.8l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8z"/>'),flag:svg('<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>'),swap:svg('<path d="M4 8h14M14 4l4 4-4 4M20 16H6M10 12l-4 4 4 4"/>'),rot:svg('<path d="M20 11a8 8 0 10-2.3 5.7M20 4v7h-7"/>'),pin:svg('<path d="M12 21s7-6.2 7-11.5A7 7 0 005 9.5C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>'),close:svg('<path d="M6 6l12 12M18 6L6 18"/>'),ball:svg('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3v18M6 5.5c3 3.5 3 9.5 0 13M18 5.5c-3 3.5-3 9.5 0 13"/>'),warn:svg('<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17h.01"/>'),dl2:svg('<path d="M6 3h9l4 4v14H6zM14 3v5h5M9 14h6M9 17h6"/>'),
plus:svg('<path d="M12 5v14M5 12h14"/>'),users:svg('<circle cx="9" cy="8" r="3.2"/><path d="M3 20v-1a6 6 0 0112 0v1M16 4.6a3.2 3.2 0 010 6.2M21 20v-1a5 5 0 00-3-4.6"/>'),trash:svg('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'),edit:svg('<path d="M4 20h4L19 9l-4-4L4 16zM13 7l4 4"/>'),
dl:svg('<path d="M12 4v11M7 11l5 5 5-5M4 20h16"/>'),ul:svg('<path d="M12 16V5M7 9l5-5 5 5M4 20h16"/>'),back:svg('<path d="M19 12H5M11 6l-6 6 6 6"/>'),
up:svg(TH),down:svg(`<g transform="translate(0 24) scale(1 -1)">${TH}</g>`),
up2:svg(`<g transform="translate(0 6) scale(.62)">${TH}</g><g transform="translate(11 6) scale(.62)">${TH}</g>`),
down2:svg(`<g transform="translate(0 18) scale(.62 -.62)">${TH}</g><g transform="translate(11 18) scale(.62 -.62)">${TH}</g>`)};
const COURT='<svg viewBox="0 0 100 100" preserveAspectRatio="none"><g fill="none" stroke="#9fbbe0" stroke-width="1.3"><rect x="33.7" y="0" width="32.6" height="41.4"/><path d="M6 0V21.4A45 48.2 0 0 0 94 21.4V0"/><path d="M38 41.4A12 12.9 0 0 0 62 41.4"/><path d="M38 41.4A12 12.9 0 0 1 62 41.4" stroke-dasharray="3 3"/><path d="M41.7 11.25A8.3 8.9 0 0 0 58.3 11.25"/><path d="M38 100A12 12.9 0 0 1 62 100"/><path d="M44 8.6H56" stroke="#ffd90f"/><ellipse cx="50" cy="11.25" rx="1.6" ry="1.7" stroke="#ffd90f"/></g></svg>';
const hdr=(t,ev,nav=1)=>`<header class="hd"><a class="lg" href="index.html" title="Inicio"><span class="lgb"><img src="logo.png" alt="FUBB"></span><span class="bd5">5x5</span></a><span class="ti">${t}</span>${nav?`<a class="ib" href="statistics-view.html" title="Estadísticas">${IC.stats}</a><a class="ib" href="index.html" title="Inicio">${IC.home}</a>`:''}<div class="ev">${ev||''}</div></header>`;
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
