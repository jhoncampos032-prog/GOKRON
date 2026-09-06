const express = require('express');
const prisma = require('../lib/prisma');
const { autenticar, requireRol } = require('../middleware/auth');

const router = express.Router();
router.use(autenticar);

// Listar tareas (filtrable por obra o por el usuario asignado)
router.get('/', async (req, res) => {
  const { obraId, asignadoId } = req.query;
  const tareas = await prisma.tarea.findMany({
    where: {
      empresaId: req.user.empresaId,
      ...(obraId && { obraId }),
      ...(asignadoId && { asignadoId }),
    },
    include: { asignado: { select: { nombre: true } }, obra: { select: { nombre: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(tareas);
});

// Crear tarea (supervisores/admin asignan trabajo a los trabajadores)
router.post('/', requireRol('ADMIN', 'SUPERVISOR'), async (req, res) => {
  const { obraId, titulo, descripcion, asignadoId, fechaLimite } = req.body;
  const tarea = await prisma.tarea.create({
    data: {
      empresaId: req.user.empresaId,
      obraId,
      titulo,
      descripcion,
      asignadoId,
      fechaLimite: fechaLimite ? new Date(fechaLimite) : null,
    },
  });
  res.status(201).json(tarea);
});

// El trabajador actualiza el estado de su tarea (y puede subir evidencia fotográfica)
router.patch('/:id', async (req, res) => {
  const { estado, fotoEvidenciaUrl } = req.body;
  const resultado = await prisma.tarea.updateMany({
    where: { id: req.params.id, empresaId: req.user.empresaId },
    data: { ...(estado && { estado }), ...(fotoEvidenciaUrl && { fotoEvidenciaUrl }) },
  });
  if (resultado.count === 0) return res.status(404).json({ error: 'Tarea no encontrada' });
  res.json({ ok: true });
});

module.exports = router;
