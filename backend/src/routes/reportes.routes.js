const express = require('express');
const ExcelJS = require('exceljs');
const prisma = require('../lib/prisma');
const { autenticar } = require('../middleware/auth');
const { generarLibroExcel } = require('../lib/generarReporteExcel');

const router = express.Router();
router.use(autenticar);

// Colores de marca de Gokron, reutilizados también en el Excel para que se
// vea coherente con el resto de la app.
const COLOR_GRAFITO = 'FF131321';
const COLOR_MENTA = 'FF46F0D2';
const COLOR_HUESO = 'FFF5F6F8';
const COLOR_BLANCO = 'FFFFFFFF';

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

const ETIQUETA_PERIODO = { dia: 'Hoy', semana: 'Esta semana', mes: 'Este mes' };

// Consultas secuenciales (no Promise.all) a propósito: el plan gratis de
// Supabase limita el pool a 15 conexiones en total, compartidas entre este
// backend local y el de producción. Disparar 8 consultas en paralelo por
// cada carga de este reporte agotaba ese pool y tumbaba el servidor entero.
// Una a la vez usa como máximo 1-2 conexiones, a costa de ser un poco más
// lento.
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

// Trae el reporte de un período (para la vista en pantalla)
router.get('/', async (req, res) => {
  try {
    const periodo = ['dia', 'semana', 'mes'].includes(req.query.periodo) ? req.query.periodo : 'semana';
    const { desde, asistencias, movimientos, tareas, herramientas, prestamos } = await obtenerDatosCompletos(req.user.empresaId, periodo);

    const horasTrabajadas = asistencias.reduce((total, a) => {
      if (!a.checkOut) return total;
      return total + (new Date(a.checkOut) - new Date(a.checkIn)) / (1000 * 60 * 60);
    }, 0);
    const entradasMaterial = movimientos.filter((m) => m.tipo === 'ENTRADA').reduce((t, m) => t + m.cantidad, 0);
    const salidasMaterial = movimientos.filter((m) => m.tipo === 'SALIDA').reduce((t, m) => t + m.cantidad, 0);

    res.json({
      periodo,
      desde,
      hasta: new Date(),
      asistencia: { totalMarcaciones: asistencias.length, horasTrabajadas: Math.round(horasTrabajadas * 10) / 10 },
      materiales: { entradas: entradasMaterial, salidas: salidasMaterial },
      tareas: {
        pendientes: tareas.filter((t) => t.estado === 'PENDIENTE').length,
        enProgreso: tareas.filter((t) => t.estado === 'EN_PROGRESO').length,
        completadas: tareas.filter((t) => t.estado === 'COMPLETADA').length,
      },
      herramientas: {
        totalCatalogo: herramientas.length,
        prestadasAhora: herramientas.filter((h) => h.estado === 'PRESTADA').length,
        entregasEnPeriodo: prestamos.length,
        devolucionesEnPeriodo: prestamos.filter((p) => p.fechaDevolucion).length,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'No se pudo calcular el reporte' });
  }
});

router.patch('/frecuencia', async (req, res) => {
  const { frecuencia } = req.body;
  if (!['DIARIO', 'SEMANAL', 'MENSUAL'].includes(frecuencia)) {
    return res.status(400).json({ error: 'Frecuencia inválida' });
  }
  try {
    await prisma.empresa.update({ where: { id: req.user.empresaId }, data: { frecuenciaReporte: frecuencia } });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'No se pudo guardar la frecuencia' });
  }
});

// ---------- Exportar a Excel, con diseño profesional ----------

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
  hoja.addRow([]); // fila en blanco antes de la tabla
}

router.get('/exportar', async (req, res) => {
  try {
    const periodo = ['dia', 'semana', 'mes'].includes(req.query.periodo) ? req.query.periodo : 'semana';
    const { buffer, nombreArchivo } = await generarLibroExcel(req.user.empresaId, periodo);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}"`);
    res.send(Buffer.from(buffer));
  } catch (err) {
    console.error(err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'No se pudo generar el archivo Excel' });
    } else {
      res.end();
    }
  }
});

module.exports = router;
