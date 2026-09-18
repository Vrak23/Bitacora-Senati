import { PLANTILLAS_DEV } from './templates.js';
import { generateInformeSemanalPDF } from './pdf-generator.js';

// Estado de la aplicación
const STORAGE_KEY = 'senati_bitacora_data';

function getEmptySeminarioData() {
  return {
    actividadActual: 1,
    actividades: {
      1: {
        titulo: 'Semana 1: Desarrollo del módulo PetShop y enrutamiento SPA en Angular',
        descripcion: 'Creación del proyecto con arquitectura Standalone Components, configuración del enrutamiento SPA en app.routes.ts y maquetación de la navegación responsiva.',
        urlUi: 'http://localhost:4200/',
        imgUi: '',
        imgCodigo: '',
        tagCodigo: 'app.routes.ts:',
        extras: []
      },
      2: {
        titulo: 'Semana 2: Formularios Template-Driven y Validaciones Sintácticas',
        descripcion: 'Registro de mascotas con enlace bidireccional [(ngModel)] y registro de clientes con validación de expresiones regulares para DNI y email.',
        urlUi: 'http://localhost:4200/',
        imgUi: '',
        imgCodigo: '',
        tagCodigo: 'PetShop.component.ts:',
        extras: []
      },
      3: {
        titulo: 'Semana 3: Formulario Reactivo de Adopciones y Servicios Asíncronos',
        descripcion: 'Módulo de solicitudes de adopción implementado con Reactive Forms (FormBuilder) y servicio HTTP para enlace de datos.',
        urlUi: 'http://localhost:4200/',
        imgUi: '',
        imgCodigo: '',
        tagCodigo: 'Adopciones.service.ts:',
        extras: []
      },
      4: {
        titulo: 'Semana 4: Dashboard de Métricas, KPIs y Despliegue en Servidor',
        descripcion: 'Diseño del panel de control con tarjetas KPI, tabla de historial de solicitudes y verificación de despliegue en servidor local.',
        urlUi: 'http://localhost:4200/',
        imgUi: '',
        imgCodigo: '',
        tagCodigo: 'Dashboard.component.ts:',
        extras: []
      }
    }
  };
}

const DEFAULT_DATA = {
  estudiante: 'Rodrigo Daniel Ormeño Llanos',
  matricula: '001681961',
  carrera: 'Informática y Desarrollo de Aplicaciones Web',
  semestre: '4° Ciclo',
  escuela: 'ETI (Escuela de Tecnologías de la Información)',
  bloque: '406',
  instructor: 'Jorge Luque Chambi',
  empresa: '',
  area: '',
  monitor: '',
  modoFormato: 'semanal', // 'semanal' | 'empresa' | 'seminario'
  semanaActual: 1,       // 1..16
  quincenaActual: 1,     // 1..8
  subSemanaEmpresa: 1,   // 1 (Semana A) | 2 (Semana B)
  semanas: {},
  informesEmpresa: {},
  informeSeminario: getEmptySeminarioData()
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
        informesEmpresa: parsed.informesEmpresa || {},
        informeSeminario: {
          ...getEmptySeminarioData(),
          ...(parsed.informeSeminario || {}),
          actividades: {
            ...getEmptySeminarioData().actividades,
            ...(parsed.informeSeminario?.actividades || {})
          }
        }
      };
    } catch (e) {
      console.warn('Error parsing storage:', e);
    }
  }
  return {
    ...JSON.parse(JSON.stringify(DEFAULT_DATA)),
    informeSeminario: getEmptySeminarioData()
  };
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

