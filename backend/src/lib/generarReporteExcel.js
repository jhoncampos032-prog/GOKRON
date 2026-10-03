const ExcelJS = require('exceljs');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const prisma = require('./prisma');

const COLOR_GRAFITO = 'FF131321';
const COLOR_MENTA = 'FF46F0D2';
const COLOR_CREMA_SUAVE = 'FFFDF6E8'; // fondo de fila alternada
const COLOR_CREMA = 'FFFBE2B4'; // mas saturado -- para pastillas de estado (CREMA_SUAVE se pierde contra las filas blancas)
const COLOR_ACERO = 'FF3E5C76';
const COLOR_BLANCO = 'FFFFFFFF';

// Misma paleta de marca, en hex plano (sin alfa) para chart.js.
const PALETA_GRAFICA = {
  menta: '#46F0D2',
  mentaOscuro: '#0E7F6D',
  marino: '#131321',
  crema: '#FBE2B4',
  acero: '#3E5C76',
};

const ANCHO_GRAFICA = 480;
const ALTO_GRAFICA = 280;
const chartCanvas = new ChartJSNodeCanvas({ width: ANCHO_GRAFICA, height: ALTO_GRAFICA, backgroundColour: '#FFFFFF' });

const ETIQUETA_PERIODO = { dia: 'Hoy', semana: 'Esta_semana', mes: 'Este_mes' };

function inicioDelPeriodo(periodo) {
  const ahora = new Date();
  if (periodo === 'dia') {
    return new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
  }
  if (periodo === 'mes') {
    return new Date(ahora.getFullYear(), ahora.getMonth(), 1);
  }
  const diaSemana = ahora.getDay();
  const diasDesdeElLunes = diaSemana === 0 ? 6 : diaSemana - 1;
  const lunes = new Date(ahora);
  lunes.setDate(ahora.getDate() - diasDesdeElLunes);
  lunes.setHours(0, 0, 0, 0);
  return lunes;
}

// Consultas secuenciales (no Promise.all) a propósito: el plan gratis de
// Supabase limita el pool a 15 conexiones en total, compartidas entre este
// backend y el de producción. Disparar 8 consultas en paralelo por cada
// reporte (pantalla, Excel, o subida a Drive) agotaba ese pool y tumbaba
// el servidor entero. Una a la vez usa como máximo 1-2 conexiones, a
// costa de ser un poco más lento.
async function obtenerDatosCompletos(empresaId, periodo) {
  const desde = inicioDelPeriodo(periodo);

  const empresa = await prisma.empresa.findUnique({ where: { id: empresaId } });
  const asistencias = await prisma.asistencia.findMany({
    where: { empresaId, checkIn: { gte: desde } },
    include: { usuario: { select: { nombre: true } }, obra: { select: { nombre: true } } },
    orderBy: { checkIn: 'desc' },
  });
  const movimientos = await prisma.movimientoMaterial.findMany({
    where: { empresaId, fecha: { gte: desde } },
    include: {
      material: { select: { nombre: true, unidad: true } },
      usuario: { select: { nombre: true } },
      obra: { select: { nombre: true } },
    },
    orderBy: { fecha: 'desc' },
  });
  const tareas = await prisma.tarea.findMany({
    where: { empresaId },
    include: { obra: { select: { nombre: true } }, asignado: { select: { nombre: true } } },
    orderBy: { createdAt: 'desc' },
  });
  const herramientas = await prisma.herramienta.findMany({ where: { empresaId } });
  const prestamos = await prisma.prestamoHerramienta.findMany({
    where: { empresaId, fechaPrestamo: { gte: desde } },
    include: { herramienta: { select: { nombre: true } }, usuario: { select: { nombre: true } }, obra: { select: { nombre: true } } },
    orderBy: { fechaPrestamo: 'desc' },
  });
  const personal = await prisma.usuario.findMany({
    where: { empresaId },
    select: { nombre: true, email: true, rol: true, activo: true, createdAt: true },
    orderBy: { nombre: 'asc' },
  });
  const obras = await prisma.obra.findMany({
    where: { empresaId },
    select: { nombre: true, direccion: true, estado: true, fechaInicio: true },
    orderBy: { nombre: 'asc' },
  });

  return { empresa, desde, asistencias, movimientos, tareas, herramientas, prestamos, personal, obras };
}

