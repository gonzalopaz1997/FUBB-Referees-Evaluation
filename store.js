const APP_VERSION=8;   // sumar 1 en cada versión entregada (también en sw.js)
/* Hay dos conjuntos de datos en el navegador:
   - "Mi evaluación": el juego que evalúa el evaluador (un juego por evaluación).
   - "Consolidado": lo que carga el departamento arbitral uniendo los .txt de muchos evaluadores.
   El modo activo se guarda en localStorage y todas las páginas trabajan sobre ese conjunto. */
const Store={KE:'fubb5x5_evaluacion',KC:'fubb5x5_consolidado',KM:'fubb5x5_modo',
get mode(){try{return localStorage.getItem(this.KM)=='cons'?'cons':'eval'}catch(e){return 'eval'}},
setMode(m){try{localStorage.setItem(this.KM,m)}catch(e){}},
get K(){return this.mode=='cons'?this.KC:this.KE},
// Un juego abierto sin jugadas no se guarda ni se exporta
clean(t){if(t&&t.games){t.games=t.games.filter(g=>g.closed||(g.plays&&g.plays.length)||(!t.consolidated&&t.games.length==1));t.games.forEach((g,i)=>g.n=i+1)}return t},
fix(t){if(t)(t.games||[]).forEach(g=>(g.plays||[]).forEach(p=>{if(p.call&&LEGACY_CALLS[p.call])p.call=LEGACY_CALLS[p.call];if(p.tags&&p.tags.doubleWhistle){p.tags.crossedCallDw='neg';delete p.tags.doubleWhistle}if(p.tags&&p.tags.clearImpactCip)delete p.tags.clearImpactCip;if(p.incident=='reboundFoul')p.incident='disruptive';if(p.q)p.crucial=isCrucial(p);if(!Array.isArray(p.refs)||!p.refs.length)p.refs=p.referee?[{name:p.referee,role:p.role}]:[];p.referee=(p.refs[0]||{}).name;p.role=(p.refs[0]||{}).role;
if(!Array.isArray(p.reviews)){p.reviews=[];(p.review||[]).forEach(k=>{const t=/Challenge/.test(k)?'challenge':'irs';if(!p.reviews.some(r=>r.type==t))p.reviews.push({type:t,use:/^correct/.test(k)?'ok':'ko',decision:/^correct/.test(k)?(okCall(p.call)?'ok':'ko'):undefined,refs:[p.referee].filter(Boolean)})})}if(!p.rules)p.rules={}}));return t},
get(){try{const t=JSON.parse(localStorage.getItem(this.K));if(t){this.clean(t);this.fix(t)}return t}catch(e){return null}},
set(t){try{localStorage.setItem(this.K,JSON.stringify(t))}catch(e){alert('El navegador no tiene más espacio para guardar los datos. Descargá un respaldo y borrá juegos que ya no necesites.');throw e}},
clear(){try{localStorage.removeItem(this.K)}catch(e){}},
cur(t){return t.games.find(g=>!g.closed)},
newGame(t){const g={id:Date.now(),n:t.games.length+1,closed:false,plays:[],evaluator:t.evaluator||'',tournament:t.name||'',date:t.date||new Date().toLocaleDateString('en-CA'),teamA:'',teamB:''};t.games.push(g);return g},
name(t){const d=new Date(),p=n=>String(n).padStart(2,'0'),g=t.games[0]||{};
const base=t.consolidated?`Consolidado FUBB 5x5 ${p(d.getDate())}${p(d.getMonth()+1)}${d.getFullYear()} ${p(d.getHours())}${p(d.getMinutes())}`
:`Evaluación 5x5 ${g.date||''} ${g.teamA||'Local'} vs ${g.teamB||'Visitante'} - ${t.evaluator||'Evaluador'}`;
return (base+'.txt').replace(/[\\/:*?"<>|]/g,'-').replace(/\s+/g,' ')},
download(t){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(this.clean(JSON.parse(JSON.stringify(t))),null,1)],{type:'text/plain'}));a.download=this.name(t);a.click()},
text(t){return JSON.stringify(this.clean(JSON.parse(JSON.stringify(t))),null,1)},
/* Compartir: en celulares y tablets abre el menú Compartir con el .txt adjunto; si el navegador no puede
   compartir archivos, descarga el .txt y abre un correo nuevo dirigido a CONFIG.sendTo (el archivo se adjunta a mano). */
async share(t){const name=this.name(t),g=t.games[0]||{},subj=`Evaluación FUBB 5x5 · ${g.date||''} · ${g.teamA||'Local'} vs ${g.teamB||'Visitante'} · ${t.evaluator||''}`;
 const body=`Adjunto la evaluación del partido ${g.teamA||'Local'} vs ${g.teamB||'Visitante'} (${g.date||''}).\nEvaluador: ${t.evaluator||''}\nArchivo: ${name}`;
 try{const f=new File([this.text(t)],name,{type:'text/plain'});if(navigator.canShare&&navigator.canShare({files:[f]})){await navigator.share({files:[f],title:subj,text:body});return 'shared'}}catch(e){if(e&&e.name=='AbortError')return 'cancel'}
 this.download(t);setTimeout(()=>{location.href=`mailto:${encodeURIComponent(sendTo())}?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(body+'\n\n(Adjuntá el archivo descargado)')}`},600);return 'mail'},
async load(f){const t=JSON.parse(await f.text());if(!t.games||!t.referees)throw new Error('archivo inválido');this.clean(t);this.fix(t);this.set(t);return t},
/* Consolidación: une los .txt exportados por cada evaluador en un solo conjunto de juegos.
   - Un juego se identifica por fecha + competencia + equipos; si el mismo juego llega en varios archivos
     se guarda una sola vez (si sus jugadas cambiaron, queda la versión del archivo más reciente).
   - Los juegos sin jugadas se ignoran. Todos los juegos cargados quedan cerrados.
   - Cada juego guarda el evaluador, la competencia y el archivo de origen. */
async merge(files,onStep){let T=this.get();const fresh=!T;
 if(!T)T={name:'Consolidado de evaluaciones',referees:[],games:[],consolidated:true};
 const nk=x=>String(x||'').trim().toLowerCase(),key=g=>[g.date||'',nk(g.tournament),nk(g.teamA),nk(g.teamB)].join('|');   // no hay dos partidos el mismo día, de la misma competencia, con los mismos equipos
 const idx=new Map(T.games.map((g,i)=>[g.src||key(g),i]));
 const sum={files:0,newG:0,upd:0,same:0,empty:0,bad:[],plays:0};let i=0;
 for(const f of files){i++;onStep&&onStep(i,files.length);let t;
  try{t=JSON.parse(await f.text());if(!Array.isArray(t.games)||!Array.isArray(t.referees))throw 0;this.fix(t)}catch(e){sum.bad.push(f.name);continue}
  sum.files++;const cat={};t.referees.forEach(r=>{cat[r.name]=r.cat;if(!T.referees.some(x=>x.name==r.name))T.referees.push({name:r.name,cat:r.cat})});
  for(const g of t.games){if(!g.plays||!g.plays.length){if(g.closed)sum.empty++;continue}
   g.plays.forEach(p=>{if(p.referee&&!T.referees.some(x=>x.name==p.referee))T.referees.push({name:p.referee,cat:cat[p.referee]||'–'})});
   const gt={...g,tournament:g.tournament||t.name||''},k=key(gt),ng={...gt,closed:true,evaluator:g.evaluator||t.evaluator||'',tournament:g.tournament||t.name||'',file:f.name,fileTime:f.lastModified||0,src:k};
   if(idx.has(k)){const j=idx.get(k),old=T.games[j];
    if(JSON.stringify(old.plays)===JSON.stringify(ng.plays)&&(old.difficulty||'')==(ng.difficulty||'')){sum.same++;continue}
    if((ng.fileTime||0)>=(old.fileTime||0)){ng.n=old.n;T.games[j]=ng;sum.upd++}else sum.same++}
   else{ng.n=T.games.length+1;idx.set(k,T.games.length);T.games.push(ng);sum.newG++;sum.plays+=ng.plays.length}}}
 this.set(T);return{T,sum,fresh}}};