function getSeminarioActividad(actNum) {
  if (!appData.informeSeminario) {
    appData.informeSeminario = getEmptySeminarioData();
  }
  if (!appData.informeSeminario.actividades[actNum]) {
    appData.informeSeminario.actividades[actNum] = {
      titulo: `Actividad ${actNum}`,
      descripcion: '',
      urlUi: 'http://localhost:4200/',
      imgUi: '',
      imgCodigo: '',
      tagCodigo: '',
      extras: []
    };
  }
  const act = appData.informeSeminario.actividades[actNum];
  if (!act.extras) act.extras = [];

  return act;
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
  const btnSeminario = document.getElementById('btn-fmt-seminario');

  const weeksBar = document.querySelector('.weeks-bar');
  const subweeksBar = document.getElementById('empresa-subweeks-bar');
  const empresaEvalCard = document.getElementById('empresa-eval-card');
  const empresaMetaFields = document.getElementById('empresa-meta-fields');
  const seminarioCard = document.getElementById('seminario-evidencias-card');
  const section2Plan = document.querySelector('.card-section:nth-of-type(2)');
  const sec1Title = document.getElementById('sec-1-title');
  const sec3Title = document.getElementById('section-3-title');
  const tsLabelTitulo = document.getElementById('ts-label-titulo');

  const templateBar = document.querySelector('.template-bar');
  const extraTsFields = document.getElementById('semanal-empresa-ts-fields');

  const modo = appData.modoFormato;

  btnSemanal?.classList.toggle('active', modo === 'semanal');
  btnEmpresa?.classList.toggle('active', modo === 'empresa');
  btnSeminario?.classList.toggle('active', modo === 'seminario');

  if (modo === 'semanal') {
    if (weeksBar) weeksBar.style.display = 'flex';
    if (subweeksBar) subweeksBar.style.display = 'none';
    if (empresaEvalCard) empresaEvalCard.style.display = 'none';
    if (empresaMetaFields) empresaMetaFields.style.display = 'none';
    if (seminarioCard) seminarioCard.style.display = 'none';
    if (section2Plan) section2Plan.style.display = 'block';
    if (templateBar) templateBar.style.display = 'flex';
    if (extraTsFields) extraTsFields.style.display = 'block';
    if (sec1Title) sec1Title.innerText = '1. Datos de Identificación Académica SENATI';
    if (sec3Title) sec3Title.innerText = '3. Tarea Más Significativa de la Semana';
    if (tsLabelTitulo) tsLabelTitulo.innerText = 'Denominación de la Tarea / Proyecto:';
  } else if (modo === 'empresa') {
    if (weeksBar) weeksBar.style.display = 'flex';
    if (subweeksBar) subweeksBar.style.display = 'flex';
    if (empresaEvalCard) empresaEvalCard.style.display = 'block';
    if (empresaMetaFields) empresaMetaFields.style.display = 'grid';
    if (seminarioCard) seminarioCard.style.display = 'none';
    if (section2Plan) section2Plan.style.display = 'block';
    if (templateBar) templateBar.style.display = 'flex';
    if (extraTsFields) extraTsFields.style.display = 'block';
    if (sec1Title) sec1Title.innerText = '1. Datos del Estudiante y Empresa Formadora (Dual)';
    if (sec3Title) sec3Title.innerText = '3. Tarea / Proyecto Principal de la Quincena';
    if (tsLabelTitulo) tsLabelTitulo.innerText = 'Denominación del Proyecto en Empresa:';
  } else if (modo === 'seminario') {
    if (weeksBar) weeksBar.style.display = 'none';
    if (subweeksBar) subweeksBar.style.display = 'none';
    if (empresaEvalCard) empresaEvalCard.style.display = 'none';
    if (empresaMetaFields) empresaMetaFields.style.display = 'none';
    if (seminarioCard) seminarioCard.style.display = 'block';
    if (section2Plan) section2Plan.style.display = 'none';
    if (templateBar) templateBar.style.display = 'none';
    if (extraTsFields) extraTsFields.style.display = 'none';
    if (sec1Title) sec1Title.innerText = '1. Datos Generales de Identificación (SENATI PAWD-301)';
    if (sec3Title) sec3Title.innerText = '2. Tarea Más Significativa del Seminario';
    if (tsLabelTitulo) tsLabelTitulo.innerText = 'Denominación del Proyecto / Módulo Integrador:';
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
  } else if (appData.modoFormato === 'empresa') {
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
  document.getElementById('meta-escuela').value = appData.escuela || '';
  document.getElementById('meta-bloque').value = appData.bloque || '';
  document.getElementById('meta-instructor').value = appData.instructor || '';

  // Datos Empresa (Solo en modo empresa)
  document.getElementById('meta-empresa').value = appData.empresa || '';
  document.getElementById('meta-area').value = appData.area || '';
  document.getElementById('meta-monitor').value = appData.monitor || '';

  const modo = appData.modoFormato;
  const displayLabel = document.getElementById('display-semana-label');
  const displayNum = document.getElementById('display-semana-num');

  if (modo === 'semanal') {
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
  } else if (modo === 'empresa') {
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
  } else if (modo === 'seminario') {
    // MODO SEMINARIO (4 ACTIVIDADES CON EVIDENCIAS)
    const semData = appData.informeSeminario;
    const actNum = semData.actividadActual || 1;

    const act = getSeminarioActividad(actNum);

    // Tarea Significativa global del seminario
    document.getElementById('ts-titulo').value = semData.tituloGlobal || act.titulo || 'Desarrollo de la aplicación web PetShop con módulos de gestión de mascotas, clientes, adopciones y dashboard en Angular';
    document.getElementById('ts-proceso').value = semData.procesoGlobal || 'El desarrollo de la aplicación web se inició configurando el entorno en Angular con arquitectura de componentes Standalone y definiendo las rutas SPA principales en app.routes.ts.\n\nPosteriormente, se implementaron los módulos principales con formularios reactivos y template-driven, aplicando validaciones sintácticas strictly para DNI, correo electrónico y campos requeridos.\n\nSe diseñó e integró la lógica de negocio mediante servicios asíncronos en TypeScript, gestionando el estado de las entidades y maquetando un Dashboard con métricas clave y tarjetas KPI.\n\nFinalmente, se realizaron las pruebas funcionales de navegación y rendimiento ejecutando el proyecto en el servidor local de desarrollo (http://localhost:4200/), verificando el correcto envío de datos y la ausencia de errores en la consola DevTools.';
    document.getElementById('ts-seguridad').value = semData.seguridadGlobal || '• Aplicación estricta de normas de ergonomía ocupacional: postura de columna a 90° frente al escritorio y altura del monitor nivelada a la vista.\n• Cumplimiento de la regla 20-20-20 (descanso visual de 20 segundos cada 20 minutos).\n• Mantenimiento del puesto de trabajo ordenado, política de cero papel y ahorro eficiente de energía eléctrica.';
    document.getElementById('ts-herramientas').value = semData.herramientasGlobal || 'Visual Studio Code, Angular CLI, TypeScript, HTML5/CSS3, Node.js, Postman, Chrome DevTools, Git, Windows 11.';

    renderSeminarioActivityUI();
  }
}

function renderSeminarioActivityUI() {
  const semData = appData.informeSeminario;
  const actNum = semData.actividadActual || 1;
  const act = getSeminarioActividad(actNum);

  // Actualizar píldoras de actividad
  for (let i = 1; i <= 4; i++) {
    const btn = document.getElementById(`btn-act-${i}`);
    if (btn) btn.classList.toggle('active', i === actNum);
  }

  const actLabel = document.getElementById('act-editing-num-label');
  if (actLabel) actLabel.innerText = `Actividad ${actNum}`;

  document.getElementById('sem-act-titulo').value = act.titulo || '';
  document.getElementById('sem-act-descripcion').value = act.descripcion || '';
  document.getElementById('sem-url-ui').value = act.urlUi || 'http://localhost:4200/';
  document.getElementById('sem-tag-codigo').value = act.tagCodigo || '';

  // Vista previa UI Image
  const uiEmpty = document.getElementById('ui-dropzone-empty');
  const uiPreview = document.getElementById('ui-dropzone-preview');
  const uiImg = document.getElementById('img-preview-ui');

  if (act.imgUi) {
    uiImg.src = act.imgUi;
    uiEmpty.style.display = 'none';
    uiPreview.style.display = 'flex';
  } else {
    uiImg.src = '';
    uiEmpty.style.display = 'flex';
    uiPreview.style.display = 'none';
  }

  // Vista previa Código Image
  const codEmpty = document.getElementById('codigo-dropzone-empty');
  const codPreview = document.getElementById('codigo-dropzone-preview');
  const codImg = document.getElementById('img-preview-codigo');

  if (act.imgCodigo) {
    codImg.src = act.imgCodigo;
    codEmpty.style.display = 'none';
    codPreview.style.display = 'flex';
  } else {
    codImg.src = '';
    codEmpty.style.display = 'flex';
    codPreview.style.display = 'none';
  }

  // Renderizar Galería de Capturas Adicionales
  renderExtraEvidencesList(act);
}

function renderExtraEvidencesList(act) {
  const containerUi = document.getElementById('extra-ui-list');
  const containerCod = document.getElementById('extra-codigo-list');
  if (!containerUi && !containerCod) return;

  if (containerUi) containerUi.innerHTML = '';
  if (containerCod) containerCod.innerHTML = '';

  const extras = act.extras || [];

  const uiExtras = extras.filter(ex => ex.tipo === 'ui');
  const codExtras = extras.filter(ex => ex.tipo === 'codigo');

  if (containerUi && uiExtras.length === 0) {
    containerUi.innerHTML = `<div style="grid-column: 1 / -1; color: var(--text-dim); font-size: 0.8rem; padding: 0.6rem; border: 1px dashed var(--border); border-radius: 8px; text-align: center;">No hay capturas Web adicionales. Pulsa "+ Agregar Captura Web adicional" para añadir más.</div>`;
  }

  if (containerCod && codExtras.length === 0) {
    containerCod.innerHTML = `<div style="grid-column: 1 / -1; color: var(--text-dim); font-size: 0.8rem; padding: 0.6rem; border: 1px dashed var(--border); border-radius: 8px; text-align: center;">No hay capturas de Código adicionales. Pulsa "+ Agregar Captura Código adicional" para añadir más.</div>`;
  }

  extras.forEach((ex, idx) => {
    const card = document.createElement('div');
    card.className = 'evidencia-box extra-card-item';
    card.setAttribute('draggable', 'true');
    card.setAttribute('data-idx', idx);

    const isUi = ex.tipo === 'ui';
    const titleText = isUi ? `Captura Web adicional #${idx + 1}` : `Captura Código adicional #${idx + 1}`;
    const placeholderText = isUi ? 'Ej: http://localhost:4200/clientes' : 'Ej: clientes.component.ts:';

    const imgHtml = ex.img
      ? `<img src="${ex.img}" style="max-height: 140px; object-fit: contain; border-radius: 6px;" alt="Evidencia Extra" />`
      : `<div style="padding: 1rem; color: var(--text-dim); font-size: 0.8rem;">Arrastra aquí una imagen o haz clic para subir</div>`;

    card.innerHTML = `
      <div class="evidencia-head" style="display: flex; justify-content: space-between; align-items: center; gap: 0.5rem;">
        <div style="display: flex; align-items: center; gap: 0.4rem;">
          <span style="cursor: grab; color: var(--text-muted); font-size: 0.9rem;" title="Arrastrar para reordenar">☰</span>
          <h3 style="font-size: 0.85rem; margin: 0;">${titleText}</h3>
        </div>
        <div class="card-reorder-actions" style="display: flex; gap: 0.35rem; align-items: center;">
          <button type="button" class="btn-order-move btn-move-up" data-idx="${idx}" ${idx === 0 ? 'disabled style="opacity: 0.3; cursor: not-allowed;"' : ''} style="background: rgba(255,255,255,0.08); border: 1px solid var(--border); color: var(--primary); font-size: 0.75rem; padding: 0.2rem 0.5rem; border-radius: 4px; cursor: pointer;" title="Mover arriba">⬆️ Subir</button>
          <button type="button" class="btn-order-move btn-move-down" data-idx="${idx}" ${idx === extras.length - 1 ? 'disabled style="opacity: 0.3; cursor: not-allowed;"' : ''} style="background: rgba(255,255,255,0.08); border: 1px solid var(--border); color: var(--primary); font-size: 0.75rem; padding: 0.2rem 0.5rem; border-radius: 4px; cursor: pointer;" title="Mover abajo">⬇️ Bajar</button>
          <button type="button" class="btn-remove-extra" data-idx="${idx}" style="background: none; border: none; color: #ef4444; font-size: 0.8rem; cursor: pointer; margin-left: 0.2rem;" title="Eliminar captura">🗑️</button>
        </div>
      </div>

      <div class="form-group" style="margin-bottom: 0.5rem;">
        <label style="font-size: 0.75rem;">${isUi ? 'Nombre / URL de la captura:' : 'Nombre / Etiqueta de archivo:'}</label>
        <input type="text" class="form-control extra-tag-input" data-idx="${idx}" value="${ex.tag || ''}" placeholder="${placeholderText}" style="font-size: 0.8rem; padding: 0.25rem 0.5rem;" />
      </div>

      <div class="dropzone-box extra-dropzone" data-idx="${idx}" style="min-height: 120px; padding: 0.5rem;">
        <input type="file" accept="image/*" class="file-hidden-input extra-file-input" data-idx="${idx}" />
        <div class="dropzone-preview" style="display: flex; flex-direction: column; align-items: center;">
          ${imgHtml}
          ${ex.img ? `<button type="button" class="btn-preview-action view btn-view-extra" data-idx="${idx}" style="margin-top: 0.35rem; font-size: 0.7rem; padding: 0.2rem 0.5rem;">🔍 Ampliar</button>` : ''}
        </div>
      </div>
    `;

    // Drag and Drop Reordering Handlers
    card.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', idx.toString());
      card.style.opacity = '0.5';
    });

    card.addEventListener('dragend', () => {
      card.style.opacity = '1';
      document.querySelectorAll('.extra-card-item').forEach(c => c.style.border = '');
    });

    card.addEventListener('dragover', (e) => {
      e.preventDefault();
      card.style.border = '2px dashed var(--primary)';
    });

    card.addEventListener('dragleave', () => {
      card.style.border = '';
    });

    card.addEventListener('drop', (e) => {
      e.preventDefault();
      card.style.border = '';
      const srcIdx = Number(e.dataTransfer.getData('text/plain'));
      const targetIdx = idx;

      if (!isNaN(srcIdx) && srcIdx !== targetIdx && act.extras[srcIdx]) {
        const itemMoved = act.extras.splice(srcIdx, 1)[0];
        act.extras.splice(targetIdx, 0, itemMoved);
        renderSeminarioActivityUI();
        showToast('Captura reordenada 🔄');
      }
    });

    if (isUi && containerUi) {
      containerUi.appendChild(card);
    } else if (!isUi && containerCod) {
      containerCod.appendChild(card);
    }
  });

  // Listeners para Mover Arriba / Mover Abajo
  document.querySelectorAll('.btn-move-up').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const idx = Number(btn.getAttribute('data-idx'));
      if (idx > 0 && act.extras[idx]) {
        const temp = act.extras[idx];
        act.extras[idx] = act.extras[idx - 1];
        act.extras[idx - 1] = temp;
        renderSeminarioActivityUI();
        showToast('Captura movida hacia arriba ⬆️');
      }
    };
  });

  document.querySelectorAll('.btn-move-down').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const idx = Number(btn.getAttribute('data-idx'));
      if (idx < act.extras.length - 1 && act.extras[idx]) {
        const temp = act.extras[idx];
        act.extras[idx] = act.extras[idx + 1];
        act.extras[idx + 1] = temp;
        renderSeminarioActivityUI();
        showToast('Captura movida hacia abajo ⬇️');
      }
    };
  });

  // Inputs y botones de eliminar/vista previa
  document.querySelectorAll('.extra-tag-input').forEach(input => {
    input.oninput = (e) => {
      const idx = Number(e.target.getAttribute('data-idx'));
      if (act.extras[idx]) {
        act.extras[idx].tag = e.target.value;
      }
    };
  });

  document.querySelectorAll('.extra-file-input').forEach(input => {
    input.onchange = async (e) => {
      const idx = Number(e.target.getAttribute('data-idx'));
      if (e.target.files && e.target.files[0] && act.extras[idx]) {
        const dataUrl = await compressAndConvertImage(e.target.files[0], 1200, 0.85);
        act.extras[idx].img = dataUrl;
        renderSeminarioActivityUI();
        showToast('¡Captura cargada!');
      }
    };
  });

  document.querySelectorAll('.btn-remove-extra').forEach(btn => {
    btn.onclick = () => {
      const idx = Number(btn.getAttribute('data-idx'));
      act.extras.splice(idx, 1);
      renderSeminarioActivityUI();
      showToast('Captura eliminada');
    };
  });

  document.querySelectorAll('.btn-view-extra').forEach(btn => {
    btn.onclick = () => {
      const idx = Number(btn.getAttribute('data-idx'));
      const item = act.extras[idx];
      if (item && item.img) {
        const modal = document.getElementById('img-fullscreen-modal');
        const modalImg = document.getElementById('modal-full-img');
        const modalCaption = document.getElementById('modal-img-caption');
        if (modal && modalImg) {
          modalImg.src = item.img;
          if (modalCaption) modalCaption.innerText = item.tag || `Captura (${item.tipo.toUpperCase()})`;
          modal.style.display = 'flex';
        }
      }
    };
  });
}

