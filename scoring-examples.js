/* scoring-examples.js — casos hipotéticos de la página "Reglas de puntaje" (FUBB 5x5).
   Se evalúan con el MISMO motor (assessReferee) que la herramienta, así los números nunca quedan desactualizados. */
(function () {
  const REF = 'Árbitro';
  const P = (call, tags, o) => ({ referee: REF, call, cat: 'fouls', incident: 'blockCharge', role: 'L', q: '2C', time: 300, tags: tags || {}, crucial: false, special: false, review: [], rules: {}, ...(o || {}) });
  // s = { ok, okCip, bad, tags:{tagKey:[valores]}, special, extra:[jugadas] }
  function game(i, s) {
    const plays = [];
    for (let k = 0; k < (s.ok || 0); k++) plays.push(P('CCM'));
    for (let k = 0; k < (s.okSpecial || 0); k++) plays.push(P('CCM', {}, { special: true }));
    for (let k = 0; k < (s.bad || 0); k++) plays.push(P('ICCM'));
    Object.entries(s.tags || {}).forEach(([t, vals]) => vals.forEach(v => plays.push(P('CCM', { [t]: v }, { special: !!s.special }))));
    (s.extra || []).forEach(p => plays.push(p));
    return { id: i + 1, n: i + 1, difficulty: s.difficulty, date: '', teamA: 'Equipo ' + String.fromCharCode(65 + i), teamB: 'Equipo ' + String.fromCharCode(73 + i), plays };
  }
  const T = games => ({ games: games.map((s, i) => game(i, s)) });
  const same = (n, s, over) => Array.from({ length: n }, (_, i) => ({ ...s, ...(over && over[i] || {}) }));

  window.SCORING_EXAMPLES = [
    { score: 3, id: 'standard',
      title: 'Caso A — Una temporada sólida y común → 3 (En el estándar)',
      story: 'Ocho juegos. El árbitro acierta la mayoría de los cobros, con un par de errores por juego, y junta una mezcla de tags positivos y negativos. Nada se destaca y ninguna regla se activa: es el árbitro promedio.',
      tournament: T(same(8, { ok: 3, bad: 2, tags: { mechanicsPositioning: ['pos', 'neg'], gameManagement: ['pos', 'neg'], useOfSignals: ['pos', 'neg'] } }, { 5: { tags: { mechanicsPositioning: ['neg', 'neg'], gameManagement: ['pos', 'pos'], useOfSignals: ['pos', 'pos'] } } })) },
    { score: 2, id: 'below',
      title: 'Caso B — Cómo un árbitro llega a 2 (Por debajo del estándar)',
      story: 'Ocho juegos. En Mecánica y posicionamiento el árbitro junta cuatro tags negativos en cada juego. En los juegos 3 y 6 no cobra una falta Flagrante (no cobro incorrecto) y en el juego 5 el evaluador registra un Error de reglas con impacto Muy malo. Cada uno es un camino distinto hacia el 2: alcanza con cualquiera.',
      tournament: T(same(8, { ok: 3, bad: 1, tags: { mechanicsPositioning: ['neg', 'neg', 'neg', 'neg'], gameManagement: ['pos', 'neg'], useOfSignals: ['pos', 'neg'] } },
        { 2: { extra: [P('ICNC', {}, { incident: 'unsportsmanlike' })] }, 5: { extra: [P('ICNC', {}, { incident: 'unsportsmanlike' })] }, 4: { extra: [P('CCM', {}, { rules: { [REF]: 'veryBad' } })] } })) },
    { score: 4, id: 'above',
      title: 'Caso C — Cómo un árbitro llega a 4 (Por encima del estándar)',
      story: 'Ocho juegos. El árbitro acierta casi siempre y en cuatro áreas los tags son positivos juego tras juego. Un juego tiene un tag negativo y un cobro incorrecto, lo que es normal. Trabajo en equipo / Control emocional nunca recibe tags.',
      tournament: T(same(8, { ok: 3, tags: { mechanicsPositioning: ['pos', 'pos'], rotation: ['pos'], gameManagement: ['pos', 'pos'], useOfSignals: ['pos', 'pos'] } },
        { 3: { bad: 1, tags: { mechanicsPositioning: ['pos', 'pos', 'neg'], gameManagement: ['pos', 'pos'], useOfSignals: ['pos', 'pos'] } } })) },
    { score: 5, id: 'superior',
      title: 'Caso D — Cómo un árbitro llega a 5 (Rendimiento superior)',
      story: 'Ocho juegos. En cada juego el árbitro acierta las jugadas más importantes (jugadas especiales), acierta los cobros clave y se destaca en las cinco áreas. Un 5 es excepcional: necesita este nivel en todas las áreas y en al menos la mitad de los juegos.',
      tournament: T(same(8, { okSpecial: 3, special: true, tags: { mechanicsPositioning: ['pos', 'pos'], gameManagement: ['supPos', 'supPos'], useOfSignals: ['pos', 'pos'], teamwork: ['supPos', 'pos'] } })) }
  ];
  window.SCORING_EXAMPLE_REF = REF;
})();
