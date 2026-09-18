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