function readFormToCurrentState() {
  // Datos Generales
  appData.estudiante = document.getElementById('meta-estudiante').value;
  appData.matricula = document.getElementById('meta-matricula').value;
  appData.carrera = document.getElementById('meta-carrera').value;
  appData.semestre = document.getElementById('meta-semestre').value;
  appData.escuela = document.getElementById('meta-escuela').value;
  appData.bloque = document.getElementById('meta-bloque').value;
  appData.instructor = document.getElementById('meta-instructor').value;

  appData.empresa = document.getElementById('meta-empresa').value;
  appData.area = document.getElementById('meta-area').value;
  appData.monitor = document.getElementById('meta-monitor').value;

  const modo = appData.modoFormato;

  if (modo === 'semanal') {
    const currentSem = appData.semanaActual;
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

    wk.tareaSignificativa = {
      titulo: document.getElementById('ts-titulo').value,
      proceso: document.getElementById('ts-proceso').value,
      seguridad: document.getElementById('ts-seguridad').value,
      herramientas: document.getElementById('ts-herramientas').value
    };
  } else if (modo === 'empresa') {
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

    const empData = getEmpresaData(appData.quincenaActual);
    empData.titulo = document.getElementById('ts-titulo').value;
    empData.proceso = document.getElementById('ts-proceso').value;
    empData.seguridad = document.getElementById('ts-seguridad').value;
    empData.herramientas = document.getElementById('ts-herramientas').value;
    empData.asistencia = document.getElementById('emp-asistencia').value;
    empData.seguridadEmpresa = document.getElementById('emp-seguridad').value;
    empData.calidad = document.getElementById('emp-calidad').value;
    empData.observaciones = document.getElementById('emp-observaciones').value;
  } else if (modo === 'seminario') {
    const semData = appData.informeSeminario;
    semData.tituloGlobal = document.getElementById('ts-titulo').value;
    semData.procesoGlobal = document.getElementById('ts-proceso').value;
    semData.seguridadGlobal = document.getElementById('ts-seguridad').value;
    semData.herramientasGlobal = document.getElementById('ts-herramientas').value;

    readSeminarioActivityFormToState();
  }
}

