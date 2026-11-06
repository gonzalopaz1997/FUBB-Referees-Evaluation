/* scoring-criteria.js — FUBB 5x5 · criterios de puntaje (versión 5)
   PARTE 1: SCORING_CRITERIA → toda la configuración. Para cambiar un criterio, cambiá el número acá:
            la página "Reglas de puntaje" lee estos mismos valores, así que siempre coincide.
   PARTE 2: assessReferee()  → el motor que calcula la evaluación de un árbitro.

   CÓMO SE CALCULA (un partido)
   1. Cada jugada da puntos a un área (escala 1–5; 3 = estándar):
        - Selección de cobros: el resultado de cada falta o violación (correcto 4 · incorrecto 2), el tag Principio de
          Ventaja/Desventaja, y el uso y la decisión final de IRS / Challenge para los árbitros que fueron a la revisión.
        - Las otras cuatro áreas: los tags (−− 1,5 · − 2 · + 4 · ++ 4,5).
   2. Jugada especial: sus puntos se alejan un 20% más del 3 (4 → 4,20 · 2 → 1,80).
   3. Puntaje del área = promedio de sus puntos + ajuste por dificultad (Fácil −0,30 · Difícil +0,30), entre 1 y 5.
      Área sin puntos = 3,00.
   4. Global = promedio de las cinco áreas, con dos decimales.
   5. Causas automáticas (decisiones graves): limitan el área y el global a 2,79 (Por debajo del estándar)
      o a 1,99 (No aceptable). Los tags por sí solos NUNCA son causa automática: solo bajan o suben el promedio.
   6. Si un área queda debajo de 2,80, el global no puede pasar de 3,74.
   CONSOLIDADO (varios partidos de un árbitro): cada área y el global son el promedio de los partidos.

   Datos de cada jugada (los guarda Jugada a jugada):
   play = { refs:[{ name, role:'L|C|T' }],          // árbitros involucrados, cada uno con su posición
            referee, role,                           // = refs[0] (compatibilidad)
            q:'1C..TE', time, call:'CCM|CNC|ICCM|ICNC', cat:'fouls|violations|others', incident, crucial, special, zone,
            reviews:[{ type:'irs'|'challenge', use:'ok'|'ko', decision:'ok'|'ko'|'na', refs:['Nombre', ...] }],
            rules:{ 'Nombre': 'bad'|'veryBad' }, tags:{ mechanicsPositioning:'neg', ... }, comment } */