function estilizarEncabezado(fila) {
  fila.eachCell((celda) => {
    celda.font = { bold: true, color: { argb: COLOR_MENTA }, size: 11 };
    celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_GRAFITO } };
    celda.alignment = { vertical: 'middle', horizontal: 'left' };
    celda.border = { bottom: { style: 'thin', color: { argb: COLOR_GRAFITO } } };
  });
  fila.height = 22;
}

function estilizarFilaTotal(fila) {
  fila.eachCell((celda) => {
    celda.font = { bold: true, color: { argb: COLOR_GRAFITO } };
    celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_MENTA } };
  });
}

function agregarTituloHoja(hoja, texto, subtexto) {
  hoja.mergeCells('A1:F1');
  const celdaTitulo = hoja.getCell('A1');
  celdaTitulo.value = texto;
  celdaTitulo.font = { bold: true, size: 16, color: { argb: COLOR_GRAFITO } };
  celdaTitulo.border = { bottom: { style: 'medium', color: { argb: COLOR_MENTA } } };
  hoja.getRow(1).height = 28;

  hoja.mergeCells('A2:F2');
  const celdaSub = hoja.getCell('A2');
  celdaSub.value = subtexto;
  celdaSub.font = { italic: true, size: 10, color: { argb: 'FF666666' } };
  hoja.addRow([]);
}

// Mapa de color por estado -- se usa para pintar la celda de "Estado" como
// una pastilla (fondo solido + texto en negrita centrado) en vez de texto
// plano, en Obras y Tareas. Excel no soporta bordes redondeados nativos,
// asi que el efecto de "pastilla" es solo el fondo solido + texto centrado.
const MAPA_COLOR_ESTADO = {
  PLANIFICADA: { bg: COLOR_CREMA, texto: COLOR_GRAFITO },
  PENDIENTE: { bg: COLOR_CREMA, texto: COLOR_GRAFITO },
  EN_CURSO: { bg: COLOR_MENTA, texto: COLOR_GRAFITO },
  EN_PROGRESO: { bg: COLOR_MENTA, texto: COLOR_GRAFITO },
  PAUSADA: { bg: COLOR_ACERO, texto: COLOR_BLANCO },
  FINALIZADA: { bg: COLOR_GRAFITO, texto: COLOR_MENTA },
  COMPLETADA: { bg: COLOR_GRAFITO, texto: COLOR_MENTA },
};

function estilizarCeldaEstado(celda, estado) {
  const estilo = MAPA_COLOR_ESTADO[estado] || { bg: COLOR_BLANCO, texto: COLOR_GRAFITO };
  celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: estilo.bg } };
  celda.font = { bold: true, color: { argb: estilo.texto } };
  celda.alignment = { horizontal: 'center', vertical: 'middle' };
}

function colorearFilaAlternada(fila, i) {
  fila.eachCell((celda) => {
    celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: i % 2 === 0 ? COLOR_BLANCO : COLOR_CREMA_SUAVE } };
  });
}

// Genera una grafica como imagen PNG (buffer) en el servidor -- no es una
// grafica nativa de Excel/editable, es una imagen ya renderizada, porque el
// reporte se recalcula en vivo cada vez que se pide.
async function generarImagenGrafica(config) {
  return chartCanvas.renderToBuffer({
    ...config,
    options: {
      responsive: false,
      animation: false,
      ...config.options,
      plugins: {
        legend: { labels: { font: { size: 11 } } },
        ...(config.options && config.options.plugins),
      },
    },
  });
}

