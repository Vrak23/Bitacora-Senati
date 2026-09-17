import { PLANTILLAS_DEV } from './templates.js';

// Estado de la aplicación
const STORAGE_KEY = 'senati_bitacora_data';

const DEFAULT_DATA = {
  estudiante: 'Rodrigo Llanos',
  matricula: '',
  carrera: 'Informática y Desarrollo de Aplicaciones Web',
  semestre: '4° Semestre',
  empresa: 'Departamento de TI y Desarrollo Web',
  area: 'Desarrollo de Software',
  monitor: '',
  instructor: '',
  modoFormato: 'semanal', // 'semanal' | 'empresa'
  semanaActual: 1,       // 1..16
  quincenaActual: 1,     // 1..8
  subSemanaEmpresa: 1,   // 1 (Semana A) | 2 (Semana B)
  semanas: {},
  informesEmpresa: {}
};

function getEmptyWeek(semNum) {
  return {
    fechaInicio: '',
    fechaFin: '',
    dias: {
      lunes: { tarea: '', horas: 6 },
      martes: { tarea: '', horas: 6 },
      miercoles: { tarea: '', horas: 6 },
      jueves: { tarea: '', horas: 6 },
      viernes: { tarea: '', horas: 6 },
      sabado: { tarea: '', horas: 0 }
    },
    tareaSignificativa: {
      titulo: '',
      proceso: '',
      seguridad: '',
      herramientas: ''
    }
  };
}

function getQuincenaWeeks(q) {
  const semA = (q - 1) * 2 + 1;
  const semB = (q - 1) * 2 + 2;
  return { semA, semB };
}

function getEmptyEmpresaReport(q) {
  return {
    titulo: '',
    proceso: '',
    seguridad: '',
    herramientas: '',
    asistencia: 'Excelente',
    seguridadEmpresa: 'Cumple',
    calidad: 'Excelente',
    observaciones: ''
  };
}

let appData = loadData();

function loadData() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      return {
        ...DEFAULT_DATA,
        ...parsed,
        semanas: parsed.semanas || {},
        informesEmpresa: parsed.informesEmpresa || {}
      };
    } catch (e) {
      console.warn('Error parsing storage:', e);
    }
  }
  return JSON.parse(JSON.stringify(DEFAULT_DATA));
}

function saveData() {
  readFormToCurrentState();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
  showToast('¡Información guardada correctamente!');
}

function showToast(msg) {
  let toast = document.getElementById('toast-msg');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast-msg';
    toast.style.position = 'fixed';
    toast.style.bottom = '24px';
    toast.style.right = '24px';
    toast.style.backgroundColor = '#131d33';
    toast.style.color = '#38bdf8';
    toast.style.border = '1px solid #38bdf8';
    toast.style.padding = '12px 20px';
    toast.style.borderRadius = '10px';
    toast.style.boxShadow = '0 12px 30px rgba(0,0,0,0.55), 0 0 16px rgba(56,189,248,0.25)';
    toast.style.fontWeight = '600';
    toast.style.fontSize = '0.88rem';
    toast.style.zIndex = '9999';
    toast.style.transition = 'all 0.25s ease';
    document.body.appendChild(toast);
  }
  toast.innerText = msg;
  toast.style.opacity = '1';
  toast.style.transform = 'translateY(0)';
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(8px)';
  }, 2500);
}

function getWeekData(num) {
  if (!appData.semanas[num]) {
    appData.semanas[num] = getEmptyWeek(num);
  }
  return appData.semanas[num];
}

function getEmpresaData(q) {
  if (!appData.informesEmpresa) appData.informesEmpresa = {};
  if (!appData.informesEmpresa[q]) {
    appData.informesEmpresa[q] = getEmptyEmpresaReport(q);
  }
  return appData.informesEmpresa[q];
}

function getWeekTotalHours(wk) {
  const dias = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
  let total = 0;
  dias.forEach(d => {
    total += Number(wk?.dias?.[d]?.horas) || 0;
  });
  return total;
}