function readSeminarioActivityFormToState() {
  const semData = appData.informeSeminario;
  const actNum = semData.actividadActual || 1;
  const act = getSeminarioActividad(actNum);

  act.titulo = document.getElementById('sem-act-titulo').value;
  act.descripcion = document.getElementById('sem-act-descripcion').value;
  act.urlUi = document.getElementById('sem-url-ui').value;
  act.tagCodigo = document.getElementById('sem-tag-codigo').value;
}

function compressAndConvertImage(file, maxWidth = 1200, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target.result;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
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
  const printSeminario = document.getElementById('print-view-seminario');

  const modo = appData.modoFormato;

  if (modo === 'semanal') {
    if (printSemanal) printSemanal.style.display = 'block';
    if (printEmpresa) printEmpresa.style.display = 'none';
    if (printSeminario) printSeminario.style.display = 'none';

    const wk = getWeekData(appData.semanaActual);

    document.getElementById('pr-estudiante').innerText = appData.estudiante || '-';
    document.getElementById('pr-carrera').innerText = appData.carrera || '-';
    document.getElementById('pr-semestre').innerText = appData.semestre || '-';
    document.getElementById('pr-empresa').innerText = appData.empresa || 'CFP SENATI';
    document.getElementById('pr-area').innerText = appData.area || 'Taller de Cómputo / ETI';
    document.getElementById('pr-monitor').innerText = appData.monitor || appData.instructor || '-';
    document.getElementById('pr-instructor').innerText = appData.instructor || '-';

    document.getElementById('pr-semana').innerText = appData.semanaActual;
    document.getElementById('pr-periodo').innerText = (wk.fechaInicio && wk.fechaFin) ? `${wk.fechaInicio} al ${wk.fechaFin}` : 'Según rol lectivo';

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
  } else if (modo === 'empresa') {
    if (printSemanal) printSemanal.style.display = 'none';
    if (printEmpresa) printEmpresa.style.display = 'block';
    if (printSeminario) printSeminario.style.display = 'none';

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
  } else if (modo === 'seminario') {
    // MODO INFORME SEMANAL / CLASE (CUADERNILLO OFICIAL DE 6 PÁGINAS SENATI)
    if (printSemanal) printSemanal.style.display = 'none';
    if (printEmpresa) printEmpresa.style.display = 'none';
    if (printSeminario) printSeminario.style.display = 'block';

    const semData = appData.informeSeminario;
    const currentWk = getWeekData(appData.semanaActual);

    // Página 2: Identificación
    const elEscuela = document.getElementById('pr-sem-escuela');
    if (elEscuela) elEscuela.innerText = appData.escuela || 'ETI (Escuela de Tecnologías de la Información)';

    const elEst = document.getElementById('pr-sem-estudiante');
    if (elEst) elEst.innerText = appData.estudiante || 'Rodrigo Daniel Ormeño Llanos';

    const elMat = document.getElementById('pr-sem-matricula');
    if (elMat) elMat.innerText = appData.matricula || '001681961';

    const elBloque = document.getElementById('pr-sem-bloque');
    if (elBloque) elBloque.innerText = appData.bloque || '406';

    const elCarrera = document.getElementById('pr-sem-carrera');
    if (elCarrera) elCarrera.innerText = appData.carrera || 'Informática y Desarrollo de Aplicaciones Web';

    const elInst = document.getElementById('pr-sem-instructor');
    if (elInst) elInst.innerText = appData.instructor || 'Jorge Luque Chambi';

    const elSemestre = document.getElementById('pr-sem-semestre');
    if (elSemestre) elSemestre.innerText = appData.semestre || '4to';

    const elFechaDel = document.getElementById('pr-sem-fecha-del');
    if (elFechaDel) elFechaDel.innerText = currentWk.fechaInicio || 'Inicio';

    const elFechaAl = document.getElementById('pr-sem-fecha-al');
    if (elFechaAl) elFechaAl.innerText = currentWk.fechaFin || 'Fin';

    // Página 4: Proceso
    const elHdrSem = document.getElementById('pr-sem-hdr-semestre');
    if (elHdrSem) elHdrSem.innerText = appData.semestre || '4°';

    const elHdrWk = document.getElementById('pr-sem-hdr-semana');
    if (elHdrWk) elHdrWk.innerText = appData.semanaActual || '1';

    const act1 = getSeminarioActividad(1);
    const mainTitle = semData.tituloGlobal || (act1 && act1.titulo ? act1.titulo : 'Desarrollo de Aplicaciones Web y Soluciones Informáticas');
    const elTsTitulo = document.getElementById('pr-sem-ts-titulo');
    if (elTsTitulo) elTsTitulo.innerText = mainTitle;

    const mainProcess = semData.procesoGlobal || (act1 && act1.descripcion ? act1.descripcion : 'Ejecución y desarrollo de las actividades técnicas programadas para la sesión de formación práctica.');
    const elTsProc = document.getElementById('pr-sem-ts-proceso-lines');
    if (elTsProc) elTsProc.innerText = mainProcess;

    // Página 5: Esquema / Diagrama con capturas en orden personalizado
    const container = document.getElementById('pr-sem-evidencias-container');
    if (container) {
      container.innerHTML = '';
      const allEvidencias = [];

      for (let i = 1; i <= 4; i++) {
        const act = getSeminarioActividad(i);
        if (act.imgUi) {
          allEvidencias.push({
            tag: `Act. ${i} UI: ${act.urlUi || 'http://localhost:4200/'}`,
            img: act.imgUi
          });
        }
        if (act.imgCodigo) {
          allEvidencias.push({
            tag: `Act. ${i} Código: ${act.tagCodigo || `Actividad${i}.component.ts`}`,
            img: act.imgCodigo
          });
        }
        if (act.extras && act.extras.length > 0) {
          act.extras.forEach(ex => {
            if (ex.img) {
              allEvidencias.push({
                tag: `Act. ${i} ${ex.tipo === 'ui' ? 'UI' : 'Código'}: ${ex.tag || ''}`,
                img: ex.img
              });
            }
          });
        }
      }

      if (allEvidencias.length > 0) {
        allEvidencias.forEach(ev => {
          const item = document.createElement('div');
          item.className = 'esquema-thumb-box';
          item.innerHTML = `
            <div class="esquema-thumb-tag" title="${ev.tag}">${ev.tag}</div>
            <img src="${ev.img}" class="esquema-thumb-img" alt="Evidencia" />
          `;
          container.appendChild(item);
        });
      } else {
        container.innerHTML = `<div style="color: #666; font-size: 8.5pt; font-style: italic; padding: 25px; text-align: center; width: 100%;">Esquema, dibujo o capturas de interfaz y código fuente desarrolladas en la sesión práctica.</div>`;
      }
    }
  }
}