window.SCORING_CRITERIA = {
  // Bandas del puntaje (con dos decimales). Se evalúa de arriba a abajo.
  levels: [
    { min: 4.5,  score: 5, label: 'Rendimiento superior' },
    { min: 3.75, score: 4, label: 'Por encima del estándar' },
    { min: 2.8,  score: 3, label: 'En el estándar' },
    { min: 2.0,  score: 2, label: 'Por debajo del estándar' },
    { min: -Infinity, score: 1, label: 'No aceptable' }
  ],
  scoreLabels: { 1: 'No aceptable', 2: 'Por debajo del estándar', 3: 'En el estándar', 4: 'Por encima del estándar', 5: 'Rendimiento superior' },
  // Tope que imponen las causas automáticas, según su nivel
  causeCap: { 2: 2.79, 1: 1.99 },
  // Si un área queda debajo de este valor, el global no puede superar globalCapIfAreaBelow
  areaBelow: 2.8, globalCapIfAreaBelow: 3.74,
  minPoint: 1, maxPoint: 5, standard: 3,
  noDataScore: 3,                       // área sin puntos en el partido

  // Dificultad (se elige al terminar el partido). Se suma al promedio de cada área que tenga puntos.
  difficulty: { default: 'normal', adjust: { easy: -0.3, normal: 0, hard: 0.3 }, labels: { easy: 'Fácil', normal: 'Normal', hard: 'Difícil' } },

  // Jugada especial: los puntos se alejan este % más del estándar (3), hacia arriba o hacia abajo
  specialAmplify: 0.2,

  // Selección de cobros
  callIncidentCategories: ['fouls', 'violations'],
  correctCalls: ['CCM', 'CNC'], incorrectCalls: ['ICCM', 'ICNC'],
  callPoints: { correct: 4, incorrect: 2, incorrectVeryNegative: 1.5 },   // muy negativo = tag −− de Llamada fantasma
  callTags: ['crossedCallDw', 'phantomCall'],                              // tags que califican el cobro (no suman a otra área)
  // IRS / Challenge: puntos para cada árbitro que fue a la revisión (decision 'na' = la imagen no permitió decidir: no suma)
  reviewPoints: { useOk: 4, useKo: 2, decisionOk: 4, decisionKo: 2 },

  // Tags de las otras cuatro áreas
  tagPoints: { supNeg: 1.5, neg: 2, pos: 4, supPos: 4.5 },

  // Límite de decisiones incorrectas en el partido (COBRO INCORRECTO + NO COBRO INCORRECTO)
  incorrectLimit: 10,
  // Error de reglas "Malo" + (1 tag −− o 2 tags −) del mismo árbitro en el partido → causa automática
  rulesError: { badCombo: { supNeg: 1, neg: 2 } },

  // Causas automáticas. score = nivel al que limita (2 o 1). area = área que también queda limitada (null = solo el global).
  autoCauses: [
    { id: 'manyIncorrect', score: 2, area: 'callSelection', label: '10 o más decisiones incorrectas (COBRO INCORRECTO + NO COBRO INCORRECTO) en el partido',
      fiba: 'Errores repetidos de importancia considerable en el juego' },
    { id: 'flagrantNonCall', score: 2, area: 'callSelection', label: 'NO COBRO INCORRECTO de una falta Flagrante',
      fiba: 'No sancionar una falta antideportiva' },
    { id: 'phantomCrucial', score: 2, area: 'callSelection', label: 'COBRO INCORRECTO con tag Llamada fantasma en tiempo crucial',
      fiba: 'Últimos minutos – llamada fantasma clara' },
    { id: 'reviewWrong', score: 2, area: 'callSelection', label: 'IRS o Challenge: uso incorrecto, o uso correcto con decisión final incorrecta (para los árbitros que fueron a la revisión)',
      fiba: 'Uso no autorizado del IRS, o uso autorizado con la decisión equivocada' },
    { id: 'rulesVeryBad', score: 2, area: null, label: 'Error de reglas con impacto Muy malo',
      fiba: 'Errores de reglas' },
    { id: 'rulesBadCombo', score: 2, area: null, label: 'Error de reglas con impacto Malo + 1 tag muy negativo o 2 tags negativos en el partido',
      fiba: 'Errores de reglas' },
    { id: 'flagrantNonCallCrucial', score: 1, area: 'callSelection', label: 'NO COBRO INCORRECTO de una falta Flagrante en tiempo crucial',
      fiba: 'Últimos minutos – no sancionar una falta antideportiva evidente' },
    { id: 'disqualifyingNonCall', score: 1, area: 'callSelection', label: 'NO COBRO INCORRECTO de una falta Descalificante',
      fiba: 'No sancionar violencia o una falta descalificante evidente' }
  ],

  areas: [
    { key: 'callSelection', label: 'Selección de cobros', short: 'Cobros', source: 'calls', tags: ['advantagePrinciple'] },
    { key: 'mechanics', label: 'Disciplina en mecánica y posicionamiento', short: 'Mecánica', source: 'tags', tags: ['mechanicsPositioning', 'rotation', 'iot'] },
    { key: 'gameMgmt', label: 'Manejo del partido y control de conducta', short: 'Manejo', source: 'tags', tags: ['gameManagement', 'gameDetailsControl', 'protocols'] },
    { key: 'signals', label: 'Señales, lenguaje corporal y comunicación', short: 'Señales', source: 'tags', tags: ['useOfSignals', 'communication'] },
    { key: 'teamwork', label: 'Trabajo en equipo / Control emocional', short: 'Equipo', source: 'tags', tags: ['teamwork', 'emotionalControl'] }
  ],
  improvementBelow: 3     // un punto por debajo de esto aparece en Áreas de mejora
};