function getCurrentActiveWeekNum() {
  if (appData.modoFormato === 'semanal') {
    return appData.semanaActual;
  } else {
    const { semA, semB } = getQuincenaWeeks(appData.quincenaActual);
    return appData.subSemanaEmpresa === 1 ? semA : semB;
  }
}

function setModoFormato(nuevoModo) {
  if (appData.modoFormato === nuevoModo) return;
  readFormToCurrentState();
  appData.modoFormato = nuevoModo;
  updateFormatUI();
  renderWeeksBar();
  populateForm();
}

function updateFormatUI() {
  const btnSemanal = document.getElementById('btn-fmt-semanal');
  const btnEmpresa = document.getElementById('btn-fmt-empresa');
  const periodsLabel = document.getElementById('periods-label');
  const subweeksBar = document.getElementById('empresa-subweeks-bar');
  const empresaEvalCard = document.getElementById('empresa-eval-card');
  const sec3Title = document.getElementById('section-3-title');
  const tsLabelTitulo = document.getElementById('ts-label-titulo');

  const esSemanal = appData.modoFormato === 'semanal';

  btnSemanal?.classList.toggle('active', esSemanal);
  btnEmpresa?.classList.toggle('active', !esSemanal);

  if (esSemanal) {
    if (periodsLabel) periodsLabel.innerText = '📅 Seleccionar Semana:';
    if (subweeksBar) subweeksBar.style.display = 'none';
    if (empresaEvalCard) empresaEvalCard.style.display = 'none';
    if (sec3Title) sec3Title.innerText = '3. Tarea Más Significativa de la Semana';
    if (tsLabelTitulo) tsLabelTitulo.innerText = 'Denominación de la Tarea / Proyecto:';
  } else {
    if (periodsLabel) periodsLabel.innerText = '🏢 Seleccionar Quincena (2 Semanas):';
    if (subweeksBar) subweeksBar.style.display = 'flex';
    if (empresaEvalCard) empresaEvalCard.style.display = 'block';
    if (sec3Title) sec3Title.innerText = '3. Tarea / Proyecto Principal de la Quincena';
    if (tsLabelTitulo) tsLabelTitulo.innerText = 'Denominación del Proyecto en Empresa:';
  }
}

function renderWeeksBar() {
  const bar = document.getElementById('weeks-pills-container');
  if (!bar) return;
  bar.innerHTML = '';

  const esSemanal = appData.modoFormato === 'semanal';

  if (esSemanal) {
    for (let i = 1; i <= 16; i++) {
      const btn = document.createElement('button');
      const isActive = appData.semanaActual === i;
      btn.className = `week-pill ${isActive ? 'active' : ''}`;
      btn.innerText = `Semana ${i}`;
      btn.onclick = () => {
        readFormToCurrentState();
        appData.semanaActual = i;
        renderWeeksBar();
        populateForm();
      };
      bar.appendChild(btn);

      if (isActive) {
        setTimeout(() => {
          btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }, 50);
      }
    }
  } else {
    for (let q = 1; q <= 8; q++) {
      const { semA, semB } = getQuincenaWeeks(q);
      const btn = document.createElement('button');
      const isActive = appData.quincenaActual === q;
      btn.className = `week-pill ${isActive ? 'active' : ''}`;
      btn.innerText = `Q${q}: Sem ${semA}-${semB}`;
      btn.onclick = () => {
        readFormToCurrentState();
        appData.quincenaActual = q;
        renderWeeksBar();
        populateForm();
      };
      bar.appendChild(btn);

      if (isActive) {
        setTimeout(() => {
          btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }, 50);
      }
    }
  }
}

function renderTemplatesDropdown() {
  const select = document.getElementById('template-select');
  if (!select) return;
  select.innerHTML = '<option value="">-- Seleccionar Plantilla Técnica de Desarrollo Web --</option>';

  PLANTILLAS_DEV.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.innerText = p.nombre;
    select.appendChild(opt);
  });

  select.onchange = (e) => {
    const val = e.target.value;
    if (!val) return;
    const tpl = PLANTILLAS_DEV.find(p => p.id === val);
    if (tpl) {
      document.getElementById('ts-titulo').value = tpl.tarea;
      document.getElementById('ts-proceso').value = tpl.proceso;
      document.getElementById('ts-seguridad').value = tpl.seguridad;
      document.getElementById('ts-herramientas').value = tpl.herramientas;
      showToast('Plantilla aplicada: ' + tpl.nombre);
    }
  };
}

