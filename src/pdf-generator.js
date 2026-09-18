import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

function wrapText(text, font, fontSize, maxWidth) {
  if (!text) return [];
  const rawParagraphs = String(text).split('\n');
  const lines = [];

  for (const rawPara of rawParagraphs) {
    const para = rawPara.trim();
    if (!para) {
      lines.push('');
      continue;
    }
    const words = para.split(/\s+/);
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? currentLine + ' ' + word : word;
      const testWidth = font.widthOfTextAtSize(testLine, fontSize);
      if (testWidth <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);
  }

  return lines;
}

async function ensureJpegOrPngDataUrl(dataUrl) {
  if (!dataUrl) return null;
  if (dataUrl.startsWith('data:image/png') || dataUrl.startsWith('data:image/jpeg') || dataUrl.startsWith('data:image/jpg')) {
    return dataUrl;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

export async function generateInformeSemanalPDF(appData) {
  const templateUrl = '/template_informe_clase.pdf';
  const response = await fetch(templateUrl);
  if (!response.ok) {
    throw new Error('No se pudo cargar la plantilla oficial de Informe de Clase.');
  }
  const templateBytes = await response.arrayBuffer();

  const pdfDoc = await PDFDocument.load(templateBytes);
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Eliminar páginas en blanco sobrantes si las hay
  while (pdfDoc.getPageCount() > 5) {
    pdfDoc.removePage(pdfDoc.getPageCount() - 1);
  }

  const pages = pdfDoc.getPages();
  const semData = appData.informeSeminario || {};
  const wk = (appData.semanas && appData.semanas[appData.semanaActual]) || {};

  // ==========================================================
  // PÁGINA 2: HOJA DE IDENTIFICACIÓN
  // ==========================================================
  const page2 = pages[1];
  if (page2) {
    const clearAndDraw = (text, x, y, size = 10.5, clearW = 300) => {
      if (!text) return;
      page2.drawRectangle({
        x: x - 2,
        y: y - 2,
        width: clearW,
        height: size + 5,
        color: rgb(1, 1, 1),
      });
      page2.drawLine({
        start: { x: x - 2, y: y - 2 },
        end: { x: x + clearW, y: y - 2 },
        thickness: 0.75,
        color: rgb(0, 0, 0)
      });
      page2.drawText(String(text), {
        x: x,
        y: y,
        size: size,
        font: helveticaBold,
        color: rgb(0, 0, 0),
      });
    };

    clearAndDraw(appData.escuela || 'ETI', 189.8, 559.9, 11, 335);
    clearAndDraw(appData.estudiante || 'Rodrigo Daniel Ormeño Llanos', 153.6, 518.6, 11, 370);
    clearAndDraw(appData.matricula || '001681961', 89.5, 477.1, 11, 75);
    clearAndDraw(appData.bloque || '406', 283.6, 477.1, 11, 80);
    clearAndDraw(appData.carrera || 'Informática y Desarrollo de Aplicaciones Web', 136.6, 435.6, 10.5, 385);
    clearAndDraw(appData.instructor || 'Jorge Luque Chambi', 156.3, 394.4, 11, 365);
    clearAndDraw(appData.semestre || '4to', 143.6, 339.1, 11, 135);
    
    if (wk.fechaInicio) {
      clearAndDraw(wk.fechaInicio, 324.6, 339.1, 10, 80);
    }
    if (wk.fechaFin) {
      clearAndDraw(wk.fechaFin, 445.7, 339.1, 10, 80);
    }
  }

  // ==========================================================
  // RECOPILAR TODAS LAS CAPTURAS ORGANIZADAS POR CATEGORÍA
  // ==========================================================
  const webEvidencias = [];
  const codeEvidencias = [];

  if (semData.actividades) {
    for (let i = 1; i <= 4; i++) {
      const act = semData.actividades[i];
      if (!act) continue;

      if (act.imgUi) {
        webEvidencias.push({
          tipo: 'ui',
          titulo: (act.urlUi && act.urlUi.trim()) ? act.urlUi.trim() : 'http://localhost:4200/',
          dataUrl: act.imgUi
        });
      }

      if (act.extras && act.extras.length > 0) {
        act.extras.forEach(ex => {
          if (ex.tipo === 'ui' && ex.img) {
            webEvidencias.push({
              tipo: 'ui',
              titulo: (ex.tag && ex.tag.trim()) ? ex.tag.trim() : 'http://localhost:4200/',
              dataUrl: ex.img
            });
          }
        });
      }

      if (act.imgCodigo) {
        codeEvidencias.push({
          tipo: 'codigo',
          titulo: (act.tagCodigo && act.tagCodigo.trim()) ? act.tagCodigo.trim() : 'codigo.ts',
          dataUrl: act.imgCodigo
        });
      }

      if (act.extras && act.extras.length > 0) {
        act.extras.forEach(ex => {
          if (ex.tipo === 'codigo' && ex.img) {
            codeEvidencias.push({
              tipo: 'codigo',
              titulo: (ex.tag && ex.tag.trim()) ? ex.tag.trim() : 'codigo.ts',
              dataUrl: ex.img
            });
          }
        });
      }
    }
  }

  // ==========================================================
  // PÁGINA 4: EXCLUSIVAMENTE TAREA Y DESCRIPCIÓN DEL PROCESO
  // ==========================================================
  const page4 = pages[3]; // Página 4
  const act1 = (semData.actividades && semData.actividades[1]) || {};
  const taskTitle = semData.tituloGlobal || act1.titulo || 'Desarrollo de Aplicaciones Web y Soluciones Informáticas';
  
  let processDesc = semData.procesoGlobal || '';
  if (!processDesc.trim()) {
    const actDescs = [];
    for (let i = 1; i <= 4; i++) {
      const a = semData.actividades && semData.actividades[i];
      if (a && a.descripcion && a.descripcion.trim()) {
        actDescs.push(a.descripcion.trim());
      }
    }
    processDesc = actDescs.join('\n\n');
  }
  if (!processDesc.trim()) {
    processDesc = 'Ejecución y desarrollo de las actividades técnicas programadas para la sesión práctica.';
  }

  // 1. Limpiar completamente el área editable de Página 4
  page4.drawRectangle({
    x: 40,
    y: 10,
    width: 515,
    height: 770,
    color: rgb(1, 1, 1),
  });

  // 2. Encabezado Tarea más significativa
  let curY = 760;
  page4.drawText('Tarea más significativa:', {
    x: 71,
    y: curY,
    size: 11,
    font: helveticaBold,
    color: rgb(0, 0, 0),
  });
  curY -= 16;

  // 3. Título de la tarea: salto de línea automático si es largo
  const titleFontSize = 9.5;
  const titleLineHeight = 14;
  const titleLines = wrapText(taskTitle, helveticaBold, titleFontSize, 454);
  for (const tLine of titleLines) {
    page4.drawText(tLine, {
      x: 71,
      y: curY,
      size: titleFontSize,
      font: helveticaBold,
      color: rgb(0, 0, 0),
    });
    page4.drawLine({
      start: { x: 71, y: curY - 3 },
      end: { x: 525, y: curY - 3 },
      thickness: 0.75,
      color: rgb(0, 0, 0),
    });
    curY -= titleLineHeight;
  }
  curY -= 12;

  // 4. Encabezado Descripción del proceso
  page4.drawText('Descripción del proceso:', {
    x: 71,
    y: curY,
    size: 11,
    font: helveticaBold,
    color: rgb(0, 0, 0),
  });
  curY -= 18;

  // 5. Texto completo de la descripción del proceso
  const procFontSize = 9;
  const procLineHeight = 13.5;
  const procLines = wrapText(processDesc, helvetica, procFontSize, 454);

  for (const line of procLines) {
    if (line) {
      page4.drawText(line, {
        x: 71,
        y: curY,
        size: procFontSize,
        font: helvetica,
        color: rgb(0, 0, 0),
      });
    }
    curY -= procLineHeight;
  }

  // ==========================================================
  // PÁGINAS DE CAPTURAS: 2 CAPTURAS GRANDES POR PÁGINA
  // (Inician en una hoja nueva a partir de la Página 5)
  // ==========================================================
  let contPageCount = 0;

  function createCapturePage(isFirstCapturePage = false) {
    contPageCount++;
    // Insertar página justo antes de la última página (Observaciones/Asistencia)
    const newPage = pdfDoc.insertPage(pdfDoc.getPageCount() - 1, [595.25, 842]);
    
    // Contenedor / Marco exterior oficial
    newPage.drawRectangle({
      x: 55,
      y: 45,
      width: 485,
      height: 752,
      borderColor: rgb(0, 0, 0),
      borderWidth: 0.8,
      color: rgb(1, 1, 1),
    });

    // Encabezado con recuadro central
    const bW = 320;
    const bH = 26;
    const bX = (595.25 - bW) / 2;
    newPage.drawRectangle({
      x: bX,
      y: 771,
      width: bW,
      height: bH,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1,
      color: rgb(1, 1, 1),
    });

    const headerText = isFirstCapturePage 
      ? 'HACER ESQUEMA, DIBUJO O DIAGRAMA' 
      : `Esquema, dibujo, capturas (Cont. ${contPageCount - 1})`;
    
    const textW = helveticaBold.widthOfTextAtSize(headerText, 11);
    newPage.drawText(headerText, {
      x: (595.25 - textW) / 2,
      y: 779,
      size: 11,
      font: helveticaBold,
      color: rgb(0, 0, 0),
    });

    return newPage;
  }

  let currentCapturePage = null;
  let currentSlotIndex = 2; // 0 = superior, 1 = inferior, >=2 = requiere nueva hoja
  let webHeaderDrawn = false;
  let codeHeaderDrawn = false;

  const maxSlotW = 465;

  // Función para dibujar una captura en el slot actual (0 o 1)
  async function renderCaptureItem(item, category) {
    const validDataUrl = await ensureJpegOrPngDataUrl(item.dataUrl);
    if (!validDataUrl) return;

    if (currentSlotIndex >= 2) {
      currentCapturePage = createCapturePage(contPageCount === 0);
      currentSlotIndex = 0;
    }

    const isPng = validDataUrl.startsWith('data:image/png');
    const img = isPng ? await pdfDoc.embedPng(validDataUrl) : await pdfDoc.embedJpg(validDataUrl);

    let needsCategoryHeader = false;
    if (category === 'web' && !webHeaderDrawn) {
      needsCategoryHeader = true;
      webHeaderDrawn = true;
    } else if (category === 'codigo' && !codeHeaderDrawn) {
      needsCategoryHeader = true;
      codeHeaderDrawn = true;
    }

    let topY, maxSlotH;

    if (currentSlotIndex === 0) {
      // Slot Superior
      if (needsCategoryHeader) {
        const catTitle = category === 'web' ? 'Web:' : 'Código:';
        currentCapturePage.drawText(catTitle, {
          x: 65,
          y: 748,
          size: 14,
          font: helveticaBold,
          color: rgb(0, 0, 0),
        });
        currentCapturePage.drawText(item.titulo.substring(0, 85), {
          x: 65,
          y: 730,
          size: 8.5,
          font: helveticaBold,
          color: rgb(0.1, 0.2, 0.4),
        });
        topY = 722;
        maxSlotH = 300;
      } else {
        currentCapturePage.drawText(item.titulo.substring(0, 85), {
          x: 65,
          y: 748,
          size: 8.5,
          font: helveticaBold,
          color: rgb(0.1, 0.2, 0.4),
        });
        topY = 738;
        maxSlotH = 316;
      }
    } else {
      // Slot Inferior (Slot 1)
      if (needsCategoryHeader) {
        const catTitle = category === 'web' ? 'Web:' : 'Código:';
        currentCapturePage.drawText(catTitle, {
          x: 65,
          y: 405,
          size: 14,
          font: helveticaBold,
          color: rgb(0, 0, 0),
        });
        currentCapturePage.drawText(item.titulo.substring(0, 85), {
          x: 65,
          y: 387,
          size: 8.5,
          font: helveticaBold,
          color: rgb(0.1, 0.2, 0.4),
        });
        topY = 379;
        maxSlotH = 300;
      } else {
        currentCapturePage.drawText(item.titulo.substring(0, 85), {
          x: 65,
          y: 403,
          size: 8.5,
          font: helveticaBold,
          color: rgb(0.1, 0.2, 0.4),
        });
        topY = 395;
        maxSlotH = 316;
      }
    }

    const scale = Math.min(maxSlotW / img.width, maxSlotH / img.height, 1);
    const dw = img.width * scale;
    const dh = img.height * scale;
    const dx = 65 + (maxSlotW - dw) / 2;
    const dy = topY - dh;

    currentCapturePage.drawImage(img, {
      x: dx,
      y: dy,
      width: dw,
      height: dh
    });

    currentSlotIndex++;
  }

  // 1. Dibujar todas las capturas Web
  for (const item of webEvidencias) {
    await renderCaptureItem(item, 'web');
  }

  // 2. Dibujar todas las capturas de Código
  for (const item of codeEvidencias) {
    await renderCaptureItem(item, 'codigo');
  }

  // Si no había capturas en absoluto, crear una hoja de capturas vacía
  if (webEvidencias.length === 0 && codeEvidencias.length === 0) {
    createCapturePage(true);
  }

  // ==========================================================
  // PÁGINA FINAL: OBSERVACIONES + ASISTENCIA VIERNES + SENATI
  // ==========================================================
  const lastPage = pdfDoc.getPages()[pdfDoc.getPageCount() - 1];
  if (lastPage) {
    // Marcar Asistencia el día VIERNES con 'X'
    lastPage.drawText('X', {
      x: 420,
      y: 304,
      size: 11,
      font: helveticaBold,
      color: rgb(0, 0, 0),
    });
    lastPage.drawText('X', {
      x: 462,
      y: 304,
      size: 11,
      font: helveticaBold,
      color: rgb(0, 0, 0),
    });
  }

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const blobUrl = URL.createObjectURL(blob);

  // Descargar automáticamente
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = 'Informe_Clase_Semana_' + (appData.semanaActual || 1) + '.pdf';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  return blobUrl;
}

export async function generateGuiaSimplePDF(appData) {
  const pdfDoc = await PDFDocument.create();
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const semData = appData.informeSeminario || {};
  const wk = (appData.semanas && appData.semanas[appData.semanaActual || 1]) || {};

  // ==========================================================
  // PÁGINA 1: DATOS, PLAN SEMANAL Y TAREA SIGNIFICATIVA
  // ==========================================================
  let page1 = pdfDoc.addPage([595.25, 842]);
  
  // Encabezado Superior / Banner
  page1.drawRectangle({
    x: 40,
    y: 775,
    width: 515,
    height: 38,
    color: rgb(0.06, 0.20, 0.38), // Azul SENATI
  });

  page1.drawText('SENATI — INFORME DE SEMINARIO (GUÍA DE PRÁCTICA)', {
    x: 55,
    y: 790,
    size: 13,
    font: helveticaBold,
    color: rgb(1, 1, 1),
  });

  // Datos del Estudiante (Caja compacta)
  page1.drawRectangle({
    x: 40,
    y: 695,
    width: 515,
    height: 70,
    borderColor: rgb(0.8, 0.85, 0.9),
    borderWidth: 1,
    color: rgb(0.97, 0.98, 1),
  });

  const drawField = (p, label, val, x, y) => {
    p.drawText(label, { x, y, size: 8.5, font: helveticaBold, color: rgb(0.2, 0.25, 0.35) });
    p.drawText(String(val || '-'), { x: x + helveticaBold.widthOfTextAtSize(label, 8.5) + 4, y, size: 8.5, font: helvetica, color: rgb(0.05, 0.1, 0.2) });
  };

  drawField(page1, 'Estudiante: ', appData.estudiante || 'Rodrigo Daniel Ormeño Llanos', 52, 745);
  drawField(page1, 'ID / Matrícula: ', appData.matricula || '001681961', 370, 745);
  drawField(page1, 'Carrera: ', appData.carrera || 'Informática y Desarrollo de Aplicaciones Web', 52, 727);
  drawField(page1, 'Bloque: ', appData.bloque || '406', 370, 727);
  drawField(page1, 'Instructor: ', appData.instructor || 'Jorge Luque Chambi', 52, 709);
  drawField(page1, 'Periodo: ', (wk.fechaInicio && wk.fechaFin) ? `${wk.fechaInicio} al ${wk.fechaFin}` : 'Semanal', 370, 709);

  // Tabla Plan Semanal de Trabajo
  let curY = 670;
  page1.drawText('PLAN SEMANAL DE TRABAJO (DÍAS Y TAREAS DESARROLLADAS):', {
    x: 40,
    y: curY,
    size: 9.5,
    font: helveticaBold,
    color: rgb(0.06, 0.20, 0.38),
  });
  curY -= 8;

  // Header tabla
  const tblX = 40;
  const tblW = 515;
  const colDiaW = 85;
  const colHrsW = 60;
  const colTareaW = tblW - colDiaW - colHrsW;

  page1.drawRectangle({
    x: tblX,
    y: curY - 18,
    width: tblW,
    height: 18,
    color: rgb(0.12, 0.30, 0.53),
  });

  page1.drawText('DÍA', { x: tblX + 10, y: curY - 13, size: 8, font: helveticaBold, color: rgb(1, 1, 1) });
  page1.drawText('TAREAS EJECUTADAS / OPERACIONES DE SOFTWARE', { x: tblX + colDiaW + 10, y: curY - 13, size: 8, font: helveticaBold, color: rgb(1, 1, 1) });
  page1.drawText('HORAS', { x: tblX + colDiaW + colTareaW + 12, y: curY - 13, size: 8, font: helveticaBold, color: rgb(1, 1, 1) });
  curY -= 18;

  const diasList = [
    { key: 'lunes', name: 'Lunes' },
    { key: 'martes', name: 'Martes' },
    { key: 'miercoles', name: 'Miércoles' },
    { key: 'jueves', name: 'Jueves' },
    { key: 'viernes', name: 'Viernes' },
    { key: 'sabado', name: 'Sábado' },
  ];

  let totalHrs = 0;
  diasList.forEach((d, i) => {
    const rowH = 20;
    const isEven = i % 2 === 0;
    const item = wk.dias && wk.dias[d.key] ? wk.dias[d.key] : { tarea: '', horas: 0 };
    totalHrs += Number(item.horas) || 0;

    page1.drawRectangle({
      x: tblX,
      y: curY - rowH,
      width: tblW,
      height: rowH,
      borderColor: rgb(0.85, 0.88, 0.92),
      borderWidth: 0.5,
      color: isEven ? rgb(0.98, 0.99, 1) : rgb(1, 1, 1),
    });

    page1.drawText(d.name, { x: tblX + 8, y: curY - 14, size: 8, font: helveticaBold, color: rgb(0.1, 0.15, 0.25) });
    const tareaTxt = item.tarea || 'Sin actividades registradas.';
    page1.drawText(tareaTxt.substring(0, 80), { x: tblX + colDiaW + 8, y: curY - 14, size: 8, font: helvetica, color: rgb(0.1, 0.1, 0.1) });
    page1.drawText(String(item.horas || 0) + ' hrs', { x: tblX + colDiaW + colTareaW + 15, y: curY - 14, size: 8, font: helvetica, color: rgb(0.1, 0.1, 0.1) });
    curY -= rowH;
  });

  // Total Horas
  page1.drawRectangle({
    x: tblX,
    y: curY - 18,
    width: tblW,
    height: 18,
    color: rgb(0.93, 0.95, 0.98),
    borderColor: rgb(0.85, 0.88, 0.92),
    borderWidth: 0.5,
  });
  page1.drawText('Total Horas Acumuladas:', { x: tblX + 10, y: curY - 13, size: 8, font: helveticaBold, color: rgb(0.1, 0.2, 0.35) });
  page1.drawText(`${totalHrs} hrs`, { x: tblX + colDiaW + colTareaW + 15, y: curY - 13, size: 8.5, font: helveticaBold, color: rgb(0.06, 0.20, 0.38) });
  curY -= 28;

  // Tarea Más Significativa
  page1.drawText('TAREA MÁS SIGNIFICATIVA DEL SEMINARIO:', {
    x: 40,
    y: curY,
    size: 9.5,
    font: helveticaBold,
    color: rgb(0.06, 0.20, 0.38),
  });
  curY -= 14;

  const act1 = (semData.actividades && semData.actividades[1]) || {};
  const taskTitle = semData.tituloGlobal || act1.titulo || wk.tareaSignificativa?.titulo || 'Desarrollo de Aplicaciones Web y Soluciones Informáticas';
  const processDesc = semData.procesoGlobal || act1.descripcion || wk.tareaSignificativa?.proceso || 'Ejecución y desarrollo de las actividades técnicas del seminario.';

  const titleLines = wrapText(taskTitle, helveticaBold, 9, 500);
  for (const tLine of titleLines) {
    page1.drawText(tLine, { x: 45, y: curY, size: 9, font: helveticaBold, color: rgb(0.1, 0.1, 0.1) });
    curY -= 12;
  }
  curY -= 6;

  page1.drawText('Descripción del Proceso Técnico:', {
    x: 40,
    y: curY,
    size: 9,
    font: helveticaBold,
    color: rgb(0.2, 0.25, 0.35),
  });
  curY -= 14;

  const procLines = wrapText(processDesc, helvetica, 8.5, 510);
  for (const pLine of procLines) {
    if (curY < 45) break;
    if (pLine) {
      page1.drawText(pLine, { x: 45, y: curY, size: 8.5, font: helvetica, color: rgb(0.1, 0.1, 0.1) });
    }
    curY -= 12;
  }

  // ==========================================================
  // PÁGINAS DE CAPTURAS: 2 CAPTURAS GRANDES POR PÁGINA
  // ==========================================================
  const webEvidencias = [];
  const codeEvidencias = [];

  if (semData.actividades) {
    for (let i = 1; i <= 4; i++) {
      const act = semData.actividades[i];
      if (!act) continue;
      if (act.imgUi) {
        webEvidencias.push({ tipo: 'ui', titulo: act.urlUi || 'http://localhost:4200/', dataUrl: act.imgUi });
      }
      if (act.extras) {
        act.extras.forEach(ex => {
          if (ex.tipo === 'ui' && ex.img) {
            webEvidencias.push({ tipo: 'ui', titulo: ex.tag || 'http://localhost:4200/', dataUrl: ex.img });
          }
        });
      }
      if (act.imgCodigo) {
        codeEvidencias.push({ tipo: 'codigo', titulo: act.tagCodigo || 'codigo.ts', dataUrl: act.imgCodigo });
      }
      if (act.extras) {
        act.extras.forEach(ex => {
          if (ex.tipo === 'codigo' && ex.img) {
            codeEvidencias.push({ tipo: 'codigo', titulo: ex.tag || 'codigo.ts', dataUrl: ex.img });
          }
        });
      }
    }
  }

  let curGuidePage = null;
  let guideSlotIndex = 2;
  let webTitleDrawn = false;
  let codeTitleDrawn = false;
  let guidePageNum = 1;

  function createGuideCapturePage() {
    guidePageNum++;
    const p = pdfDoc.addPage([595.25, 842]);
    p.drawRectangle({
      x: 40,
      y: 785,
      width: 515,
      height: 28,
      color: rgb(0.06, 0.20, 0.38),
    });
    p.drawText(`EVIDENCIAS VISUALES — GUÍA DE PRÁCTICA (Pág. ${guidePageNum})`, {
      x: 55,
      y: 795,
      size: 11,
      font: helveticaBold,
      color: rgb(1, 1, 1),
    });
    return p;
  }

  async function renderGuideCapture(item, category) {
    const validDataUrl = await ensureJpegOrPngDataUrl(item.dataUrl);
    if (!validDataUrl) return;

    if (guideSlotIndex >= 2) {
      curGuidePage = createGuideCapturePage();
      guideSlotIndex = 0;
    }

    const isPng = validDataUrl.startsWith('data:image/png');
    const img = isPng ? await pdfDoc.embedPng(validDataUrl) : await pdfDoc.embedJpg(validDataUrl);

    let needsCategoryHeader = false;
    if (category === 'web' && !webTitleDrawn) {
      needsCategoryHeader = true;
      webTitleDrawn = true;
    } else if (category === 'codigo' && !codeTitleDrawn) {
      needsCategoryHeader = true;
      codeTitleDrawn = true;
    }

    const maxSlotW = 495;
    let topY, maxSlotH;

    if (guideSlotIndex === 0) {
      if (needsCategoryHeader) {
        const catTitle = category === 'web' ? 'Web (Interfaz de Usuario):' : 'Código Fuente (CodeSnap):';
        curGuidePage.drawText(catTitle, { x: 50, y: 760, size: 12, font: helveticaBold, color: rgb(0.06, 0.20, 0.38) });
        curGuidePage.drawText(item.titulo.substring(0, 85), { x: 50, y: 744, size: 8.5, font: helveticaBold, color: rgb(0.1, 0.3, 0.6) });
        topY = 736;
        maxSlotH = 300;
      } else {
        curGuidePage.drawText(item.titulo.substring(0, 85), { x: 50, y: 760, size: 8.5, font: helveticaBold, color: rgb(0.1, 0.3, 0.6) });
        topY = 752;
        maxSlotH = 316;
      }
    } else {
      if (needsCategoryHeader) {
        const catTitle = category === 'web' ? 'Web (Interfaz de Usuario):' : 'Código Fuente (CodeSnap):';
        curGuidePage.drawText(catTitle, { x: 50, y: 410, size: 12, font: helveticaBold, color: rgb(0.06, 0.20, 0.38) });
        curGuidePage.drawText(item.titulo.substring(0, 85), { x: 50, y: 394, size: 8.5, font: helveticaBold, color: rgb(0.1, 0.3, 0.6) });
        topY = 386;
        maxSlotH = 300;
      } else {
        curGuidePage.drawText(item.titulo.substring(0, 85), { x: 50, y: 410, size: 8.5, font: helveticaBold, color: rgb(0.1, 0.3, 0.6) });
        topY = 402;
        maxSlotH = 316;
      }
    }

    const scale = Math.min(maxSlotW / img.width, maxSlotH / img.height, 1);
    const dw = img.width * scale;
    const dh = img.height * scale;
    const dx = 50 + (maxSlotW - dw) / 2;
    const dy = topY - dh;

    curGuidePage.drawImage(img, { x: dx, y: dy, width: dw, height: dh });
    guideSlotIndex++;
  }

  for (const item of webEvidencias) {
    await renderGuideCapture(item, 'web');
  }
  for (const item of codeEvidencias) {
    await renderGuideCapture(item, 'codigo');
  }

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const blobUrl = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = 'Guia_Informe_Seminario.pdf';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  return blobUrl;
}
