/* panel-buttons.js — fuente única de los botones del panel (FUBB 5x5).
   Cada botón es [texto en pantalla, key]. La key es la que se guarda en los datos y la que usa
   scoring-criteria.js: si cambiás el texto, dejá la misma key. Para agregar un botón, sumá una fila
   con una key nueva (sin tildes ni espacios, en camelCase). */
(function () {
  const mk = (id, title, items, extra) => ({
    id, title, ...extra,
    buttons: items.map(([label, key]) => ({ label, key }))
  });

  window.plain = l => l.replace('✅ ', 'Correcto ').replace('⛔ ', 'Incorrecto ');
  window.PANEL_BUTTONS = [
    mk('callResult', 'Resultado del cobro', [['CC', 'CC'], ['IC', 'IC'], ['INC', 'INC'], ['CNC', 'CNC']]),
    mk('fouls', 'Faltas', [
      ['Bloqueo / Carga', 'blockCharge'], ['Agarrar / Sujetar', 'holding'], ['Uso ilegal de manos', 'illegalHands'],
      ['Pantalla ilegal', 'illegalScreen'], ['Falta en tiro', 'shootingFoul'], ['Falta en rebote', 'reboundFoul'],
      ['Antideportiva', 'unsportsmanlike'], ['Técnica', 'technical'], ['Descalificante', 'disqualifying'],
      ['Otras faltas', 'otherFouls']
    ], { group: 'incidentType' }),
    mk('violations', 'Violaciones', [
      ['Pasos', 'travelling'], ['Dobles', 'doubleDribbling'], ['3 seg.', 'threeSeconds'],
      ['5 seg.', 'fiveSeconds'], ['8 seg.', 'eightSeconds'], ['24 seg.', 'shotClock'],
      ['Campo atrás', 'backcourt'], ['Interposición', 'goaltending'], ['Fuera de banda', 'outOfBounds'],
      ['Pie', 'kicking']
    ], { group: 'incidentType' }),
    mk('others', 'Otros', [['Demora', 'delay'], ['Conducta', 'behaviour'], ['Control del banco', 'benchControl'], ['Reloj / 24"', 'clockError']], { group: 'incidentType' }),
    mk('review', 'Sistema de revisión', [['✅ Uso IRS', 'correctUseIrs'], ['⛔ Uso IRS', 'incorrectUseIrs'], ['✅ Challenge', 'correctChallenge'], ['⛔ Challenge', 'incorrectChallenge']]),
    mk('tags', 'Tags', [
      ['Cobro cruzado/DW', 'crossedCallDw'], ['Impacto claro (CIP)', 'clearImpactCip'], ['Llamada fantasma', 'phantomCall'],
      ['Mecánica/Posición', 'mechanicsPositioning'], ['Rotación', 'rotation'], ['IOT', 'iot'],
      ['Comunicación', 'communication'], ['Protocolos', 'protocols'], ['Manejo del partido', 'gameManagement'],
      ['Control de detalles', 'gameDetailsControl'], ['Uso de señales', 'useOfSignals'], ['Trabajo en equipo', 'teamwork'],
      ['Control emocional', 'emotionalControl'], ['Otro', 'other']
    ], { multi: true }),
  ];
  // Valores obligatorios al marcar un tag (keys usadas por scoring-criteria.js)
  window.TAG_VALUES = [
    { label: '−−', key: 'supNeg' }, { label: '−', key: 'neg' },
    { label: '+', key: 'pos' }, { label: '++', key: 'supPos' }
  ];
  // Valores permitidos por tag (los que no aparecen acá admiten los 4 valores)
  window.TAG_ALLOWED = {
    crossedCallDw:        ['neg'],
    clearImpactCip:       ['neg', 'pos'],
    phantomCall:          ['supNeg', 'neg'],
    mechanicsPositioning: ['neg', 'pos'],
    rotation:             ['neg', 'pos'],
    iot:                  ['neg', 'pos'],
    communication:        ['neg', 'pos'],
    protocols:            ['neg', 'pos'],
    useOfSignals:         ['neg', 'pos']
  };
  window.tagAllows = (tag, val) => !window.TAG_ALLOWED[tag] || window.TAG_ALLOWED[tag].includes(val);
  // Posiciones de la terna: key guardada → nombre en pantalla y abreviatura
  window.ROLES = { L: ['Líder', 'LÍD'], C: ['Central', 'CEN'], T: ['Seguidor', 'SEG'] };
  // Períodos: duración en segundos
  window.PERIODS = [['1C', 600], ['2C', 600], ['3C', 600], ['4C', 600], ['TE', 300]];
  window.CRUCIAL = { periods: ['4C', 'TE'], seconds: 120 }; // últimos 2 minutos del 4.º cuarto y del tiempo extra
})();