function populateForm() {
  // Datos Generales
  document.getElementById('meta-estudiante').value = appData.estudiante || '';
  document.getElementById('meta-matricula').value = appData.matricula || '';
  document.getElementById('meta-carrera').value = appData.carrera || '';
  document.getElementById('meta-semestre').value = appData.semestre || '';
  document.getElementById('meta-empresa').value = appData.empresa || '';
  document.getElementById('meta-area').value = appData.area || '';
  document.getElementById('meta-monitor').value = appData.monitor || '';
  document.getElementById('meta-instructor').value = appData.instructor || '';

  const esSemanal = appData.modoFormato === 'semanal';
  const displayLabel = document.getElementById('display-semana-label');
  const displayNum = document.getElementById('display-semana-num');

  if (esSemanal) {
    const currentSem = appData.semanaActual;
    if (displayLabel) displayLabel.innerText = '2. Plan Semanal de Trabajo — Semana';
    if (displayNum) displayNum.innerText = currentSem;

    const wk = getWeekData(currentSem);
    document.getElementById('meta-fecha-inicio').value = wk.fechaInicio || '';
    document.getElementById('meta-fecha-fin').value = wk.fechaFin || '';

    // Días
    const dias = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    dias.forEach(d => {
      const tareaEl = document.getElementById(`dia-${d}-tarea`);
      const horasEl = document.getElementById(`dia-${d}-horas`);
      if (tareaEl && horasEl) {
        tareaEl.value = wk.dias[d]?.tarea || '';
        horasEl.value = wk.dias[d]?.horas ?? 0;
      }
    });

    // Tarea Significativa semanal
    document.getElementById('ts-titulo').value = wk.tareaSignificativa?.titulo || '';
    document.getElementById('ts-proceso').value = wk.tareaSignificativa?.proceso || '';
    document.getElementById('ts-seguridad').value = wk.tareaSignificativa?.seguridad || '';
    document.getElementById('ts-herramientas').value = wk.tareaSignificativa?.herramientas || '';

    calcTotalHours();
  } else {
    // MODO EMPRESA (QUINCENAL 2 SEMANAS)
    const { semA, semB } = getQuincenaWeeks(appData.quincenaActual);
    const subSemNum = appData.subSemanaEmpresa === 1 ? semA : semB;

    if (displayLabel) {
      displayLabel.innerText = `2. Plan de Trabajo en Empresa — Quincena ${appData.quincenaActual} (Sem ${semA} y ${semB}) — Editando:`;
    }
    if (displayNum) displayNum.innerText = `Semana ${subSemNum}`;

    // Subweeks buttons
    document.getElementById('subweek-a-num').innerText = `Sem ${semA}`;
    document.getElementById('subweek-b-num').innerText = `Sem ${semB}`;
    document.getElementById('btn-subweek-a').classList.toggle('active', appData.subSemanaEmpresa === 1);
    document.getElementById('btn-subweek-b').classList.toggle('active', appData.subSemanaEmpresa === 2);

    const wk = getWeekData(subSemNum);
    document.getElementById('meta-fecha-inicio').value = wk.fechaInicio || '';
    document.getElementById('meta-fecha-fin').value = wk.fechaFin || '';

    // Días
    const dias = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    dias.forEach(d => {
      const tareaEl = document.getElementById(`dia-${d}-tarea`);
      const horasEl = document.getElementById(`dia-${d}-horas`);
      if (tareaEl && horasEl) {
        tareaEl.value = wk.dias[d]?.tarea || '';
        horasEl.value = wk.dias[d]?.horas ?? 0;
      }
    });

    // Tarea Significativa de Empresa (Quincenal)
    const empData = getEmpresaData(appData.quincenaActual);
    document.getElementById('ts-titulo').value = empData.titulo || '';
    document.getElementById('ts-proceso').value = empData.proceso || '';
    document.getElementById('ts-seguridad').value = empData.seguridad || '';
    document.getElementById('ts-herramientas').value = empData.herramientas || '';

    // Evaluación del Monitor
    document.getElementById('emp-asistencia').value = empData.asistencia || 'Excelente';
    document.getElementById('emp-seguridad').value = empData.seguridadEmpresa || 'Cumple';
    document.getElementById('emp-calidad').value = empData.calidad || 'Excelente';
    document.getElementById('emp-observaciones').value = empData.observaciones || '';

    calcTotalHours();
  }
}