function setupDropzoneEvents() {
  // Dropzone UI
  const dzUi = document.getElementById('dropzone-ui');
  const fileUiInput = document.getElementById('file-ui-img');
  const btnRemoveUi = document.getElementById('btn-remove-ui');
  const btnViewUi = document.getElementById('btn-view-ui');

  // Dropzone Código
  const dzCod = document.getElementById('dropzone-codigo');
  const fileCodInput = document.getElementById('file-codigo-img');
  const btnRemoveCod = document.getElementById('btn-remove-codigo');
  const btnViewCod = document.getElementById('btn-view-codigo');

  // Botones de Agregar Extra
  const btnAddExtraUi = document.getElementById('btn-add-extra-ui');
  const btnAddExtraCod = document.getElementById('btn-add-extra-codigo');

  // Modal
  const modal = document.getElementById('img-fullscreen-modal');
  const modalImg = document.getElementById('modal-full-img');
  const modalCaption = document.getElementById('modal-img-caption');
  const modalClose = document.getElementById('btn-close-modal');

  const openModal = (src, caption) => {
    if (!src || !modal) return;
    modalImg.src = src;
    modalCaption.innerText = caption || 'Vista previa';
    modal.style.display = 'flex';
  };

  const closeModal = () => {
    if (modal) modal.style.display = 'none';
  };

  if (modalClose) modalClose.onclick = closeModal;
  if (modal) {
    modal.onclick = (e) => {
      if (e.target === modal) closeModal();
    };
  }

  // Quick URLs
  document.querySelectorAll('.btn-quick-url').forEach(btn => {
    btn.onclick = () => {
      const url = btn.getAttribute('data-url');
      const urlInput = document.getElementById('sem-url-ui');
      if (urlInput && url) {
        urlInput.value = url;
        readSeminarioActivityFormToState();
      }
    };
  });

  // UI Dropzone Logic
  if (dzUi && fileUiInput) {
    dzUi.addEventListener('dragover', (e) => {
      e.preventDefault();
      dzUi.classList.add('dragover');
    });
    dzUi.addEventListener('dragleave', () => dzUi.classList.remove('dragover'));
    dzUi.addEventListener('drop', async (e) => {
      e.preventDefault();
      dzUi.classList.remove('dragover');
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        await handleImageUpload(e.dataTransfer.files[0], 'ui');
      }
    });

    fileUiInput.addEventListener('change', async (e) => {
      if (e.target.files && e.target.files[0]) {
        await handleImageUpload(e.target.files[0], 'ui');
      }
    });
  }

  // Code Dropzone Logic
  if (dzCod && fileCodInput) {
    dzCod.addEventListener('dragover', (e) => {
      e.preventDefault();
      dzCod.classList.add('dragover');
    });
    dzCod.addEventListener('dragleave', () => dzCod.classList.remove('dragover'));
    dzCod.addEventListener('drop', async (e) => {
      e.preventDefault();
      dzCod.classList.remove('dragover');
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        await handleImageUpload(e.dataTransfer.files[0], 'codigo');
      }
    });

    fileCodInput.addEventListener('change', async (e) => {
      if (e.target.files && e.target.files[0]) {
        await handleImageUpload(e.target.files[0], 'codigo');
      }
    });
  }

  if (btnRemoveUi) {
    btnRemoveUi.onclick = (e) => {
      e.stopPropagation();
      const semData = appData.informeSeminario;
      const act = getSeminarioActividad(semData.actividadActual || 1);
      act.imgUi = '';
      renderSeminarioActivityUI();
      showToast('Captura de interfaz eliminada');
    };
  }

  if (btnViewUi) {
    btnViewUi.onclick = (e) => {
      e.stopPropagation();
      const semData = appData.informeSeminario;
      const act = getSeminarioActividad(semData.actividadActual || 1);
      openModal(act.imgUi, `Interfaz Web - Actividad ${semData.actividadActual}: ${act.titulo}`);
    };
  }

  if (btnRemoveCod) {
    btnRemoveCod.onclick = (e) => {
      e.stopPropagation();
      const semData = appData.informeSeminario;
      const act = getSeminarioActividad(semData.actividadActual || 1);
      act.imgCodigo = '';
      renderSeminarioActivityUI();
      showToast('Captura de código eliminada');
    };
  }

  if (btnViewCod) {
    btnViewCod.onclick = (e) => {
      e.stopPropagation();
      const semData = appData.informeSeminario;
      const act = getSeminarioActividad(semData.actividadActual || 1);
      openModal(act.imgCodigo, `Código CodeSnap - Actividad ${semData.actividadActual}: ${act.titulo}`);
    };
  }

  // Agregar Captura Extra
  if (btnAddExtraUi) {
    btnAddExtraUi.onclick = () => {
      readFormToCurrentState();
      const semData = appData.informeSeminario;
      const act = getSeminarioActividad(semData.actividadActual || 1);
      act.extras.push({
        id: Date.now().toString(),
        tipo: 'ui',
        tag: 'http://localhost:4200/',
        img: ''
      });
      renderSeminarioActivityUI();
      showToast('Captura extra de UI agregada');
    };
  }

  if (btnAddExtraCod) {
    btnAddExtraCod.onclick = () => {
      readFormToCurrentState();
      const semData = appData.informeSeminario;
      const act = getSeminarioActividad(semData.actividadActual || 1);
      act.extras.push({
        id: Date.now().toString(),
        tipo: 'codigo',
        tag: 'component.ts:',
        img: ''
      });
      renderSeminarioActivityUI();
      showToast('Captura extra de código agregada');
    };
  }
}

