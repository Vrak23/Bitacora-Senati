import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

function wrapText(text, font, fontSize, maxWidth) {
  if (!text) return [];
  const paragraphs = text.split('\n');
  const lines = [];

  for (const para of paragraphs) {
    if (!para.trim()) {
      lines.push('');
      continue;
    }
    const words = para.split(' ');
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
  // RECOPILAR TODAS LAS CAPTURAS (SIN LÍMITE DE 4)
  // ==========================================================
  const webEvidencias = [];
  const codeEvidencias = [];

  if (semData.actividades) {
    for (let i = 1; i <= 4; i++) {
      const act = semData.actividades[i];
      if (!act) continue;

      if (act.imgUi) {
        webEvidencias.push({
          actNum: i,
          tipo: 'ui',
          titulo: 'Actividad ' + i + ': ' + (act.urlUi || 'http://localhost:4200/'),
          dataUrl: act.imgUi
        });
      }

      if (act.extras && act.extras.length > 0) {
        act.extras.forEach(ex => {
          if (ex.tipo === 'ui' && ex.img) {
            webEvidencias.push({
              actNum: i,
              tipo: 'ui',
              titulo: 'Actividad ' + i + ' (Extra): ' + (ex.tag || 'http://localhost:4200/'),
              dataUrl: ex.img
            });
          }
        });
      }

      if (act.imgCodigo) {
        codeEvidencias.push({
          actNum: i,
          tipo: 'codigo',
          titulo: 'Actividad ' + i + ': ' + (act.tagCodigo || ('Actividad' + i + '.ts')),
          dataUrl: act.imgCodigo
        });
      }

      if (act.extras && act.extras.length > 0) {
        act.extras.forEach(ex => {
          if (ex.tipo === 'codigo' && ex.img) {
            codeEvidencias.push({
              actNum: i,
              tipo: 'codigo',
              titulo: 'Actividad ' + i + ' (Extra): ' + (ex.tag || 'codigo.ts'),
              dataUrl: ex.img
            });
          }
        });
      }
    }
  }

  // ==========================================================
  // PÁGINA 4: TAREA, PROCESO Y CAPTURAS (WEB Y CÓDIGO)
  // ==========================================================
  const page4 = pages[3];
  if (page4) {
    const act1 = (semData.actividades && semData.actividades[1]) || {};
    const taskTitle = semData.tituloGlobal || act1.titulo || 'Desarrollo de Aplicaciones Web y Soluciones Informáticas';
    const processDesc = semData.procesoGlobal || act1.descripcion || 'Ejecución y desarrollo de las actividades técnicas programadas para la sesión práctica.';

    // Tarea más significativa
    page4.drawRectangle({
      x: 71,
      y: 736,
      width: 454,
      height: 16,
      color: rgb(1, 1, 1),
    });
    page4.drawLine({
      start: { x: 71, y: 737 },
      end: { x: 525, y: 737 },
      thickness: 0.75,
      color: rgb(0, 0, 0),
    });
    page4.drawText(String(taskTitle), {
      x: 71,
      y: 740,
      size: 9.5,
      font: helveticaBold,
      color: rgb(0, 0, 0),
    });

    // Descripción del proceso (2 líneas oficiales en la plantilla)
    const procLines = wrapText(processDesc, helvetica, 9, 445);
    if (procLines[0]) {
      page4.drawText(procLines[0], { x: 75, y: 668.7, size: 9, font: helvetica, color: rgb(0, 0, 0) });
    }
    if (procLines[1]) {
      page4.drawText(procLines[1], { x: 75, y: 649.7, size: 9, font: helvetica, color: rgb(0, 0, 0) });
    }

    // Dibujar Capturas WEB en Página 4 (área y: 275..490, x: 71..525)
    const webAreaY = 275;
    const webAreaH = 215;
    const webAreaW = 454;
    const webOnP4 = webEvidencias.slice(0, 2);

    if (webOnP4.length === 1) {
      const ev = webOnP4[0];
      const validDataUrl = await ensureJpegOrPngDataUrl(ev.dataUrl);
      if (validDataUrl) {
        const isPng = validDataUrl.startsWith('data:image/png');
        const img = isPng ? await pdfDoc.embedPng(validDataUrl) : await pdfDoc.embedJpg(validDataUrl);
        const maxW = webAreaW;
        const maxH = webAreaH - 15;
        const scale = Math.min(maxW / img.width, maxH / img.height, 1);
        const dw = img.width * scale;
        const dh = img.height * scale;
        const dx = 71 + (webAreaW - dw) / 2;
        const dy = webAreaY + (webAreaH - dh) / 2;

        page4.drawImage(img, { x: dx, y: dy, width: dw, height: dh });
        page4.drawText(ev.titulo.substring(0, 60), {
          x: dx,
          y: dy + dh + 3,
          size: 7.5,
          font: helveticaBold,
          color: rgb(0.1, 0.2, 0.4),
        });
      }
    } else if (webOnP4.length === 2) {
      const cellW = (webAreaW - 15) / 2;
      const cellH = webAreaH;
      for (let idx = 0; idx < 2; idx++) {
        const ev = webOnP4[idx];
        const validDataUrl = await ensureJpegOrPngDataUrl(ev.dataUrl);
        if (!validDataUrl) continue;
        const isPng = validDataUrl.startsWith('data:image/png');
        const img = isPng ? await pdfDoc.embedPng(validDataUrl) : await pdfDoc.embedJpg(validDataUrl);
        const scale = Math.min(cellW / img.width, (cellH - 15) / img.height, 1);
        const dw = img.width * scale;
        const dh = img.height * scale;
        const cx = 71 + idx * (cellW + 15);
        const dx = cx + (cellW - dw) / 2;
        const dy = webAreaY + (cellH - dh) / 2;

        page4.drawImage(img, { x: dx, y: dy, width: dw, height: dh });
        page4.drawText(ev.titulo.substring(0, 42), {
          x: cx,
          y: dy + dh + 2,
          size: 7,
          font: helveticaBold,
          color: rgb(0.1, 0.2, 0.4),
        });
      }
    }

    // Dibujar Capturas CÓDIGO en Página 4 (área y: 25..235, x: 71..525)
    const codAreaY = 25;
    const codAreaH = 210;
    const codAreaW = 454;
    const codOnP4 = codeEvidencias.slice(0, 2);

    if (codOnP4.length === 1) {
      const ev = codOnP4[0];
      const validDataUrl = await ensureJpegOrPngDataUrl(ev.dataUrl);
      if (validDataUrl) {
        const isPng = validDataUrl.startsWith('data:image/png');
        const img = isPng ? await pdfDoc.embedPng(validDataUrl) : await pdfDoc.embedJpg(validDataUrl);
        const maxW = codAreaW;
        const maxH = codAreaH - 15;
        const scale = Math.min(maxW / img.width, maxH / img.height, 1);
        const dw = img.width * scale;
        const dh = img.height * scale;
        const dx = 71 + (codAreaW - dw) / 2;
        const dy = codAreaY + (codAreaH - dh) / 2;

        page4.drawImage(img, { x: dx, y: dy, width: dw, height: dh });
        page4.drawText(ev.titulo.substring(0, 60), {
          x: dx,
          y: dy + dh + 3,
          size: 7.5,
          font: helveticaBold,
          color: rgb(0.1, 0.2, 0.4),
        });
      }
    } else if (codOnP4.length === 2) {
      const cellW = (codAreaW - 15) / 2;
      const cellH = codAreaH;
      for (let idx = 0; idx < 2; idx++) {
        const ev = codOnP4[idx];
        const validDataUrl = await ensureJpegOrPngDataUrl(ev.dataUrl);
        if (!validDataUrl) continue;
        const isPng = validDataUrl.startsWith('data:image/png');
        const img = isPng ? await pdfDoc.embedPng(validDataUrl) : await pdfDoc.embedJpg(validDataUrl);
        const scale = Math.min(cellW / img.width, (cellH - 15) / img.height, 1);
        const dw = img.width * scale;
        const dh = img.height * scale;
        const cx = 71 + idx * (cellW + 15);
        const dx = cx + (cellW - dw) / 2;
        const dy = codAreaY + (cellH - dh) / 2;

        page4.drawImage(img, { x: dx, y: dy, width: dw, height: dh });
        page4.drawText(ev.titulo.substring(0, 42), {
          x: cx,
          y: dy + dh + 2,
          size: 7,
          font: helveticaBold,
          color: rgb(0.1, 0.2, 0.4),
        });
      }
    }
  }

  // ==========================================================
  // PÁGINAS ADICIONALES DE CAPTURAS SI HAY MÁS DE 4
  // ==========================================================
  const overflowWeb = webEvidencias.slice(2);
  const overflowCod = codeEvidencias.slice(2);
  const remainingAll = [...overflowWeb, ...overflowCod];

  if (remainingAll.length > 0) {
    const itemsPerPage = 4;
    const numPages = Math.ceil(remainingAll.length / itemsPerPage);

    for (let pIdx = 0; pIdx < numPages; pIdx++) {
      const subItems = remainingAll.slice(pIdx * itemsPerPage, (pIdx + 1) * itemsPerPage);
      // Insertar página de continuación antes de la página final de Observaciones
      const contPage = pdfDoc.insertPage(4 + pIdx, [595.25, 842]);

      // Encabezado de la página de continuación
      contPage.drawRectangle({
        x: 71,
        y: 770,
        width: 454,
        height: 35,
        borderColor: rgb(0, 0, 0),
        borderWidth: 1,
        color: rgb(0.96, 0.96, 0.96),
      });
      contPage.drawText('Esquema, dibujo, capturas (Continuación ' + (pIdx + 1) + ')', {
        x: 180,
        y: 782,
        size: 13,
        font: helveticaBold,
        color: rgb(0, 0, 0),
      });

      // Grilla de 2x2 para las capturas de continuación
      const gridX = 71;
      const gridY = 50;
      const gridW = 454;
      const gridH = 700;
      const cols = 2;
      const rows = 2;
      const cW = (gridW - 15) / cols;
      const cH = (gridH - 25) / rows;

      for (let sIdx = 0; sIdx < subItems.length; sIdx++) {
        const ev = subItems[sIdx];
        const validDataUrl = await ensureJpegOrPngDataUrl(ev.dataUrl);
        if (!validDataUrl) continue;
        const isPng = validDataUrl.startsWith('data:image/png');
        const img = isPng ? await pdfDoc.embedPng(validDataUrl) : await pdfDoc.embedJpg(validDataUrl);

        const col = sIdx % 2;
        const row = Math.floor(sIdx / 2); // 0 = sup, 1 = inf
        const scale = Math.min(cW / img.width, (cH - 16) / img.height, 1);
        const dw = img.width * scale;
        const dh = img.height * scale;

        const cx = gridX + col * (cW + 15);
        const topY = gridY + gridH - (row + 1) * cH;
        const dx = cx + (cW - dw) / 2;
        const dy = topY + (cH - dh) / 2;

        contPage.drawImage(img, { x: dx, y: dy, width: dw, height: dh });
        contPage.drawText(ev.titulo.substring(0, 42), {
          x: cx,
          y: dy + dh + 2,
          size: 7,
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

  // Descargar automáticamente y abrir
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = 'Informe_Clase_Semana_' + (appData.semanaActual || 1) + '.pdf';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  return blobUrl;
}
