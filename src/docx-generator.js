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
  ShadingType
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

function createStyledTableCell(text, isHeader = false, widthPercent = null, bgColor = null, isBold = false) {
  return new TableCell({
    width: widthPercent ? { size: widthPercent, type: WidthType.PERCENTAGE } : undefined,
    shading: bgColor ? { fill: bgColor, type: ShadingType.CLEAR } : (isHeader ? { fill: '0f2b5c', type: ShadingType.CLEAR } : undefined),
    margins: { top: 120, bottom: 120, left: 140, right: 140 },
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text: String(text || ''),
            bold: isHeader || isBold,
            color: isHeader ? 'FFFFFF' : '0f172a',
            size: isHeader ? 19 : 18, // 9.5pt o 9pt
            font: 'Arial'
          })
        ],
        spacing: { before: 40, after: 40 }
      })
    ]
  });
}

// =========================================================================
// 1. INFORME DE SEMINARIO DOCX (Plan Semanal + 4 Actividades con Capturas)
// =========================================================================
export async function generateInformeSeminarioDOCX(appData) {
  const semData = appData.informeSeminario || {};
  const wk = (appData.semanas && appData.semanas[appData.semanaActual || 1]) || {};

  const children = [];

  // Título Principal
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 100, after: 140 },
      children: [
        new TextRun({
          text: 'SERVICIO NACIONAL DE ADIESTRAMIENTO EN TRABAJO INDUSTRIAL',
          bold: true,
          size: 22,
          color: '0f2b5c',
          font: 'Arial'
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
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

  // Tabla de Datos del Estudiante
  const metaRows = [
    new TableRow({
      children: [
        createStyledTableCell('Estudiante:', false, 25, 'f1f5f9', true),
        createStyledTableCell(appData.estudiante || 'Rodrigo Daniel Ormeño Llanos', false, 75)
      ]
    }),
    new TableRow({
      children: [
        createStyledTableCell('ID / Matrícula:', false, 25, 'f1f5f9', true),
        createStyledTableCell(appData.matricula || '001681961', false, 75)
      ]
    }),
    new TableRow({
      children: [
        createStyledTableCell('Carrera:', false, 25, 'f1f5f9', true),
        createStyledTableCell(appData.carrera || 'Informática y Desarrollo de Aplicaciones Web', false, 75)
      ]
    }),
    new TableRow({
      children: [
        createStyledTableCell('Semestre / Ciclo:', false, 25, 'f1f5f9', true),
        createStyledTableCell(appData.semestre || '4° Ciclo', false, 75)
      ]
    }),
    new TableRow({
      children: [
        createStyledTableCell('CFP / Escuela:', false, 25, 'f1f5f9', true),
        createStyledTableCell(appData.escuela || 'ETI (Escuela de Tecnologías de la Información)', false, 75)
      ]
    }),
    new TableRow({
      children: [
        createStyledTableCell('Bloque:', false, 25, 'f1f5f9', true),
        createStyledTableCell(appData.bloque || '406', false, 75)
      ]
    }),
    new TableRow({
      children: [
        createStyledTableCell('Instructor:', false, 25, 'f1f5f9', true),
        createStyledTableCell(appData.instructor || 'Jorge Luque Chambi', false, 75)
      ]
    }),
    new TableRow({
      children: [
        createStyledTableCell('Periodo:', false, 25, 'f1f5f9', true),
        createStyledTableCell((wk.fechaInicio && wk.fechaFin) ? `${wk.fechaInicio} al ${wk.fechaFin}` : 'Semanal / Mes', false, 75)
      ]
    })
  ];

  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: metaRows
    }),
    new Paragraph({ spacing: { after: 200 } })
  );

  // Tabla Plan Semanal de Trabajo
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 120 },
      children: [
        new TextRun({
          text: 'PLAN SEMANAL DE TRABAJO',
          bold: true,
          size: 20,
          color: '0f2b5c',
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
        createStyledTableCell('DÍA', true, 18),
        createStyledTableCell('TAREAS EJECUTADAS / OPERACIONES DE SOFTWARE', true, 68),
        createStyledTableCell('HORAS', true, 14)
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
          createStyledTableCell(d.name, false, 18, bg, true),
          createStyledTableCell(item.tarea || 'Sin actividades registradas.', false, 68, bg),
          createStyledTableCell(`${item.horas || 0} hrs`, false, 14, bg)
        ]
      })
    );
  });

  planRows.push(
    new TableRow({
      children: [
        createStyledTableCell('TOTAL HORAS:', false, 18, 'e2e8f0', true),
        createStyledTableCell('Horas Formativas Acumuladas', false, 68, 'e2e8f0', true),
        createStyledTableCell(`${totalHrs} hrs`, false, 14, 'e2e8f0', true)
      ]
    })
  );

  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: planRows
    }),
    new Paragraph({ spacing: { after: 200 } })
  );

  // Tarea Más Significativa del Seminario
  const act1 = (semData.actividades && semData.actividades[1]) || {};
  const taskTitle = semData.tituloGlobal || act1.titulo || wk.tareaSignificativa?.titulo || 'Desarrollo de Aplicaciones Web y Soluciones Informáticas';
  const processDesc = semData.procesoGlobal || act1.descripcion || wk.tareaSignificativa?.proceso || 'Ejecución de actividades del seminario.';

  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 100 },
      children: [
        new TextRun({
          text: 'TAREA MÁS SIGNIFICATIVA DEL SEMINARIO',
          bold: true,
          size: 20,
          color: '0f2b5c',
          font: 'Arial'
        })
      ]
    }),
    new Paragraph({
      spacing: { after: 120 },
      children: [
        new TextRun({ text: 'Denominación: ', bold: true, size: 19, font: 'Arial', color: '0284c7' }),
        new TextRun({ text: taskTitle, size: 19, font: 'Arial' })
      ]
    }),
    new Paragraph({
      spacing: { after: 160 },
      children: [
        new TextRun({ text: 'Descripción del Proceso: ', bold: true, size: 19, font: 'Arial', color: '0284c7' }),
        new TextRun({ text: processDesc, size: 18, font: 'Arial' })
      ]
    })
  );

  // 4 Actividades del Mes con Evidencias
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 300, after: 150 },
      children: [
        new TextRun({
          text: 'EVIDENCIAS VISUALES DE LAS 4 ACTIVIDADES DEL MES',
          bold: true,
          size: 22,
          color: '0f2b5c',
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
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 80 },
        children: [
          new TextRun({
            text: `Actividad ${i}: ${act.titulo || 'Sin título'}`,
            bold: true,
            size: 20,
            color: '0284c7',
            font: 'Arial'
          })
        ]
      })
    );

    if (act.descripcion && act.descripcion.trim()) {
      children.push(
        new Paragraph({
          spacing: { after: 120 },
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
          spacing: { before: 80, after: 60 },
          children: [
            new TextRun({ text: '🌐 Capturas de Interfaz Web (UI):', bold: true, size: 18, color: '0284c7', font: 'Arial' })
          ]
        })
      );

      for (const w of webList) {
        const bytes = dataUrlToUint8Array(w.img);
        if (bytes) {
          const dims = await getImageDimensions(w.img);
          const scale = Math.min(540 / dims.width, 320 / dims.height, 1);
          const dw = Math.round(dims.width * scale);
          const dh = Math.round(dims.height * scale);

          children.push(
            new Paragraph({
              spacing: { before: 40, after: 40 },
              children: [
                new TextRun({ text: `URL: ${w.tag}`, bold: true, size: 17, color: '1e3a8a', font: 'Arial' })
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
          spacing: { before: 80, after: 60 },
          children: [
            new TextRun({ text: '💻 Capturas de Código Fuente (CodeSnap):', bold: true, size: 18, color: '0284c7', font: 'Arial' })
          ]
        })
      );

      for (const c of codeList) {
        const bytes = dataUrlToUint8Array(c.img);
        if (bytes) {
          const dims = await getImageDimensions(c.img);
          const scale = Math.min(540 / dims.width, 320 / dims.height, 1);
          const dw = Math.round(dims.width * scale);
          const dh = Math.round(dims.height * scale);

          children.push(
            new Paragraph({
              spacing: { before: 40, after: 40 },
              children: [
                new TextRun({ text: `Archivo: ${c.tag}`, bold: true, size: 17, color: '1e3a8a', font: 'Arial' })
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
        }
      }
    }
  }

  const doc = new Document({
    sections: [{ children }]
  });

  return await downloadDocxBlob(doc, 'Informe_Seminario_Guia.docx');
}

// =========================================================================
// 2. INFORME DE CLASE DOCX (Informe Semanal / Viernes)
// =========================================================================
export async function generateInformeClaseDOCX(appData) {
  const semData = appData.informeSeminario || {};
  const wk = (appData.semanas && appData.semanas[appData.semanaActual || 1]) || {};
  const act1 = (semData.actividades && semData.actividades[1]) || {};

  const taskTitle = semData.tituloGlobal || act1.titulo || 'Desarrollo de Aplicaciones Web y Soluciones Informáticas';
  let processDesc = semData.procesoGlobal || act1.descripcion || 'Ejecución y desarrollo de las actividades técnicas programadas para la sesión práctica.';

  const children = [];

  // Título Institucional
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 100, after: 80 },
      children: [
        new TextRun({
          text: 'SERVICIO NACIONAL DE ADIESTRAMIENTO EN TRABAJO INDUSTRIAL',
          bold: true,
          size: 22,
          color: '0f2b5c',
          font: 'Arial'
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 180 },
      children: [
        new TextRun({
          text: 'CUADERNO DE INFORMES DE FORMACIÓN PRÁCTICA (INFORME SEMANAL)',
          bold: true,
          size: 24,
          color: '0284c7',
          font: 'Arial'
        })
      ]
    })
  );

  // Tabla de Identificación
  const idRows = [
    new TableRow({
      children: [
        createStyledTableCell('CFP / Escuela:', false, 30, 'f1f5f9', true),
        createStyledTableCell(appData.escuela || 'ETI (Escuela de Tecnologías de la Información)', false, 70)
      ]
    }),
    new TableRow({
      children: [
        createStyledTableCell('Estudiante:', false, 30, 'f1f5f9', true),
        createStyledTableCell(appData.estudiante || 'Rodrigo Daniel Ormeño Llanos', false, 70)
      ]
    }),
    new TableRow({
      children: [
        createStyledTableCell('ID / Matrícula:', false, 30, 'f1f5f9', true),
        createStyledTableCell(appData.matricula || '001681961', false, 70)
      ]
    }),
    new TableRow({
      children: [
        createStyledTableCell('Bloque / Grupo:', false, 30, 'f1f5f9', true),
        createStyledTableCell(appData.bloque || '406', false, 70)
      ]
    }),
    new TableRow({
      children: [
        createStyledTableCell('Carrera:', false, 30, 'f1f5f9', true),
        createStyledTableCell(appData.carrera || 'Informática y Desarrollo de Aplicaciones Web', false, 70)
      ]
    }),
    new TableRow({
      children: [
        createStyledTableCell('Instructor:', false, 30, 'f1f5f9', true),
        createStyledTableCell(appData.instructor || 'Jorge Luque Chambi', false, 70)
      ]
    }),
    new TableRow({
      children: [
        createStyledTableCell('Semestre:', false, 30, 'f1f5f9', true),
        createStyledTableCell(appData.semestre || '4to', false, 70)
      ]
    }),
    new TableRow({
      children: [
        createStyledTableCell('Fecha de la Sesión:', false, 30, 'f1f5f9', true),
        createStyledTableCell((wk.fechaInicio && wk.fechaFin) ? `${wk.fechaInicio} al ${wk.fechaFin}` : 'Viernes lectivo', false, 70)
      ]
    })
  ];

  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: idRows
    }),
    new Paragraph({ spacing: { after: 200 } })
  );

  // Tarea Más Significativa
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 100 },
      children: [
        new TextRun({
          text: 'INFORME DE TAREA MÁS SIGNIFICATIVA',
          bold: true,
          size: 20,
          color: '0f2b5c',
          font: 'Arial'
        })
      ]
    }),
    new Paragraph({
      spacing: { after: 120 },
      children: [
        new TextRun({ text: 'Tarea más significativa: ', bold: true, size: 19, font: 'Arial', color: '0284c7' }),
        new TextRun({ text: taskTitle, size: 19, font: 'Arial' })
      ]
    }),
    new Paragraph({
      spacing: { after: 160 },
      children: [
        new TextRun({ text: 'Descripción del proceso: ', bold: true, size: 19, font: 'Arial', color: '0284c7' }),
        new TextRun({ text: processDesc, size: 18, font: 'Arial' })
      ]
    })
  );

  // Esquema, dibujo o capturas
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 260, after: 120 },
      children: [
        new TextRun({
          text: 'HACER ESQUEMA, DIBUJO O DIAGRAMA (CAPTURAS DE EVIDENCIA)',
          bold: true,
          size: 20,
          color: '0f2b5c',
          font: 'Arial'
        })
      ]
    })
  );

  // Recopilar capturas Web
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

  // 1. Todas las Web
  if (webEvidencias.length > 0) {
    children.push(
      new Paragraph({
        spacing: { before: 120, after: 80 },
        children: [
          new TextRun({ text: 'Web:', bold: true, size: 22, color: '0f2b5c', font: 'Arial' })
        ]
      })
    );

    for (const item of webEvidencias) {
      const bytes = dataUrlToUint8Array(item.dataUrl);
      if (bytes) {
        const dims = await getImageDimensions(item.dataUrl);
        const scale = Math.min(540 / dims.width, 320 / dims.height, 1);
        const dw = Math.round(dims.width * scale);
        const dh = Math.round(dims.height * scale);

        children.push(
          new Paragraph({
            spacing: { before: 60, after: 40 },
            children: [
              new TextRun({ text: item.titulo, bold: true, size: 17, color: '1e3a8a', font: 'Arial' })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 160 },
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

  // 2. Todos los Códigos
  if (codeEvidencias.length > 0) {
    children.push(
      new Paragraph({
        spacing: { before: 160, after: 80 },
        children: [
          new TextRun({ text: 'Código:', bold: true, size: 22, color: '0f2b5c', font: 'Arial' })
        ]
      })
    );

    for (const item of codeEvidencias) {
      const bytes = dataUrlToUint8Array(item.dataUrl);
      if (bytes) {
        const dims = await getImageDimensions(item.dataUrl);
        const scale = Math.min(540 / dims.width, 320 / dims.height, 1);
        const dw = Math.round(dims.width * scale);
        const dh = Math.round(dims.height * scale);

        children.push(
          new Paragraph({
            spacing: { before: 60, after: 40 },
            children: [
              new TextRun({ text: item.titulo, bold: true, size: 17, color: '1e3a8a', font: 'Arial' })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 160 },
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

  // Observaciones y Asistencia
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 240, after: 100 },
      children: [
        new TextRun({
          text: 'AUTOCONTROL DE ASISTENCIA POR EL ESTUDIANTE',
          bold: true,
          size: 19,
          color: '0f2b5c',
          font: 'Arial'
        })
      ]
    }),
    new Paragraph({
      spacing: { after: 100 },
      children: [
        new TextRun({ text: 'Asistencia registrada para la sesión del día ', size: 18, font: 'Arial' }),
        new TextRun({ text: 'VIERNES: ASISTIÓ [X]', bold: true, size: 18, color: '0284c7', font: 'Arial' })
      ]
    })
  );

  const doc = new Document({
    sections: [{ children }]
  });

  return await downloadDocxBlob(doc, 'Informe_Clase_Semanal.docx');
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
      spacing: { before: 100, after: 80 },
      children: [
        new TextRun({
          text: 'SERVICIO NACIONAL DE ADIESTRAMIENTO EN TRABAJO INDUSTRIAL',
          bold: true,
          size: 22,
          color: '0f2b5c',
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
        createStyledTableCell('Estudiante:', false, 30, 'f1f5f9', true),
        createStyledTableCell(appData.estudiante || 'Rodrigo Daniel Ormeño Llanos', false, 70)
      ]
    }),
    new TableRow({
      children: [
        createStyledTableCell('Carrera / Semestre:', false, 30, 'f1f5f9', true),
        createStyledTableCell(`${appData.carrera || 'Informática y Desarrollo Web'} — ${appData.semestre || '4to'}`, false, 70)
      ]
    }),
    new TableRow({
      children: [
        createStyledTableCell('Empresa Formadora:', false, 30, 'f1f5f9', true),
        createStyledTableCell(appData.empresa || 'Empresa Patrocinadora', false, 70)
      ]
    }),
    new TableRow({
      children: [
        createStyledTableCell('Área de Práctica:', false, 30, 'f1f5f9', true),
        createStyledTableCell(appData.area || 'Departamento de TI / Desarrollo', false, 70)
      ]
    }),
    new TableRow({
      children: [
        createStyledTableCell('Monitor de Empresa:', false, 30, 'f1f5f9', true),
        createStyledTableCell(appData.monitor || 'Monitor Técnico', false, 70)
      ]
    }),
    new TableRow({
      children: [
        createStyledTableCell('Instructor SENATI:', false, 30, 'f1f5f9', true),
        createStyledTableCell(appData.instructor || 'Jorge Luque Chambi', false, 70)
      ]
    }),
    new TableRow({
      children: [
        createStyledTableCell('Periodo Quincenal:', false, 30, 'f1f5f9', true),
        createStyledTableCell(`${wkA.fechaInicio || 'Inicio'} al ${wkB.fechaFin || wkA.fechaFin || 'Fin'}`, false, 70)
      ]
    })
  ];

  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: empIdRows
    }),
    new Paragraph({ spacing: { after: 200 } })
  );

  // Plan Semanal de Ambas Semanas
  const dias = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
  const diasNombres = { lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles', jueves: 'Jueves', viernes: 'Viernes', sabado: 'Sábado' };

  let totalA = 0;
  let totalB = 0;

  const planQRows = [
    new TableRow({
      children: [
        createStyledTableCell('DÍA', true, 15),
        createStyledTableCell(`SEMANA ${semA} — TAREAS`, true, 35),
        createStyledTableCell('HRS', true, 10),
        createStyledTableCell(`SEMANA ${semB} — TAREAS`, true, 30),
        createStyledTableCell('HRS', true, 10)
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
          createStyledTableCell(diasNombres[d], false, 15, bg, true),
          createStyledTableCell(itemA.tarea || '-', false, 35, bg),
          createStyledTableCell(`${itemA.horas || 0}h`, false, 10, bg),
          createStyledTableCell(itemB.tarea || '-', false, 30, bg),
          createStyledTableCell(`${itemB.horas || 0}h`, false, 10, bg)
        ]
      })
    );
  });

  planQRows.push(
    new TableRow({
      children: [
        createStyledTableCell('TOTALES:', false, 15, 'e2e8f0', true),
        createStyledTableCell(`Total Sem ${semA}: ${totalA} hrs`, false, 45, 'e2e8f0', true),
        createStyledTableCell(`Total Sem ${semB}: ${totalB} hrs`, false, 40, 'e2e8f0', true)
      ]
    })
  );

  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 180, after: 100 },
      children: [
        new TextRun({
          text: `PLAN DE TRABAJO QUINCENAL (TOTAL: ${totalA + totalB} HORAS)`,
          bold: true,
          size: 20,
          color: '0f2b5c',
          font: 'Arial'
        })
      ]
    }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: planQRows
    }),
    new Paragraph({ spacing: { after: 200 } })
  );

  // Tarea de Quincena
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 180, after: 100 },
      children: [
        new TextRun({
          text: 'TAREA / PROYECTO PRINCIPAL DE LA QUINCENA',
          bold: true,
          size: 20,
          color: '0f2b5c',
          font: 'Arial'
        })
      ]
    }),
    new Paragraph({
      spacing: { after: 100 },
      children: [
        new TextRun({ text: 'Denominación: ', bold: true, size: 19, font: 'Arial', color: '0284c7' }),
        new TextRun({ text: empData.titulo || 'Desarrollo de Soluciones de Software', size: 19, font: 'Arial' })
      ]
    }),
    new Paragraph({
      spacing: { after: 120 },
      children: [
        new TextRun({ text: 'Descripción del Proceso: ', bold: true, size: 19, font: 'Arial', color: '0284c7' }),
        new TextRun({ text: empData.proceso || 'Desarrollo de operaciones técnicas en empresa.', size: 18, font: 'Arial' })
      ]
    }),
    new Paragraph({
      spacing: { after: 100 },
      children: [
        new TextRun({ text: 'Normas de Seguridad y Ergonomía: ', bold: true, size: 19, font: 'Arial', color: '0284c7' }),
        new TextRun({ text: empData.seguridad || 'Cumplimiento de pausas activas y postura ergonómica.', size: 18, font: 'Arial' })
      ]
    }),
    new Paragraph({
      spacing: { after: 180 },
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
        createStyledTableCell('Criterio de Evaluación', true, 50),
        createStyledTableCell('Calificación / Estado', true, 50)
      ]
    }),
    new TableRow({
      children: [
        createStyledTableCell('Asistencia y Puntualidad:', false, 50, 'f8fafc', true),
        createStyledTableCell(empData.asistencia || 'Excelente', false, 50, 'f8fafc')
      ]
    }),
    new TableRow({
      children: [
        createStyledTableCell('Normas de Seguridad y Ergonomía:', false, 50, 'ffffff', true),
        createStyledTableCell(empData.seguridadEmpresa || 'Cumple', false, 50, 'ffffff')
      ]
    }),
    new TableRow({
      children: [
        createStyledTableCell('Desempeño y Calidad Técnica:', false, 50, 'f8fafc', true),
        createStyledTableCell(empData.calidad || 'Excelente', false, 50, 'f8fafc')
      ]
    }),
    new TableRow({
      children: [
        createStyledTableCell('Observaciones del Monitor:', false, 50, 'ffffff', true),
        createStyledTableCell(empData.observaciones || 'Desempeño destacado y proactivo.', false, 50, 'ffffff')
      ]
    })
  ];

  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 100 },
      children: [
        new TextRun({
          text: 'EVALUACIÓN DEL MONITOR DE EMPRESA',
          bold: true,
          size: 20,
          color: '0f2b5c',
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
