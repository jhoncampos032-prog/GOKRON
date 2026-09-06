const express = require('express');
const prisma = require('../lib/prisma');
const { autenticar, requireRol } = require('../middleware/auth');

const router = express.Router();
router.use(autenticar);

// Listar materiales de la empresa, con alerta de stock bajo
router.get('/', async (req, res) => {
  const materiales = await prisma.material.findMany({
    where: { empresaId: req.user.empresaId },
  });
  const conAlerta = materiales.map((m) => ({
    ...m,
    stockBajo: m.stockActual <= m.stockMinimo,
  }));
  res.json(conAlerta);
});

// Crear un nuevo material en el catálogo
router.post('/', requireRol('ADMIN', 'SUPERVISOR'), async (req, res) => {
  const { nombre, unidad, stockMinimo, fotoUrl } = req.body;
  const material = await prisma.material.create({
    data: { empresaId: req.user.empresaId, nombre, unidad, stockMinimo: stockMinimo || 0, fotoUrl: fotoUrl || null },
  });
  res.status(201).json(material);
});

// Agregar o cambiar la foto de un material ya existente
router.patch('/:id/foto', requireRol('ADMIN', 'SUPERVISOR'), async (req, res) => {
  const { fotoUrl } = req.body;
  const resultado = await prisma.material.updateMany({
    where: { id: req.params.id, empresaId: req.user.empresaId },
    data: { fotoUrl: fotoUrl || null },
  });
  if (resultado.count === 0) return res.status(404).json({ error: 'Material no encontrado' });
  res.json({ ok: true });
});

// Registrar entrada/salida de material y actualizar el stock automáticamente
router.post('/:id/movimiento', async (req, res) => {
  const { obraId, tipo, cantidad, nota, fotoUrl } = req.body; // tipo: 'ENTRADA' | 'SALIDA'
  const materialId = req.params.id;

  const material = await prisma.material.findFirst({
    where: { id: materialId, empresaId: req.user.empresaId },
  });
  if (!material) return res.status(404).json({ error: 'Material no encontrado' });

  const delta = tipo === 'ENTRADA' ? cantidad : -cantidad;
  const nuevoStock = material.stockActual + delta;

  if (nuevoStock < 0) {
    return res.status(400).json({ error: 'No hay suficiente stock para esa salida' });
  }

  const [, movimiento] = await prisma.$transaction([
    prisma.material.update({ where: { id: materialId }, data: { stockActual: nuevoStock } }),
    prisma.movimientoMaterial.create({
      data: {
        empresaId: req.user.empresaId,
        materialId,
        obraId,
        usuarioId: req.user.userId,
        tipo,
        cantidad,
        nota,
        fotoUrl: fotoUrl || null,
      },
    }),
  ]);

  res.status(201).json({ movimiento, stockActual: nuevoStock });
});

// Historial completo de movimientos de materiales de la empresa, con
// el nombre del trabajador que lo registró y la obra correspondiente —
// así el dueño siempre sabe quién sacó o metió qué material.
router.get('/movimientos', async (req, res) => {
  const { materialId } = req.query;
  const movimientos = await prisma.movimientoMaterial.findMany({
    where: {
      empresaId: req.user.empresaId,
      ...(materialId && { materialId }),
    },
    include: {
      material: { select: { nombre: true, unidad: true } },
      obra: { select: { nombre: true } },
      usuario: { select: { nombre: true } },
    },
    orderBy: { fecha: 'desc' },
  });
  res.json(movimientos);
});

module.exports = router;
