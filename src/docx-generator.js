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
  HeadingLevel,
  ImageRun,
  ShadingType,
  UnderlineType
} from 'docx';

function dataUrlToUint8Array(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') return null;
  const parts = dataUrl.split(',');
  if (parts.length < 2) return null;
  const base64 = parts[1];
  try {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  } catch (e) {
    console.warn('Error converting dataURL to bytes:', e);
    return null;
  }
}

async function getImageDimensions(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth || img.width || 800, height: img.naturalHeight || img.height || 450 });
    };
    img.onerror = () => resolve({ width: 800, height: 450 });
    img.src = dataUrl;
  });
}

const tableBordersThin = {
  top: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
  left: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
  right: { style: BorderStyle.SINGLE, size: 4, color: '000000' }
};

const tableBordersLight = {
  top: { style: BorderStyle.SINGLE, size: 2, color: 'cbd5e1' },
  bottom: { style: BorderStyle.SINGLE, size: 2, color: 'cbd5e1' },
  left: { style: BorderStyle.SINGLE, size: 2, color: 'cbd5e1' },
  right: { style: BorderStyle.SINGLE, size: 2, color: 'cbd5e1' }
};

function createCell(text, widthPct = null, isHeader = false, isBold = false, bgHex = null, align = AlignmentType.LEFT) {
  return new TableCell({
    width: widthPct ? { size: widthPct, type: WidthType.PERCENTAGE } : undefined,
    shading: bgHex ? { fill: bgHex, type: ShadingType.CLEAR } : (isHeader ? { fill: '004b87', type: ShadingType.CLEAR } : undefined),
    margins: { top: 100, bottom: 100, left: 120, right: 120 },
    borders: tableBordersThin,
    children: [
      new Paragraph({
        alignment: align,
        spacing: { before: 20, after: 20 },
        children: [
          new TextRun({
            text: String(text ?? ''),
            bold: isHeader || isBold,
            color: isHeader ? 'FFFFFF' : '000000',
            size: isHeader ? 19 : 18,
            font: 'Arial'
          })
        ]
      })
    ]
  });
}

