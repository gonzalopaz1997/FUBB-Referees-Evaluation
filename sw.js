const C='fubb5x5-v6',F=['./','index.html','games.html','instructions.html','play-by-play.html','statistics-view.html','evaluation.html','panel-buttons.js','scoring-criteria.js','store.js','referee-pool.js','ref-picker.js','style.css','manifest.json','logo.png','icon-192.png','icon-512.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(C).then(c=>c.addAll(F)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!=C).map(x=>caches.delete(x))))));
self.addEventListener('fetch',e=>e.respondWith(caches.match(e.request,{ignoreSearch:true}).then(r=>r||fetch(e.request))));
