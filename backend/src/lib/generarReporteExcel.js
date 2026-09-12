const ExcelJS = require('exceljs');
const prisma = require('./prisma');

const COLOR_GRAFITO = 'FF131321';
const COLOR_MENTA = 'FF46F0D2';
const COLOR_HUESO = 'FFF5F6F8';
const COLOR_BLANCO = 'FFFFFFFF';

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

async function obtenerDatosCompletos(empresaId, periodo) {
  const desde = inicioDelPeriodo(periodo);

  const [empresa, asistencias, movimientos, tareas, herramientas, prestamos, personal, obras] = await Promise.all([
    prisma.empresa.findUnique({ where: { id: empresaId } }),
    prisma.asistencia.findMany({
      where: { empresaId, checkIn: { gte: desde } },
      include: { usuario: { select: { nombre: true } }, obra: { select: { nombre: true } } },
      orderBy: { checkIn: 'desc' },
    }),
    prisma.movimientoMaterial.findMany({
      where: { empresaId, fecha: { gte: desde } },
      include: {
        material: { select: { nombre: true, unidad: true } },
        usuario: { select: { nombre: true } },
        obra: { select: { nombre: true } },
      },
      orderBy: { fecha: 'desc' },
    }),
    prisma.tarea.findMany({
      where: { empresaId },
      include: { obra: { select: { nombre: true } }, asignado: { select: { nombre: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.herramienta.findMany({ where: { empresaId } }),
    prisma.prestamoHerramienta.findMany({
      where: { empresaId, fechaPrestamo: { gte: desde } },
      include: { herramienta: { select: { nombre: true } }, usuario: { select: { nombre: true } }, obra: { select: { nombre: true } } },
      orderBy: { fechaPrestamo: 'desc' },
    }),
    prisma.usuario.findMany({
      where: { empresaId },
      select: { nombre: true, email: true, rol: true, activo: true, createdAt: true },
      orderBy: { nombre: 'asc' },
    }),
    prisma.obra.findMany({
      where: { empresaId },
      select: { nombre: true, direccion: true, estado: true, fechaInicio: true },
      orderBy: { nombre: 'asc' },
    }),
  ]);

  return { empresa, desde, asistencias, movimientos, tareas, herramientas, prestamos, personal, obras };
}

function estilizarEncabezado(fila) {
  fila.eachCell((celda) => {
    celda.font = { bold: true, color: { argb: COLOR_BLANCO }, size: 11 };
    celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_GRAFITO } };
    celda.alignment = { vertical: 'middle', horizontal: 'left' };
    celda.border = { bottom: { style: 'thin', color: { argb: COLOR_GRAFITO } } };
  });
  fila.height = 22;
}

function agregarTituloHoja(hoja, texto, subtexto) {
  hoja.mergeCells('A1:F1');
  const celdaTitulo = hoja.getCell('A1');
  celdaTitulo.value = texto;
  celdaTitulo.font = { bold: true, size: 16, color: { argb: COLOR_GRAFITO } };
  hoja.getRow(1).height = 28;

  hoja.mergeCells('A2:F2');
  const celdaSub = hoja.getCell('A2');
  celdaSub.value = subtexto;
  celdaSub.font = { italic: true, size: 10, color: { argb: 'FF666666' } };
  hoja.addRow([]);
}

function colorearFilaAlternada(fila, i) {
  fila.eachCell((celda) => {
    celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: i % 2 === 0 ? COLOR_BLANCO : COLOR_HUESO } };
  });
}

// Genera el libro de Excel completo con las 8 hojas, y devuelve el
// contenido en memoria (buffer) listo para descargar o subir a Drive,
// junto con el nombre de archivo sugerido.
async function generarLibroExcel(empresaId, periodo) {
  const p = ['dia', 'semana', 'mes'].includes(periodo) ? periodo : 'semana';
  const { empresa, desde, asistencias, movimientos, tareas, herramientas, prestamos, personal, obras } =
    await obtenerDatosCompletos(empresaId, p);

  const libro = new (require('exceljs')).Workbook();
  libro.creator = 'Gokron';
  libro.created = new Date();

  const subtitulo = `${empresa.nombre} · Período: ${ETIQUETA_PERIODO[p].replace('_', ' ')} (desde ${desde.toLocaleDateString('es')}) · Generado el ${new Date().toLocaleString('es')}`;

  // Hoja 1: Resumen
  const hojaResumen = libro.addWorksheet('Resumen', { properties: { tabColor: { argb: COLOR_MENTA } } });
  agregarTituloHoja(hojaResumen, `Reporte Gokron — ${empresa.nombre}`, subtitulo);
  hojaResumen.columns = [{ width: 32 }, { width: 20 }];

  const horasTrabajadas = asistencias.reduce((total, a) => {
    if (!a.checkOut) return total;
    return total + (new Date(a.checkOut) - new Date(a.checkIn)) / (1000 * 60 * 60);
  }, 0);
  const entradasMaterial = movimientos.filter((m) => m.tipo === 'ENTRADA').reduce((t, m) => t + m.cantidad, 0);
  const salidasMaterial = movimientos.filter((m) => m.tipo === 'SALIDA').reduce((t, m) => t + m.cantidad, 0);

  estilizarEncabezado(hojaResumen.addRow(['Indicador', 'Valor']));
  [
    ['Marcaciones de asistencia', asistencias.length],
    ['Horas trabajadas', Math.round(horasTrabajadas * 10) / 10],
    ['Materiales — entradas', entradasMaterial],
    ['Materiales — salidas', salidasMaterial],
    ['Tareas pendientes', tareas.filter((t) => t.estado === 'PENDIENTE').length],
    ['Tareas en progreso', tareas.filter((t) => t.estado === 'EN_PROGRESO').length],
    ['Tareas completadas', tareas.filter((t) => t.estado === 'COMPLETADA').length],
    ['Herramientas en catálogo', herramientas.length],
    ['Herramientas prestadas ahora', herramientas.filter((h) => h.estado === 'PRESTADA').length],
    ['Entregas de herramientas en el período', prestamos.length],
  ].forEach((datos, i) => colorearFilaAlternada(hojaResumen.addRow(datos), i));

  // Hoja 2: Asistencia
  const hojaAsistencia = libro.addWorksheet('Asistencia', { properties: { tabColor: { argb: COLOR_MENTA } } });
  agregarTituloHoja(hojaAsistencia, 'Asistencia', subtitulo);
  hojaAsistencia.columns = [{ width: 22 }, { width: 22 }, { width: 20 }, { width: 20 }, { width: 12 }];
  estilizarEncabezado(hojaAsistencia.addRow(['Trabajador', 'Obra', 'Entrada', 'Salida', 'Horas']));
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

  // Hoja 3: Materiales
  const hojaMateriales = libro.addWorksheet('Materiales', { properties: { tabColor: { argb: COLOR_MENTA } } });
  agregarTituloHoja(hojaMateriales, 'Movimientos de materiales', subtitulo);
  hojaMateriales.columns = [{ width: 22 }, { width: 12 }, { width: 12 }, { width: 20 }, { width: 20 }, { width: 24 }];
  estilizarEncabezado(hojaMateriales.addRow(['Material', 'Tipo', 'Cantidad', 'Trabajador', 'Obra', 'Fecha']));
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

  // Hoja 4: Tareas
  const hojaTareas = libro.addWorksheet('Tareas', { properties: { tabColor: { argb: COLOR_MENTA } } });
  agregarTituloHoja(hojaTareas, 'Tareas', subtitulo);
  hojaTareas.columns = [{ width: 28 }, { width: 20 }, { width: 20 }, { width: 16 }];
  estilizarEncabezado(hojaTareas.addRow(['Tarea', 'Obra', 'Asignado a', 'Estado']));
  tareas.forEach((t, i) => {
    colorearFilaAlternada(
      hojaTareas.addRow([t.titulo, t.obra?.nombre || '—', t.asignado?.nombre || 'Sin asignar', t.estado.replace('_', ' ')]),
      i
    );
  });

  // Hoja 5: Herramientas
  const hojaHerramientas = libro.addWorksheet('Herramientas', { properties: { tabColor: { argb: COLOR_MENTA } } });
  agregarTituloHoja(hojaHerramientas, 'Movimientos de herramientas', subtitulo);
  hojaHerramientas.columns = [{ width: 24 }, { width: 20 }, { width: 20 }, { width: 20 }, { width: 20 }];
  estilizarEncabezado(hojaHerramientas.addRow(['Herramienta', 'Entregada a', 'Obra', 'Fecha entrega', 'Fecha devolución']));
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

  // Hoja 6: Resumen por trabajador
  const hojaPorTrabajador = libro.addWorksheet('Por trabajador', { properties: { tabColor: { argb: COLOR_MENTA } } });
  agregarTituloHoja(hojaPorTrabajador, 'Resumen por trabajador', subtitulo);
  hojaPorTrabajador.columns = [{ width: 26 }, { width: 18 }, { width: 18 }, { width: 18 }];
  estilizarEncabezado(hojaPorTrabajador.addRow(['Trabajador', 'Marcaciones', 'Horas trabajadas', 'Tareas completadas']));
  const nombresConDatos = new Set([
    ...asistencias.map((a) => a.usuario?.nombre).filter(Boolean),
    ...tareas.filter((t) => t.estado === 'COMPLETADA').map((t) => t.asignado?.nombre).filter(Boolean),
  ]);
  Array.from(nombresConDatos).sort().forEach((nombre, i) => {
    const asistenciasDeEstaPersona = asistencias.filter((a) => a.usuario?.nombre === nombre);
    const horasDeEstaPersona = asistenciasDeEstaPersona.reduce((total, a) => {
      if (!a.checkOut) return total;
      return total + (new Date(a.checkOut) - new Date(a.checkIn)) / (1000 * 60 * 60);
    }, 0);
    const tareasCompletadasDeEstaPersona = tareas.filter(
      (t) => t.estado === 'COMPLETADA' && t.asignado?.nombre === nombre
    ).length;
    colorearFilaAlternada(
      hojaPorTrabajador.addRow([nombre, asistenciasDeEstaPersona.length, Math.round(horasDeEstaPersona * 10) / 10, tareasCompletadasDeEstaPersona]),
      i
    );
  });

  // Hoja 7: Personal
  const hojaPersonal = libro.addWorksheet('Personal', { properties: { tabColor: { argb: COLOR_MENTA } } });
  agregarTituloHoja(hojaPersonal, 'Personal registrado', subtitulo);
  hojaPersonal.columns = [{ width: 26 }, { width: 28 }, { width: 16 }, { width: 12 }, { width: 16 }];
  estilizarEncabezado(hojaPersonal.addRow(['Nombre', 'Correo', 'Rol', 'Activo', 'Registrado desde']));
  personal.forEach((p3, i) => {
    colorearFilaAlternada(
      hojaPersonal.addRow([p3.nombre, p3.email, p3.rol, p3.activo ? 'Sí' : 'No', new Date(p3.createdAt).toLocaleDateString('es')]),
      i
    );
  });

  // Hoja 8: Obras
  const hojaObras = libro.addWorksheet('Obras', { properties: { tabColor: { argb: COLOR_MENTA } } });
  agregarTituloHoja(hojaObras, 'Obras registradas', subtitulo);
  hojaObras.columns = [{ width: 26 }, { width: 32 }, { width: 16 }, { width: 16 }];
  estilizarEncabezado(hojaObras.addRow(['Obra', 'Dirección', 'Estado', 'Fecha de inicio']));
  obras.forEach((o, i) => {
    colorearFilaAlternada(
      hojaObras.addRow([o.nombre, o.direccion || '—', o.estado.replace('_', ' '), o.fechaInicio ? new Date(o.fechaInicio).toLocaleDateString('es') : '—']),
      i
    );
  });

  const buffer = await libro.xlsx.writeBuffer();
  const nombreArchivo = `Gokron_${empresa.nombre.replace(/\s+/g, '_')}_${ETIQUETA_PERIODO[p]}.xlsx`;
  return { buffer, nombreArchivo };
}

module.exports = { generarLibroExcel };
