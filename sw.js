// Versión de la caché: sumar 1 en cada versión entregada (igual que APP_VERSION en store.js)
const C='fubb5x5-version-4',F=['./','index.html','games.html','instructions.html','scoring-rules.html','scoring-examples.js','play-by-play.html','statistics-view.html','evaluation.html','panel-buttons.js','scoring-criteria.js','store.js','example-data.js','referee-pool.js','ref-picker.js','style.css','manifest.json','logo.png','icon-192.png','icon-512.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(C).then(c=>c.addAll(F)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!=C).map(x=>caches.delete(x)))).then(()=>self.clients.claim())));
// Primero la red (así cada versión nueva se ve enseguida); sin conexión, la copia guardada
self.addEventListener('fetch',e=>{if(e.request.method!='GET')return;e.respondWith(fetch(e.request).then(r=>{if(r&&r.ok){const cp=r.clone();caches.open(C).then(c=>c.put(e.request,cp))}return r}).catch(()=>caches.match(e.request,{ignoreSearch:true})))});