if(navigator.storage&&navigator.storage.persist)navigator.storage.persist();
if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
const roleName=r=>(ROLES[r]||[r])[0],roleAb=r=>(ROLES[r]||[r,r])[1];
const okCall=c=>c=='CCM'||c=='CNC',allPlays=t=>t.games.flatMap(g=>g.plays);
const callKey=c=>LEGACY_CALLS_K[c]||c,callLbl=c=>CALL_NAMES[callKey(c)]||c||'–',callAb=c=>CALL_SHORT[callKey(c)]||c||'–';
const LEGACY_CALLS_K={CC:'CCM',IC:'ICCM',INC:'ICNC'};
const LEGACY_CALLS={CC:'CCM',IC:'ICCM',INC:'ICNC'};   // nombres anteriores del resultado del cobro (archivos viejos)
const lbl0=k=>{for(const c of PANEL_BUTTONS){const b=c.buttons.find(b=>b.key==k);if(b)return b.label}return (window.LEGACY_LABELS||{})[k]||k};
const lbl=k=>{const l=lbl0(k);return k=='other'?'Otro':l},nm=k=>plain(lbl(k));
const refsTxt=p=>(p.refs||[]).map(r=>roleAb(r.role)+' '+r.name).join(' + ');
const sendTo=()=>(window.CONFIG||{}).sendTo||'';
const gameTitle=g=>`${g.teamA||'Local'} vs ${g.teamB||'Visitante'}`;
const svg=p=>`<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
const TH='<path d="M7 11v9H4v-9zM7 11l4-8c1.8 0 3 1.2 3 3l-1 4h6a2 2 0 012 2l-1.4 6a2 2 0 01-2 1.6H7"/>';
const IC={home:svg('<path d="M3 11l9-8 9 8"/><path d="M5 10v10h5v-6h4v6h5V10"/>'),stats:svg('<path d="M4 20v-9M10 20V4M16 20v-6M2 20h20"/>'),
play:svg('<circle cx="12" cy="12" r="9"/><path d="M10 8.5l5 3.5-5 3.5z"/>'),list:svg('<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>'),
eval:svg('<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4h6v3H9zM9 14l2 2 4-4"/>'),book:svg('<path d="M5 4h11a3 3 0 013 3v13H8a3 3 0 01-3-3zM5 17a3 3 0 013-3h11"/>'),
ok:svg('<circle cx="12" cy="12" r="9"/><path d="M8 12.5l3 3 5-6"/>'),no:svg('<circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/>'),
info:svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5h.01"/>'),star:svg('<path d="M12 3l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.8l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8z"/>'),flag:svg('<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>'),swap:svg('<path d="M4 8h14M14 4l4 4-4 4M20 16H6M10 12l-4 4 4 4"/>'),pin:svg('<path d="M12 21s7-6.2 7-11.5A7 7 0 005 9.5C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>'),close:svg('<path d="M6 6l12 12M18 6L6 18"/>'),ball:svg('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3v18M6 5.5c3 3.5 3 9.5 0 13M18 5.5c-3 3.5-3 9.5 0 13"/>'),warn:svg('<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17h.01"/>'),dl2:svg('<path d="M6 3h9l4 4v14H6zM14 3v5h5M9 14h6M9 17h6"/>'),
trend:svg('<path d="M3 17l6-6 4 4 8-8M15 7h6v6"/>'),plus:svg('<path d="M12 5v14M5 12h14"/>'),users:svg('<circle cx="9" cy="8" r="3.2"/><path d="M3 20v-1a6 6 0 0112 0v1M16 4.6a3.2 3.2 0 010 6.2M21 20v-1a5 5 0 00-3-4.6"/>'),trash:svg('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'),edit:svg('<path d="M4 20h4L19 9l-4-4L4 16zM13 7l4 4"/>'),
dl:svg('<path d="M12 4v11M7 11l5 5 5-5M4 20h16"/>'),ul:svg('<path d="M12 16V5M7 9l5-5 5 5M4 20h16"/>'),back:svg('<path d="M19 12H5M11 6l-6 6 6 6"/>'),
up:svg(TH),down:svg(`<g transform="translate(0 24) scale(1 -1)">${TH}</g>`),
up2:svg(`<g transform="translate(0 6) scale(.62)">${TH}</g><g transform="translate(11 6) scale(.62)">${TH}</g>`),
down2:svg(`<g transform="translate(0 18) scale(.62 -.62)">${TH}</g><g transform="translate(11 18) scale(.62 -.62)">${TH}</g>`)};
const COURT='<svg viewBox="0 0 100 100" preserveAspectRatio="none"><g fill="none" stroke="#7d7a68" stroke-width="1.3"><rect x="33.7" y="0" width="32.6" height="50"/><path d="M8 0V28A42 47 0 0 0 92 28V0"/><path d="M38 50A12 15 0 0 0 62 50"/><path d="M38 50A12 15 0 0 1 62 50" stroke-dasharray="3 3"/><path d="M41.7 10.5A8.3 10 0 0 0 58.3 10.5"/><path d="M38 100A12 15 0 0 1 62 100"/><path d="M44 7.5H56" stroke="#a39665"/><ellipse cx="50" cy="10.5" rx="1.6" ry="1.8" stroke="#a39665"/></g></svg>';
// Encabezado: logo, título, accesos y a la derecha el evento + evaluador + versión
const hdrInfo=T=>!T?'':T.consolidated?`<b>Consolidado</b> · ${T.games.length} ${T.games.length===1?'juego':'juegos'}`:`${esc(T.name||'')}${T.evaluator?`<br>Evaluador: <b>${esc(T.evaluator)}</b>`:''}`;
/* Aviso de datos ficticios: se muestra en todas las pantallas mientras los datos cargados sean los de ejemplo */
const isDemo=()=>{try{const t=Store.get();return !!(t&&t.example)}catch(e){return false}};
const DEMO_NOTE='<p style="border:2px solid #c99a00;color:#8a6500;font-weight:800;padding:6px 10px;text-transform:uppercase;letter-spacing:.06em">Datos de demostración · No reales — informe generado con datos ficticios de ejemplo</p>';
const hdr=(t,ev,nav=1)=>`<header class="hd"><a class="lg" href="index.html"><img src="logo.png" alt="FUBB"></a><span class="ti">${t}</span>${isDemo()?`<span class="demo" title="Estos datos son ficticios: sirven solo para mostrar cómo funciona la herramienta">Datos de demostración · No reales</span>`:''}${nav?`<a class="ib" href="statistics-view.html" title="Estadísticas">${IC.stats}</a><a class="ib" href="index.html" title="Inicio">${IC.home}</a>`:''}<div class="ev">${(ev||'').replace(/^<br>/,'')}<a class="vr" href="versions.html" title="Historial de versiones">Versión ${APP_VERSION}</a></div></header>`;
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