(function () {
  const C = window.SCORING_CRITERIA;
  const r2 = x => Math.round(x * 100) / 100;
  const clamp = x => Math.max(C.minPoint, Math.min(C.maxPoint, x));
  const avg = a => a.length ? a.reduce((s, x) => s + x, 0) / a.length : null;
  const isOk = c => C.correctCalls.includes(c);
  const isCallPlay = p => C.callIncidentCategories.includes(String(p.cat || '').toLowerCase());
  const meta = id => C.autoCauses.find(c => c.id === id);
  const labelOf = key => { for (const c of (window.PANEL_BUTTONS || [])) { const b = c.buttons.find(b => b.key === key); if (b) return b.label; } return (window.LEGACY_LABELS || {})[key] || key; };
  const pl = s => (window.plain ? window.plain(s) : s);
  const levelOf = v => C.levels.find(l => v >= l.min);
  // Jugada especial: se aleja un % más del estándar
  const amp = (p, x) => p.special ? clamp(C.standard + (x - C.standard) * (1 + C.specialAmplify)) : x;

  // Árbitros de una jugada (compatible con jugadas viejas de un solo árbitro)
  const refsOf = p => Array.isArray(p.refs) && p.refs.length ? p.refs : (p.referee ? [{ name: p.referee, role: p.role }] : []);
  const involves = (p, n) => refsOf(p).some(r => r.name === n);
  const roleIn = (p, n) => (refsOf(p).find(r => r.name === n) || {}).role;
  const reviewsOf = (p, n) => (p.reviews || []).filter(rv => (rv.refs || []).includes(n));
  window.playRefs = refsOf; window.playInvolves = involves; window.playRole = roleIn;

  function callPts(p) {
    if (!isCallPlay(p)) return null;
    let x = isOk(p.call) ? C.callPoints.correct : C.callPoints.incorrect;
    if (!isOk(p.call) && C.callTags.some(t => (p.tags || {})[t] === 'supNeg')) x = C.callPoints.incorrectVeryNegative;
    return amp(p, x);
  }
  const tagPts = (p, v) => amp(p, C.tagPoints[v]);
  const reviewPts = rv => { const o = []; if (rv.use) o.push(rv.use === 'ok' ? C.reviewPoints.useOk : C.reviewPoints.useKo);
    if (rv.decision === 'ok') o.push(C.reviewPoints.decisionOk); else if (rv.decision === 'ko') o.push(C.reviewPoints.decisionKo); return o; };

  // Causas automáticas de un árbitro en un partido. mine = jugadas donde está involucrado; revs = revisiones a las que fue
  function detect(mine, revs, rulesList) {
    const out = [], add = (id, ps) => out.push({ ...meta(id), plays: ps });
    const bad = mine.filter(p => isCallPlay(p) && !isOk(p.call));
    if (bad.length >= C.incorrectLimit) add('manyIncorrect', bad);
    const fl = mine.filter(p => p.incident === 'unsportsmanlike' && p.call === 'ICNC');
    if (fl.some(p => p.crucial)) add('flagrantNonCallCrucial', fl.filter(p => p.crucial));
    else if (fl.length) add('flagrantNonCall', fl);
    const dq = mine.filter(p => p.incident === 'disqualifying' && p.call === 'ICNC');
    if (dq.length) add('disqualifyingNonCall', dq);
    const ph = mine.filter(p => p.crucial && !isOk(p.call) && (p.tags || {}).phantomCall);
    if (ph.length) add('phantomCrucial', ph);
    const rw = revs.filter(x => x.rv.use === 'ko' || (x.rv.use === 'ok' && x.rv.decision === 'ko'));
    if (rw.length) add('reviewWrong', [...new Set(rw.map(x => x.p))]);
    const imp = rulesList.map(r => r.impact);
    if (imp.includes('veryBad')) add('rulesVeryBad', rulesList.filter(r => r.impact === 'veryBad').map(r => r.p));
    else if (imp.includes('bad')) {
      const vals = mine.flatMap(p => Object.values(p.tags || {})), b = C.rulesError.badCombo;
      if (vals.filter(v => v === 'supNeg').length >= b.supNeg || vals.filter(v => v === 'neg').length >= b.neg)
        add('rulesBadCombo', [...new Set([...rulesList.map(r => r.p), ...mine.filter(p => Object.values(p.tags || {}).some(v => v === 'supNeg' || v === 'neg'))])]);
    }
    return out;
  }

  // Un partido para un árbitro
  function assessGame(g, name) {
    const mine = g.plays.filter(p => involves(p, name));
    const revs = g.plays.flatMap(p => reviewsOf(p, name).map(rv => ({ p, rv })));
    const rulesList = g.plays.filter(p => p.rules && p.rules[name]).map(p => ({ p, impact: p.rules[name] }));
    if (!mine.length && !revs.length && !rulesList.length) return null;
    const dkey = C.difficulty.adjust[g.difficulty] !== undefined ? g.difficulty : C.difficulty.default, adj = C.difficulty.adjust[dkey];
    const causes = detect(mine, revs, rulesList);
    const areas = {};
    for (const a of C.areas) {
      const pts = [], low = [], items = [];
      // put: suma un puntaje al área y guarda de dónde salió (para mostrar el detalle en la evaluación)
      const put = (x, p, what, lowWhy) => { pts.push(x); items.push({ p, what, pts: x }); if (x < C.improvementBelow) low.push({ p, why: lowWhy || what }); };
      const tv = v => ({ supNeg: '−−', neg: '−', pos: '+', supPos: '++' })[v];
      if (a.source === 'calls') {
        mine.forEach(p => { const x = callPts(p); if (x !== null) put(x, p, callLbl0(p.call)); });
        revs.forEach(({ p, rv }) => { const rt = rv.type === 'challenge' ? 'Challenge' : 'IRS';
          if (rv.use) put(rv.use === 'ok' ? C.reviewPoints.useOk : C.reviewPoints.useKo, p, `${rt}: uso ${rv.use === 'ok' ? 'correcto' : 'incorrecto'}`, rvTxt(rv));
          if (rv.decision === 'ok' || rv.decision === 'ko') put(rv.decision === 'ok' ? C.reviewPoints.decisionOk : C.reviewPoints.decisionKo, p, `${rt}: decisión final ${rv.decision === 'ok' ? 'correcta' : 'incorrecta'}`, rvTxt(rv)); });
        mine.forEach(p => (a.tags || []).forEach(t => { const v = (p.tags || {})[t]; if (v) put(tagPts(p, v), p, `Tag ${labelOf(t)} ${tv(v)}`, labelOf(t) + ' ' + tv(v)); }));
      } else {
        mine.forEach(p => a.tags.forEach(t => { const v = (p.tags || {})[t]; if (v) put(tagPts(p, v), p, `Tag ${labelOf(t)} ${tv(v)}`, labelOf(t) + ' ' + tv(v)); }));
      }
      const raw = pts.length ? avg(pts) : null;
      let score = raw === null ? C.noDataScore : clamp(raw + adj), capped = null;
      const owned = causes.filter(c => c.area === a.key);
      if (owned.length) { const lim = Math.min(...owned.map(c => C.causeCap[c.score])); if (score > lim) { score = lim; capped = owned; } }
      areas[a.key] = { key: a.key, label: a.label, short: a.short, n: pts.length, raw: raw === null ? null : r2(raw), adj: raw === null ? 0 : adj, score: r2(score), defaulted: raw === null, capped, causes: owned, low, items };
    }
    const vals = Object.values(areas).map(x => x.score), avgAreas = r2(avg(vals));
    let global = avgAreas; const reasons = [];
    if (causes.length) { const worst = Math.min(...causes.map(c => c.score)), lim = C.causeCap[worst]; if (global > lim) { global = lim; reasons.push(`Causa automática: el global queda limitado a ${fmt(lim)} (${C.scoreLabels[worst]}).`); } }
    if (vals.some(v => v < C.areaBelow) && global > C.globalCapIfAreaBelow) { global = C.globalCapIfAreaBelow; reasons.push(`Un área está debajo de ${fmt(C.areaBelow)}: el global no puede pasar de ${fmt(C.globalCapIfAreaBelow)}.`); }
    global = r2(global);
    const calls = mine.filter(isCallPlay);
    return { game: g, plays: mine, reviews: revs, rulesList, difficulty: dkey, adj, causes, areas, avgAreas, global, level: levelOf(global).score, label: levelOf(global).label, reasons,
      calls: { ok: calls.filter(p => isOk(p.call)).length, bad: calls.filter(p => !isOk(p.call)).length } };
  }
  const fmt = x => x == null ? '–' : (Math.round(x * 100) / 100).toFixed(2).replace('.', ',');
  const callLbl0 = c => (window.CALL_NAMES || {})[c] || c;
  const rvTxt = rv => `${rv.type === 'challenge' ? 'Challenge' : 'IRS'}: uso ${rv.use === 'ok' ? 'correcto' : 'incorrecto'}${rv.decision === 'ok' ? ', decisión final correcta' : rv.decision === 'ko' ? ', decisión final incorrecta' : rv.decision === 'na' ? ', sin decisión (la imagen no permitió decidir)' : ''}${rv.type === 'challenge' && rv.result ? ', resultado: ' + ({ won: 'ganado', lost: 'perdido', unclear: 'video no claro' })[rv.result] : ''}`;
  window.reviewText = rvTxt;

  // tournament = { games:[...] } (un partido en Mi evaluación; muchos en el consolidado)
  window.assessReferee = function (tournament, name) {
    const per = tournament.games.map(g => assessGame(g, name)).filter(Boolean);
    const n = per.length;
    const areas = {};
    for (const a of C.areas) {
      const sc = per.map(x => x.areas[a.key].score), withData = per.filter(x => !x.areas[a.key].defaulted).length;
      const score = n ? r2(avg(sc)) : null;
      areas[a.key] = { key: a.key, label: a.label, short: a.short, score, level: score == null ? null : levelOf(score).score, levelLabel: score == null ? '' : levelOf(score).label,
        defaulted: n > 0 && withData === 0, raw: n === 1 ? per[0].areas[a.key].raw : null, adj: n === 1 ? per[0].areas[a.key].adj : 0, n: per.reduce((s, x) => s + x.areas[a.key].n, 0),
        capped: per.some(x => x.areas[a.key].capped), causes: per.flatMap(x => x.areas[a.key].causes.map(c => ({ game: x.game, cause: c }))),
        low: per.flatMap(x => x.areas[a.key].low.map(l => ({ game: x.game, ...l }))) };
    }
    const overall = n ? r2(avg(per.map(x => x.global))) : null;
    // Áreas de mejora: todo lo que quedó debajo de 3, agrupado
    const items = {};
    const add = (label, game, p) => { const i = items[label] ||= { label, count: 0, plays: [] }; i.count++; i.plays.push({ game, p }); };
    per.forEach(x => {
      x.rulesList.forEach(r => add('Conocimiento de reglas', x.game, r.p));
      x.reviews.forEach(({ p, rv }) => { if (rv.use === 'ko') add((rv.type === 'challenge' ? 'Challenge' : 'IRS') + ': uso incorrecto', x.game, p); if (rv.decision === 'ko') add((rv.type === 'challenge' ? 'Challenge' : 'IRS') + ': decisión final incorrecta', x.game, p); });
      x.plays.forEach(p => {
        const inc = p.incident ? (p.incident === 'other' ? (p.iother || 'Otro') : pl(labelOf(p.incident))) : null, cp = callPts(p);
        const lowTags = Object.entries(p.tags || {}).filter(([t, v]) => !C.callTags.includes(t) && tagPts(p, v) < C.improvementBelow).map(([t]) => labelOf(t));
        if (inc && cp !== null && cp < C.improvementBelow) { if (lowTags.length) lowTags.forEach(t => add(`${inc} / ${t}`, x.game, p)); else add(inc, x.game, p); }
        else lowTags.forEach(t => add(t, x.game, p));
      });
    });
    const improvements = Object.values(items).sort((a, b) => b.count - a.count);
    if (improvements[0]) improvements[0].mostRepeated = true;
    const causeGames = per.filter(x => x.causes.length).length;
    return { referee: name, games: n, byGame: per, areas, overall, level: overall == null ? null : levelOf(overall).score, overallLabel: overall == null ? '' : levelOf(overall).label,
      causes: per.flatMap(x => x.causes.map(c => ({ game: x.game, cause: c }))), reasons: n === 1 ? per[0].reasons : [], causeGames, improvements };
  };
  window.scoreFmt = fmt;
  window.levelOfScore = v => v == null ? null : levelOf(v);
})();
