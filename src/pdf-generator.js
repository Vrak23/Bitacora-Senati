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

  // Eliminar página 6 si viene vacía en la plantilla
  if (pdfDoc.getPageCount() >= 6) {
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
  // (USANDO SOLO EL NOMBRE PERSONALIZADO DEL USUARIO, SIN 'ACTIVIDAD X')
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
  // PÁGINA 4: TAREA, PROCESO Y CAPTURAS (WEB PRIMERO, CÓDIGO SEGUNDO)
  // ==========================================================
  const page4 = pages[3];
  let overflowWeb = [];
  let overflowCod = [];

  if (page4) {
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

    // 1. Limpiar completamente desde abajo del encabezado hasta el final de la Página 4
    page4.drawRectangle({
      x: 40,
      y: 10,
      width: 515,
      height: 770,
      color: rgb(1, 1, 1),
    });

    // 2. Encabezado Tarea más significativa
    page4.drawText('Tarea más significativa:', {
      x: 71,
      y: 760,
      size: 11,
      font: helveticaBold,
      color: rgb(0, 0, 0),
    });
    page4.drawLine({
      start: { x: 71, y: 737 },
      end: { x: 525, y: 737 },
      thickness: 0.75,
      color: rgb(0, 0, 0),
    });
    page4.drawText(String(taskTitle), {
      x: 71,
      y: 741,
      size: 9.5,
      font: helveticaBold,
      color: rgb(0, 0, 0),
    });

    // 3. Encabezado Descripción del proceso
    page4.drawText('Descripción del proceso:', {
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
        page4.drawText(line, {
          x: 71,
          y: currentY,
          size: procFontSize,
          font: helvetica,
          color: rgb(0, 0, 0),
        });
      }
      currentY -= procLineHeight;
    }

    currentY -= 12; // Separación

    // 5. Recuadro: Esquema, dibujo, capturas
    const boxW = 280;
    const boxH = 26;
    const boxX = (595.25 - boxW) / 2;
    page4.drawRectangle({
      x: boxX,
      y: currentY - boxH,
      width: boxW,
      height: boxH,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1,
      color: rgb(1, 1, 1),
    });
    page4.drawText('Esquema, dibujo, capturas', {
      x: boxX + 45,
      y: currentY - boxH + 8,
      size: 13,
      font: helveticaBold,
      color: rgb(0, 0, 0),
    });

    currentY -= (boxH + 18);

    // 6. CATEGORÍA WEB PRIMERO
    const remainingH = currentY - 30;
    const slotH = Math.min(Math.floor((remainingH - 60) / 2), 150);

    page4.drawText('Web:', {
      x: 71,
      y: currentY,
      size: 15,
      font: helveticaBold,
      color: rgb(0, 0, 0),
    });
    currentY -= 15;

    const webOnP4 = webEvidencias.slice(0, 2);
    overflowWeb = webEvidencias.slice(2);

    if (webOnP4.length === 1) {
      const ev = webOnP4[0];
      const validDataUrl = await ensureJpegOrPngDataUrl(ev.dataUrl);
      if (validDataUrl) {
        const isPng = validDataUrl.startsWith('data:image/png');
        const img = isPng ? await pdfDoc.embedPng(validDataUrl) : await pdfDoc.embedJpg(validDataUrl);
        const maxW = 454;
        const maxH = slotH;
        const scale = Math.min(maxW / img.width, maxH / img.height, 1);
        const dw = img.width * scale;
        const dh = img.height * scale;
        const dx = 71 + (454 - dw) / 2;
        const dy = currentY - dh;

        page4.drawImage(img, { x: dx, y: dy, width: dw, height: dh });
        page4.drawText(ev.titulo.substring(0, 60), {
          x: dx,
          y: dy + dh + 2,
          size: 7,
          font: helveticaBold,
          color: rgb(0.1, 0.2, 0.4),
        });
        currentY = dy - 18;
      }
    } else if (webOnP4.length === 2) {
      const cellW = (454 - 14) / 2;
      let maxDrawnH = 0;
      for (let idx = 0; idx < 2; idx++) {
        const ev = webOnP4[idx];
        const validDataUrl = await ensureJpegOrPngDataUrl(ev.dataUrl);
        if (!validDataUrl) continue;
        const isPng = validDataUrl.startsWith('data:image/png');
        const img = isPng ? await pdfDoc.embedPng(validDataUrl) : await pdfDoc.embedJpg(validDataUrl);
        const scale = Math.min(cellW / img.width, slotH / img.height, 1);
        const dw = img.width * scale;
        const dh = img.height * scale;
        maxDrawnH = Math.max(maxDrawnH, dh);
        const cx = 71 + idx * (cellW + 14);
        const dx = cx + (cellW - dw) / 2;
        const dy = currentY - dh;

        page4.drawImage(img, { x: dx, y: dy, width: dw, height: dh });
        page4.drawText(ev.titulo.substring(0, 40), {
          x: cx,
          y: dy + dh + 2,
          size: 6.5,
          font: helveticaBold,
          color: rgb(0.1, 0.2, 0.4),
        });
      }
      currentY -= (maxDrawnH + 18);
    }

    // 7. CATEGORÍA CÓDIGO SEGUNDO
    page4.drawText('Código:', {
      x: 71,
      y: currentY,
      size: 15,
      font: helveticaBold,
      color: rgb(0, 0, 0),
    });
    currentY -= 15;

    const codOnP4 = codeEvidencias.slice(0, 2);
    overflowCod = codeEvidencias.slice(2);

    const codSlotH = Math.max(Math.min(currentY - 30, slotH), 50);

    if (codOnP4.length === 1) {
      const ev = codOnP4[0];
      const validDataUrl = await ensureJpegOrPngDataUrl(ev.dataUrl);
      if (validDataUrl) {
        const isPng = validDataUrl.startsWith('data:image/png');
        const img = isPng ? await pdfDoc.embedPng(validDataUrl) : await pdfDoc.embedJpg(validDataUrl);
        const maxW = 454;
        const maxH = codSlotH;
        const scale = Math.min(maxW / img.width, maxH / img.height, 1);
        const dw = img.width * scale;
        const dh = img.height * scale;
        const dx = 71 + (454 - dw) / 2;
        const dy = currentY - dh;

        page4.drawImage(img, { x: dx, y: dy, width: dw, height: dh });
        page4.drawText(ev.titulo.substring(0, 60), {
          x: dx,
          y: dy + dh + 2,
          size: 7,
          font: helveticaBold,
          color: rgb(0.1, 0.2, 0.4),
        });
      }
    } else if (codOnP4.length === 2) {
      const cellW = (454 - 14) / 2;
      for (let idx = 0; idx < 2; idx++) {
        const ev = codOnP4[idx];
        const validDataUrl = await ensureJpegOrPngDataUrl(ev.dataUrl);
        if (!validDataUrl) continue;
        const isPng = validDataUrl.startsWith('data:image/png');
        const img = isPng ? await pdfDoc.embedPng(validDataUrl) : await pdfDoc.embedJpg(validDataUrl);
        const scale = Math.min(cellW / img.width, codSlotH / img.height, 1);
        const dw = img.width * scale;
        const dh = img.height * scale;
        const cx = 71 + idx * (cellW + 14);
        const dx = cx + (cellW - dw) / 2;
        const dy = currentY - dh;

        page4.drawImage(img, { x: dx, y: dy, width: dw, height: dh });
        page4.drawText(ev.titulo.substring(0, 40), {
          x: cx,
          y: dy + dh + 2,
          size: 6.5,
          font: helveticaBold,
          color: rgb(0.1, 0.2, 0.4),
        });
      }
    }
  }

  // ==========================================================
  // PÁGINAS DE CONTINUACIÓN DE CAPTURAS (SI HAY MÁS DE 4)
  // ==========================================================
  const remainingImages = [...overflowWeb, ...overflowCod];

  if (remainingImages.length > 0) {
    const itemsPerPage = 4;
    const numPages = Math.ceil(remainingImages.length / itemsPerPage);

    for (let pIdx = 0; pIdx < numPages; pIdx++) {
      const subItems = remainingImages.slice(pIdx * itemsPerPage, (pIdx + 1) * itemsPerPage);
      const contPage = pdfDoc.insertPage(4 + pIdx, [595.25, 842]);

      // Encabezado
      const bW = 280;
      const bH = 26;
      const bX = (595.25 - bW) / 2;
      contPage.drawRectangle({
        x: bX,
        y: 770,
        width: bW,
        height: bH,
        borderColor: rgb(0, 0, 0),
        borderWidth: 1,
        color: rgb(1, 1, 1),
      });
      contPage.drawText('Esquema, dibujo, capturas (Cont. ' + (pIdx + 1) + ')', {
        x: bX + 22,
        y: 778,
        size: 11.5,
        font: helveticaBold,
        color: rgb(0, 0, 0),
      });

      // Grilla de 2x2 para las capturas de continuación
      const gridX = 71;
      const gridY = 40;
      const gridW = 454;
      const gridH = 700;
      const cols = 2;
      const rows = 2;
      const cW = (gridW - 14) / cols;
      const cH = (gridH - 18) / rows;

      for (let sIdx = 0; sIdx < subItems.length; sIdx++) {
        const ev = subItems[sIdx];
        const validDataUrl = await ensureJpegOrPngDataUrl(ev.dataUrl);
        if (!validDataUrl) continue;
        const isPng = validDataUrl.startsWith('data:image/png');
        const img = isPng ? await pdfDoc.embedPng(validDataUrl) : await pdfDoc.embedJpg(validDataUrl);

        const col = sIdx % 2;
        const row = Math.floor(sIdx / 2);
        const scale = Math.min(cW / img.width, (cH - 16) / img.height, 1);
        const dw = img.width * scale;
        const dh = img.height * scale;

        const cx = gridX + col * (cW + 14);
        const topY = gridY + gridH - (row + 1) * cH;
        const dx = cx + (cW - dw) / 2;
        const dy = topY + (cH - dh) / 2;

        contPage.drawImage(img, { x: dx, y: dy, width: dw, height: dh });
        contPage.drawText(ev.titulo.substring(0, 42), {
          x: cx,
          y: dy + dh + 2,
          size: 6.5,
          font: helveticaBold,
          color: rgb(0.1, 0.2, 0.4),
        });
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