function readFormToCurrentState() {
  // Datos Generales
  appData.estudiante = document.getElementById('meta-estudiante').value;
  appData.matricula = document.getElementById('meta-matricula').value;
  appData.carrera = document.getElementById('meta-carrera').value;
  appData.semestre = document.getElementById('meta-semestre').value;
  appData.empresa = document.getElementById('meta-empresa').value;
  appData.area = document.getElementById('meta-area').value;
  appData.monitor = document.getElementById('meta-monitor').value;
  appData.instructor = document.getElementById('meta-instructor').value;

  const currentSem = getCurrentActiveWeekNum();
  const wk = getWeekData(currentSem);

  wk.fechaInicio = document.getElementById('meta-fecha-inicio').value;
  wk.fechaFin = document.getElementById('meta-fecha-fin').value;

  const dias = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
  dias.forEach(d => {
    wk.dias[d] = {
      tarea: document.getElementById(`dia-${d}-tarea`).value,
      horas: Number(document.getElementById(`dia-${d}-horas`).value) || 0
    };
  });

  if (appData.modoFormato === 'semanal') {
    wk.tareaSignificativa = {
      titulo: document.getElementById('ts-titulo').value,
      proceso: document.getElementById('ts-proceso').value,
      seguridad: document.getElementById('ts-seguridad').value,
      herramientas: document.getElementById('ts-herramientas').value
    };
  } else {
    // Guardar informe quincenal de empresa
    const empData = getEmpresaData(appData.quincenaActual);
    empData.titulo = document.getElementById('ts-titulo').value;
    empData.proceso = document.getElementById('ts-proceso').value;
    empData.seguridad = document.getElementById('ts-seguridad').value;
    empData.herramientas = document.getElementById('ts-herramientas').value;
    empData.asistencia = document.getElementById('emp-asistencia').value;
    empData.seguridadEmpresa = document.getElementById('emp-seguridad').value;
    empData.calidad = document.getElementById('emp-calidad').value;
    empData.observaciones = document.getElementById('emp-observaciones').value;
  }
}

function calcTotalHours() {
  const dias = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
  let totalSemanaActual = 0;
  dias.forEach(d => {
    const val = Number(document.getElementById(`dia-${d}-horas`)?.value) || 0;
    totalSemanaActual += val;
  });

  const totalEl = document.getElementById('total-horas-semana');
  if (totalEl) totalEl.innerText = totalSemanaActual + ' hrs';

  // Si estamos en modo empresa, recalcular suma de ambas semanas
  if (appData.modoFormato === 'empresa') {
    const { semA, semB } = getQuincenaWeeks(appData.quincenaActual);
    const wkA = getWeekData(semA);
    const wkB = getWeekData(semB);

    // Si estamos editando una de ellas en este momento, tomar los valores del formulario
    let hrsA = appData.subSemanaEmpresa === 1 ? totalSemanaActual : getWeekTotalHours(wkA);
    let hrsB = appData.subSemanaEmpresa === 2 ? totalSemanaActual : getWeekTotalHours(wkB);

    const totalQ = hrsA + hrsB;
    const qTotalEl = document.getElementById('quincena-total-hrs');
    const hrsAEl = document.getElementById('hrs-sem-a');
    const hrsBEl = document.getElementById('hrs-sem-b');

    if (qTotalEl) qTotalEl.innerText = totalQ + ' hrs';
    if (hrsAEl) hrsAEl.innerText = hrsA + 'h';
    if (hrsBEl) hrsBEl.innerText = hrsB + 'h';
  }
}

