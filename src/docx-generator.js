import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
  ImageRun,
  UnderlineType
} from 'docx';

// Normalize and prepare image for DOCX with guaranteed PNG format & exact dimensions
async function prepareImageForDocx(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.includes(',')) return null;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      try {
        const origW = img.naturalWidth || img.width || 800;
        const origH = img.naturalHeight || img.height || 450;

        // Proportional scaling: max width 560px, max height 315px
        const scale = Math.min(560 / origW, 315 / origH, 1);
        const dw = Math.max(1, Math.round(origW * scale));
        const dh = Math.max(1, Math.round(origH * scale));

        // Use canvas to guarantee standard clean PNG byte stream
        const canvas = document.createElement('canvas');
        canvas.width = origW;
        canvas.height = origH;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, origW, origH);
        ctx.drawImage(img, 0, 0);

        const pngDataUrl = canvas.toDataURL('image/png');
        const base64 = pngDataUrl.split(',')[1].replace(/\s/g, '');
        const binaryString = atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        resolve({
          bytes,
          type: 'png',
          width: dw,
          height: dh
        });
      } catch (err) {
        console.warn('Canvas conversion failed, fallback to raw dataUrl:', err);
        try {
          const base64 = dataUrl.split(',')[1].replace(/\s/g, '');
          const binaryString = atob(base64);
          const len = binaryString.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          resolve({
            bytes,
            type: 'png',
            width: 500,
            height: 300
          });
        } catch (e2) {
          resolve(null);
        }
      }
    };
    img.onerror = () => {
      console.warn('Failed to load image for DOCX');
      resolve(null);
    };
    img.src = dataUrl;
  });
}

const tableBordersThin = {
  top: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
  left: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
  right: { style: BorderStyle.SINGLE, size: 4, color: '000000' }
};

const tableBordersSubtle = {
  top: { style: BorderStyle.SINGLE, size: 2, color: 'cbd5e1' },
  bottom: { style: BorderStyle.SINGLE, size: 2, color: 'cbd5e1' },
  left: { style: BorderStyle.SINGLE, size: 2, color: 'cbd5e1' },
  right: { style: BorderStyle.SINGLE, size: 2, color: 'cbd5e1' }
};

// Page layout constants (A4 in DXA)
const PAGE_WIDTH_DXA = 11906; // 210mm
const PAGE_HEIGHT_DXA = 16838; // 297mm
const MARGIN_DXA = 1440; // 1 inch (25.4mm)
const CONTENT_WIDTH_DXA = 9020; // 11906 - (1440 * 2) = 9026 ~ 9020 dxa

function createCell(text, widthDxa, isHeader = false, isBold = false, bgHex = null, align = AlignmentType.LEFT, borders = tableBordersThin, fontSize = 18) {
  return new TableCell({
    width: { size: widthDxa, type: WidthType.DXA },
    shading: bgHex ? { fill: bgHex } : (isHeader ? { fill: '004b87' } : undefined),
    margins: { top: 100, bottom: 100, left: 120, right: 120 },
    borders: borders,
    children: [
      new Paragraph({
        alignment: align,
        spacing: { before: 20, after: 20 },
        children: [
          new TextRun({
            text: String(text ?? ''),
            bold: isHeader || isBold,
            color: isHeader ? 'FFFFFF' : '000000',
            size: isHeader ? (fontSize + 1) : fontSize,
            font: 'Arial'
          })
        ]
      })
    ]
  });
}

