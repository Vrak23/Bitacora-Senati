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

  const pages = pdfDoc.getPages();
  const semData = appData.informeSeminario || {};
  const wk = (appData.semanas && appData.semanas[appData.semanaActual]) || {};

  // PÁGINA 2: HOJA DE IDENTIFICACIÓN
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

  // PÁGINA 4: TAREA MÁS SIGNIFICATIVA Y DESCRIPCIÓN DEL PROCESO
  const page4 = pages[3];
  if (page4) {
    const act1 = (semData.actividades && semData.actividades[1]) || {};
    const taskTitle = semData.tituloGlobal || act1.titulo || 'Desarrollo de Aplicaciones Web y Soluciones Informáticas';
    const processDesc = semData.procesoGlobal || act1.descripcion || 'Ejecución y desarrollo de las actividades técnicas programadas para la sesión práctica.';

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

    const ruledLinesY = [
      684.7, 665.7, 646.7, 627.7, 608.7, 589.7, 570.7, 551.9,
      532.9, 513.9, 494.9, 475.9, 456.9, 437.9, 418.9, 399.9,
      381.1, 362.1, 343.1, 324.1, 305.1, 286.1, 267.1, 248.1,
      229.1, 210.1, 191.3, 172.3, 153.3, 134.3
    ];

    const wrappedProcess = wrapText(processDesc, helvetica, 9, 445);
    for (let i = 0; i < ruledLinesY.length; i++) {
      const lineText = wrappedProcess[i];
      if (lineText) {
        page4.drawText(lineText, {
          x: 75,
          y: ruledLinesY[i] + 3,
          size: 9,
          font: helvetica,
          color: rgb(0, 0, 0),
        });
      }
    }
  }

  // PÁGINA 5: ESQUEMA / DIAGRAMA + ASISTENCIA VIERNES + OBSERVACIONES
  const page5 = pages[4];
  if (page5) {
    const evidencias = [];
    if (semData.actividades) {
      for (let i = 1; i <= 4; i++) {
        const act = semData.actividades[i];
        if (!act) continue;

        if (act.imgUi) {
          evidencias.push({
            tipo: 'UI',
            titulo: 'Act. ' + i + ' UI: ' + (act.urlUi || 'http://localhost:4200/'),
            dataUrl: act.imgUi
          });
        }
        if (act.imgCodigo) {
          evidencias.push({
            tipo: 'Código',
            titulo: 'Act. ' + i + ' Código: ' + (act.tagCodigo || ('Actividad' + i + '.ts')),
            dataUrl: act.imgCodigo
          });
        }
        if (act.extras && act.extras.length > 0) {
          act.extras.forEach(ex => {
            if (ex.img) {
              evidencias.push({
                tipo: ex.tipo === 'ui' ? 'UI' : 'Código',
                titulo: 'Act. ' + i + ' ' + (ex.tipo === 'ui' ? 'UI' : 'Código') + ': ' + (ex.tag || ''),
                dataUrl: ex.img
              });
            }
          });
        }
      }
    }

    const boxX = 49.8;
    const boxY = 385;
    const boxW = 510;
    const boxH = 340;

    if (evidencias.length > 0) {
      const count = evidencias.length;

      if (count === 1) {
        const ev = evidencias[0];
        const validDataUrl = await ensureJpegOrPngDataUrl(ev.dataUrl);
        if (validDataUrl) {
          const isPng = validDataUrl.startsWith('data:image/png');
          const embeddedImg = isPng ? await pdfDoc.embedPng(validDataUrl) : await pdfDoc.embedJpg(validDataUrl);
          const maxW = boxW - 20;
          const maxH = boxH - 30;
          const scale = Math.min(maxW / embeddedImg.width, maxH / embeddedImg.height, 1);
          const dw = embeddedImg.width * scale;
          const dh = embeddedImg.height * scale;
          const dx = boxX + (boxW - dw) / 2;
          const dy = boxY + (boxH - dh) / 2;

          page5.drawImage(embeddedImg, { x: dx, y: dy, width: dw, height: dh });
          page5.drawText(ev.titulo, {
            x: dx,
            y: dy + dh + 4,
            size: 8,
            font: helveticaBold,
            color: rgb(0.1, 0.2, 0.4),
          });
        }
      } else if (count === 2) {
        const cellW = (boxW - 30) / 2;
        const cellH = boxH - 30;
        for (let idx = 0; idx < 2; idx++) {
          const ev = evidencias[idx];
          const validDataUrl = await ensureJpegOrPngDataUrl(ev.dataUrl);
          if (!validDataUrl) continue;
          const isPng = validDataUrl.startsWith('data:image/png');
          const embeddedImg = isPng ? await pdfDoc.embedPng(validDataUrl) : await pdfDoc.embedJpg(validDataUrl);
          const scale = Math.min(cellW / embeddedImg.width, (cellH - 15) / embeddedImg.height, 1);
          const dw = embeddedImg.width * scale;
          const dh = embeddedImg.height * scale;
          const cx = boxX + 10 + idx * (cellW + 10);
          const dx = cx + (cellW - dw) / 2;
          const dy = boxY + 10 + (cellH - dh) / 2;

          page5.drawImage(embeddedImg, { x: dx, y: dy, width: dw, height: dh });
          page5.drawText(ev.titulo.substring(0, 45), {
            x: cx,
            y: dy + dh + 3,
            size: 7,
            font: helveticaBold,
            color: rgb(0.1, 0.2, 0.4),
          });
        }
      } else {
        const cols = 2;
        const rows = Math.min(2, Math.ceil(count / 2));
        const cellW = (boxW - 30) / cols;
        const cellH = (boxH - 30) / rows;

        for (let idx = 0; idx < Math.min(4, count); idx++) {
          const ev = evidencias[idx];
          const validDataUrl = await ensureJpegOrPngDataUrl(ev.dataUrl);
          if (!validDataUrl) continue;
          const isPng = validDataUrl.startsWith('data:image/png');
          const embeddedImg = isPng ? await pdfDoc.embedPng(validDataUrl) : await pdfDoc.embedJpg(validDataUrl);
          const col = idx % 2;
          const row = Math.floor(idx / 2);
          const scale = Math.min(cellW / embeddedImg.width, (cellH - 14) / embeddedImg.height, 1);
          const dw = embeddedImg.width * scale;
          const dh = embeddedImg.height * scale;

          const cx = boxX + 10 + col * (cellW + 10);
          const topY = boxY + boxH - 15 - (row + 1) * cellH;
          const dx = cx + (cellW - dw) / 2;
          const dy = topY + (cellH - dh) / 2;

          page5.drawImage(embeddedImg, { x: dx, y: dy, width: dw, height: dh });
          page5.drawText(ev.titulo.substring(0, 42), {
            x: cx,
            y: dy + dh + 2,
            size: 6.5,
            font: helveticaBold,
            color: rgb(0.1, 0.2, 0.4),
          });
        }
      }
    }

    // Viernes marcado
    page5.drawText('X', {
      x: 428,
      y: 304,
      size: 11,
      font: helveticaBold,
      color: rgb(0, 0, 0),
    });
    page5.drawText('X', {
      x: 470,
      y: 304,
      size: 11,
      font: helveticaBold,
      color: rgb(0, 0, 0),
    });
  }

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const blobUrl = URL.createObjectURL(blob);

  // Descargar y abrir
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = 'Informe_Clase_Semana_' + (appData.semanaActual || 1) + '.pdf';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  return blobUrl;
}