// Inserta la imagen de una grafica debajo de la tabla de la hoja, o un
// texto de aviso si no hay datos del periodo para graficar. Devuelve el
// numero de la siguiente fila libre.
function insertarGrafica(libro, hoja, filaInicio, resultadoGrafica) {
  if (!resultadoGrafica.hayDatos) {
    const celda = hoja.getCell(`A${filaInicio + 1}`);
    celda.value = 'Sin datos en este período';
    celda.font = { italic: true, color: { argb: 'FF888888' }, size: 12 };
    return filaInicio + 3;
  }
  const imageId = libro.addImage({ buffer: resultadoGrafica.buffer, extension: 'png' });
  hoja.addImage(imageId, {
    tl: { col: 0, row: filaInicio },
    ext: { width: ANCHO_GRAFICA, height: ALTO_GRAFICA },
  });
  // Una imagen de ALTO_GRAFICA px, con filas de ~15px de alto por defecto,
  // ocupa aproximadamente ALTO_GRAFICA/15 filas -- se deja un pequeño
  // colchon extra para que la siguiente hoja no quede pegada.
  return filaInicio + Math.ceil(ALTO_GRAFICA / 15) + 2;
}

// Genera el libro de Excel completo con las 8 hojas, y devuelve el
// contenido en memoria (buffer) listo para descargar o subir a Drive,
// junto con el nombre de archivo sugerido.
async function generarLibroExcel(empresaId, periodo) {
  const p = ['dia', 'semana', 'mes'].includes(periodo) ? periodo : 'semana';
  const { empresa, desde, asistencias, movimientos, tareas, herramientas, prestamos, personal, obras } =
    await obtenerDatosCompletos(empresaId, p);

  const libro = new ExcelJS.Workbook();
  libro.creator = 'Gokron';
  libro.created = new Date();

  const subtitulo = `${empresa.nombre} · Período: ${ETIQUETA_PERIODO[p].replace('_', ' ')} (desde ${desde.toLocaleDateString('es')}) · Generado el ${new Date().toLocaleString('es')}`;

  const horasTrabajadas = asistencias.reduce((total, a) => {
    if (!a.checkOut) return total;
    return total + (new Date(a.checkOut) - new Date(a.checkIn)) / (1000 * 60 * 60);
  }, 0);
  const entradasMaterial = movimientos.filter((m) => m.tipo === 'ENTRADA').reduce((t, m) => t + m.cantidad, 0);
  const salidasMaterial = movimientos.filter((m) => m.tipo === 'SALIDA').reduce((t, m) => t + m.cantidad, 0);
  const tareasPendientes = tareas.filter((t) => t.estado === 'PENDIENTE').length;
  const tareasEnProgreso = tareas.filter((t) => t.estado === 'EN_PROGRESO').length;
  const tareasCompletadas = tareas.filter((t) => t.estado === 'COMPLETADA').length;
  const obrasActivas = obras.filter((o) => o.estado === 'EN_CURSO').length;

  // ---- Resumen por trabajador (calculado una vez, se usa en la hoja y en su grafica) ----
  const nombresConDatos = Array.from(
    new Set([
      ...asistencias.map((a) => a.usuario?.nombre).filter(Boolean),
      ...tareas.filter((t) => t.estado === 'COMPLETADA').map((t) => t.asignado?.nombre).filter(Boolean),
    ])
  ).sort();
  const resumenPorTrabajador = nombresConDatos.map((nombre) => {
    const asistenciasDeEstaPersona = asistencias.filter((a) => a.usuario?.nombre === nombre);
    const horasDeEstaPersona = asistenciasDeEstaPersona.reduce((total, a) => {
      if (!a.checkOut) return total;
      return total + (new Date(a.checkOut) - new Date(a.checkIn)) / (1000 * 60 * 60);
    }, 0);
    const tareasCompletadasDeEstaPersona = tareas.filter(
      (t) => t.estado === 'COMPLETADA' && t.asignado?.nombre === nombre
    ).length;
    return {
      nombre,
      marcaciones: asistenciasDeEstaPersona.length,
      horas: Math.round(horasDeEstaPersona * 10) / 10,
      tareasCompletadas: tareasCompletadasDeEstaPersona,
    };
  });

  // ---- Hoja 1: Resumen ----
  const hojaResumen = libro.addWorksheet('Resumen', { properties: { tabColor: { argb: COLOR_MENTA } } });
  agregarTituloHoja(hojaResumen, `Reporte Gokron — ${empresa.nombre}`, subtitulo);
  hojaResumen.columns = [{ width: 26 }, { width: 18 }, { width: 14 }, { width: 26 }, { width: 18 }, { width: 14 }];

  // Cuadricula 2x2 de tarjetas KPI (encabezado de color de ancho completo del
  // bloque + valores debajo en negrita, tamaño grande, con el mismo color
  // del bloque) -- cada bloque ocupa 3 columnas (izquierda A-C, derecha D-F).
  const BLOQUES_RESUMEN = [
    [
      {
        titulo: 'Asistencia', bg: COLOR_MENTA, texto: COLOR_GRAFITO,
        valores: [['Marcaciones de asistencia', asistencias.length], ['Horas trabajadas', Math.round(horasTrabajadas * 10) / 10]],
      },
      {
        titulo: 'Materiales', bg: COLOR_GRAFITO, texto: COLOR_MENTA,
        valores: [['Materiales — entradas', entradasMaterial], ['Materiales — salidas', salidasMaterial]],
      },
    ],
    [
      {
        titulo: 'Tareas', bg: COLOR_CREMA, texto: COLOR_GRAFITO,
        valores: [['Tareas pendientes', tareasPendientes], ['Tareas en progreso', tareasEnProgreso], ['Tareas completadas', tareasCompletadas]],
      },
      {
        titulo: 'Herramientas', bg: COLOR_ACERO, texto: COLOR_BLANCO,
        valores: [
          ['Herramientas en catálogo', herramientas.length],
          ['Herramientas prestadas ahora', herramientas.filter((h) => h.estado === 'PRESTADA').length],
          ['Entregas de herramientas en el período', prestamos.length],
        ],
      },
    ],
  ];

  BLOQUES_RESUMEN.forEach((par, fila) => {
    const filaEncabezado = hojaResumen.rowCount + 1;
    hojaResumen.addRow([]);
    par.forEach((bloque, col) => {
      const colIni = col === 0 ? 1 : 4;
      const colFin = col === 0 ? 3 : 6;
      hojaResumen.mergeCells(filaEncabezado, colIni, filaEncabezado, colFin);
      const celdaEncabezado = hojaResumen.getRow(filaEncabezado).getCell(colIni);
      celdaEncabezado.value = bloque.titulo;
      celdaEncabezado.font = { bold: true, size: 12, color: { argb: bloque.texto } };
      celdaEncabezado.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bloque.bg } };
      celdaEncabezado.alignment = { horizontal: 'center', vertical: 'middle' };
    });
    hojaResumen.getRow(filaEncabezado).height = 22;
    // El primer bloque de encabezados cae exactamente en la fila 4 (titulo=1,
    // subtitulo=2, blanco=3), igual que el encabezado de columnas en las
    // demas hojas -- se congela ahi para que no se pierda al hacer scroll.
    if (fila === 0) hojaResumen.views = [{ state: 'frozen', ySplit: 4 }];

    const maxValores = Math.max(...par.map((b) => b.valores.length));
    for (let v = 0; v < maxValores; v++) {
      const filaValor = hojaResumen.rowCount + 1;
      hojaResumen.addRow([]);
      par.forEach((bloque, col) => {
        if (!bloque.valores[v]) return;
        const [etiqueta, valor] = bloque.valores[v];
        const colIniEtq = col === 0 ? 1 : 4;
        const colFinEtq = col === 0 ? 2 : 5;
        const colValor = col === 0 ? 3 : 6;

        hojaResumen.mergeCells(filaValor, colIniEtq, filaValor, colFinEtq);
        const celdaEtiqueta = hojaResumen.getRow(filaValor).getCell(colIniEtq);
        celdaEtiqueta.value = etiqueta;
        celdaEtiqueta.font = { size: 10, color: { argb: bloque.texto } };
        celdaEtiqueta.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bloque.bg } };
        celdaEtiqueta.alignment = { horizontal: 'left', vertical: 'middle' };

        const celdaValor = hojaResumen.getRow(filaValor).getCell(colValor);
        celdaValor.value = valor;
        celdaValor.font = { bold: true, size: 15, color: { argb: bloque.texto } };
        celdaValor.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bloque.bg } };
        celdaValor.alignment = { horizontal: 'right', vertical: 'middle' };
      });
      hojaResumen.getRow(filaValor).height = 20;
    }
    hojaResumen.addRow([]); // separador entre bloques
  });

  // ---- Hoja 2: Asistencia ----
  const hojaAsistencia = libro.addWorksheet('Asistencia', { properties: { tabColor: { argb: COLOR_MENTA } } });
  agregarTituloHoja(hojaAsistencia, 'Asistencia', subtitulo);
  hojaAsistencia.columns = [{ width: 22 }, { width: 22 }, { width: 20 }, { width: 20 }, { width: 12 }];
  estilizarEncabezado(hojaAsistencia.addRow(['Trabajador', 'Obra', 'Entrada', 'Salida', 'Horas']));
  hojaAsistencia.views = [{ state: 'frozen', ySplit: 4 }];
  asistencias.forEach((a, i) => {
    const horas = a.checkOut ? Math.round(((new Date(a.checkOut) - new Date(a.checkIn)) / (1000 * 60 * 60)) * 10) / 10 : '—';
    colorearFilaAlternada(
      hojaAsistencia.addRow([
        a.usuario?.nombre || '—',
        a.obra?.nombre || '—',
        new Date(a.checkIn).toLocaleString('es'),
        a.checkOut ? new Date(a.checkOut).toLocaleString('es') : 'Sigue en obra',
        horas,
      ]),
      i
    );
  });
  estilizarFilaTotal(hojaAsistencia.addRow(['TOTAL', '', '', '', `${Math.round(horasTrabajadas * 10) / 10} h`]));

  // ---- Hoja 3: Materiales ----
  const hojaMateriales = libro.addWorksheet('Materiales', { properties: { tabColor: { argb: COLOR_MENTA } } });
  agregarTituloHoja(hojaMateriales, 'Movimientos de materiales', subtitulo);
  hojaMateriales.columns = [{ width: 22 }, { width: 12 }, { width: 12 }, { width: 20 }, { width: 20 }, { width: 24 }];
  estilizarEncabezado(hojaMateriales.addRow(['Material', 'Tipo', 'Cantidad', 'Trabajador', 'Obra', 'Fecha']));
  hojaMateriales.views = [{ state: 'frozen', ySplit: 4 }];
  movimientos.forEach((m, i) => {
    colorearFilaAlternada(
      hojaMateriales.addRow([
        m.material?.nombre || '—',
        m.tipo === 'ENTRADA' ? 'Entrada' : 'Salida',
        `${m.cantidad} ${m.material?.unidad || ''}`,
        m.usuario?.nombre || '—',
        m.obra?.nombre || '—',
        new Date(m.fecha).toLocaleString('es'),
      ]),
      i
    );
  });
  estilizarFilaTotal(hojaMateriales.addRow(['TOTAL', `${movimientos.length} movimientos`, '', '', '', '']));

  // ---- Hoja 4: Tareas ----
  const hojaTareas = libro.addWorksheet('Tareas', { properties: { tabColor: { argb: COLOR_MENTA } } });
  agregarTituloHoja(hojaTareas, 'Tareas', subtitulo);
  hojaTareas.columns = [{ width: 28 }, { width: 20 }, { width: 20 }, { width: 16 }];
  estilizarEncabezado(hojaTareas.addRow(['Tarea', 'Obra', 'Asignado a', 'Estado']));
  hojaTareas.views = [{ state: 'frozen', ySplit: 4 }];
  tareas.forEach((t, i) => {
    const fila = hojaTareas.addRow([t.titulo, t.obra?.nombre || '—', t.asignado?.nombre || 'Sin asignar', t.estado.replace('_', ' ')]);
    colorearFilaAlternada(fila, i);
    estilizarCeldaEstado(fila.getCell(4), t.estado);
  });
  estilizarFilaTotal(hojaTareas.addRow(['TOTAL', '', '', `${tareas.length} tareas`]));

  // ---- Hoja 5: Herramientas ----
  const hojaHerramientas = libro.addWorksheet('Herramientas', { properties: { tabColor: { argb: COLOR_MENTA } } });
  agregarTituloHoja(hojaHerramientas, 'Movimientos de herramientas', subtitulo);
  hojaHerramientas.columns = [{ width: 24 }, { width: 20 }, { width: 20 }, { width: 20 }, { width: 20 }];
  estilizarEncabezado(hojaHerramientas.addRow(['Herramienta', 'Entregada a', 'Obra', 'Fecha entrega', 'Fecha devolución']));
  hojaHerramientas.views = [{ state: 'frozen', ySplit: 4 }];
  prestamos.forEach((p2, i) => {
    colorearFilaAlternada(
      hojaHerramientas.addRow([
        p2.herramienta?.nombre || '—',
        p2.usuario?.nombre || 'Oficina/Compañía',
        p2.obra?.nombre || '—',
        new Date(p2.fechaPrestamo).toLocaleString('es'),
        p2.fechaDevolucion ? new Date(p2.fechaDevolucion).toLocaleString('es') : 'Aún no regresada',
      ]),
      i
    );
  });
  estilizarFilaTotal(hojaHerramientas.addRow(['TOTAL', '', '', '', `${prestamos.length} préstamos`]));

  // ---- Hoja 6: Resumen por trabajador ----
  const hojaPorTrabajador = libro.addWorksheet('Por trabajador', { properties: { tabColor: { argb: COLOR_MENTA } } });
  agregarTituloHoja(hojaPorTrabajador, 'Resumen por trabajador', subtitulo);
  hojaPorTrabajador.columns = [{ width: 26 }, { width: 18 }, { width: 18 }, { width: 18 }];
  estilizarEncabezado(hojaPorTrabajador.addRow(['Trabajador', 'Marcaciones', 'Horas trabajadas', 'Tareas completadas']));
  hojaPorTrabajador.views = [{ state: 'frozen', ySplit: 4 }];
  resumenPorTrabajador.forEach((r, i) => {
    colorearFilaAlternada(hojaPorTrabajador.addRow([r.nombre, r.marcaciones, r.horas, r.tareasCompletadas]), i);
  });
  estilizarFilaTotal(
    hojaPorTrabajador.addRow([
      'TOTAL',
      resumenPorTrabajador.reduce((t, r) => t + r.marcaciones, 0),
      Math.round(resumenPorTrabajador.reduce((t, r) => t + r.horas, 0) * 10) / 10,
      resumenPorTrabajador.reduce((t, r) => t + r.tareasCompletadas, 0),
    ])
  );

  // ---- Hoja 7: Personal ----
  const hojaPersonal = libro.addWorksheet('Personal', { properties: { tabColor: { argb: COLOR_MENTA } } });
  agregarTituloHoja(hojaPersonal, 'Personal registrado', subtitulo);
  hojaPersonal.columns = [{ width: 26 }, { width: 28 }, { width: 16 }, { width: 12 }, { width: 16 }];
  estilizarEncabezado(hojaPersonal.addRow(['Nombre', 'Correo', 'Rol', 'Activo', 'Registrado desde']));
  hojaPersonal.views = [{ state: 'frozen', ySplit: 4 }];
  personal.forEach((p3, i) => {
    colorearFilaAlternada(
      hojaPersonal.addRow([p3.nombre, p3.email, p3.rol, p3.activo ? 'Sí' : 'No', new Date(p3.createdAt).toLocaleDateString('es')]),
      i
    );
  });
  estilizarFilaTotal(hojaPersonal.addRow(['TOTAL', `${personal.length} personas`, '', '', '']));

  // ---- Hoja 8: Obras ----
  const hojaObras = libro.addWorksheet('Obras', { properties: { tabColor: { argb: COLOR_MENTA } } });
  agregarTituloHoja(hojaObras, 'Obras registradas', subtitulo);
  hojaObras.columns = [{ width: 26 }, { width: 32 }, { width: 16 }, { width: 16 }];
  estilizarEncabezado(hojaObras.addRow(['Obra', 'Dirección', 'Estado', 'Fecha de inicio']));
  hojaObras.views = [{ state: 'frozen', ySplit: 4 }];
  obras.forEach((o, i) => {
    const fila = hojaObras.addRow([o.nombre, o.direccion || '—', o.estado.replace('_', ' '), o.fechaInicio ? new Date(o.fechaInicio).toLocaleDateString('es') : '—']);
    colorearFilaAlternada(fila, i);
    estilizarCeldaEstado(fila.getCell(3), o.estado);
  });
  estilizarFilaTotal(hojaObras.addRow(['TOTAL', `${obras.length} obras`, '', '']));

  // ---- Graficas: se preparan las 8 configuraciones primero (sin tocar la
  // base de datos, todo con los arreglos ya calculados arriba), y se
  // renderizan en paralelo -- a diferencia de las consultas a Prisma, esto
  // es puro trabajo de CPU/canvas en memoria, no abre conexiones nuevas a
  // Supabase, asi que Promise.all aqui es seguro y no reintroduce el
  // problema del pool de conexiones. ----
  const graficasPendientes = [
    {
      hoja: hojaResumen,
      filaInicio: hojaResumen.rowCount + 2,
      hayDatos: obrasActivas > 0 || asistencias.length > 0 || tareasCompletadas > 0,
      config: {
        type: 'bar',
        data: {
          labels: ['Obras activas', 'Asistencias', 'Tareas completadas'],
          datasets: [{ label: 'Totales del período', data: [obrasActivas, asistencias.length, tareasCompletadas], backgroundColor: [PALETA_GRAFICA.menta, PALETA_GRAFICA.marino, PALETA_GRAFICA.crema] }],
        },
        options: { plugins: { legend: { display: false }, title: { display: true, text: 'Totales del período' } } },
      },
    },
    {
      hoja: hojaAsistencia,
      filaInicio: hojaAsistencia.rowCount + 2,
      hayDatos: asistencias.length > 0,
      config: (() => {
        const NOMBRES_DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const ORDEN = [1, 2, 3, 4, 5, 6, 0]; // empieza en lunes
        const conteo = new Array(7).fill(0);
        asistencias.forEach((a) => { conteo[new Date(a.checkIn).getDay()]++; });
        return {
          type: 'bar',
          data: {
            labels: ORDEN.map((i) => NOMBRES_DIAS[i]),
            datasets: [{ label: 'Marcaciones', data: ORDEN.map((i) => conteo[i]), backgroundColor: PALETA_GRAFICA.menta }],
          },
          options: { plugins: { legend: { display: false }, title: { display: true, text: 'Marcaciones por día' } } },
        };
      })(),
    },
    {
      hoja: hojaMateriales,
      filaInicio: hojaMateriales.rowCount + 2,
      hayDatos: movimientos.length > 0,
      config: {
        type: 'bar',
        data: { labels: ['Entradas', 'Salidas'], datasets: [{ label: 'Cantidad', data: [entradasMaterial, salidasMaterial], backgroundColor: [PALETA_GRAFICA.menta, PALETA_GRAFICA.marino] }] },
        options: { plugins: { legend: { display: false }, title: { display: true, text: 'Movimientos por tipo' } } },
      },
    },
    {
      hoja: hojaTareas,
      filaInicio: hojaTareas.rowCount + 2,
      hayDatos: tareas.length > 0,
      config: {
        type: 'doughnut',
        data: {
          labels: ['Pendiente', 'En progreso', 'Completada'],
          datasets: [{ data: [tareasPendientes, tareasEnProgreso, tareasCompletadas], backgroundColor: [PALETA_GRAFICA.crema, PALETA_GRAFICA.acero, PALETA_GRAFICA.menta] }],
        },
        options: { plugins: { legend: { position: 'right' }, title: { display: true, text: 'Tareas por estado' } } },
      },
    },
    {
      hoja: hojaHerramientas,
      filaInicio: hojaHerramientas.rowCount + 2,
      hayDatos: herramientas.length > 0,
      config: (() => {
        const prestadas = herramientas.filter((h) => h.estado === 'PRESTADA').length;
        const disponibles = herramientas.filter((h) => h.estado === 'DISPONIBLE').length;
        const otro = herramientas.length - prestadas - disponibles;
        const labels = ['Prestadas', 'Disponibles'];
        const data = [prestadas, disponibles];
        const colores = [PALETA_GRAFICA.acero, PALETA_GRAFICA.menta];
        if (otro > 0) { labels.push('Otro (mantenimiento/perdida)'); data.push(otro); colores.push(PALETA_GRAFICA.crema); }
        return {
          type: 'doughnut',
          data: { labels, datasets: [{ data, backgroundColor: colores }] },
          options: { plugins: { legend: { position: 'right' }, title: { display: true, text: 'Estado de herramientas' } } },
        };
      })(),
    },
    {
      hoja: hojaPorTrabajador,
      filaInicio: hojaPorTrabajador.rowCount + 2,
      hayDatos: resumenPorTrabajador.length > 0,
      config: (() => {
        const topOcho = [...resumenPorTrabajador].sort((a, b) => b.horas - a.horas).slice(0, 8);
        return {
          type: 'bar',
          data: { labels: topOcho.map((r) => r.nombre), datasets: [{ label: 'Horas trabajadas', data: topOcho.map((r) => r.horas), backgroundColor: PALETA_GRAFICA.menta }] },
          options: { indexAxis: 'y', plugins: { legend: { display: false }, title: { display: true, text: 'Horas trabajadas (top)' } } },
        };
      })(),
    },
    {
      hoja: hojaPersonal,
      filaInicio: hojaPersonal.rowCount + 2,
      hayDatos: personal.length > 0,
      config: {
        type: 'doughnut',
        data: {
          labels: ['Admin', 'Supervisor', 'Trabajador'],
          datasets: [{
            data: [
              personal.filter((p) => p.rol === 'ADMIN').length,
              personal.filter((p) => p.rol === 'SUPERVISOR').length,
              personal.filter((p) => p.rol === 'TRABAJADOR').length,
            ],
            backgroundColor: [PALETA_GRAFICA.marino, PALETA_GRAFICA.acero, PALETA_GRAFICA.menta],
          }],
        },
        options: { plugins: { legend: { position: 'right' }, title: { display: true, text: 'Personal por rol' } } },
      },
    },
    {
      hoja: hojaObras,
      filaInicio: hojaObras.rowCount + 2,
      hayDatos: obras.length > 0,
      config: {
        type: 'doughnut',
        data: {
          labels: ['Planificada', 'En curso', 'Pausada', 'Finalizada'],
          datasets: [{
            data: ['PLANIFICADA', 'EN_CURSO', 'PAUSADA', 'FINALIZADA'].map((e) => obras.filter((o) => o.estado === e).length),
            backgroundColor: [PALETA_GRAFICA.crema, PALETA_GRAFICA.menta, PALETA_GRAFICA.acero, PALETA_GRAFICA.marino],
          }],
        },
        options: { plugins: { legend: { position: 'right' }, title: { display: true, text: 'Obras por estado' } } },
      },
    },
  ];

  await Promise.all(
    graficasPendientes.map(async (g) => {
      if (g.hayDatos) g.buffer = await generarImagenGrafica(g.config);
    })
  );

  graficasPendientes.forEach((g) => insertarGrafica(libro, g.hoja, g.filaInicio, g));

  const buffer = await libro.xlsx.writeBuffer();
  const nombreArchivo = `Gokron_${empresa.nombre.replace(/\s+/g, '_')}_${ETIQUETA_PERIODO[p]}.xlsx`;
  return { buffer, nombreArchivo };
}

module.exports = { generarLibroExcel };
