/* scoring-criteria.js — FUBB 5x5 (misma lógica que la herramienta 3x3)
   PARTE 1: SCORING_CRITERIA → toda la configuración (editar acá para cambiar criterios).
   PARTE 2: assessReferee()  → motor que calcula el "Preliminary Event Assessment".

   Esquema de datos esperado (lo que guarda playByPlay):
   tournament = { games:[ { id, plays:[ play ] } ] }
   play = { referee:'Nombre', call:'CC|IC|INC|CNC', cat:'fouls|violations|others',
            incident:'travelling', special:true|false,
            tags:{ clearImpactCip:'neg', gameManagement:'supPos', ... }  // supNeg|neg|pos|supPos
          } */
window.SCORING_CRITERIA = {
  // Conversión promedio → score final (se evalúa de arriba a abajo; ">=")
  levels: [
    { min: 4.5,  score: 5, label: 'Rendimiento superior' },
    { min: 3.3,  score: 4, label: 'Por encima del estándar' },   // redondeo: 1 tag negativa cada 3 (3.33) sigue siendo 4 (antes 3.75)
    { min: 2.8,  score: 3, label: 'En el estándar' },
    { min: -Infinity, score: 2, label: 'Por debajo del estándar' }
  ],
  belowStandardScore: 2,
  // ── Area without any points ───────────────────────────────────────────────
  // What score an area gets when the referee has no points in it.
  //   score: 3 → "At Standard" by default.   score: null → leave it unscored (excluded from the overall).
  //   scope: 'tournament' → only when the area has no points in ANY of the referee's games (default).
  //          'game'       → every game without points in an area counts as 3 inside the average.
  // Never applied to a referee with no games.
  noData: { score: 3, scope: 'tournament' },
  // Si en más de este % de sus juegos un área es below standard → esa área queda en 2
  belowStandardGameShare: 0.20,
  // Con algún 2, el overall no puede superar esto
  overallCapIfAnyBelow: 3,
  // Jugadas de relevancia especial: multiplicador según call result
  importantPlayFactor: { correct: 1.2, incorrect: 0.8 },
  // ── Dificultad del juego ──────────────────────────────────────────────────
  // El evaluador la elige al cerrar el juego. Se suma al puntaje de cada área de ese juego
  // (antes de pasarlo a nivel 1–5), con mínimo 1 y máximo maxPoint.
  // Con los umbrales de arriba, un juego con todo correcto (promedio 4) queda:
  //   Fácil 4 − 0.8 = 3.2 → 3 · Normal 4 → 4 · Difícil 4 + 0.3 = 4.3 → 4
  // y un juego con algunos errores (promedio 3.1, nivel 3) sube a 3.4 → 4 si fue difícil.
  // Juegos sin dificultad elegida (cargados antes de este cambio) cuentan como 'normal'.
  difficulty: {
    options: [ { key: 'easy', label: 'Fácil', adjust: -0.8 }, { key: 'normal', label: 'Normal', adjust: 0 }, { key: 'hard', label: 'Difícil', adjust: 0.3 } ],
    default: 'normal',
    minPoint: 1
  },
  maxPoint: 5,

  correctCalls: ['CC', 'CNC'],
  incorrectCalls: ['IC', 'INC'],

  // Puntos de cada valor de tag (áreas 2–5)
  tagPoints: { supNeg: 1.5, neg: 2, pos: 4, supPos: 4.5 },

  // Área 1: puntos del call result (según el tag "decisivo" de la jugada)
  callIncidentCategories: ['fouls', 'violations'],
  callTags: ['crossedCallDw', 'doubleWhistle', 'clearImpactCip', 'phantomCall'],  // 'doubleWhistle' = nombre viejo (backups anteriores)
  callTagPriority: ['supPos', 'supNeg', 'pos', 'neg'],
  callPoints: {
    correct:   { default: 4, pos: 4, supPos: 5, neg: 4, supNeg: 4 },   // ⚠ neg/supNeg en correctas: supuesto
    incorrect: { default: 2, neg: 2, supNeg: 1.5, pos: 2, supPos: 2 }
  },
  // Reglas automáticas por juego (área 1 → score 2)
  gameAutoBelow: { cipTag: 'clearImpactCip', incorrectCipMin: 3, incorrectCallsMoreThan: 5 },

  // Incidentes "Others" evaluados por uso del sistema (IRS / Challenge); solo para Areas for improvement
  othersIncidentPoints: { correct: 4, incorrect: 2 },

  areas: [
    { key: 'callSelection', label: 'Selección de cobros', source: 'calls' },
    { key: 'mechanics',     label: 'Disciplina en mecánica y posicionamiento', source: 'tags', tags: ['mechanicsPositioning', 'rotation', 'iot'] },
    { key: 'gameMgmt',      label: 'Manejo del partido y control de conducta', source: 'tags', tags: ['gameManagement', 'gameDetailsControl', 'protocols'] },
    { key: 'signals',       label: 'Señales, lenguaje corporal y comunicación', source: 'tags', tags: ['useOfSignals', 'communication'] },
    { key: 'teamwork',      label: 'Trabajo en equipo / Control emocional', source: 'tags', tags: ['teamwork', 'emotionalControl'] }
  ],

  improvement: { belowPoints: 3, sort: 'countDesc' } // 'countDesc' (como tu ejemplo) o 'pointsAsc'
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
    return key;
  };

  function callPts(p) {
    if (!C.callIncidentCategories.includes(String(p.cat).toLowerCase())) return null;
    const tbl = C.callPoints[isOk(p.call) ? 'correct' : 'incorrect'];
    const vals = C.callTags.map(t => (p.tags || {})[t]).filter(Boolean);
    const v = C.callTagPriority.find(x => vals.includes(x));
    return cap((tbl[v] ?? tbl.default) * factor(p));
  }
  const tagPts = (p, v) => cap(C.tagPoints[v] * factor(p));

  const diffOf = k => C.difficulty.options.find(o => o.key === k) || C.difficulty.options.find(o => o.key === C.difficulty.default);
  const adjusted = (v, d) => v === null ? null : Math.max(C.difficulty.minPoint, Math.min(C.maxPoint, v + diffOf(d).adjust));
  window.difficultyOf = diffOf;
  function gameAreaScores(plays, d) {
    const out = {};
    for (const a of C.areas) {
      let pts = [];
      if (a.source === 'calls') {
        pts = plays.map(callPts).filter(x => x !== null);
        const bad = plays.filter(p => !isOk(p.call) && C.callIncidentCategories.includes(String(p.cat).toLowerCase()));
        const g = C.gameAutoBelow;
        const badCip = bad.filter(p => (p.tags || {})[g.cipTag]).length;
        if (pts.length && (badCip >= g.incorrectCipMin || bad.length > g.incorrectCallsMoreThan)) { out[a.key] = C.belowStandardScore; continue; }
      } else {
        plays.forEach(p => a.tags.forEach(t => { if (p.tags && p.tags[t]) pts.push(tagPts(p, p.tags[t])); }));
      }
      out[a.key] = adjusted(avg(pts), d);
    }
    return out;
  }

  window.assessReferee = function (tournament, referee) {
    const games = tournament.games.map(g => ({ ...g, plays: g.plays.filter(p => p.referee === referee) })).filter(g => g.plays.length);
    const perGame = games.map(g => gameAreaScores(g.plays, g.difficulty));
    const ND = C.noData && C.noData.score != null ? C.noData : null;
    const gameDefaults = perGame.map(() => ({}));
    if (ND && ND.scope === 'game') perGame.forEach((sc, i) => C.areas.forEach(a => { if (sc[a.key] == null) { sc[a.key] = ND.score; gameDefaults[i][a.key] = true; } }));
    const areas = {};
    for (const a of C.areas) {
      const vals = perGame.map(s => s[a.key]).filter(v => v !== null && v !== undefined);
      let raw = avg(vals), defaulted = false;
      if (raw === null && ND && games.length) { raw = ND.score; defaulted = true; }
      const below = vals.filter(v => levelOf(v).score <= C.belowStandardScore).length;
      const forced = !defaulted && games.length && below / games.length > C.belowStandardGameShare;
      areas[a.key] = {
        label: a.label, raw, gamesWithData: vals.length, gamesBelow: below,
        score: raw === null ? null : forced ? C.belowStandardScore : levelOf(raw).score,
        forcedBelow: !!forced, defaulted
      };
    }
    const scored = Object.values(areas).filter(x => x.score !== null).map(x => x.score);
    let overall = scored.length ? levelOf(avg(scored)).score : null;
    if (overall !== null && scored.some(s => s <= C.belowStandardScore)) overall = Math.min(overall, C.overallCapIfAnyBelow);

    // Areas for improvement: todo el torneo, sin promediar por partido
    const items = {};
    const add = (label, pts) => { const i = items[label] ||= { label, count: 0, sum: 0 }; i.count++; i.sum += pts; };
    games.flatMap(g => g.plays).forEach(p => {
      const inc = p.incident === 'other' ? (p.iother || 'Otro') : plain(labelOf(p.incident)), cp = callPts(p);
      (p.review || []).forEach(k => { const pts = k.startsWith('correct') ? C.othersIncidentPoints.correct : C.othersIncidentPoints.incorrect; if (pts < C.improvement.belowPoints) add(plain(labelOf(k)), pts); });
      if (!p.incident) return;
      const lowTags = Object.entries(p.tags || {}).filter(([, v]) => tagPts(p, v) < C.improvement.belowPoints).map(([t]) => labelOf(t));
      let ip = cp;
      if (ip === null && /^(correct|incorrect)/.test(p.incident || '')) ip = p.incident.startsWith('correct') ? C.othersIncidentPoints.correct : C.othersIncidentPoints.incorrect;
      if (ip !== null && ip < C.improvement.belowPoints) {
        if (lowTags.length) lowTags.forEach(t => add(`${inc}/${t}`, ip)); else add(inc, ip);
      } else lowTags.forEach(t => add(t, C.tagPoints.neg));
    });
    const list = Object.values(items).sort(C.improvement.sort === 'pointsAsc'
      ? (a, b) => a.sum / a.count - b.sum / b.count : (a, b) => b.count - a.count);
    if (list[0]) list[0].mostRepeated = true;

    const byGame = games.map((g, i) => ({ n: g.n, day: g.day, date: g.date, teams: (g.teamA || '?') + ' vs ' + (g.teamB || '?'), difficulty: diffOf(g.difficulty), plays: g.plays.length, wrong: g.plays.filter(p => !isOk(p.call)).length, scores: perGame[i], defaults: gameDefaults[i] }));
    return { referee, byGame, games: games.length, areas, overall, overallLabel: overall ? levelOf(overall === 2 ? 0 : overall === 3 ? 3 : overall === 4 ? 4 : 5).label : null, improvements: list };
  };
})();