function syncToOfficialPrint() {
  readFormToCurrentState();

  const printSemanal = document.getElementById('print-view-semanal');
  const printEmpresa = document.getElementById('print-view-empresa');

  if (appData.modoFormato === 'semanal') {
    if (printSemanal) printSemanal.style.display = 'block';
    if (printEmpresa) printEmpresa.style.display = 'none';

    const wk = getWeekData(appData.semanaActual);

    document.getElementById('pr-estudiante').innerText = appData.estudiante || '-';
    document.getElementById('pr-carrera').innerText = appData.carrera || '-';
    document.getElementById('pr-semestre').innerText = appData.semestre || '-';
    document.getElementById('pr-empresa').innerText = appData.empresa || '-';
    document.getElementById('pr-area').innerText = appData.area || '-';
    document.getElementById('pr-monitor').innerText = appData.monitor || '-';
    document.getElementById('pr-instructor').innerText = appData.instructor || '-';

    document.getElementById('pr-semana').innerText = appData.semanaActual;
    document.getElementById('pr-periodo').innerText = (wk.fechaInicio && wk.fechaFin) ? `${wk.fechaInicio} al ${wk.fechaFin}` : 'Según rol de prácticas';

    const dias = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    let totalHoras = 0;
    dias.forEach(d => {
      const item = wk.dias[d] || { tarea: '', horas: 0 };
      document.getElementById(`pr-${d}-tarea`).innerText = item.tarea || 'Sin actividad registrada.';
      document.getElementById(`pr-${d}-horas`).innerText = item.horas;
      totalHoras += Number(item.horas) || 0;
    });
    document.getElementById('pr-total-horas').innerText = totalHoras + ' hrs';

    document.getElementById('pr-ts-titulo').innerText = wk.tareaSignificativa?.titulo || 'Desarrollo de Aplicaciones Web';
    document.getElementById('pr-ts-proceso').innerText = wk.tareaSignificativa?.proceso || 'No especificado.';
    document.getElementById('pr-ts-seguridad').innerText = wk.tareaSignificativa?.seguridad || 'No especificado.';
    document.getElementById('pr-ts-herramientas').innerText = wk.tareaSignificativa?.herramientas || 'No especificado.';
  } else {
    // IMPRESIÓN MODO EMPRESA (2 SEMANAS / FORMATO DUAL-05)
    if (printSemanal) printSemanal.style.display = 'none';
    if (printEmpresa) printEmpresa.style.display = 'block';

    const q = appData.quincenaActual;
    const { semA, semB } = getQuincenaWeeks(q);
    const wkA = getWeekData(semA);
    const wkB = getWeekData(semB);
    const empData = getEmpresaData(q);

    document.getElementById('pr-emp-estudiante').innerText = appData.estudiante || '-';
    document.getElementById('pr-emp-carrera').innerText = appData.carrera || '-';
    document.getElementById('pr-emp-semestre').innerText = appData.semestre || '-';
    document.getElementById('pr-emp-empresa').innerText = appData.empresa || '-';
    document.getElementById('pr-emp-area').innerText = appData.area || '-';
    document.getElementById('pr-emp-monitor').innerText = appData.monitor || '-';
    document.getElementById('pr-emp-instructor').innerText = appData.instructor || '-';

    document.getElementById('pr-emp-quincena').innerText = `Quincena N° ${q} (Semanas ${semA} y ${semB})`;

    const fechaIni = wkA.fechaInicio || 'Inicio periodo';
    const fechaFin = wkB.fechaFin || wkA.fechaFin || 'Fin periodo';
    document.getElementById('pr-emp-periodo').innerText = `${fechaIni} al ${fechaFin}`;

    document.getElementById('pr-emp-semA-titulo').innerText = `Semana ${semA}`;
    document.getElementById('pr-emp-semB-titulo').innerText = `Semana ${semB}`;

    const dias = [
      { id: 'lunes', short: 'lun' },
      { id: 'martes', short: 'mar' },
      { id: 'miercoles', short: 'mie' },
      { id: 'jueves', short: 'jue' },
      { id: 'viernes', short: 'vie' },
      { id: 'sabado', short: 'sab' }
    ];

    let totalHrsA = 0;
    let totalHrsB = 0;

    dias.forEach(d => {
      const itemA = wkA.dias[d.id] || { tarea: '', horas: 0 };
      const itemB = wkB.dias[d.id] || { tarea: '', horas: 0 };

      document.getElementById(`pr-emp-semA-${d.short}-tarea`).innerText = itemA.tarea || 'Sin actividad registrada.';
      document.getElementById(`pr-emp-semA-${d.short}-hrs`).innerText = itemA.horas;
      totalHrsA += Number(itemA.horas) || 0;

      document.getElementById(`pr-emp-semB-${d.short}-tarea`).innerText = itemB.tarea || 'Sin actividad registrada.';
      document.getElementById(`pr-emp-semB-${d.short}-hrs`).innerText = itemB.horas;
      totalHrsB += Number(itemB.horas) || 0;
    });

    document.getElementById('pr-emp-semA-total').innerText = totalHrsA + ' hrs';
    document.getElementById('pr-emp-semB-total').innerText = totalHrsB + ' hrs';
    document.getElementById('pr-emp-total-quincena').innerText = (totalHrsA + totalHrsB) + ' hrs';

    // Tarea de Quincena
    document.getElementById('pr-emp-ts-titulo').innerText = empData.titulo || 'Proyecto de Formación Práctica en Empresa';
    document.getElementById('pr-emp-ts-proceso').innerText = empData.proceso || 'No especificado.';
    document.getElementById('pr-emp-ts-seguridad').innerText = empData.seguridad || 'No especificado.';
    document.getElementById('pr-emp-ts-herramientas').innerText = empData.herramientas || 'No especificado.';

    // Evaluación del Monitor
    document.getElementById('pr-emp-eval-asistencia').innerText = empData.asistencia || 'Excelente';
    document.getElementById('pr-emp-eval-seguridad').innerText = empData.seguridadEmpresa || 'Cumple';
    document.getElementById('pr-emp-eval-calidad').innerText = empData.calidad || 'Excelente';
    document.getElementById('pr-emp-eval-obs').innerText = empData.observaciones || 'Desempeño conforme a los objetivos del perfil técnico.';
  }
}

