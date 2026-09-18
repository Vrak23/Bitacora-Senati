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
  // PÁGINA 4: TAREA Y DESCRIPCIÓN COMPLETA DEL PROCESO
  // ==========================================================
  let currentPage = pages[3]; // Página 4
  let contPageCount = 0;

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

  // 1. Limpiar completamente el área inferior de Página 4
  currentPage.drawRectangle({
    x: 40,
    y: 10,
    width: 515,
    height: 770,
    color: rgb(1, 1, 1),
  });

  // 2. Encabezado Tarea más significativa
  currentPage.drawText('Tarea más significativa:', {
    x: 71,
    y: 760,
    size: 11,
    font: helveticaBold,
    color: rgb(0, 0, 0),
  });
  currentPage.drawLine({
    start: { x: 71, y: 737 },
    end: { x: 525, y: 737 },
    thickness: 0.75,
    color: rgb(0, 0, 0),
  });

  // Título de la tarea (puede tener hasta 2 líneas si es largo)
  const titleLines = wrapText(taskTitle, helveticaBold, 9.5, 454);
  if (titleLines[0]) {
    currentPage.drawText(titleLines[0], {
      x: 71,
      y: 741,
      size: 9.5,
      font: helveticaBold,
      color: rgb(0, 0, 0),
    });
  }

  // 3. Encabezado Descripción del proceso
  currentPage.drawText('Descripción del proceso:', {
    x: 71,
    y: 710,
    size: 11,
    font: helveticaBold,
    color: rgb(0, 0, 0),
  });

  // 4. Texto completo de la descripción del proceso
  const procFontSize = 8.5;
  const procLineHeight = 11.5;
  const procLines = wrapText(processDesc, helvetica, procFontSize, 454);

  let currentY = 692;
  for (const line of procLines) {
    if (line) {
      currentPage.drawText(line, {
        x: 71,
        y: currentY,
        size: procFontSize,
        font: helvetica,
        color: rgb(0, 0, 0),
      });
    }
    currentY -= procLineHeight;
  }

  currentY -= 15; // Espacio después de la descripción

  // Helper para crear una nueva página de continuación antes de la página final de Observaciones
  function createContinuationPage() {
    contPageCount++;
    const newPage = pdfDoc.insertPage(pdfDoc.getPageCount() - 1, [595.25, 842]);
    
    // Encabezado con recuadro
    const bW = 280;
    const bH = 26;
    const bX = (595.25 - bW) / 2;
    newPage.drawRectangle({
      x: bX,
      y: 775,
      width: bW,
      height: bH,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1,
      color: rgb(1, 1, 1),
    });
    newPage.drawText('Esquema, dibujo, capturas (Cont. ' + contPageCount + ')', {
      x: bX + 22,
      y: 783,
      size: 11.5,
      font: helveticaBold,
      color: rgb(0, 0, 0),
    });

    return { page: newPage, startY: 745 };
  }

  // 5. Dibujar recuadro central: Esquema, dibujo, capturas
  // Si no hay suficiente espacio en Página 4 (mínimo 180 pt), pasar a nueva página
  if (currentY < 180) {
    const next = createContinuationPage();
    currentPage = next.page;
    currentY = next.startY;
  } else {
    const boxW = 280;
    const boxH = 26;
    const boxX = (595.25 - boxW) / 2;
    currentPage.drawRectangle({
      x: boxX,
      y: currentY - boxH,
      width: boxW,
      height: boxH,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1,
      color: rgb(1, 1, 1),
    });
    currentPage.drawText('Esquema, dibujo, capturas', {
      x: boxX + 45,
      y: currentY - boxH + 8,
      size: 13,
      font: helveticaBold,
      color: rgb(0, 0, 0),
    });
    currentY -= (boxH + 20);
  }

  // ==========================================================
  // 6. DIBUJAR TODAS LAS CAPTURAS DE LA CATEGORÍA WEB PRIMERO
  // ==========================================================
  if (webEvidencias.length > 0) {
    // Si queda poco espacio para el título Web, pasar de página
    if (currentY < 120) {
      const next = createContinuationPage();
      currentPage = next.page;
      currentY = next.startY;
    }

    currentPage.drawText('Web:', {
      x: 71,
      y: currentY,
      size: 15,
      font: helveticaBold,
      color: rgb(0, 0, 0),
    });
    currentY -= 16;

    // Procesar capturas Web en pares (2 por fila)
    for (let i = 0; i < webEvidencias.length; i += 2) {
      const pair = webEvidencias.slice(i, i + 2);
      const targetSlotH = 140; // Altura estándar para Web

      // Si la fila no cabe en la página actual, crear nueva página
      if (currentY - (targetSlotH + 25) < 35) {
        const next = createContinuationPage();
        currentPage = next.page;
        currentY = next.startY;
      }

      if (pair.length === 1) {
        const ev = pair[0];
        const validDataUrl = await ensureJpegOrPngDataUrl(ev.dataUrl);
        if (validDataUrl) {
          const isPng = validDataUrl.startsWith('data:image/png');
          const img = isPng ? await pdfDoc.embedPng(validDataUrl) : await pdfDoc.embedJpg(validDataUrl);
          const maxW = 454;
          const maxH = targetSlotH;
          const scale = Math.min(maxW / img.width, maxH / img.height, 1);
          const dw = img.width * scale;
          const dh = img.height * scale;
          const dx = 71 + (454 - dw) / 2;
          const dy = currentY - dh;

          currentPage.drawImage(img, { x: dx, y: dy, width: dw, height: dh });
          currentPage.drawText(ev.titulo.substring(0, 70), {
            x: dx,
            y: dy + dh + 2,
            size: 7,
            font: helveticaBold,
            color: rgb(0.1, 0.2, 0.4),
          });
          currentY = dy - 18;
        }
      } else {
        const cellW = (454 - 14) / 2;
        let maxDrawnH = 0;
        const embeddedList = [];

        for (let idx = 0; idx < 2; idx++) {
          const ev = pair[idx];
          const validDataUrl = await ensureJpegOrPngDataUrl(ev.dataUrl);
          if (validDataUrl) {
            const isPng = validDataUrl.startsWith('data:image/png');
            const img = isPng ? await pdfDoc.embedPng(validDataUrl) : await pdfDoc.embedJpg(validDataUrl);
            const scale = Math.min(cellW / img.width, targetSlotH / img.height, 1);
            const dw = img.width * scale;
            const dh = img.height * scale;
            maxDrawnH = Math.max(maxDrawnH, dh);
            embeddedList.push({ img, dw, dh, ev, colIdx: idx });
          }
        }

        for (const item of embeddedList) {
          const cx = 71 + item.colIdx * (cellW + 14);
          const dx = cx + (cellW - item.dw) / 2;
          const dy = currentY - item.dh;

          currentPage.drawImage(item.img, { x: dx, y: dy, width: item.dw, height: item.dh });
          currentPage.drawText(item.ev.titulo.substring(0, 42), {
            x: cx,
            y: dy + item.dh + 2,
            size: 6.5,
            font: helveticaBold,
            color: rgb(0.1, 0.2, 0.4),
          });
        }

        currentY -= (maxDrawnH + 18);
      }
    }
  }

  // ==========================================================
  // 7. DIBUJAR TODAS LAS CAPTURAS DE LA CATEGORÍA CÓDIGO SEGUNDO
  // ==========================================================
  if (codeEvidencias.length > 0) {
    // Si queda poco espacio para el título Código, pasar de página
    if (currentY < 120) {
      const next = createContinuationPage();
      currentPage = next.page;
      currentY = next.startY;
    }

    currentPage.drawText('Código:', {
      x: 71,
      y: currentY,
      size: 15,
      font: helveticaBold,
      color: rgb(0, 0, 0),
    });
    currentY -= 16;

    // Procesar capturas Código en pares (2 por fila)
    for (let i = 0; i < codeEvidencias.length; i += 2) {
      const pair = codeEvidencias.slice(i, i + 2);
      const targetSlotH = 150; // Altura estándar para Código

      // Si la fila no cabe en la página actual, crear nueva página
      if (currentY - (targetSlotH + 25) < 35) {
        const next = createContinuationPage();
        currentPage = next.page;
        currentY = next.startY;
      }

      if (pair.length === 1) {
        const ev = pair[0];
        const validDataUrl = await ensureJpegOrPngDataUrl(ev.dataUrl);
        if (validDataUrl) {
          const isPng = validDataUrl.startsWith('data:image/png');
          const img = isPng ? await pdfDoc.embedPng(validDataUrl) : await pdfDoc.embedJpg(validDataUrl);
          const maxW = 454;
          const maxH = targetSlotH;
          const scale = Math.min(maxW / img.width, maxH / img.height, 1);
          const dw = img.width * scale;
          const dh = img.height * scale;
          const dx = 71 + (454 - dw) / 2;
          const dy = currentY - dh;

          currentPage.drawImage(img, { x: dx, y: dy, width: dw, height: dh });
          currentPage.drawText(ev.titulo.substring(0, 70), {
            x: dx,
            y: dy + dh + 2,
            size: 7,
            font: helveticaBold,
            color: rgb(0.1, 0.2, 0.4),
          });
          currentY = dy - 18;
        }
      } else {
        const cellW = (454 - 14) / 2;
        let maxDrawnH = 0;
        const embeddedList = [];

        for (let idx = 0; idx < 2; idx++) {
          const ev = pair[idx];
          const validDataUrl = await ensureJpegOrPngDataUrl(ev.dataUrl);
          if (validDataUrl) {
            const isPng = validDataUrl.startsWith('data:image/png');
            const img = isPng ? await pdfDoc.embedPng(validDataUrl) : await pdfDoc.embedJpg(validDataUrl);
            const scale = Math.min(cellW / img.width, targetSlotH / img.height, 1);
            const dw = img.width * scale;
            const dh = img.height * scale;
            maxDrawnH = Math.max(maxDrawnH, dh);
            embeddedList.push({ img, dw, dh, ev, colIdx: idx });
          }
        }

        for (const item of embeddedList) {
          const cx = 71 + item.colIdx * (cellW + 14);
          const dx = cx + (cellW - item.dw) / 2;
          const dy = currentY - item.dh;

          currentPage.drawImage(item.img, { x: dx, y: dy, width: item.dw, height: item.dh });
          currentPage.drawText(item.ev.titulo.substring(0, 42), {
            x: cx,
            y: dy + item.dh + 2,
            size: 6.5,
            font: helveticaBold,
            color: rgb(0.1, 0.2, 0.4),
          });
        }

        currentY -= (maxDrawnH + 18);
      }
    }
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
