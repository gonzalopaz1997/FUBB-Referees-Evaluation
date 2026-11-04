/* scoring-criteria.js — FUBB 5x5 (mismo motor que la herramienta 3x3, adaptado a 5x5)
   PARTE 1: SCORING_CRITERIA → toda la configuración (editar acá para cambiar criterios).
   PARTE 2: assessReferee()  → motor que calcula la evaluación de cada árbitro.

   Datos que usa (lo que guarda play-by-play):
   tournament = { games:[ { id, plays:[ play ] } ] }
   play = { referee, role:'L|C|T', q:'1C..TE', call:'CCM|CNC|ICCM|ICNC', cat:'fouls|violations|others', incident:'travelling', crucial, special,
            review:['correctUseIrs'|'incorrectUseIrs'|'correctChallenge'|'incorrectChallenge'],
            rules:{ 'Nombre árbitro':'bad'|'veryBad' },           // error de conocimiento de reglas
            tags:{ mechanicsPositioning:'neg', ... } }                   // supNeg|neg|pos|supPos

   MODELO (resumen)
   1. Cada área parte en 3 (At Standard) = promedio.
   2. Un área baja a 2 si: promedio de marcas negativas por partido > negativeMarks.maxPerGame,
      o más del autoGameShare de los partidos tiene una causa automática de esa área.
   3. Un área sube a 4/5 solo con mérito: promedio de puntos ≥ umbral Y sostenido en ≥ sustainedShare de los partidos,
      y sin ninguna causa automática propia de esa área.
   4. Causas automáticas por partido (autoCauses): llevan el partido a 2 (Below Standard) o 1 (Not Acceptable).
   5. Dificultad del partido (easy/normal/hard) ajusta el promedio de puntos de cada área en ese partido.
   6. Overall = nivel del promedio de las áreas; topes por área en 2, por partidos automáticos, y 2/1 si superan los % definidos. */
