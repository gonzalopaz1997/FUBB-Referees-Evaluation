/* scoring-examples.js — partidos hipotéticos para la página "Reglas de puntaje".
   Los puntajes NO están escritos acá: los calcula el motor (scoring-criteria.js) cada vez que se abre la página. */
(function () {
  const REF = 'Árbitro', OTRO = 'Compañero';
  let id = 0;
  const P = (call, o = {}) => ({ id: ++id, n: id, refs: [{ name: REF, role: o.role || 'L' }], call, cat: o.cat || 'fouls', incident: o.incident || 'blockCharge',
    q: o.q || '2C', time: o.time ?? 300, crucial: !!o.crucial, special: !!o.special, tags: o.tags || {}, reviews: o.reviews || [], rules: o.rules || {}, zone: 6 });
  const rep = (k, f) => Array.from({ length: k }, f);
  const game = (difficulty, plays) => ({ games: [{ id: 1, n: 1, difficulty, date: '', teamA: 'Local', teamB: 'Visitante', plays }] });

  window.SCORING_EXAMPLE_REF = REF;
  window.SCORING_EXAMPLES = [
    { title: 'Caso A — Un partido común', difficulty: 'normal',
      story: '20 decisiones registradas: 17 correctas y 3 incorrectas. Algunos tags positivos y negativos repartidos. Ninguna causa automática.',
      t: game('normal', [...rep(17, () => P('CCM')), ...rep(3, () => P('ICCM')),
        P('CCM', { tags: { mechanicsPositioning: 'neg' } }), P('CCM', { tags: { mechanicsPositioning: 'pos' } }), P('CCM', { tags: { communication: 'pos' } }), P('CCM', { tags: { gameManagement: 'neg' } })]) },
    { title: 'Caso B — Buen trabajo en un partido difícil', difficulty: 'hard',
      story: 'Partido Difícil. 18 decisiones: 17 correctas y 1 incorrecta; una jugada especial bien resuelta. Tags positivos en mecánica, manejo y señales.',
      t: game('hard', [...rep(16, () => P('CCM')), P('ICCM'), P('CCM', { special: true, crucial: true, q: '4C', time: 40 }),
        P('CCM', { tags: { mechanicsPositioning: 'pos', rotation: 'pos' } }), P('CCM', { tags: { gameManagement: 'supPos' } }), P('CCM', { tags: { useOfSignals: 'pos', communication: 'pos' } }), P('CCM', { tags: { teamwork: 'pos' } })]) },
    { title: 'Caso C — Decisiones correctas pero muchos tags negativos', difficulty: 'normal',
      story: 'Todas las decisiones son correctas, pero el árbitro recibe 6 tags negativos de posicionamiento. Los tags bajan el área a 2,00, pero no son causa automática: el partido no queda limitado a 2,79.',
      t: game('normal', [...rep(14, () => P('CCM')), ...rep(6, () => P('CCM', { tags: { mechanicsPositioning: 'neg' } }))]) },
    { title: 'Caso D — 10 decisiones incorrectas', difficulty: 'normal',
      story: '30 decisiones: 20 correctas y 10 incorrectas. Al llegar a 10 incorrectas se activa la causa automática y el global queda limitado a 2,79 aunque el promedio dé más.',
      t: game('normal', [...rep(20, () => P('CCM')), ...rep(10, () => P(['ICCM', 'ICNC'][id % 2])), P('CCM', { tags: { communication: 'pos' } })]) },
    { title: 'Caso E — IRS con decisión final incorrecta', difficulty: 'normal',
      story: 'Se cobró una falta personal común. El árbitro y su compañero fueron al IRS (uso correcto) y la mantuvieron común cuando era flagrante (decisión final incorrecta). La causa automática alcanza a los dos que fueron a la revisión.',
      t: game('normal', [...rep(15, () => P('CCM')), P('ICCM', { incident: 'shootingFoul', reviews: [{ type: 'irs', use: 'ok', decision: 'ko', refs: [REF, OTRO] }] })]) }
  ];
})();