// =========================================================================
// 1. INFORME DE CLASE DOCX (Exacto al PDF Oficial SENATI)
// =========================================================================
export async function generateInformeClaseDOCX(appData) {
  const semData = appData.informeSeminario || {};
  const wk = (appData.semanas && appData.semanas[appData.semanaActual || 1]) || {};
  const act1 = (semData.actividades && semData.actividades[1]) || {};

  const taskTitle = semData.tituloGlobal || act1.titulo || 'Desarrollo de Aplicaciones Web y Soluciones Informáticas';
  let processDesc = semData.procesoGlobal || act1.descripcion || 'Ejecución y desarrollo de las actividades técnicas programadas para la sesión práctica.';

  const children = [];

  // -------------------------------------------------------------
  // PÁGINA 1: PORTADA OFICIAL SENATI
  // -------------------------------------------------------------
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 100 },
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
      spacing: { after: 120 },
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
      spacing: { before: 400, after: 120 },
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
      spacing: { after: 600 },
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
      spacing: { before: 400, after: 60 },
      children: [
        new TextRun({ text: 'Estudiante: ', bold: true, size: 20, font: 'Arial' }),
        new TextRun({ text: appData.estudiante || 'Rodrigo Daniel Ormeño Llanos', size: 20, font: 'Arial' })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [
        new TextRun({ text: 'ID / Matrícula: ', bold: true, size: 20, font: 'Arial' }),
        new TextRun({ text: appData.matricula || '001681961', size: 20, font: 'Arial' })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [
        new TextRun({ text: 'Carrera: ', bold: true, size: 20, font: 'Arial' }),
        new TextRun({ text: appData.carrera || 'Informática y Desarrollo de Aplicaciones Web', size: 20, font: 'Arial' })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [
        new TextRun({ text: 'Bloque / Grupo: ', bold: true, size: 20, font: 'Arial' }),
        new TextRun({ text: appData.bloque || '406', size: 20, font: 'Arial' })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [
        new TextRun({ text: 'Instructor: ', bold: true, size: 20, font: 'Arial' }),
        new TextRun({ text: appData.instructor || 'Jorge Luque Chambi', size: 20, font: 'Arial' })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
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

  const idRows = [
    new TableRow({
      children: [
        createCell('DIRECCIÓN ZONAL / CFP:', 35, false, true, 'f1f5f9'),
        createCell(appData.escuela || 'ETI (Escuela de Tecnologías de la Información)', 65)
      ]
    }),
    new TableRow({
      children: [
        createCell('CARRERA:', 35, false, true, 'f1f5f9'),
        createCell(appData.carrera || 'Informática y Desarrollo de Aplicaciones Web', 65)
      ]
    }),
    new TableRow({
      children: [
        createCell('APELLIDOS Y NOMBRES:', 35, false, true, 'f1f5f9'),
        createCell(appData.estudiante || 'Rodrigo Daniel Ormeño Llanos', 65, false, true)
      ]
    }),
    new TableRow({
      children: [
        createCell('ID / MATRÍCULA:', 35, false, true, 'f1f5f9'),
        createCell(appData.matricula || '001681961', 65)
      ]
    }),
    new TableRow({
      children: [
        createCell('BLOQUE / GRUPO:', 35, false, true, 'f1f5f9'),
        createCell(appData.bloque || '406', 65)
      ]
    }),
    new TableRow({
      children: [
        createCell('INSTRUCTOR:', 35, false, true, 'f1f5f9'),
        createCell(appData.instructor || 'Jorge Luque Chambi', 65)
      ]
    }),
    new TableRow({
      children: [
        createCell('SEMESTRE:', 35, false, true, 'f1f5f9'),
        createCell(appData.semestre || '4to Ciclo', 65)
      ]
    }),
    new TableRow({
      children: [
        createCell('PERIODO / FECHA:', 35, false, true, 'f1f5f9'),
        createCell((wk.fechaInicio && wk.fechaFin) ? `${wk.fechaInicio} al ${wk.fechaFin}` : 'Viernes lectivo', 65)
      ]
    })
  ];

  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: idRows
    }),
    new Paragraph({ spacing: { after: 300 } })
  );

  // -------------------------------------------------------------
  // PÁGINA 3: INFORME DE TAREA MÁS SIGNIFICATIVA (PÁGINA 4 EN PDF)
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
      spacing: { before: 100, after: 60 },
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

  // Párrafos de la descripción del proceso
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
  // PÁGINAS DE CAPTURAS: EXACTO AL PDF (2 CAPTURAS GRANDES POR PÁGINA)
  // -------------------------------------------------------------
  const webEvidencias = [];
  const codeEvidencias = [];

  if (act1.imgUi) {
    webEvidencias.push({ titulo: act1.urlUi || 'http://localhost:4200/', dataUrl: act1.imgUi });
  }
  if (act1.extras) {
    act1.extras.forEach(ex => {
      if (ex.tipo === 'ui' && ex.img) {
        webEvidencias.push({ titulo: ex.tag || 'http://localhost:4200/', dataUrl: ex.img });
      }
    });
  }

  if (act1.imgCodigo) {
    codeEvidencias.push({ titulo: act1.tagCodigo || 'codigo.ts', dataUrl: act1.imgCodigo });
  }
  if (act1.extras) {
    act1.extras.forEach(ex => {
      if (ex.tipo === 'codigo' && ex.img) {
        codeEvidencias.push({ titulo: ex.tag || 'codigo.ts', dataUrl: ex.img });
      }
    });
  }

  let isFirstCapturasPage = true;

  function addCapturasHeader(pageBreak = true, isCont = false, contNum = 1) {
    return [
      new Paragraph({
        pageBreakBefore: pageBreak,
        alignment: AlignmentType.CENTER,
        spacing: { before: 100, after: 160 },
        children: [
          new TextRun({
            text: isCont ? `Esquema, dibujo, capturas (Cont. ${contNum})` : 'HACER ESQUEMA, DIBUJO O DIAGRAMA',
            bold: true,
            size: 21,
            color: '004b87',
            font: 'Arial'
          })
        ]
      })
    ];
  }

  // 1. DIBUJAR TODAS LAS CAPTURAS DE WEB (2 POR HOJA)
  if (webEvidencias.length > 0) {
    children.push(...addCapturasHeader(true, false));
    isFirstCapturasPage = false;

    children.push(
      new Paragraph({
        spacing: { before: 60, after: 80 },
        children: [
          new TextRun({ text: 'Web:', bold: true, size: 24, color: '000000', font: 'Arial' })
        ]
      })
    );

    let webSlotsOnPage = 0;
    let webContCount = 1;

    for (let i = 0; i < webEvidencias.length; i++) {
      const item = webEvidencias[i];
      if (webSlotsOnPage >= 2) {
        children.push(...addCapturasHeader(true, true, webContCount++));
        webSlotsOnPage = 0;
      }

      const bytes = dataUrlToUint8Array(item.dataUrl);
      if (bytes) {
        const dims = await getImageDimensions(item.dataUrl);
        const scale = Math.min(560 / dims.width, 320 / dims.height, 1);
        const dw = Math.round(dims.width * scale);
        const dh = Math.round(dims.height * scale);

        children.push(
          new Paragraph({
            spacing: { before: 40, after: 30 },
            children: [
              new TextRun({ text: item.titulo, bold: true, size: 17, color: '1e3a8a', font: 'Arial' })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 140 },
            children: [
              new ImageRun({
                data: bytes,
                transformation: { width: dw, height: dh }
              })
            ]
          })
        );
        webSlotsOnPage++;
      }
    }
  }

  // 2. DIBUJAR TODAS LAS CAPTURAS DE CÓDIGO (2 POR HOJA)
  if (codeEvidencias.length > 0) {
    children.push(...addCapturasHeader(true, !isFirstCapturasPage, 2));

    children.push(
      new Paragraph({
        spacing: { before: 60, after: 80 },
        children: [
          new TextRun({ text: 'Código:', bold: true, size: 24, color: '000000', font: 'Arial' })
        ]
      })
    );

    let codeSlotsOnPage = 0;
    let codeContCount = 3;

    for (let i = 0; i < codeEvidencias.length; i++) {
      const item = codeEvidencias[i];
      if (codeSlotsOnPage >= 2) {
        children.push(...addCapturasHeader(true, true, codeContCount++));
        codeSlotsOnPage = 0;
      }

      const bytes = dataUrlToUint8Array(item.dataUrl);
      if (bytes) {
        const dims = await getImageDimensions(item.dataUrl);
        const scale = Math.min(560 / dims.width, 320 / dims.height, 1);
        const dw = Math.round(dims.width * scale);
        const dh = Math.round(dims.height * scale);

        children.push(
          new Paragraph({
            spacing: { before: 40, after: 30 },
            children: [
              new TextRun({ text: item.titulo, bold: true, size: 17, color: '1e3a8a', font: 'Arial' })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 140 },
            children: [
              new ImageRun({
                data: bytes,
                transformation: { width: dw, height: dh }
              })
            ]
          })
        );
        codeSlotsOnPage++;
      }
    }
  }

  // -------------------------------------------------------------
  // PÁGINA FINAL: OBSERVACIONES, RECOMENDACIONES Y ASISTENCIA
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

  // Tabla de Asistencia Lunes a Sábado con X en Viernes
  const asistenciaRows = [
    new TableRow({
      children: [
        createCell('LUNES', 16.6, true, true, '004b87', AlignmentType.CENTER),
        createCell('MARTES', 16.6, true, true, '004b87', AlignmentType.CENTER),
        createCell('MIÉRCOLES', 16.6, true, true, '004b87', AlignmentType.CENTER),
        createCell('JUEVES', 16.6, true, true, '004b87', AlignmentType.CENTER),
        createCell('VIERNES', 16.6, true, true, '004b87', AlignmentType.CENTER),
        createCell('SÁBADO', 16.6, true, true, '004b87', AlignmentType.CENTER)
      ]
    }),
    new TableRow({
      children: [
        createCell('', 16.6, false, false, 'ffffff', AlignmentType.CENTER),
        createCell('', 16.6, false, false, 'ffffff', AlignmentType.CENTER),
        createCell('', 16.6, false, false, 'ffffff', AlignmentType.CENTER),
        createCell('', 16.6, false, false, 'ffffff', AlignmentType.CENTER),
        createCell('X', 16.6, false, true, 'f1f5f9', AlignmentType.CENTER),
        createCell('', 16.6, false, false, 'ffffff', AlignmentType.CENTER)
      ]
    })
  ];

  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: asistenciaRows
    })
  );

  const doc = new Document({
    sections: [{ children }]
  });

  return await downloadDocxBlob(doc, 'Informe_Clase_Semanal.docx');
}