async function handleImageUpload(file, type) {
  try {
    const dataUrl = await compressAndConvertImage(file, 1200, 0.85);
    const semData = appData.informeSeminario;
    const act = getSeminarioActividad(semData.actividadActual || 1);

    if (type === 'ui') {
      act.imgUi = dataUrl;
      showToast('¡Captura de Interfaz Web cargada!');
    } else {
      act.imgCodigo = dataUrl;
      showToast('¡Captura de Código cargada!');
    }
    renderSeminarioActivityUI();
  } catch (err) {
    console.error('Error al procesar imagen:', err);
    showToast('Error al procesar la imagen seleccionada');
  }
}

function setupListeners() {
  document.getElementById('btn-guardar').onclick = saveData;

  document.getElementById('btn-imprimir').onclick = async () => {
    readFormToCurrentState();
    if (appData.modoFormato === 'seminario') {
      showToast('Generando PDF oficial exacto...');
      try {
        await generateInformeSemanalPDF(appData);
        showToast('¡PDF oficial generado exitosamente!');
      } catch (err) {
        console.error('Error al generar PDF oficial:', err);
        showToast('Abriendo vista de impresión estándar...');
        syncToOfficialPrint();
        window.print();
      }
    } else {
      syncToOfficialPrint();
      window.print();
    }
  };

  // Switcher de Formato Trimodal
  document.getElementById('btn-fmt-semanal').onclick = () => setModoFormato('semanal');
  document.getElementById('btn-fmt-empresa').onclick = () => setModoFormato('empresa');
  document.getElementById('btn-fmt-seminario').onclick = () => setModoFormato('seminario');

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

  // Botones de Actividad (Seminario 1 a 4)
  for (let i = 1; i <= 4; i++) {
    const btn = document.getElementById(`btn-act-${i}`);
    if (btn) {
      btn.onclick = () => {
        readFormToCurrentState();
        appData.informeSeminario.actividadActual = i;
        renderSeminarioActivityUI();
      };
    }
  }

  // Escuchadores de inputs en Seminario
  ['sem-act-titulo', 'sem-act-descripcion', 'sem-url-ui', 'sem-tag-codigo'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', () => {
        readSeminarioActivityFormToState();
      });
    }
  });

  setupDropzoneEvents();

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