window.SCORING_CRITERIA = {
  // Conversión promedio → score (se evalúa de arriba a abajo; ">="). Se usa para el promedio de áreas (overall)
  // y para los umbrales de mérito (score 5 y 4) de cada área.
  levels: [
    { min: 4.5,  score: 5, label: 'Rendimiento superior' },
    { min: 3.75, score: 4, label: 'Por encima del estándar' },
    { min: 2.8,  score: 3, label: 'En el estándar' },
    { min: -Infinity, score: 2, label: 'Por debajo del estándar' }
  ],
  scoreLabels: { 1: 'No aceptable', 2: 'Por debajo del estándar', 3: 'En el estándar', 4: 'Por encima del estándar', 5: 'Rendimiento superior' },
  belowStandardScore: 2,
  notAcceptableScore: 1,

  // Área sin ningún punto: score 3 por defecto (score:null la deja sin evaluar). scope: 'tournament' | 'game'
  noData: { score: 3, scope: 'tournament' },

  // Marcas negativas = tags con estos valores. Promedio por partido (sobre los partidos del árbitro) mayor a maxPerGame → área en 2
  negativeMarks: { values: ['supNeg', 'neg'], maxPerGame: 3 },
  // Más de este % de partidos con causa automática → área (si la causa es de esa área) y overall en 2
  autoGameShare: 0.20,
  // Más de este % de partidos Not Acceptable (1) → overall 1
  notAcceptableGameShare: 0.20,
  // Para llegar a 4 o 5 en un área: este % de los partidos del árbitro debe alcanzar individualmente el umbral
  sustainedShare: 0.5,
  // Topes del overall
  overallCapIfAnyBelow: 3,       // algún área en 2
  overallCapIfAnyAutoGame: 3,    // algún partido con causa automática (aunque no supere el %)

  // Dificultad del partido (la elige el evaluador al cerrar el juego). Se SUMA al promedio de puntos del partido en cada área
  // (resultado limitado entre 0 y maxPoint). No cambia las marcas negativas ni las causas automáticas.
  // Un partido difícil bien arbitrado da más mérito; uno fácil no se sobrevalora. Sin dato → 'normal'.
  difficulty: { default: 'normal', adjust: { easy: -0.3, normal: 0, hard: 0.3 }, labels: { easy: 'Fácil', normal: 'Normal', hard: 'Difícil' } },

  // Jugadas de relevancia especial: multiplicador según call result
  importantPlayFactor: { correct: 1.2, incorrect: 0.8 },
  maxPoint: 5,
  correctCallMax: 4,      // una llamada correcta (CCM/CNC) nunca vale más que esto, ni siquiera en jugada Special
  correctCalls: ['CCM', 'CNC'],
  incorrectCalls: ['ICCM', 'ICNC'],

  // Puntos de cada valor de tag (áreas 2–5)
  tagPoints: { supNeg: 1.5, neg: 2, pos: 4, supPos: 4.5 },

  // Área 1: puntos del call result (según el tag "decisivo" de la jugada)
  callIncidentCategories: ['fouls', 'violations'],
  callTags: ['crossedCallDw', 'doubleWhistle', 'phantomCall'],  // 'doubleWhistle' = nombre viejo (backups anteriores)
  callTagPriority: ['supPos', 'supNeg', 'pos', 'neg'],
  callPoints: {
    correct:   { default: 4, pos: 4, supPos: 5, neg: 4, supNeg: 4 },   // ⚠ neg/supNeg en correctas: supuesto
    incorrect: { default: 2, neg: 2, supNeg: 1.5, pos: 2, supPos: 2 }
  },

  // Umbrales de las causas automáticas basadas en call result
  gameAutoBelow: { incorrectCallsMoreThan: 5 },   // (en 5x5 no se usa el tag CIP)
  // Error de reglas "Bad" + (1 supNeg o 2 neg) en el mismo partido → partido en 2
  rulesError: { badCombo: { supNeg: 1, neg: 2 } },

  // Causas automáticas por partido. (La detección está en el motor, por id; acá van los textos y el efecto.)
  // area: área a la que se le atribuye (null = solo afecta partido/overall). fiba: criterio FIBA al que corresponde.
  autoCauses: [
    { id: 'manyIncorrect',      score: 2, area: 'callSelection', label: 'Más de 5 cobros incorrectos o no cobros incorrectos en el juego',
      fiba: 'Errores repetidos (5) de importancia considerable en el juego' },
    { id: 'unsportsmanlikeNonCall', score: 2, area: 'callSelection', label: 'No cobro incorrecto de una falta Flagrante',
      fiba: 'No sancionar una falta antideportiva' },
    { id: 'irsWrong',           score: 2, area: null, label: 'Uso incorrecto del IRS (✗ Uso IRS), o uso correcto del IRS con una decisión final equivocada',
      fiba: 'Uso no autorizado del IRS, o uso autorizado con la decisión equivocada' },
    { id: 'phantomCrucial',     score: 2, area: 'callSelection', label: 'Cobro incorrecto con tag Llamada fantasma en tiempo crucial (últimos 2:00 del 4.º cuarto o tiempo extra)',
      fiba: 'Últimos minutos – llamada fantasma clara' },
    { id: 'rulesVeryBad',       score: 2, area: null, label: 'Error de reglas con impacto Muy malo para el árbitro',
      fiba: 'Errores de reglas' },
    { id: 'rulesBadCombo',      score: 2, area: null, label: 'Error de reglas con impacto Malo + un tag muy negativo o dos tags negativos en el mismo juego',
      fiba: 'Errores de reglas' },
    { id: 'unsportsmanlikeNonCallCrucial', score: 1, area: 'callSelection', label: 'No cobro incorrecto de una falta Flagrante en tiempo crucial',
      fiba: 'Últimos minutos – no sancionar una falta antideportiva evidente' },
    { id: 'disqualifyingNonCall', score: 1, area: 'callSelection', label: 'No cobro incorrecto de una falta Descalificante',
      fiba: 'No sancionar violencia o una falta descalificante evidente' }
  ],

  // Incidentes "Others" evaluados por uso del sistema (IRS / Challenge); solo para Areas for improvement
  othersIncidentPoints: { correct: 4, incorrect: 2 },

  areas: [
    { key: 'callSelection', label: 'Selección de cobros', short: 'Cobros', source: 'calls' },
    { key: 'mechanics',     label: 'Disciplina en mecánica y posicionamiento', short: 'Mecánica', source: 'tags', tags: ['mechanicsPositioning', 'rotation', 'iot'] },
    { key: 'gameMgmt',      label: 'Manejo del partido y control de conducta', short: 'Manejo', source: 'tags', tags: ['gameManagement', 'gameDetailsControl', 'protocols'] },
    { key: 'signals',       label: 'Señales, lenguaje corporal y comunicación', short: 'Señales', source: 'tags', tags: ['useOfSignals', 'communication'] },
    { key: 'teamwork',      label: 'Trabajo en equipo / Control emocional', short: 'Equipo', source: 'tags', tags: ['teamwork', 'emotionalControl'] }
  ],

  improvement: { belowPoints: 3, sort: 'countDesc' } // 'countDesc' o 'pointsAsc'
};