function setupListeners() {
  document.getElementById('btn-guardar').onclick = saveData;

  document.getElementById('btn-imprimir').onclick = () => {
    syncToOfficialPrint();
    window.print();
  };

  // Switcher de Formato
  document.getElementById('btn-fmt-semanal').onclick = () => setModoFormato('semanal');
  document.getElementById('btn-fmt-empresa').onclick = () => setModoFormato('empresa');

  // Switcher de Sub-semana en modo empresa
  document.getElementById('btn-subweek-a').onclick = () => {
    readFormToCurrentState();
    appData.subSemanaEmpresa = 1;
    populateForm();
  };

  document.getElementById('btn-subweek-b').onclick = () => {
    readFormToCurrentState();
    appData.subSemanaEmpresa = 2;
    populateForm();
  };

  // Dynamic Central Hub URL
  const hubBtn = document.getElementById('btn-central-hub');
  if (hubBtn) {
    hubBtn.href = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'http://localhost:4200'
      : 'https://central-de-estudio.vercel.app/';
  }

  // Recalcular horas en inputs
  const dias = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
  dias.forEach(d => {
    document.getElementById(`dia-${d}-horas`)?.addEventListener('input', calcTotalHours);
  });
}

function hideSplashScreen() {
  const splash = document.getElementById('app-splash-screen');
  if (!splash) return;
  setTimeout(() => {
    splash.classList.add('splash-hidden');
  }, 400);
}

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
  updateFormatUI();
  renderWeeksBar();
  renderTemplatesDropdown();
  populateForm();
  setupListeners();
  hideSplashScreen();
});

