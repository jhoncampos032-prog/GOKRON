const express = require('express');
const prisma = require('../lib/prisma');
const { autenticar, requireRol } = require('../middleware/auth');

const router = express.Router();
router.use(autenticar);

// Lista el catálogo de herramientas, incluyendo quién tiene cada una
// prestada ahora mismo (si aplica). Si usuarioId es null, significa que
// se entregó a "Oficina / Compañía" en vez de a una persona específica.
router.get('/', async (req, res) => {
  const herramientas = await prisma.herramienta.findMany({
    where: { empresaId: req.user.empresaId },
    include: {
      prestamos: {
        where: { fechaDevolucion: null },
        include: {
          usuario: { select: { nombre: true } },
          obra: { select: { nombre: true } },
        },
      },
    },
    orderBy: { nombre: 'asc' },
  });

  const conPrestamoActivo = herramientas.map((h) => ({
    id: h.id,
    nombre: h.nombre,
    codigo: h.codigo,
    fotoUrl: h.fotoUrl,
    estado: h.estado,
    createdAt: h.createdAt,
    prestamoActivo: h.prestamos[0]
      ? {
          id: h.prestamos[0].id,
          usuarioNombre: h.prestamos[0].usuario?.nombre || null,
          esOficina: h.prestamos[0].usuarioId == null,
          obraNombre: h.prestamos[0].obra?.nombre || null,
          fechaPrestamo: h.prestamos[0].fechaPrestamo,
          notaPrestamo: h.prestamos[0].notaPrestamo,
          fotoPrestamoUrl: h.prestamos[0].fotoPrestamoUrl,
        }
      : null,
  }));

  res.json(conPrestamoActivo);
});

// Crear una herramienta nueva en el catálogo (solo admin/supervisor)
router.post('/', requireRol('ADMIN', 'SUPERVISOR'), async (req, res) => {
  const { nombre, codigo, fotoUrl } = req.body;
  if (!nombre) return res.status(400).json({ error: 'El nombre es obligatorio' });

  const herramienta = await prisma.herramienta.create({
    data: { empresaId: req.user.empresaId, nombre, codigo: codigo || null, fotoUrl: fotoUrl || null },
  });
  res.status(201).json(herramienta);
});

// Agregar o cambiar la foto de una herramienta ya existente
router.patch('/:id/foto', requireRol('ADMIN', 'SUPERVISOR'), async (req, res) => {
  const { fotoUrl } = req.body;
  const resultado = await prisma.herramienta.updateMany({
    where: { id: req.params.id, empresaId: req.user.empresaId },
    data: { fotoUrl: fotoUrl || null },
  });
  if (resultado.count === 0) return res.status(404).json({ error: 'Herramienta no encontrada' });
  res.json({ ok: true });
});

// Registrar la entrega: a quién se le entrega (una persona concreta, o a
// "Oficina/Compañía" dejando usuarioId vacío), y opcionalmente en qué obra
router.post('/:id/prestar', async (req, res) => {
  const { usuarioId, entregarAOficina, obraId, nota, fotoUrl } = req.body;
  const herramientaId = req.params.id;

  if (!usuarioId && !entregarAOficina) {
    return res.status(400).json({ error: 'Selecciona a quién se le entrega la herramienta, o marca que es para la oficina' });
  }

  const herramienta = await prisma.herramienta.findFirst({
    where: { id: herramientaId, empresaId: req.user.empresaId },
  });
  if (!herramienta) return res.status(404).json({ error: 'Herramienta no encontrada' });
  if (herramienta.estado === 'PRESTADA') {
    return res.status(409).json({ error: 'Esta herramienta ya está entregada. Regístrala como regresada primero.' });
  }

  const [, prestamo] = await prisma.$transaction([
    prisma.herramienta.update({ where: { id: herramientaId }, data: { estado: 'PRESTADA' } }),
    prisma.prestamoHerramienta.create({
      data: {
        empresaId: req.user.empresaId,
        herramientaId,
        usuarioId: entregarAOficina ? null : usuarioId,
        obraId: obraId || null,
        notaPrestamo: nota || null,
        fotoPrestamoUrl: fotoUrl || null,
      },
    }),
  ]);

  res.status(201).json(prestamo);
});

// Registrar la devolución: cierra el préstamo activo y deja la herramienta disponible
router.post('/:id/devolver', async (req, res) => {
  const { nota, fotoUrl } = req.body;
  const herramientaId = req.params.id;

  const prestamoActivo = await prisma.prestamoHerramienta.findFirst({
    where: { herramientaId, empresaId: req.user.empresaId, fechaDevolucion: null },
    orderBy: { fechaPrestamo: 'desc' },
  });
  if (!prestamoActivo) {
    return res.status(404).json({ error: 'Esta herramienta no tiene un préstamo activo' });
  }

  const [, prestamoCerrado] = await prisma.$transaction([
    prisma.herramienta.update({ where: { id: herramientaId }, data: { estado: 'DISPONIBLE' } }),
    prisma.prestamoHerramienta.update({
      where: { id: prestamoActivo.id },
      data: { fechaDevolucion: new Date(), notaDevolucion: nota || null, fotoDevolucionUrl: fotoUrl || null },
    }),
  ]);

  res.json(prestamoCerrado);
});

// Historial completo de préstamos de una herramienta (quién la ha tenido antes)
router.get('/:id/historial', async (req, res) => {
  const herramientaId = req.params.id;
  const historial = await prisma.prestamoHerramienta.findMany({
    where: { herramientaId, empresaId: req.user.empresaId },
    include: {
      usuario: { select: { nombre: true } },
      obra: { select: { nombre: true } },
    },
    orderBy: { fechaPrestamo: 'desc' },
  });
  res.json(historial);
});

module.exports = router;
