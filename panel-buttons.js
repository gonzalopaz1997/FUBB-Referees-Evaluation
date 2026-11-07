/* panel-buttons.js — fuente única de los botones del panel (FUBB 5x5).
   Cada botón es [texto en pantalla, key]. La key es la que se guarda en los datos y la que usa
   scoring-criteria.js: si cambiás el texto, dejá la misma key. Para agregar un botón, sumá una fila
   con una key nueva (sin tildes ni espacios, en camelCase). */
// Configuración general
window.CONFIG = {
  sendTo: 'departamentoarbitral@fubb.org.uy',  // correo al que se envía cada evaluación terminada
  // Videos de instrucciones: vienen incluidos en la carpeta videos/. Si los subís a YouTube, pegá el enlace acá y se usa ese.
  tutorialUrlEvaluador: '',        // ej.: 'https://www.youtube.com/watch?v=XXXXXXXXXXX'
  tutorialUrlDepartamento: ''
};
(function () {
  const mk = (id, title, items, extra) => ({ id, title, ...extra, buttons: items.map(([label, key]) => ({ label, key })) });

  window.plain = l => l.replace('✅ ', 'Correcto ').replace('⛔ ', 'Incorrecto ');
  // Botones que ya no existen pero pueden estar en archivos viejos
  window.LEGACY_LABELS = { otherFouls: 'Otras faltas', doubleWhistle: 'Cobro cruzado/DW', reboundFoul: 'Falta en rebote', clearImpactCip: 'Impacto claro (CIP)', clockError: 'Reloj / 24"' };
  window.PANEL_BUTTONS = [
    mk('callResult', 'Resultado del cobro', [['COBRO CORRECTO', 'CCM'], ['COBRO INCORRECTO', 'ICCM'], ['NO COBRO INCORRECTO', 'ICNC'], ['NO COBRO CORRECTO', 'CNC']]),
    mk('fouls', 'Faltas', [
      ['Bloqueo / Carga', 'blockCharge'], ['Agarrar / Sujetar', 'holding'], ['Uso ilegal de manos', 'illegalHands'],
      ['Pantalla ilegal', 'illegalScreen'], ['Falta en tiro', 'shootingFoul'], ['Disruptiva', 'disruptive'],
      ['Flagrante', 'unsportsmanlike'], ['Técnica', 'technical'], ['Descalificante', 'disqualifying']
    ], { group: 'incidentType' }),
    mk('violations', 'Violaciones', [
      ['Caminar', 'travelling'], ['Doble regate', 'doubleDribbling'], ['3 seg.', 'threeSeconds'],
      ['5 seg.', 'fiveSeconds'], ['8 seg.', 'eightSeconds'], ['24 seg.', 'shotClock'],
      ['Campo atrás', 'backcourt'], ['Interposición', 'goaltending'], ['Interferencia', 'interference'],
      ['Fuera de banda', 'outOfBounds'], ['Pie', 'kicking']
    ], { group: 'incidentType' }),
    mk('others', 'Otros', [['Demora', 'delay'], ['Conducta', 'behaviour'], ['Control del banco', 'benchControl'], ['Saque rápido', 'quickInbound']], { group: 'incidentType' }),
    mk('review', 'Sistema de revisión', [['✅ Uso IRS', 'correctUseIrs'], ['⛔ Uso IRS', 'incorrectUseIrs'], ['✅ Challenge', 'correctChallenge'], ['⛔ Challenge', 'incorrectChallenge']]),
    mk('tags', 'Tags', [
      ['Cobro cruzado/DW', 'crossedCallDw'], ['Llamada fantasma', 'phantomCall'], ['Ventaja/Desventaja', 'advantagePrinciple'],
      ['Posicionamiento', 'mechanicsPositioning'], ['Rotación', 'rotation'], ['IOT', 'iot'],
      ['Comunicación', 'communication'], ['Protocolos', 'protocols'], ['Manejo del partido', 'gameManagement'],
      ['Control de detalles', 'gameDetailsControl'], ['Uso de señales', 'useOfSignals'], ['Trabajo en equipo', 'teamwork'],
      ['Control emocional', 'emotionalControl'], ['Otro', 'other']
    ], { multi: true }),
  ];
  // Resultado del cobro: la key (CCM/ICCM/ICNC/CNC) es la que se guarda; en pantalla se muestra el texto o la abreviatura
  window.CALL_NAMES = { CCM: 'COBRO CORRECTO', CNC: 'NO COBRO CORRECTO', ICCM: 'COBRO INCORRECTO', ICNC: 'NO COBRO INCORRECTO' };
  window.CALL_SHORT = { CCM: 'CC', ICCM: 'CI', ICNC: 'NCI', CNC: 'NCC' };
  // Valores obligatorios al marcar un tag (keys usadas por scoring-criteria.js)
  window.TAG_VALUES = [
    { label: '−−', key: 'supNeg' }, { label: '−', key: 'neg' },
    { label: '+', key: 'pos' }, { label: '++', key: 'supPos' }
  ];
  // Valores permitidos por tag (los que no aparecen acá admiten los 4 valores)
  window.TAG_ALLOWED = {
    crossedCallDw:        ['neg'],
    phantomCall:          ['supNeg', 'neg'],
    advantagePrinciple:   ['neg', 'pos'],
    mechanicsPositioning: ['neg', 'pos'],
    rotation:             ['neg', 'pos'],
    iot:                  ['neg', 'pos'],
    communication:        ['neg', 'pos'],
    protocols:            ['neg', 'pos'],
    useOfSignals:         ['neg', 'pos']
  };
  window.tagAllows = (tag, val) => !window.TAG_ALLOWED[tag] || window.TAG_ALLOWED[tag].includes(val);
  // Resultado del Challenge (solo Challenge, no IRS). Se registra para estadísticas; no suma ni resta puntos.
  window.CHALLENGE_RESULT = { won: 'Ganado', lost: 'Perdido', unclear: 'Video no claro' };
  // Torneos FUBB para el selector (se puede escribir otro)
  window.TOURNAMENTS = ['LUB', 'LDA', 'DTA', 'Formativas'];
  // Posiciones de la terna: key guardada → nombre en pantalla y abreviatura
  window.ROLES = { L: ['Líder', 'LÍD'], C: ['Central', 'CEN'], T: ['Seguidor', 'SEG'] };
  // Períodos: duración en segundos
  window.PERIODS = [['1C', 600], ['2C', 600], ['3C', 600], ['4C', 600], ['TE', 300]];
  // Tiempo crucial (solo por tiempo): los últimos 2:00 del 4.º cuarto y todo el tiempo extra
  window.CRUCIAL = { last: { '4C': 120 }, whole: ['TE'] };
  window.isCrucial = p => (window.CRUCIAL.whole.includes(p.q)) || (p.q in window.CRUCIAL.last && p.time <= window.CRUCIAL.last[p.q]);
})();