(function () {
  const C = window.SCORING_CRITERIA;
  const levelOf = avg => C.levels.find(l => avg >= l.min);
  const isOk = c => C.correctCalls.includes(c);
  const cap = x => Math.min(C.maxPoint, x);
  const factor = p => !p.special ? 1 : (isOk(p.call) ? C.importantPlayFactor.correct : C.importantPlayFactor.incorrect);
  const avg = a => a.length ? a.reduce((s, x) => s + x, 0) / a.length : null;
  const labelOf = key => {
    for (const c of (window.PANEL_BUTTONS || [])) { const b = c.buttons.find(b => b.key === key); if (b) return b.label; }
    return (window.LEGACY_LABELS || {})[key] || key;
  };
  const isCallPlay = p => C.callIncidentCategories.includes(String(p.cat).toLowerCase());
  const isNeg = v => C.negativeMarks.values.includes(v);
  const meta = id => C.autoCauses.find(c => c.id === id);

  function callPts(p) {
    if (!isCallPlay(p)) return null;
    const tbl = C.callPoints[isOk(p.call) ? 'correct' : 'incorrect'];
    const vals = C.callTags.map(t => (p.tags || {})[t]).filter(Boolean);
    const v = C.callTagPriority.find(x => vals.includes(x));
    const x = cap((tbl[v] ?? tbl.default) * factor(p));
    return isOk(p.call) ? Math.min(C.correctCallMax, x) : x;
  }
  const tagPts = (p, v) => cap(C.tagPoints[v] * factor(p));

  // Causas automáticas de un partido para un árbitro. plays = jugadas del árbitro; rules = impactos de error de reglas
  // rulesList = [{ p: jugada, impact: 'bad'|'veryBad' }] (jugadas del partido con error de reglas para este árbitro)
  // Cada causa devuelve también las jugadas que la provocan (evidence)
  function detect(plays, rulesList) {
    const out = [], add = (id, ps) => out.push({ ...meta(id), count: 1, plays: ps });
    const g = C.gameAutoBelow, bad = plays.filter(p => isCallPlay(p) && !isOk(p.call));
    const impacts = rulesList.map(r => r.impact), at = f => plays.filter(f);
    if (bad.length > g.incorrectCallsMoreThan) add('manyIncorrect', bad);
    const unsp = at(p => p.incident === 'unsportsmanlike' && p.call === 'ICNC');
    if (unsp.length) add('unsportsmanlikeNonCall', unsp);
    if (unsp.some(p => p.crucial)) add('unsportsmanlikeNonCallCrucial', unsp.filter(p => p.crucial));
    const dq = at(p => p.incident === 'disqualifying' && p.call === 'ICNC');
    if (dq.length) add('disqualifyingNonCall', dq);
    const irs = at(p => (p.review || []).includes('incorrectUseIrs') || ((p.review || []).includes('correctUseIrs') && !isOk(p.call)));
    if (irs.length) add('irsWrong', irs);
    const ph = at(p => p.crucial && !isOk(p.call) && (p.tags || {}).phantomCall);
    if (ph.length) add('phantomCrucial', ph);
    if (impacts.includes('veryBad')) add('rulesVeryBad', rulesList.filter(r => r.impact === 'veryBad').map(r => r.p));
    else if (impacts.includes('bad')) {
      const vals = plays.flatMap(p => Object.values(p.tags || {})), b = C.rulesError.badCombo;
      if (vals.filter(v => v === 'supNeg').length >= b.supNeg || vals.filter(v => v === 'neg').length >= b.neg)
        add('rulesBadCombo', [...new Set([...rulesList.map(r => r.p), ...at(p => Object.values(p.tags || {}).some(v => v === 'supNeg' || v === 'neg'))])]);
    }
    return out;
  }

  function gameData(plays, rulesList, difficulty) {
    const scores = {}, marks = {}, negPlays = {};
    const adj = C.difficulty.adjust[difficulty || C.difficulty.default] || 0;
    const causes = detect(plays, rulesList);
    for (const a of C.areas) {
      let pts = [], m = 0;
      negPlays[a.key] = [];
      const note = (p, tagKeys) => { const ts = tagKeys.filter(t => isNeg((p.tags || {})[t])); if (ts.length) negPlays[a.key].push({ p, tags: ts }); };
      if (a.source === 'calls') {
        pts = plays.map(callPts).filter(x => x !== null);
        plays.filter(isCallPlay).forEach(p => { C.callTags.forEach(t => { if (isNeg((p.tags || {})[t])) m++; }); note(p, C.callTags); });
      } else {
        plays.forEach(p => { a.tags.forEach(t => { const v = (p.tags || {})[t]; if (v) { pts.push(tagPts(p, v, t)); if (isNeg(v)) m++; } }); note(p, a.tags); });
      }
      scores[a.key] = pts.length ? Math.max(0, Math.min(C.maxPoint, avg(pts) + adj)) : null;   // + ajuste por dificultad
      marks[a.key] = m;
      const owned = causes.filter(c => c.area === a.key);
      if (owned.length) scores[a.key] = Math.min(...owned.map(c => c.score));   // causa automática → el partido queda en 2 (o 1) en el área
    }
    const verdict = causes.length ? Math.min(...causes.map(c => c.score)) : null;
    return { scores, marks, causes, verdict, negPlays };
  }

  window.assessReferee = function (tournament, referee) {
    const games = tournament.games.map(g => {
      const rulesList = g.plays.filter(p => p.rules && p.rules[referee]).map(p => ({ p, impact: p.rules[referee] }));
      return { ...g, plays: g.plays.filter(p => p.referee === referee), rulesList, rulesImpacts: rulesList.map(r => r.impact) };
    }).filter(g => g.plays.length || g.rulesImpacts.length);
    const n = games.length;
    const data = games.map(g => gameData(g.plays, g.rulesList, g.difficulty));
    const gi = g => ({ id: g.id, n: g.n, date: g.date, teamA: g.teamA, teamB: g.teamB, evaluator: g.evaluator, tournament: g.tournament });
    const ND = C.noData && C.noData.score != null ? C.noData : null;
    const gameDefaults = data.map(() => ({}));
    if (ND && ND.scope === 'game') data.forEach((d, i) => C.areas.forEach(a => { if (d.scores[a.key] == null) { d.scores[a.key] = ND.score; gameDefaults[i][a.key] = true; } }));
    const sup = C.levels.find(l => l.score === 5).min, abv = C.levels.find(l => l.score === 4).min;

    const areas = {};
    for (const a of C.areas) {
      const vals = data.map(d => d.scores[a.key]).filter(v => v !== null && v !== undefined);
      let raw = avg(vals), defaulted = false;
      if (raw === null && ND && n) { raw = ND.score; defaulted = true; }
      const negTotal = data.reduce((s, d) => s + d.marks[a.key], 0), negPerGame = n ? negTotal / n : 0;
      const ownedAuto = data.filter(d => d.causes.some(c => c.area === a.key)).length;
      const aboveGames = vals.filter(v => v >= abv).length, superiorGames = vals.filter(v => v >= sup).length;
      let score = null, reason = null;
      if (raw === null) { /* sin datos y sin default */ }
      else if (defaulted) { score = ND.score; reason = 'default'; }
      else if (negPerGame > C.negativeMarks.maxPerGame) { score = C.belowStandardScore; reason = 'negMarks'; }
      else if (n && ownedAuto / n > C.autoGameShare) { score = C.belowStandardScore; reason = 'autoGames'; }
      else if (ownedAuto === 0 && raw >= sup && n && superiorGames / n >= C.sustainedShare) { score = 5; reason = 'merit'; }
      else if (ownedAuto === 0 && raw >= abv && n && aboveGames / n >= C.sustainedShare) { score = 4; reason = 'merit'; }
      else { score = 3; reason = 'standard'; }
      const evidence = {
        negPlays: games.flatMap((g, i) => data[i].negPlays[a.key].map(x => ({ game: gi(g), p: x.p, tags: x.tags }))),
        autoGames: games.flatMap((g, i) => data[i].causes.filter(c => c.area === a.key).map(c => ({ game: gi(g), cause: c })))
      };
      areas[a.key] = {
        label: a.label, short: a.short, raw, gamesWithData: vals.length, negTotal, negPerGame, ownedAuto, aboveGames, superiorGames,
        score, reason, defaulted, evidence,
        forcedBelow: reason === 'negMarks' || reason === 'autoGames'
      };
    }

    // Overall
    const scored = Object.values(areas).filter(x => x.score !== null).map(x => x.score);
    const avgAreas = scored.length ? avg(scored) : null;
    let overall = avgAreas !== null ? levelOf(avgAreas).score : null;
    const autoGames = data.filter(d => d.verdict !== null).length, naGames = data.filter(d => d.verdict === C.notAcceptableScore).length;
    const reasons = [];
    if (overall !== null) {
      if (scored.some(s => s <= C.belowStandardScore) && overall > C.overallCapIfAnyBelow) { overall = C.overallCapIfAnyBelow; reasons.push(`Un área está en ${C.belowStandardScore}: el global queda limitado a ${C.overallCapIfAnyBelow}.`); }
      if (n && naGames / n > C.notAcceptableGameShare) { overall = C.notAcceptableScore; reasons.push(`No aceptable en ${naGames} de ${n} juegos (más del ${C.notAcceptableGameShare * 100}%): global ${C.notAcceptableScore}.`); }
      else if (n && autoGames / n > C.autoGameShare) { if (overall > C.belowStandardScore) overall = C.belowStandardScore; reasons.push(`Por debajo del estándar automático en ${autoGames} de ${n} juegos (más del ${C.autoGameShare * 100}%): global ${C.belowStandardScore}.`); }
      else if (autoGames > 0 && overall > C.overallCapIfAnyAutoGame) { overall = C.overallCapIfAnyAutoGame; reasons.push(`${autoGames} juego(s) con causa automática: el global queda limitado a ${C.overallCapIfAnyAutoGame}.`); }
    }

    // Areas for improvement: todo el torneo, sin promediar por partido
    const items = {};
    const add = (label, pts, ctx) => { const i = items[label] ||= { label, count: 0, sum: 0, plays: [] }; i.count++; i.sum += pts; if (ctx) i.plays.push(ctx); };
    games.forEach(g => g.rulesList.forEach(r => add('Conocimiento de reglas', 2, { game: gi(g), p: r.p, impact: r.impact })));
    games.flatMap(g => g.plays.map(p => ({ g, p }))).forEach(({ g, p }) => {
      const ctx = { game: gi(g), p };
      const inc = p.incident === 'other' ? (p.iother || 'Otro') : plain(labelOf(p.incident)), cp = callPts(p);
      (p.review || []).forEach(k => { const pts = k.startsWith('correct') ? C.othersIncidentPoints.correct : C.othersIncidentPoints.incorrect; if (pts < C.improvement.belowPoints) add(plain(labelOf(k)), pts, ctx); });
      if (!p.incident) return;
      const lowTags = Object.entries(p.tags || {}).filter(([, v]) => tagPts(p, v) < C.improvement.belowPoints).map(([t]) => labelOf(t));
      let ip = cp;
      if (ip === null && /^(correct|incorrect)/.test(p.incident || '')) ip = p.incident.startsWith('correct') ? C.othersIncidentPoints.correct : C.othersIncidentPoints.incorrect;
      if (ip !== null && ip < C.improvement.belowPoints) {
        if (lowTags.length) lowTags.forEach(t => add(`${inc}/${t}`, ip, ctx)); else add(inc, ip, ctx);
      } else lowTags.forEach(t => add(t, C.tagPoints.neg, ctx));
    });
    const list = Object.values(items).sort(C.improvement.sort === 'pointsAsc'
      ? (a, b) => a.sum / a.count - b.sum / b.count : (a, b) => b.count - a.count);
    if (list[0]) list[0].mostRepeated = true;

    const byGame = games.map((g, i) => ({ id: g.id, n: g.n, date: g.date, evaluator: g.evaluator, tournament: g.tournament, teams: (g.teamA || '?') + ' vs ' + (g.teamB || '?'), game: gi(g), plays: g.plays.length, difficulty: g.difficulty || C.difficulty.default,
      scores: data[i].scores, marks: data[i].marks, causes: data[i].causes, verdict: data[i].verdict, defaults: gameDefaults[i],
      calls: { ok: g.plays.filter(p => isCallPlay(p) && isOk(p.call)).length, bad: g.plays.filter(p => isCallPlay(p) && !isOk(p.call)).length } }));
    return { referee, byGame, games: n, areas, overall, overallLabel: overall ? C.scoreLabels[overall] : null,
      overallInfo: { avgAreas, autoGames, naGames, reasons }, improvements: list };
  };
  window.SCORING_LABEL = s => C.scoreLabels[s] || '';
})();