// =========================================================================
// 1. INFORME DE CLASE DOCX (Exacto al PDF Oficial SENATI: template_informe_clase.pdf)
// =========================================================================
export async function generateInformeClaseDOCX(appData) {
  const semData = appData.informeSeminario || {};
  const semNum = appData.semanaActual || 1;
  const wk = (appData.semanas && appData.semanas[semNum]) || {};
  const act1 = (semData.actividades && semData.actividades[1]) || {};

  const liveTitle = (typeof document !== 'undefined' && document.getElementById('ts-titulo')?.value) || '';
  const liveProc = (typeof document !== 'undefined' && document.getElementById('ts-proceso')?.value) || '';

  const taskTitle = liveTitle.trim() || semData.tituloGlobal || wk.tareaSignificativa?.titulo || act1.titulo || 'Desarrollo de Aplicaciones Web y Soluciones Informáticas';
  
  let processDesc = liveProc.trim() || semData.procesoGlobal || wk.tareaSignificativa?.proceso || '';
  if (!processDesc.trim() && act1.descripcion) {
    processDesc = act1.descripcion;
  }
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

  const children = [];

  // -------------------------------------------------------------
  // PÁGINA 1: PORTADA OFICIAL SENATI
  // -------------------------------------------------------------
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 300, after: 120 },
      children: [
        new TextRun({
          text: 'SERVICIO NACIONAL DE ADIESTRAMIENTO EN TRABAJO INDUSTRIAL',
          bold: true,
          size: 26,
          color: '004b87',
          font: 'Arial'
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 160 },
      children: [
        new TextRun({
          text: 'DIRECCIÓN ZONAL LIMA CALLAO / CFP LIMA',
          bold: true,
          size: 20,
          color: '334155',
          font: 'Arial'
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 600, after: 140 },
      children: [
        new TextRun({
          text: 'CUADERNO DE INFORMES DE FORMACIÓN PRÁCTICA',
          bold: true,
          size: 26,
          color: '004b87',
          font: 'Arial'
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 700 },
      children: [
        new TextRun({
          text: 'PROGRAMA DE FORMACIÓN DUAL — INFORME SEMANAL',
          bold: true,
          size: 20,
          color: '0284c7',
          font: 'Arial'
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 400, after: 80 },
      children: [
        new TextRun({ text: 'Estudiante: ', bold: true, size: 20, font: 'Arial' }),
        new TextRun({ text: appData.estudiante || 'Rodrigo Daniel Ormeño Llanos', size: 20, font: 'Arial' })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [
        new TextRun({ text: 'ID / Matrícula: ', bold: true, size: 20, font: 'Arial' }),
        new TextRun({ text: appData.matricula || '001681961', size: 20, font: 'Arial' })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [
        new TextRun({ text: 'Carrera: ', bold: true, size: 20, font: 'Arial' }),
        new TextRun({ text: appData.carrera || 'Informática y Desarrollo de Aplicaciones Web', size: 20, font: 'Arial' })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [
        new TextRun({ text: 'Bloque / Grupo: ', bold: true, size: 20, font: 'Arial' }),
        new TextRun({ text: appData.bloque || '406', size: 20, font: 'Arial' })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [
        new TextRun({ text: 'Instructor: ', bold: true, size: 20, font: 'Arial' }),
        new TextRun({ text: appData.instructor || 'Jorge Luque Chambi', size: 20, font: 'Arial' })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      children: [
        new TextRun({ text: 'Semestre: ', bold: true, size: 20, font: 'Arial' }),
        new TextRun({ text: appData.semestre || '4to Ciclo', size: 20, font: 'Arial' })
      ]
    })
  );

  // -------------------------------------------------------------
  // PÁGINA 2: HOJA DE IDENTIFICACIÓN DEL APRENDIZ
  // -------------------------------------------------------------
  children.push(
    new Paragraph({
      pageBreakBefore: true,
      alignment: AlignmentType.CENTER,
      spacing: { before: 100, after: 200 },
      children: [
        new TextRun({
          text: 'HOJA DE IDENTIFICACIÓN DEL APRENDIZ',
          bold: true,
          size: 24,
          color: '004b87',
          font: 'Arial'
        })
      ]
    })
  );

  const colW1 = 3157;
  const colW2 = 5863;

  const idRows = [
    new TableRow({
      children: [
        createCell('DIRECCIÓN ZONAL / CFP:', colW1, false, true, 'f1f5f9'),
        createCell(appData.escuela || 'ETI (Escuela de Tecnologías de la Información)', colW2)
      ]
    }),
    new TableRow({
      children: [
        createCell('CARRERA:', colW1, false, true, 'f1f5f9'),
        createCell(appData.carrera || 'Informática y Desarrollo de Aplicaciones Web', colW2)
      ]
    }),
    new TableRow({
      children: [
        createCell('APELLIDOS Y NOMBRES:', colW1, false, true, 'f1f5f9'),
        createCell(appData.estudiante || 'Rodrigo Daniel Ormeño Llanos', colW2, false, true)
      ]
    }),
    new TableRow({
      children: [
        createCell('ID / MATRÍCULA:', colW1, false, true, 'f1f5f9'),
        createCell(appData.matricula || '001681961', colW2)
      ]
    }),
    new TableRow({
      children: [
        createCell('BLOQUE / GRUPO:', colW1, false, true, 'f1f5f9'),
        createCell(appData.bloque || '406', colW2)
      ]
    }),
    new TableRow({
      children: [
        createCell('INSTRUCTOR:', colW1, false, true, 'f1f5f9'),
        createCell(appData.instructor || 'Jorge Luque Chambi', colW2)
      ]
    }),
    new TableRow({
      children: [
        createCell('SEMESTRE:', colW1, false, true, 'f1f5f9'),
        createCell(appData.semestre || '4to Ciclo', colW2)
      ]
    }),
    new TableRow({
      children: [
        createCell('PERIODO / FECHA:', colW1, false, true, 'f1f5f9'),
        createCell((wk.fechaInicio && wk.fechaFin) ? `${wk.fechaInicio} al ${wk.fechaFin}` : 'Viernes lectivo', colW2)
      ]
    })
  ];

  children.push(
    new Table({
      width: { size: CONTENT_WIDTH_DXA, type: WidthType.DXA },
      columnWidths: [colW1, colW2],
      rows: idRows
    }),
    new Paragraph({ spacing: { after: 300 } })
  );

  // -------------------------------------------------------------
  // PÁGINA 3: PLAN SEMANAL DE TRABAJO (INFORME SEMANAL)
  // -------------------------------------------------------------
  children.push(
    new Paragraph({
      pageBreakBefore: true,
      spacing: { before: 100, after: 120 },
      children: [
        new TextRun({
          text: `INFORME SEMANAL — SEMANA N° ${semNum}`,
          bold: true,
          size: 22,
          color: '004b87',
          font: 'Arial'
        })
      ]
    }),
    new Paragraph({
      spacing: { after: 140 },
      children: [
        new TextRun({ text: 'PLAN SEMANAL DE ROTACIÓN / TRABAJO:', bold: true, size: 19, font: 'Arial', color: '334155' })
      ]
    })
  );

  const planCols = [1620, 6140, 1260];
  const diasList = [
    { key: 'lunes', name: 'LUNES' },
    { key: 'martes', name: 'MARTES' },
    { key: 'miercoles', name: 'MIÉRCOLES' },
    { key: 'jueves', name: 'JUEVES' },
    { key: 'viernes', name: 'VIERNES' },
    { key: 'sabado', name: 'SÁBADO' }
  ];

  let totalHrs = 0;
  const planRows = [
    new TableRow({
      children: [
        createCell('DÍA', planCols[0], true, true, '004b87', AlignmentType.CENTER),
        createCell('TAREAS O TRABAJOS EFECTUADOS', planCols[1], true, true, '004b87', AlignmentType.CENTER),
        createCell('HORAS', planCols[2], true, true, '004b87', AlignmentType.CENTER)
      ]
    })
  ];

  diasList.forEach((d, i) => {
    const item = wk.dias && wk.dias[d.key.toLowerCase()] ? wk.dias[d.key.toLowerCase()] : { tarea: '', horas: 0 };
    totalHrs += Number(item.horas) || 0;
    const bg = i % 2 === 0 ? 'f8fafc' : 'ffffff';
    planRows.push(
      new TableRow({
        children: [
          createCell(d.name, planCols[0], false, true, bg, AlignmentType.CENTER),
          createCell(item.tarea || 'Sin actividades registradas.', planCols[1], false, false, bg),
          createCell(`${item.horas || 0} hrs`, planCols[2], false, false, bg, AlignmentType.CENTER)
        ]
      })
    );
  });

  planRows.push(
    new TableRow({
      children: [
        createCell('TOTAL HORAS:', planCols[0], false, true, 'e2e8f0', AlignmentType.CENTER),
        createCell('Horas Formativas Acumuladas en la Semana', planCols[1], false, true, 'e2e8f0'),
        createCell(`${totalHrs} hrs`, planCols[2], false, true, 'e2e8f0', AlignmentType.CENTER)
      ]
    })
  );

  children.push(
    new Table({
      width: { size: CONTENT_WIDTH_DXA, type: WidthType.DXA },
      columnWidths: planCols,
      rows: planRows
    }),
    new Paragraph({ spacing: { after: 200 } })
  );

  // -------------------------------------------------------------
  // PÁGINA 4: INFORME DE TAREA MÁS SIGNIFICATIVA
  // -------------------------------------------------------------
  children.push(
    new Paragraph({
      pageBreakBefore: true,
      spacing: { before: 100, after: 120 },
      children: [
        new TextRun({
          text: 'INFORME DE TAREA MÁS SIGNIFICATIVA',
          bold: true,
          size: 22,
          color: '004b87',
          font: 'Arial'
        })
      ]
    }),
    new Paragraph({
      spacing: { before: 80, after: 60 },
      children: [
        new TextRun({ text: 'Tarea más significativa:', bold: true, size: 20, font: 'Arial', color: '000000' })
      ]
    }),
    new Paragraph({
      spacing: { after: 140 },
      children: [
        new TextRun({
          text: taskTitle,
          bold: true,
          size: 19,
          font: 'Arial',
          color: '000000',
          underline: { type: UnderlineType.SINGLE, color: '000000' }
        })
      ]
    }),
    new Paragraph({
      spacing: { before: 120, after: 80 },
      children: [
        new TextRun({ text: 'Descripción del proceso:', bold: true, size: 20, font: 'Arial', color: '000000' })
      ]
    })
  );

  const procParagraphs = processDesc.split('\n');
  for (const para of procParagraphs) {
    if (para.trim()) {
      children.push(
        new Paragraph({
          spacing: { after: 100 },
          children: [
            new TextRun({
              text: para.trim(),
              size: 18,
              font: 'Arial',
              color: '1e293b'
            })
          ]
        })
      );
    }
  }

  // -------------------------------------------------------------
  // PÁGINAS DE CAPTURAS: 2 CAPTURAS GRANDES POR PÁGINA (PÁGINA 5+)
  // -------------------------------------------------------------
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

  let isFirstCapturasPage = true;

  function addCapturasHeaderBox(pageBreak = true, isCont = false, contNum = 1) {
    const titleText = isCont ? `Esquema, dibujo, capturas (Cont. ${contNum})` : 'HACER ESQUEMA, DIBUJO O DIAGRAMA';
    return [
      new Paragraph({
        pageBreakBefore: pageBreak,
        alignment: AlignmentType.CENTER,
        spacing: { before: 80, after: 140 },
        children: [
          new TextRun({
            text: titleText,
            bold: true,
            size: 21,
            color: '004b87',
            font: 'Arial'
          })
        ]
      })
    ];
  }

  // 1. Capturas Web
  if (webEvidencias.length > 0) {
    children.push(...addCapturasHeaderBox(true, false));
    isFirstCapturasPage = false;

    children.push(
      new Paragraph({
        spacing: { before: 40, after: 60 },
        children: [
          new TextRun({ text: 'Web:', bold: true, size: 24, color: '000000', font: 'Arial' })
        ]
      })
    );

    let webSlots = 0;
    let webContCount = 1;

    for (let i = 0; i < webEvidencias.length; i++) {
      const item = webEvidencias[i];
      if (webSlots >= 2) {
        children.push(...addCapturasHeaderBox(true, true, webContCount++));
        webSlots = 0;
      }

      const imgInfo = await prepareImageForDocx(item.dataUrl);
      if (imgInfo) {
        children.push(
          new Paragraph({
            spacing: { before: 30, after: 20 },
            children: [
              new TextRun({ text: item.titulo, bold: true, size: 17, color: '1e3a8a', font: 'Arial' })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 120 },
            children: [
              new ImageRun({
                data: imgInfo.bytes,
                transformation: { width: imgInfo.width, height: imgInfo.height },
                type: 'png'
              })
            ]
          })
        );
        webSlots++;
      }
    }
  }

  // 2. Capturas Código
  if (codeEvidencias.length > 0) {
    children.push(...addCapturasHeaderBox(true, !isFirstCapturasPage, 2));

    children.push(
      new Paragraph({
        spacing: { before: 40, after: 60 },
        children: [
          new TextRun({ text: 'Código:', bold: true, size: 24, color: '000000', font: 'Arial' })
        ]
      })
    );

    let codeSlots = 0;
    let codeContCount = 3;

    for (let i = 0; i < codeEvidencias.length; i++) {
      const item = codeEvidencias[i];
      if (codeSlots >= 2) {
        children.push(...addCapturasHeaderBox(true, true, codeContCount++));
        codeSlots = 0;
      }

      const imgInfo = await prepareImageForDocx(item.dataUrl);
      if (imgInfo) {
        children.push(
          new Paragraph({
            spacing: { before: 30, after: 20 },
            children: [
              new TextRun({ text: item.titulo, bold: true, size: 17, color: '1e3a8a', font: 'Arial' })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 120 },
            children: [
              new ImageRun({
                data: imgInfo.bytes,
                transformation: { width: imgInfo.width, height: imgInfo.height },
                type: 'png'
              })
            ]
          })
        );
        codeSlots++;
      }
    }
  }

  // -------------------------------------------------------------
  // PÁGINA FINAL: OBSERVACIONES, ASISTENCIA Y CALIFICACIÓN
  // -------------------------------------------------------------
  children.push(
    new Paragraph({
      pageBreakBefore: true,
      spacing: { before: 100, after: 120 },
      children: [
        new TextRun({
          text: 'OBSERVACIONES Y RECOMENDACIONES',
          bold: true,
          size: 22,
          color: '004b87',
          font: 'Arial'
        })
      ]
    }),
    new Paragraph({
      spacing: { after: 80 },
      children: [
        new TextRun({ text: 'DEL INSTRUCTOR:', bold: true, size: 19, font: 'Arial' })
      ]
    }),
    new Paragraph({
      spacing: { after: 180 },
      children: [
        new TextRun({ text: 'El estudiante cumple satisfactoriamente con los objetivos formativos y procedimentales de la sesión práctica.', size: 18, font: 'Arial', italic: true })
      ]
    }),
    new Paragraph({
      spacing: { before: 200, after: 120 },
      children: [
        new TextRun({
          text: 'AUTOCONTROL DE ASISTENCIA POR EL ESTUDIANTE',
          bold: true,
          size: 22,
          color: '004b87',
          font: 'Arial'
        })
      ]
    })
  );

  // Tabla de Asistencia Lunes a Sábado con X en Viernes (6 columnas: 1503 dxa x 4 + 1504 dxa x 2 = 9020 dxa)
  const asisCols = [1503, 1503, 1503, 1503, 1504, 1504];
  const asistenciaRows = [
    new TableRow({
      children: [
        createCell('LUNES', asisCols[0], true, true, '004b87', AlignmentType.CENTER),
        createCell('MARTES', asisCols[1], true, true, '004b87', AlignmentType.CENTER),
        createCell('MIÉRCOLES', asisCols[2], true, true, '004b87', AlignmentType.CENTER),
        createCell('JUEVES', asisCols[3], true, true, '004b87', AlignmentType.CENTER),
        createCell('VIERNES', asisCols[4], true, true, '004b87', AlignmentType.CENTER),
        createCell('SÁBADO', asisCols[5], true, true, '004b87', AlignmentType.CENTER)
      ]
    }),
    new TableRow({
      children: [
        createCell('', asisCols[0], false, false, 'ffffff', AlignmentType.CENTER),
        createCell('', asisCols[1], false, false, 'ffffff', AlignmentType.CENTER),
        createCell('', asisCols[2], false, false, 'ffffff', AlignmentType.CENTER),
        createCell('', asisCols[3], false, false, 'ffffff', AlignmentType.CENTER),
        createCell('X', asisCols[4], false, true, 'f1f5f9', AlignmentType.CENTER),
        createCell('', asisCols[5], false, false, 'ffffff', AlignmentType.CENTER)
      ]
    })
  ];

  children.push(
    new Table({
      width: { size: CONTENT_WIDTH_DXA, type: WidthType.DXA },
      columnWidths: asisCols,
      rows: asistenciaRows
    }),
    new Paragraph({ spacing: { before: 200, after: 120 } })
  );

  // Tabla de Evaluación y Firmas
  const evalCols = [4510, 4510];
  const evalRows = [
    new TableRow({
      children: [
        createCell('EVALUACIÓN DEL INFORME DE TRABAJO SEMANAL', evalCols[0] + evalCols[1], true, true, '004b87', AlignmentType.CENTER)
      ]
    }),
    new TableRow({
      children: [
        createCell('NOTA:', evalCols[0], false, true, 'f8fafc'),
        createCell('', evalCols[1], false, false, 'ffffff')
      ]
    }),
    new TableRow({
      children: [
        createCell('FIRMA DEL INSTRUCTOR:', evalCols[0], false, true, 'f8fafc'),
        createCell('FIRMA DEL APRENDIZ:', evalCols[1], false, true, 'f8fafc')
      ]
    }),
    new TableRow({
      children: [
        createCell('', evalCols[0], false, false, 'ffffff'),
        createCell('', evalCols[1], false, false, 'ffffff')
      ]
    })
  ];

  children.push(
    new Table({
      width: { size: CONTENT_WIDTH_DXA, type: WidthType.DXA },
      columnWidths: evalCols,
      rows: evalRows
    })
  );

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          size: { width: PAGE_WIDTH_DXA, height: PAGE_HEIGHT_DXA },
          margin: { top: MARGIN_DXA, bottom: MARGIN_DXA, left: MARGIN_DXA, right: MARGIN_DXA }
        }
      },
      children
    }]
  });

  return await downloadDocxBlob(doc, `Informe_Clase_Semana_${semNum}.docx`);
}

// =========================================================================
// 2. INFORME DE SEMINARIO DOCX (Exacto al PDF generateGuiaSimplePDF)
// =========================================================================
export async function generateInformeSeminarioDOCX(appData) {
  const semData = appData.informeSeminario || {};
  const wk = (appData.semanas && appData.semanas[appData.semanaActual || 1]) || {};

  const children = [];

  // -------------------------------------------------------------
  // PÁGINA 1: BANNER, DATOS, PLAN SEMANAL Y TAREA SIGNIFICATIVA
  // -------------------------------------------------------------
  // Banner institucional azul SENATI
  children.push(
    new Table({
      width: { size: CONTENT_WIDTH_DXA, type: WidthType.DXA },
      columnWidths: [CONTENT_WIDTH_DXA],
      rows: [
        new TableRow({
          children: [
            createCell('SENATI — INFORME DE SEMINARIO (GUÍA DE PRÁCTICA)', CONTENT_WIDTH_DXA, true, true, '0f3361', AlignmentType.LEFT, tableBordersThin, 22)
          ]
        })
      ]
    }),
    new Paragraph({ spacing: { after: 120 } })
  );

  // Ficha de Datos del Estudiante (Caja compacta 25% / 75% -> 2255 dxa / 6765 dxa)
  const metaCol1 = 2255;
  const metaCol2 = 6765;

  const metaRows = [
    new TableRow({
      children: [
        createCell('Estudiante:', metaCol1, false, true, 'f1f5f9', AlignmentType.LEFT, tableBordersSubtle),
        createCell(appData.estudiante || 'Rodrigo Daniel Ormeño Llanos', metaCol2, false, true, 'ffffff', AlignmentType.LEFT, tableBordersSubtle)
      ]
    }),
    new TableRow({
      children: [
        createCell('ID / Matrícula:', metaCol1, false, true, 'f1f5f9', AlignmentType.LEFT, tableBordersSubtle),
        createCell(appData.matricula || '001681961', metaCol2, false, false, 'ffffff', AlignmentType.LEFT, tableBordersSubtle)
      ]
    }),
    new TableRow({
      children: [
        createCell('Carrera:', metaCol1, false, true, 'f1f5f9', AlignmentType.LEFT, tableBordersSubtle),
        createCell(appData.carrera || 'Informática y Desarrollo de Aplicaciones Web', metaCol2, false, false, 'ffffff', AlignmentType.LEFT, tableBordersSubtle)
      ]
    }),
    new TableRow({
      children: [
        createCell('Bloque:', metaCol1, false, true, 'f1f5f9', AlignmentType.LEFT, tableBordersSubtle),
        createCell(appData.bloque || '406', metaCol2, false, false, 'ffffff', AlignmentType.LEFT, tableBordersSubtle)
      ]
    }),
    new TableRow({
      children: [
        createCell('Instructor:', metaCol1, false, true, 'f1f5f9', AlignmentType.LEFT, tableBordersSubtle),
        createCell(appData.instructor || 'Jorge Luque Chambi', metaCol2, false, false, 'ffffff', AlignmentType.LEFT, tableBordersSubtle)
      ]
    }),
    new TableRow({
      children: [
        createCell('Periodo:', metaCol1, false, true, 'f1f5f9', AlignmentType.LEFT, tableBordersSubtle),
        createCell((wk.fechaInicio && wk.fechaFin) ? `${wk.fechaInicio} al ${wk.fechaFin}` : 'Semanal / Mes', metaCol2, false, false, 'ffffff', AlignmentType.LEFT, tableBordersSubtle)
      ]
    })
  ];

  children.push(
    new Table({
      width: { size: CONTENT_WIDTH_DXA, type: WidthType.DXA },
      columnWidths: [metaCol1, metaCol2],
      rows: metaRows
    }),
    new Paragraph({ spacing: { after: 180 } })
  );

  // Tabla Plan Semanal de Trabajo (18% / 68% / 14% -> 1620 / 6140 / 1260 dxa)
  children.push(
    new Paragraph({
      spacing: { before: 100, after: 80 },
      children: [
        new TextRun({
          text: 'PLAN SEMANAL DE TRABAJO (DÍAS Y TAREAS DESARROLLADAS):',
          bold: true,
          size: 19,
          color: '0f3361',
          font: 'Arial'
        })
      ]
    })
  );

  const planCols = [1620, 6140, 1260];
  const diasList = [
    { key: 'lunes', name: 'Lunes' },
    { key: 'martes', name: 'Martes' },
    { key: 'miercoles', name: 'Miércoles' },
    { key: 'jueves', name: 'Jueves' },
    { key: 'viernes', name: 'Viernes' },
    { key: 'sabado', name: 'Sábado' }
  ];

  let totalHrs = 0;
  const planRows = [
    new TableRow({
      children: [
        createCell('DÍA', planCols[0], true, true, '1e4d8c'),
        createCell('TAREAS EJECUTADAS / OPERACIONES DE SOFTWARE', planCols[1], true, true, '1e4d8c'),
        createCell('HORAS', planCols[2], true, true, '1e4d8c', AlignmentType.CENTER)
      ]
    })
  ];

  diasList.forEach((d, i) => {
    const item = wk.dias && wk.dias[d.key] ? wk.dias[d.key] : { tarea: '', horas: 0 };
    totalHrs += Number(item.horas) || 0;
    const bg = i % 2 === 0 ? 'f8fafc' : 'ffffff';
    planRows.push(
      new TableRow({
        children: [
          createCell(d.name, planCols[0], false, true, bg, AlignmentType.LEFT, tableBordersSubtle),
          createCell(item.tarea || 'Sin actividades registradas.', planCols[1], false, false, bg, AlignmentType.LEFT, tableBordersSubtle),
          createCell(`${item.horas || 0} hrs`, planCols[2], false, false, bg, AlignmentType.CENTER, tableBordersSubtle)
        ]
      })
    );
  });

  planRows.push(
    new TableRow({
      children: [
        createCell('TOTAL HORAS:', planCols[0], false, true, 'e2e8f0', AlignmentType.LEFT, tableBordersSubtle),
        createCell('Total Horas Acumuladas en la Semana', planCols[1], false, true, 'e2e8f0', AlignmentType.LEFT, tableBordersSubtle),
        createCell(`${totalHrs} hrs`, planCols[2], false, true, 'e2e8f0', AlignmentType.CENTER, tableBordersSubtle)
      ]
    })
  );

  children.push(
    new Table({
      width: { size: CONTENT_WIDTH_DXA, type: WidthType.DXA },
      columnWidths: planCols,
      rows: planRows
    }),
    new Paragraph({ spacing: { after: 180 } })
  );

  // Tarea Más Significativa del Seminario
  const act1 = (semData.actividades && semData.actividades[1]) || {};
  const taskTitle = semData.tituloGlobal || act1.titulo || wk.tareaSignificativa?.titulo || 'Desarrollo de Aplicaciones Web y Soluciones Informáticas';
  const processDesc = semData.procesoGlobal || act1.descripcion || wk.tareaSignificativa?.proceso || 'Ejecución y desarrollo de las actividades técnicas del seminario.';

  children.push(
    new Paragraph({
      spacing: { before: 100, after: 60 },
      children: [
        new TextRun({
          text: 'TAREA MÁS SIGNIFICATIVA DEL SEMINARIO:',
          bold: true,
          size: 19,
          color: '0f3361',
          font: 'Arial'
        })
      ]
    }),
    new Paragraph({
      spacing: { after: 60 },
      children: [
        new TextRun({ text: taskTitle, bold: true, size: 18, font: 'Arial', color: '1e293b' })
      ]
    }),
    new Paragraph({
      spacing: { before: 60, after: 40 },
      children: [
        new TextRun({ text: 'Descripción del Proceso Técnico:', bold: true, size: 18, font: 'Arial', color: '334155' })
      ]
    })
  );

  const pLines = processDesc.split('\n');
  for (const line of pLines) {
    if (line.trim()) {
      children.push(
        new Paragraph({
          spacing: { after: 80 },
          children: [
            new TextRun({ text: line.trim(), size: 17, font: 'Arial', color: '1e293b' })
          ]
        })
      );
    }
  }

  // -------------------------------------------------------------
  // PÁGINAS DE CAPTURAS: EXACTO AL PDF DE GUÍA SIMPLE (2 POR PÁGINA)
  // -------------------------------------------------------------
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

  let guidePageNum = 1;

  function addGuideBanner(pageBreak = true) {
    guidePageNum++;
    return [
      new Table({
        width: { size: CONTENT_WIDTH_DXA, type: WidthType.DXA },
        columnWidths: [CONTENT_WIDTH_DXA],
        rows: [
          new TableRow({
            children: [
              createCell(`EVIDENCIAS VISUALES — GUÍA DE PRÁCTICA (Pág. ${guidePageNum})`, CONTENT_WIDTH_DXA, true, true, '0f3361', AlignmentType.LEFT, tableBordersThin, 20)
            ]
          })
        ]
      }),
      new Paragraph({ spacing: { after: 120 } })
    ];
  }

  let isFirstGuideCapturaPage = true;

  // 1. Web
  if (webEvidencias.length > 0) {
    children.push(
      new Paragraph({ pageBreakBefore: true, spacing: { before: 60 } }),
      ...addGuideBanner(false)
    );
    isFirstGuideCapturaPage = false;

    children.push(
      new Paragraph({
        spacing: { before: 40, after: 60 },
        children: [
          new TextRun({ text: 'Web (Interfaz de Usuario):', bold: true, size: 22, color: '0f3361', font: 'Arial' })
        ]
      })
    );

    let gWebSlots = 0;
    for (let i = 0; i < webEvidencias.length; i++) {
      const item = webEvidencias[i];
      if (gWebSlots >= 2) {
        children.push(
          new Paragraph({ pageBreakBefore: true, spacing: { before: 60 } }),
          ...addGuideBanner(false)
        );
        gWebSlots = 0;
      }

      const imgInfo = await prepareImageForDocx(item.dataUrl);
      if (imgInfo) {
        children.push(
          new Paragraph({
            spacing: { before: 30, after: 20 },
            children: [
              new TextRun({ text: item.titulo, bold: true, size: 17, color: '1e3a8a', font: 'Arial' })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 120 },
            children: [
              new ImageRun({
                data: imgInfo.bytes,
                transformation: { width: imgInfo.width, height: imgInfo.height },
                type: 'png'
              })
            ]
          })
        );
        gWebSlots++;
      }
    }
  }

  // 2. Código
  if (codeEvidencias.length > 0) {
    children.push(
      new Paragraph({ pageBreakBefore: true, spacing: { before: 60 } }),
      ...addGuideBanner(false)
    );

    children.push(
      new Paragraph({
        spacing: { before: 40, after: 60 },
        children: [
          new TextRun({ text: 'Código Fuente (CodeSnap):', bold: true, size: 22, color: '0f3361', font: 'Arial' })
        ]
      })
    );

    let gCodeSlots = 0;
    for (let i = 0; i < codeEvidencias.length; i++) {
      const item = codeEvidencias[i];
      if (gCodeSlots >= 2) {
        children.push(
          new Paragraph({ pageBreakBefore: true, spacing: { before: 60 } }),
          ...addGuideBanner(false)
        );
        gCodeSlots = 0;
      }

      const imgInfo = await prepareImageForDocx(item.dataUrl);
      if (imgInfo) {
        children.push(
          new Paragraph({
            spacing: { before: 30, after: 20 },
            children: [
              new TextRun({ text: item.titulo, bold: true, size: 17, color: '1e3a8a', font: 'Arial' })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 120 },
            children: [
              new ImageRun({
                data: imgInfo.bytes,
                transformation: { width: imgInfo.width, height: imgInfo.height },
                type: 'png'
              })
            ]
          })
        );
        gCodeSlots++;
      }
    }
  }

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          size: { width: PAGE_WIDTH_DXA, height: PAGE_HEIGHT_DXA },
          margin: { top: MARGIN_DXA, bottom: MARGIN_DXA, left: MARGIN_DXA, right: MARGIN_DXA }
        }
      },
      children
    }]
  });

  return await downloadDocxBlob(doc, 'Guia_Informe_Seminario.docx');
}

