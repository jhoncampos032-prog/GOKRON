const express = require('express');
const prisma = require('../lib/prisma');
const { autenticar, requireRol } = require('../middleware/auth');

const router = express.Router();
router.use(autenticar); // todas las rutas de obras requieren estar logueado

// Listar obras de la empresa del usuario logueado (aislamiento multi-empresa)
router.get('/', async (req, res) => {
  const obras = await prisma.obra.findMany({
    where: { empresaId: req.user.empresaId },
    orderBy: { createdAt: 'desc' },
  });
  res.json(obras);
});

// Crear obra (solo admin/supervisor)
router.post('/', requireRol('ADMIN', 'SUPERVISOR'), async (req, res) => {
  const { nombre, direccion, latitud, longitud, fechaInicio, fechaFinEstimada } = req.body;
  const obra = await prisma.obra.create({
    data: {
      empresaId: req.user.empresaId,
      nombre,
      direccion,
      latitud: latitud !== undefined && latitud !== '' ? Number(latitud) : null,
      longitud: longitud !== undefined && longitud !== '' ? Number(longitud) : null,
      fechaInicio: fechaInicio ? new Date(fechaInicio) : null,
      fechaFinEstimada: fechaFinEstimada ? new Date(fechaFinEstimada) : null,
    },
  });
  res.status(201).json(obra);
});

// Actualizar estado de una obra
router.patch('/:id/estado', requireRol('ADMIN', 'SUPERVISOR'), async (req, res) => {
  const { estado } = req.body;
  const obra = await prisma.obra.updateMany({
    where: { id: req.params.id, empresaId: req.user.empresaId },
    data: { estado },
  });
  if (obra.count === 0) return res.status(404).json({ error: 'Obra no encontrada' });
  res.json({ ok: true });
});

// Guardar/corregir la ubicación GPS de una obra (solo admin/supervisor,
// pensado para usarse desde el celular parado en el sitio real de trabajo).
// Los trabajadores nunca pueden tocar esto — así se mantiene la seguridad
// de que solo se puede marcar entrada en obras con ubicación verificada
// por alguien con autoridad para hacerlo.
router.patch('/:id/ubicacion', requireRol('ADMIN', 'SUPERVISOR'), async (req, res) => {
  const { latitud, longitud } = req.body;
  if (latitud == null || longitud == null) {
    return res.status(400).json({ error: 'Faltan las coordenadas de latitud y longitud' });
  }
  const obra = await prisma.obra.updateMany({
    where: { id: req.params.id, empresaId: req.user.empresaId },
    data: { latitud: Number(latitud), longitud: Number(longitud) },
  });
  if (obra.count === 0) return res.status(404).json({ error: 'Obra no encontrada' });
  res.json({ ok: true });
});

module.exports = router;