// =========================================================================
// 2. INFORME DE SEMINARIO DOCX (Guía de Práctica / Plan Semanal + 4 Actividades)
// =========================================================================
export async function generateInformeSeminarioDOCX(appData) {
  const semData = appData.informeSeminario || {};
  const wk = (appData.semanas && appData.semanas[appData.semanaActual || 1]) || {};

  const children = [];

  // -------------------------------------------------------------
  // PÁGINA 1: DATOS, PLAN SEMANAL Y TAREA SIGNIFICATIVA
  // -------------------------------------------------------------
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 80, after: 60 },
      children: [
        new TextRun({
          text: 'SERVICIO NACIONAL DE ADIESTRAMIENTO EN TRABAJO INDUSTRIAL',
          bold: true,
          size: 22,
          color: '004b87',
          font: 'Arial'
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 180 },
      children: [
        new TextRun({
          text: 'INFORME DE SEMINARIO — GUÍA DE PRÁCTICA',
          bold: true,
          size: 24,
          color: '0284c7',
          font: 'Arial'
        })
      ]
    })
  );

  // Ficha de Datos del Estudiante
  const metaRows = [
    new TableRow({
      children: [
        createCell('Estudiante:', 25, false, true, 'f1f5f9'),
        createCell(appData.estudiante || 'Rodrigo Daniel Ormeño Llanos', 75, false, true)
      ]
    }),
    new TableRow({
      children: [
        createCell('ID / Matrícula:', 25, false, true, 'f1f5f9'),
        createCell(appData.matricula || '001681961', 75)
      ]
    }),
    new TableRow({
      children: [
        createCell('Carrera:', 25, false, true, 'f1f5f9'),
        createCell(appData.carrera || 'Informática y Desarrollo de Aplicaciones Web', 75)
      ]
    }),
    new TableRow({
      children: [
        createCell('Semestre / Ciclo:', 25, false, true, 'f1f5f9'),
        createCell(appData.semestre || '4° Ciclo', 75)
      ]
    }),
    new TableRow({
      children: [
        createCell('CFP / Escuela:', 25, false, true, 'f1f5f9'),
        createCell(appData.escuela || 'ETI (Escuela de Tecnologías de la Información)', 75)
      ]
    }),
    new TableRow({
      children: [
        createCell('Bloque:', 25, false, true, 'f1f5f9'),
        createCell(appData.bloque || '406', 75)
      ]
    }),
    new TableRow({
      children: [
        createCell('Instructor:', 25, false, true, 'f1f5f9'),
        createCell(appData.instructor || 'Jorge Luque Chambi', 75)
      ]
    }),
    new TableRow({
      children: [
        createCell('Periodo:', 25, false, true, 'f1f5f9'),
        createCell((wk.fechaInicio && wk.fechaFin) ? `${wk.fechaInicio} al ${wk.fechaFin}` : 'Semanal / Mes', 75)
      ]
    })
  ];

  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: metaRows
    }),
    new Paragraph({ spacing: { after: 180 } })
  );

  // Tabla Plan Semanal de Trabajo
  children.push(
    new Paragraph({
      spacing: { before: 140, after: 100 },
      children: [
        new TextRun({
          text: 'PLAN SEMANAL DE TRABAJO (DÍAS Y TAREAS DESARROLLADAS):',
          bold: true,
          size: 20,
          color: '004b87',
          font: 'Arial'
        })
      ]
    })
  );

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
        createCell('DÍA', 18, true),
        createCell('TAREAS EJECUTADAS / OPERACIONES DE SOFTWARE', 68, true),
        createCell('HORAS', 14, true, false, null, AlignmentType.CENTER)
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
          createCell(d.name, 18, false, true, bg),
          createCell(item.tarea || 'Sin actividades registradas.', 68, false, false, bg),
          createCell(`${item.horas || 0} hrs`, 14, false, false, bg, AlignmentType.CENTER)
        ]
      })
    );
  });

  planRows.push(
    new TableRow({
      children: [
        createCell('TOTAL HORAS:', 18, false, true, 'e2e8f0'),
        createCell('Horas Formativas Acumuladas en la Semana', 68, false, true, 'e2e8f0'),
        createCell(`${totalHrs} hrs`, 14, false, true, 'e2e8f0', AlignmentType.CENTER)
      ]
    })
  );

  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
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
      spacing: { before: 140, after: 80 },
      children: [
        new TextRun({
          text: 'TAREA MÁS SIGNIFICATIVA DEL SEMINARIO:',
          bold: true,
          size: 20,
          color: '004b87',
          font: 'Arial'
        })
      ]
    }),
    new Paragraph({
      spacing: { after: 80 },
      children: [
        new TextRun({ text: 'Denominación: ', bold: true, size: 19, font: 'Arial', color: '0284c7' }),
        new TextRun({ text: taskTitle, size: 19, font: 'Arial' })
      ]
    }),
    new Paragraph({
      spacing: { after: 140 },
      children: [
        new TextRun({ text: 'Descripción del Proceso Técnico: ', bold: true, size: 19, font: 'Arial', color: '0284c7' }),
        new TextRun({ text: processDesc, size: 18, font: 'Arial' })
      ]
    })
  );

  // -------------------------------------------------------------
  // PÁGINA 2+: EVIDENCIAS VISUALES (4 ACTIVIDADES DEL MES)
  // -------------------------------------------------------------
  children.push(
    new Paragraph({
      pageBreakBefore: true,
      alignment: AlignmentType.CENTER,
      spacing: { before: 100, after: 160 },
      children: [
        new TextRun({
          text: 'EVIDENCIAS VISUALES — GUÍA DE PRÁCTICA (4 ACTIVIDADES)',
          bold: true,
          size: 22,
          color: '004b87',
          font: 'Arial'
        })
      ]
    })
  );

  for (let i = 1; i <= 4; i++) {
    const act = semData.actividades && semData.actividades[i];
    if (!act) continue;

    children.push(
      new Paragraph({
        spacing: { before: 180, after: 60 },
        children: [
          new TextRun({
            text: `Actividad ${i}: ${act.titulo || 'Sin título'}`,
            bold: true,
            size: 20,
            color: '004b87',
            font: 'Arial'
          })
        ]
      })
    );

    if (act.descripcion && act.descripcion.trim()) {
      children.push(
        new Paragraph({
          spacing: { after: 100 },
          children: [
            new TextRun({ text: act.descripcion.trim(), italic: true, size: 18, font: 'Arial', color: '334155' })
          ]
        })
      );
    }

    // Capturas Web
    const webList = [];
    if (act.imgUi) {
      webList.push({ tag: act.urlUi || 'http://localhost:4200/', img: act.imgUi });
    }
    if (act.extras) {
      act.extras.forEach(ex => {
        if (ex.tipo === 'ui' && ex.img) {
          webList.push({ tag: ex.tag || 'http://localhost:4200/', img: ex.img });
        }
      });
    }

    if (webList.length > 0) {
      children.push(
        new Paragraph({
          spacing: { before: 60, after: 40 },
          children: [
            new TextRun({ text: 'Web (Interfaz de Usuario):', bold: true, size: 18, color: '0284c7', font: 'Arial' })
          ]
        })
      );

      for (const w of webList) {
        const bytes = dataUrlToUint8Array(w.img);
        if (bytes) {
          const dims = await getImageDimensions(w.img);
          const scale = Math.min(560 / dims.width, 320 / dims.height, 1);
          const dw = Math.round(dims.width * scale);
          const dh = Math.round(dims.height * scale);

          children.push(
            new Paragraph({
              spacing: { before: 30, after: 30 },
              children: [
                new TextRun({ text: w.tag, bold: true, size: 17, color: '1e3a8a', font: 'Arial' })
              ]
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 120 },
              children: [
                new ImageRun({
                  data: bytes,
                  transformation: { width: dw, height: dh }
                })
              ]
            })
          );
        }
      }
    }

    // Capturas Código
    const codeList = [];
    if (act.imgCodigo) {
      codeList.push({ tag: act.tagCodigo || 'codigo.ts', img: act.imgCodigo });
    }
    if (act.extras) {
      act.extras.forEach(ex => {
        if (ex.tipo === 'codigo' && ex.img) {
          codeList.push({ tag: ex.tag || 'codigo.ts', img: ex.img });
        }
      });
    }

    if (codeList.length > 0) {
      children.push(
        new Paragraph({
          spacing: { before: 60, after: 40 },
          children: [
            new TextRun({ text: 'Código Fuente (CodeSnap):', bold: true, size: 18, color: '0284c7', font: 'Arial' })
          ]
        })
      );

      for (const c of codeList) {
        const bytes = dataUrlToUint8Array(c.img);
        if (bytes) {
          const dims = await getImageDimensions(c.img);
          const scale = Math.min(560 / dims.width, 320 / dims.height, 1);
          const dw = Math.round(dims.width * scale);
          const dh = Math.round(dims.height * scale);

          children.push(
            new Paragraph({
              spacing: { before: 30, after: 30 },
              children: [
                new TextRun({ text: c.tag, bold: true, size: 17, color: '1e3a8a', font: 'Arial' })
              ]
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 120 },
              children: [
                new ImageRun({
                  data: bytes,
                  transformation: { width: dw, height: dh }
                })
              ]
            })
          );
        }
      }
    }
  }

  const doc = new Document({
    sections: [{ children }]
  });

  return await downloadDocxBlob(doc, 'Guia_Informe_Seminario.docx');
}

