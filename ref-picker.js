/* ref-picker.js — selector de árbitros compartido por "Nuevo torneo" y "Árbitros del torneo".
   Lista = REFEREE_POOL (referee-pool.js) + lista importada + árbitros agregados a mano. */
const RefPicker=(()=>{
const KC='fubb5x5_arbitros_manual',KI='fubb5x5_lista_importada';
const CATS=()=>window.CATEGORIES||['A','B','C'];
const norm=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().trim();
const rd=k=>{try{return JSON.parse(localStorage.getItem(k))||[]}catch(e){return[]}};
const wr=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};
const pool=()=>{const seen=new Set(),out=[];[...(window.REFEREE_POOL||[]),...rd(KI),...rd(KC)].forEach(r=>{const k=norm(r.name);if(k&&!seen.has(k)){seen.add(k);out.push(r)}});return out.sort((a,b)=>a.name.localeCompare(b.name))};
const clean=sel=>sel.map(r=>({name:r.name,cat:r.cat,...(r.country?{country:r.country}:{}),...(r.custom?{custom:true}:{})}));
const valid=sel=>sel.length>=2&&sel.every(r=>r.cat);
function mount(el,sel,o={}){
 const locked=new Set((o.locked||[]).map(norm));let q='';
 el.innerHTML=`<input class="inp" id="rp-q" type="search" placeholder="Buscar árbitro por nombre o categoría…" autocomplete="off"><div id="rp-res" class="rp-res"></div>
 <div class="t" style="margin-top:10px" id="rp-st"></div><div id="rp-sel"></div>
 <details class="rp-add"><summary>${IC.plus} Agregar un árbitro que no está en la lista</summary><div class="rp-form"><input class="inp" id="rp-n" placeholder="Nombre completo"><input class="inp" id="rp-c" placeholder="Club o departamento (opcional)"><select class="inp" id="rp-k"><option value="">Categoría</option>${CATS().map(c=>`<option>${c}</option>`).join('')}</select><button id="rp-a" class="cta">Agregar</button></div><div class="rp-err" id="rp-e"></div></details>
 <label class="rp-imp">${IC.ul} Importar lista de árbitros (.txt / .csv, uno por línea: Nombre, Club o departamento, Categoría)<input type="file" id="rp-f" accept=".txt,.csv" hidden></label>`;
 const $=id=>el.querySelector('#'+id),has=n=>sel.some(r=>norm(r.name)==norm(n));
 function res(){const p=pool(),qq=norm(q);let h;
  if(!p.length)h='<div class="rp-hint">La lista de árbitros está vacía. Importala abajo o agregá los árbitros a mano.</div>';
  else if(!qq)h=`<div class="rp-hint">Escribí un nombre o una categoría (${CATS().join(', ')}) para buscar entre los ${p.length} árbitros de la lista.</div>`;
  else{const m=p.filter(r=>!has(r.name)&&(norm(r.name).includes(qq)||norm(r.country).includes(qq)||norm(r.license)==qq)).slice(0,qq.length<=6&&CATS().some(c=>norm(c)==qq)?40:8);
   h=m.map(r=>`<button class="rp-r" data-n="${esc(r.name)}"><span>${esc(r.name)}</span><small>${[r.country,r.license&&'Cat. '+r.license].filter(Boolean).map(esc).join(' · ')}</small>${IC.plus}</button>`).join('')||'<div class="rp-hint">Sin resultados. Usá “Agregar un árbitro que no está en la lista”.</div>'}
  $('rp-res').innerHTML=h}
 function list(){$('rp-st').textContent=`Árbitros seleccionados (${sel.length})`;
  $('rp-sel').innerHTML=sel.map((r,i)=>{const lk=locked.has(norm(r.name));return `<div class="rp-row"><div class="rp-nm"><b>${esc(r.name)}</b> <small>${esc(r.country||'')}${r.custom?' · agregado a mano':''}</small></div><select data-i="${i}" class="rp-cat ${r.cat?'':'rp-need'}"><option value="">Categoría</option>${CATS().map(c=>`<option ${r.cat==c?'selected':''}>${c}</option>`).join('')}</select><button data-x="${i}" ${lk?'disabled title="Tiene juegos registrados, no se puede quitar"':'title="Quitar"'}>${IC.trash}</button></div>`}).join('')||'<div class="rp-hint">Todavía no hay árbitros seleccionados.</div>';
  o.onChange&&o.onChange()}
 el.addEventListener('input',e=>{if(e.target.id=='rp-q'){q=e.target.value;res()}});
 el.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
  if(b.dataset.n){const r=pool().find(x=>x.name==b.dataset.n);if(r&&!has(r.name)){sel.push({name:r.name,country:r.country||'',cat:r.license||''});q='';$('rp-q').value='';res();list()}}
  else if(b.dataset.x!==undefined&&!b.disabled){sel.splice(+b.dataset.x,1);res();list()}
  else if(b.id=='rp-a'){const n=$('rp-n').value.trim().replace(/\s+/g,' '),c=$('rp-c').value.trim(),k=$('rp-k').value,er=$('rp-e');
   if(!n)return er.textContent='Escribí el nombre completo del árbitro.';if(has(n))return er.textContent='Ese árbitro ya está seleccionado.';if(!k)return er.textContent='Elegí una categoría.';
   er.textContent='';sel.push({name:n,country:c,cat:k,custom:!pool().some(x=>norm(x.name)==norm(n))||undefined});
   if(!pool().some(x=>norm(x.name)==norm(n))){const cu=rd(KC);cu.push({name:n,country:c});wr(KC,cu)}
   $('rp-n').value='';$('rp-c').value='';$('rp-k').value='';res();list()}});
 el.addEventListener('change',e=>{if(e.target.classList.contains('rp-cat')){sel[+e.target.dataset.i].cat=e.target.value;list()}
  else if(e.target.id=='rp-f'){const f=e.target.files[0];if(!f)return;f.text().then(t=>{const im=rd(KI),seen=new Set(im.map(r=>norm(r.name)));
   t.split(/\r?\n/).map(l=>l.split(/[,;\t]/).map(s=>s.trim().replace(/^"|"$/g,''))).filter(a=>a[0]&&!/^(name|referee|nombre|arbitro|árbitro)$/i.test(a[0])).forEach(a=>{if(!seen.has(norm(a[0]))){seen.add(norm(a[0]));im.push({name:a[0],country:a[1]||'',...(CATS().includes((a[2]||'').toUpperCase())?{license:a[2].toUpperCase()}:{})})}});
   wr(KI,im);res()})}});
 res();list()}
return{mount,pool,clean,valid}})();
