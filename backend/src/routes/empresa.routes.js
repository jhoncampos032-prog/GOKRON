const express = require('express');
const prisma = require('../lib/prisma');
const { autenticar, requireRol } = require('../middleware/auth');

const router = express.Router();
router.use(autenticar);

const CAMPOS_OPCIONALES = ['ruc', 'direccion', 'ciudad', 'telefono', 'emailContacto', 'sitioWeb'];
const SELECCION = { id: true, nombre: true, plan: true, ruc: true, direccion: true, ciudad: true, telefono: true, emailContacto: true, sitioWeb: true };

// Datos de la empresa del usuario logueado (cualquier rol puede verlos).
router.get('/', async (req, res) => {
  try {
    const empresa = await prisma.empresa.findUnique({ where: { id: req.user.empresaId }, select: SELECCION });
    if (!empresa) return res.status(404).json({ error: 'Empresa no encontrada' });
    res.json(empresa);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'No se pudieron cargar los datos de la empresa' });
  }
});

// Solo el ADMIN puede editar la informacion de su empresa.
router.patch('/', requireRol('ADMIN'), async (req, res) => {
  const data = {};

  if (req.body.nombre !== undefined) {
    const nombre = String(req.body.nombre).trim();
    if (!nombre) return res.status(400).json({ error: 'El nombre de la empresa no puede estar vacío' });
    data.nombre = nombre;
  }

  for (const campo of CAMPOS_OPCIONALES) {
    if (req.body[campo] !== undefined) {
      const valor = String(req.body[campo]).trim();
      data[campo] = valor === '' ? null : valor;
    }
  }

  try {
    const empresa = await prisma.empresa.update({ where: { id: req.user.empresaId }, data, select: SELECCION });
    res.json(empresa);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'No se pudo guardar la información' });
  }
});

module.exports = router;