// =========================================================================
// 3. INFORME DE EMPRESA DOCX (Formato Quincenal / Dual)
// =========================================================================
export async function generateInformeEmpresaDOCX(appData) {
  const q = appData.quincenaActual || 1;
  const semA = (q - 1) * 2 + 1;
  const semB = (q - 1) * 2 + 2;
  const wkA = (appData.semanas && appData.semanas[semA]) || {};
  const wkB = (appData.semanas && appData.semanas[semB]) || {};
  const empData = (appData.informesEmpresa && appData.informesEmpresa[q]) || {};

  const children = [];

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 100, after: 60 },
      children: [
        new TextRun({
          text: 'SERVICIO NACIONAL DE ADIESTRAMIENTO EN TRABAJO INDUSTRIAL',
          bold: true,
          size: 22,
          color: '004b87',
          font: 'Arial'
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 180 },
      children: [
        new TextRun({
          text: `INFORME DE FORMACIÓN PRÁCTICA EN EMPRESA — QUINCENA N° ${q}`,
          bold: true,
          size: 24,
          color: '0284c7',
          font: 'Arial'
        })
      ]
    })
  );

  // Tabla de Identificación Empresa
  const empIdRows = [
    new TableRow({
      children: [
        createCell('Estudiante:', 30, false, true, 'f1f5f9'),
        createCell(appData.estudiante || 'Rodrigo Daniel Ormeño Llanos', 70, false, true)
      ]
    }),
    new TableRow({
      children: [
        createCell('Carrera / Semestre:', 30, false, true, 'f1f5f9'),
        createCell(`${appData.carrera || 'Informática y Desarrollo Web'} — ${appData.semestre || '4to'}`, 70)
      ]
    }),
    new TableRow({
      children: [
        createCell('Empresa Formadora:', 30, false, true, 'f1f5f9'),
        createCell(appData.empresa || 'Empresa Patrocinadora', 70)
      ]
    }),
    new TableRow({
      children: [
        createCell('Área de Práctica:', 30, false, true, 'f1f5f9'),
        createCell(appData.area || 'Departamento de TI / Desarrollo', 70)
      ]
    }),
    new TableRow({
      children: [
        createCell('Monitor de Empresa:', 30, false, true, 'f1f5f9'),
        createCell(appData.monitor || 'Monitor Técnico', 70)
      ]
    }),
    new TableRow({
      children: [
        createCell('Instructor SENATI:', 30, false, true, 'f1f5f9'),
        createCell(appData.instructor || 'Jorge Luque Chambi', 70)
      ]
    }),
    new TableRow({
      children: [
        createCell('Periodo Quincenal:', 30, false, true, 'f1f5f9'),
        createCell(`${wkA.fechaInicio || 'Inicio'} al ${wkB.fechaFin || wkA.fechaFin || 'Fin'}`, 70)
      ]
    })
  ];

  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: empIdRows
    }),
    new Paragraph({ spacing: { after: 180 } })
  );

  // Plan Semanal de Ambas Semanas
  const dias = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
  const diasNombres = { lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles', jueves: 'Jueves', viernes: 'Viernes', sabado: 'Sábado' };

  let totalA = 0;
  let totalB = 0;

  const planQRows = [
    new TableRow({
      children: [
        createCell('DÍA', 15, true),
        createCell(`SEMANA ${semA} — TAREAS`, 35, true),
        createCell('HRS', 10, true, false, null, AlignmentType.CENTER),
        createCell(`SEMANA ${semB} — TAREAS`, 30, true),
        createCell('HRS', 10, true, false, null, AlignmentType.CENTER)
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
          createCell(diasNombres[d], 15, false, true, bg),
          createCell(itemA.tarea || '-', 35, false, false, bg),
          createCell(`${itemA.horas || 0}h`, 10, false, false, bg, AlignmentType.CENTER),
          createCell(itemB.tarea || '-', 30, false, false, bg),
          createCell(`${itemB.horas || 0}h`, 10, false, false, bg, AlignmentType.CENTER)
        ]
      })
    );
  });

  planQRows.push(
    new TableRow({
      children: [
        createCell('TOTALES:', 15, false, true, 'e2e8f0'),
        createCell(`Total Sem ${semA}: ${totalA} hrs`, 45, false, true, 'e2e8f0'),
        createCell(`Total Sem ${semB}: ${totalB} hrs`, 40, false, true, 'e2e8f0')
      ]
    })
  );

  children.push(
    new Paragraph({
      spacing: { before: 140, after: 80 },
      children: [
        new TextRun({
          text: `PLAN DE TRABAJO QUINCENAL (TOTAL: ${totalA + totalB} HORAS)`,
          bold: true,
          size: 20,
          color: '004b87',
          font: 'Arial'
        })
      ]
    }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: planQRows
    }),
    new Paragraph({ spacing: { after: 180 } })
  );

  // Tarea de Quincena
  children.push(
    new Paragraph({
      spacing: { before: 140, after: 80 },
      children: [
        new TextRun({
          text: 'TAREA / PROYECTO PRINCIPAL DE LA QUINCENA',
          bold: true,
          size: 20,
          color: '004b87',
          font: 'Arial'
        })
      ]
    }),
    new Paragraph({
      spacing: { after: 80 },
      children: [
        new TextRun({ text: 'Denominación: ', bold: true, size: 19, font: 'Arial', color: '0284c7' }),
        new TextRun({ text: empData.titulo || 'Desarrollo de Soluciones de Software', size: 19, font: 'Arial' })
      ]
    }),
    new Paragraph({
      spacing: { after: 100 },
      children: [
        new TextRun({ text: 'Descripción del Proceso: ', bold: true, size: 19, font: 'Arial', color: '0284c7' }),
        new TextRun({ text: empData.proceso || 'Desarrollo de operaciones técnicas en empresa.', size: 18, font: 'Arial' })
      ]
    }),
    new Paragraph({
      spacing: { after: 80 },
      children: [
        new TextRun({ text: 'Normas de Seguridad y Ergonomía: ', bold: true, size: 19, font: 'Arial', color: '0284c7' }),
        new TextRun({ text: empData.seguridad || 'Cumplimiento de pausas activas y postura ergonómica.', size: 18, font: 'Arial' })
      ]
    }),
    new Paragraph({
      spacing: { after: 160 },
      children: [
        new TextRun({ text: 'Herramientas y Software Utilizado: ', bold: true, size: 19, font: 'Arial', color: '0284c7' }),
        new TextRun({ text: empData.herramientas || 'VS Code, Git, Angular, Node.js, SQL.', size: 18, font: 'Arial' })
      ]
    })
  );

  // Evaluación del Monitor
  const evalRows = [
    new TableRow({
      children: [
        createCell('Criterio de Evaluación', 50, true),
        createCell('Calificación / Estado', 50, true)
      ]
    }),
    new TableRow({
      children: [
        createCell('Asistencia y Puntualidad:', 50, false, true, 'f8fafc'),
        createCell(empData.asistencia || 'Excelente', 50, false, false, 'f8fafc')
      ]
    }),
    new TableRow({
      children: [
        createCell('Normas de Seguridad y Ergonomía:', 50, false, true, 'ffffff'),
        createCell(empData.seguridadEmpresa || 'Cumple', 50, false, false, 'ffffff')
      ]
    }),
    new TableRow({
      children: [
        createCell('Desempeño y Calidad Técnica:', 50, false, true, 'f8fafc'),
        createCell(empData.calidad || 'Excelente', 50, false, false, 'f8fafc')
      ]
    }),
    new TableRow({
      children: [
        createCell('Observaciones del Monitor:', 50, false, true, 'ffffff'),
        createCell(empData.observaciones || 'Desempeño destacado y proactivo.', 50, false, false, 'ffffff')
      ]
    })
  ];

  children.push(
    new Paragraph({
      spacing: { before: 160, after: 80 },
      children: [
        new TextRun({
          text: 'EVALUACIÓN DEL MONITOR DE EMPRESA',
          bold: true,
          size: 20,
          color: '004b87',
          font: 'Arial'
        })
      ]
    }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: evalRows
    })
  );

  const doc = new Document({
    sections: [{ children }]
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
