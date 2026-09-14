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
  semanaActual: 1,
  semanas: {}
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

let appData = loadData();

function loadData() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.warn('Error parsing storage:', e);
    }
  }
  return JSON.parse(JSON.stringify(DEFAULT_DATA));
}

function saveData() {
  readFormToCurrentWeek();
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

function renderWeeksBar() {
  const bar = document.getElementById('weeks-pills-container');
  if (!bar) return;
  bar.innerHTML = '';

  for (let i = 1; i <= 16; i++) {
    const btn = document.createElement('button');
    const isActive = appData.semanaActual === i;
    btn.className = `week-pill ${isActive ? 'active' : ''}`;
    btn.innerText = `Semana ${i}`;
    btn.onclick = () => {
      readFormToCurrentWeek();
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

  // Semana Actual
  const wk = getWeekData(appData.semanaActual);
  document.getElementById('display-semana-num').innerText = appData.semanaActual;
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

  // Tarea Significativa
  document.getElementById('ts-titulo').value = wk.tareaSignificativa?.titulo || '';
  document.getElementById('ts-proceso').value = wk.tareaSignificativa?.proceso || '';
  document.getElementById('ts-seguridad').value = wk.tareaSignificativa?.seguridad || '';
  document.getElementById('ts-herramientas').value = wk.tareaSignificativa?.herramientas || '';

  calcTotalHours();
}

function readFormToCurrentWeek() {
  // Datos Generales
  appData.estudiante = document.getElementById('meta-estudiante').value;
  appData.matricula = document.getElementById('meta-matricula').value;
  appData.carrera = document.getElementById('meta-carrera').value;
  appData.semestre = document.getElementById('meta-semestre').value;
  appData.empresa = document.getElementById('meta-empresa').value;
  appData.area = document.getElementById('meta-area').value;
  appData.monitor = document.getElementById('meta-monitor').value;
  appData.instructor = document.getElementById('meta-instructor').value;

  // Semana
  const wk = getWeekData(appData.semanaActual);
  wk.fechaInicio = document.getElementById('meta-fecha-inicio').value;
  wk.fechaFin = document.getElementById('meta-fecha-fin').value;

  const dias = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
  dias.forEach(d => {
    wk.dias[d] = {
      tarea: document.getElementById(`dia-${d}-tarea`).value,
      horas: Number(document.getElementById(`dia-${d}-horas`).value) || 0
    };
  });

  wk.tareaSignificativa = {
    titulo: document.getElementById('ts-titulo').value,
    proceso: document.getElementById('ts-proceso').value,
    seguridad: document.getElementById('ts-seguridad').value,
    herramientas: document.getElementById('ts-herramientas').value
  };
}

function calcTotalHours() {
  const dias = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
  let total = 0;
  dias.forEach(d => {
    const val = Number(document.getElementById(`dia-${d}-horas`)?.value) || 0;
    total += val;
  });
  const totalEl = document.getElementById('total-horas-semana');
  if (totalEl) totalEl.innerText = total + ' hrs';
}

function syncToOfficialPrint() {
  readFormToCurrentWeek();
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
}

function setupListeners() {
  document.getElementById('btn-guardar').onclick = saveData;

  document.getElementById('btn-imprimir').onclick = () => {
    syncToOfficialPrint();
    window.print();
  };

  // Recalcular horas en inputs
  const dias = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
  dias.forEach(d => {
    document.getElementById(`dia-${d}-horas`)?.addEventListener('input', calcTotalHours);
  });
}

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
  renderWeeksBar();
  renderTemplatesDropdown();
  populateForm();
  setupListeners();
});