// =========================================================================
// 3. INFORME DE EMPRESA DOCX (Exacto al formato de Empresa Dual Quincenal)
// =========================================================================
export async function generateInformeEmpresaDOCX(appData) {
  const q = appData.quincenaActual || 1;
  const semA = (q - 1) * 2 + 1;
  const semB = (q - 1) * 2 + 2;
  const wkA = (appData.semanas && appData.semanas[semA]) || {};
  const wkB = (appData.semanas && appData.semanas[semB]) || {};
  const empData = (appData.informesEmpresa && appData.informesEmpresa[q]) || {};

  const children = [];

  // Banner superior
  children.push(
    new Table({
      width: { size: CONTENT_WIDTH_DXA, type: WidthType.DXA },
      columnWidths: [CONTENT_WIDTH_DXA],
      rows: [
        new TableRow({
          children: [
            createCell(`SENATI — INFORME DE FORMACIÓN PRÁCTICA EN EMPRESA (QUINCENA N° ${q})`, CONTENT_WIDTH_DXA, true, true, '004b87', AlignmentType.LEFT, tableBordersThin, 21)
          ]
        })
      ]
    }),
    new Paragraph({ spacing: { after: 120 } })
  );

  // Tabla de Identificación Empresa (30% / 70% -> 2700 / 6320 dxa)
  const empCol1 = 2700;
  const empCol2 = 6320;

  const empIdRows = [
    new TableRow({
      children: [
        createCell('Estudiante:', empCol1, false, true, 'f1f5f9', AlignmentType.LEFT, tableBordersSubtle),
        createCell(appData.estudiante || 'Rodrigo Daniel Ormeño Llanos', empCol2, false, true, 'ffffff', AlignmentType.LEFT, tableBordersSubtle)
      ]
    }),
    new TableRow({
      children: [
        createCell('Carrera / Semestre:', empCol1, false, true, 'f1f5f9', AlignmentType.LEFT, tableBordersSubtle),
        createCell(`${appData.carrera || 'Informática y Desarrollo Web'} — ${appData.semestre || '4to Ciclo'}`, empCol2, false, false, 'ffffff', AlignmentType.LEFT, tableBordersSubtle)
      ]
    }),
    new TableRow({
      children: [
        createCell('Empresa Formadora:', empCol1, false, true, 'f1f5f9', AlignmentType.LEFT, tableBordersSubtle),
        createCell(appData.empresa || 'Empresa Patrocinadora', empCol2, false, false, 'ffffff', AlignmentType.LEFT, tableBordersSubtle)
      ]
    }),
    new TableRow({
      children: [
        createCell('Área de Práctica:', empCol1, false, true, 'f1f5f9', AlignmentType.LEFT, tableBordersSubtle),
        createCell(appData.area || 'Departamento de TI / Desarrollo de Software', empCol2, false, false, 'ffffff', AlignmentType.LEFT, tableBordersSubtle)
      ]
    }),
    new TableRow({
      children: [
        createCell('Monitor de Empresa:', empCol1, false, true, 'f1f5f9', AlignmentType.LEFT, tableBordersSubtle),
        createCell(appData.monitor || 'Monitor Técnico', empCol2, false, false, 'ffffff', AlignmentType.LEFT, tableBordersSubtle)
      ]
    }),
    new TableRow({
      children: [
        createCell('Instructor SENATI:', empCol1, false, true, 'f1f5f9', AlignmentType.LEFT, tableBordersSubtle),
        createCell(appData.instructor || 'Jorge Luque Chambi', empCol2, false, false, 'ffffff', AlignmentType.LEFT, tableBordersSubtle)
      ]
    }),
    new TableRow({
      children: [
        createCell('Periodo Quincenal:', empCol1, false, true, 'f1f5f9', AlignmentType.LEFT, tableBordersSubtle),
        createCell(`${wkA.fechaInicio || 'Inicio'} al ${wkB.fechaFin || wkA.fechaFin || 'Fin'}`, empCol2, false, false, 'ffffff', AlignmentType.LEFT, tableBordersSubtle)
      ]
    })
  ];

  children.push(
    new Table({
      width: { size: CONTENT_WIDTH_DXA, type: WidthType.DXA },
      columnWidths: [empCol1, empCol2],
      rows: empIdRows
    }),
    new Paragraph({ spacing: { after: 180 } })
  );

  // Plan Semanal de Ambas Semanas
  const qCols = [1400, 3200, 910, 2600, 910];
  const dias = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
  const diasNombres = { lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles', jueves: 'Jueves', viernes: 'Viernes', sabado: 'Sábado' };

  let totalA = 0;
  let totalB = 0;

  const planQRows = [
    new TableRow({
      children: [
        createCell('DÍA', qCols[0], true, true, '004b87'),
        createCell(`SEMANA ${semA} — TAREAS`, qCols[1], true, true, '004b87'),
        createCell('HRS', qCols[2], true, true, '004b87', AlignmentType.CENTER),
        createCell(`SEMANA ${semB} — TAREAS`, qCols[3], true, true, '004b87'),
        createCell('HRS', qCols[4], true, true, '004b87', AlignmentType.CENTER)
      ]
    })
  ];

  dias.forEach((d, i) => {
    const itemA = wkA.dias && wkA.dias[d] ? wkA.dias[d] : { tarea: '', horas: 0 };
    const itemB = wkB.dias && wkB.dias[d] ? wkB.dias[d] : { tarea: '', horas: 0 };
    totalA += Number(itemA.horas) || 0;
    totalB += Number(itemB.horas) || 0;
    const bg = i % 2 === 0 ? 'f8fafc' : 'ffffff';

    planQRows.push(
      new TableRow({
        children: [
          createCell(diasNombres[d], qCols[0], false, true, bg, AlignmentType.LEFT, tableBordersSubtle),
          createCell(itemA.tarea || '-', qCols[1], false, false, bg, AlignmentType.LEFT, tableBordersSubtle),
          createCell(`${itemA.horas || 0}h`, qCols[2], false, false, bg, AlignmentType.CENTER, tableBordersSubtle),
          createCell(itemB.tarea || '-', qCols[3], false, false, bg, AlignmentType.LEFT, tableBordersSubtle),
          createCell(`${itemB.horas || 0}h`, qCols[4], false, false, bg, AlignmentType.CENTER, tableBordersSubtle)
        ]
      })
    );
  });

  planQRows.push(
    new TableRow({
      children: [
        createCell('TOTALES:', qCols[0], false, true, 'e2e8f0', AlignmentType.LEFT, tableBordersSubtle),
        createCell(`Total Sem ${semA}: ${totalA} hrs`, qCols[1] + qCols[2], false, true, 'e2e8f0', AlignmentType.LEFT, tableBordersSubtle),
        createCell(`Total Sem ${semB}: ${totalB} hrs`, qCols[3] + qCols[4], false, true, 'e2e8f0', AlignmentType.LEFT, tableBordersSubtle)
      ]
    })
  );

  children.push(
    new Paragraph({
      spacing: { before: 100, after: 80 },
      children: [
        new TextRun({
          text: `PLAN DE TRABAJO QUINCENAL (TOTAL: ${totalA + totalB} HORAS)`,
          bold: true,
          size: 19,
          color: '004b87',
          font: 'Arial'
        })
      ]
    }),
    new Table({
      width: { size: CONTENT_WIDTH_DXA, type: WidthType.DXA },
      columnWidths: qCols,
      rows: planQRows
    }),
    new Paragraph({ spacing: { after: 180 } })
  );

  // Tarea de Quincena
  children.push(
    new Paragraph({
      spacing: { before: 100, after: 60 },
      children: [
        new TextRun({
          text: 'TAREA / PROYECTO PRINCIPAL DE LA QUINCENA',
          bold: true,
          size: 19,
          color: '004b87',
          font: 'Arial'
        })
      ]
    }),
    new Paragraph({
      spacing: { after: 60 },
      children: [
        new TextRun({ text: 'Denominación: ', bold: true, size: 18, font: 'Arial', color: '0284c7' }),
        new TextRun({ text: empData.titulo || 'Desarrollo de Soluciones de Software', size: 18, font: 'Arial' })
      ]
    }),
    new Paragraph({
      spacing: { after: 80 },
      children: [
        new TextRun({ text: 'Descripción del Proceso: ', bold: true, size: 18, font: 'Arial', color: '0284c7' }),
        new TextRun({ text: empData.proceso || 'Desarrollo de operaciones técnicas en empresa.', size: 17, font: 'Arial' })
      ]
    }),
    new Paragraph({
      spacing: { after: 60 },
      children: [
        new TextRun({ text: 'Normas de Seguridad y Ergonomía: ', bold: true, size: 18, font: 'Arial', color: '0284c7' }),
        new TextRun({ text: empData.seguridad || 'Cumplimiento de pausas activas y postura ergonómica.', size: 17, font: 'Arial' })
      ]
    }),
    new Paragraph({
      spacing: { after: 140 },
      children: [
        new TextRun({ text: 'Herramientas y Software Utilizado: ', bold: true, size: 18, font: 'Arial', color: '0284c7' }),
        new TextRun({ text: empData.herramientas || 'VS Code, Git, Angular, Node.js, SQL.', size: 17, font: 'Arial' })
      ]
    })
  );

  // Evaluación del Monitor (50% / 50% -> 4510 / 4510 dxa)
  const evalCols = [4510, 4510];
  const evalRows = [
    new TableRow({
      children: [
        createCell('Criterio de Evaluación', evalCols[0], true, true, '004b87'),
        createCell('Calificación / Estado', evalCols[1], true, true, '004b87')
      ]
    }),
    new TableRow({
      children: [
        createCell('Asistencia y Puntualidad:', evalCols[0], false, true, 'f8fafc', AlignmentType.LEFT, tableBordersSubtle),
        createCell(empData.asistencia || 'Excelente', evalCols[1], false, false, 'f8fafc', AlignmentType.LEFT, tableBordersSubtle)
      ]
    }),
    new TableRow({
      children: [
        createCell('Normas de Seguridad y Ergonomía:', evalCols[0], false, true, 'ffffff', AlignmentType.LEFT, tableBordersSubtle),
        createCell(empData.seguridadEmpresa || 'Cumple', evalCols[1], false, false, 'ffffff', AlignmentType.LEFT, tableBordersSubtle)
      ]
    }),
    new TableRow({
      children: [
        createCell('Desempeño y Calidad Técnica:', evalCols[0], false, true, 'f8fafc', AlignmentType.LEFT, tableBordersSubtle),
        createCell(empData.calidad || 'Excelente', evalCols[1], false, false, 'f8fafc', AlignmentType.LEFT, tableBordersSubtle)
      ]
    }),
    new TableRow({
      children: [
        createCell('Observaciones del Monitor:', evalCols[0], false, true, 'ffffff', AlignmentType.LEFT, tableBordersSubtle),
        createCell(empData.observaciones || 'Desempeño destacado y proactivo.', evalCols[1], false, false, 'ffffff', AlignmentType.LEFT, tableBordersSubtle)
      ]
    })
  ];

  children.push(
    new Paragraph({
      spacing: { before: 140, after: 80 },
      children: [
        new TextRun({
          text: 'EVALUACIÓN DEL MONITOR DE EMPRESA',
          bold: true,
          size: 19,
          color: '004b87',
          font: 'Arial'
        })
      ]
    }),
    new Table({
      width: { size: CONTENT_WIDTH_DXA, type: WidthType.DXA },
      columnWidths: evalCols,
      rows: evalRows
    })
  );

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          size: { width: PAGE_WIDTH_DXA, height: PAGE_HEIGHT_DXA },
          margin: { top: MARGIN_DXA, bottom: MARGIN_DXA, left: MARGIN_DXA, right: MARGIN_DXA }
        }
      },
      children
    }]
  });

  return await downloadDocxBlob(doc, `Informe_Empresa_Quincena_${q}.docx`);
}

// Master Dispatcher
export async function generateReportDOCX(appData) {
  const modo = appData.modoFormato;
  if (modo === 'seminario') {
    return await generateInformeClaseDOCX(appData);
  } else if (modo === 'empresa') {
    return await generateInformeEmpresaDOCX(appData);
  } else {
    return await generateInformeSeminarioDOCX(appData);
  }
}

async function downloadDocxBlob(doc, filename) {
  const blob = await Packer.toBlob(doc);
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  return blobUrl;
}
