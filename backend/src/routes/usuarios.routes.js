const express = require('express');
const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
const { autenticar, requireRol } = require('../middleware/auth');

const router = express.Router();
router.use(autenticar);

// Lista el personal de la empresa (para elegir "encargado" al marcar entrada,
// o para la pantalla de administración de Personal). Nunca expone el hash
// de contraseña. Por defecto solo trae activos; el admin puede pedir todos
// (incluyendo desactivados) con ?todos=1, para poder reactivarlos si hace falta.
router.get('/', async (req, res) => {
  const { rol, todos } = req.query;
  const verTodos = todos === '1' && req.user.rol === 'ADMIN';
  const usuarios = await prisma.usuario.findMany({
    where: {
      empresaId: req.user.empresaId,
      ...(verTodos ? {} : { activo: true }),
      ...(rol && { rol }),
    },
    select: { id: true, nombre: true, email: true, rol: true, activo: true },
    orderBy: { nombre: 'asc' },
  });
  res.json(usuarios);
});

// Editar el PROPIO perfil (nombre, correo, foto) — cualquier usuario
// autenticado puede usar esta ruta para editarse a sí mismo, sin importar
// su rol. Nunca permite cambiar el rol ni la empresa desde aquí.
router.patch('/me', async (req, res) => {
  const { nombre, email, fotoUrl } = req.body;
  const data = {};

  if (nombre) data.nombre = nombre;
  if (fotoUrl !== undefined) data.fotoUrl = fotoUrl;

  if (email) {
    const existente = await prisma.usuario.findUnique({ where: { email } });
    if (existente && existente.id !== req.user.userId) {
      return res.status(409).json({ error: 'Ese correo ya está en uso por otra cuenta' });
    }
    data.email = email;
  }

  if (Object.keys(data).length === 0) {
    return res.status(400).json({ error: 'No hay ningún cambio para guardar' });
  }

  const actualizado = await prisma.usuario.update({
    where: { id: req.user.userId },
    data,
  });

  res.json({
    id: actualizado.id,
    nombre: actualizado.nombre,
    email: actualizado.email,
    rol: actualizado.rol,
    fotoUrl: actualizado.fotoUrl,
  });
});

// Crear un trabajador o supervisor nuevo (solo el admin de la empresa puede hacerlo)
router.post('/', requireRol('ADMIN'), async (req, res) => {
  const { nombre, email, password, rol } = req.body;

  if (!nombre || !email || !password) {
    return res.status(400).json({ error: 'Nombre, correo y contraseña son obligatorios' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
  }

  const existente = await prisma.usuario.findUnique({ where: { email } });
  if (existente) {
    return res.status(409).json({ error: 'Ese correo ya está registrado' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const rolFinal = rol === 'SUPERVISOR' ? 'SUPERVISOR' : 'TRABAJADOR'; // nunca se crea otro ADMIN desde aquí

  const nuevoUsuario = await prisma.usuario.create({
    data: {
      empresaId: req.user.empresaId,
      nombre,
      email,
      passwordHash,
      rol: rolFinal,
    },
  });

  res.status(201).json({
    id: nuevoUsuario.id,
    nombre: nuevoUsuario.nombre,
    email: nuevoUsuario.email,
    rol: nuevoUsuario.rol,
    activo: nuevoUsuario.activo,
  });
});

// Activar o desactivar a un trabajador (para cuando alguien deja de trabajar
// en la empresa, sin borrar su historial de asistencia/tareas)
router.patch('/:id/estado', requireRol('ADMIN'), async (req, res) => {
  const { activo } = req.body;
  const resultado = await prisma.usuario.updateMany({
    where: { id: req.params.id, empresaId: req.user.empresaId },
    data: { activo: Boolean(activo) },
  });
  if (resultado.count === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json({ ok: true });
});

module.exports = router;
