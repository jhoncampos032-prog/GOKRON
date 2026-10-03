const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const prisma = require('../lib/prisma');
const { enviarCorreoRecuperacion } = require('../lib/correo');

const router = express.Router();

// Crea una nueva empresa cliente + su primer usuario administrador.
// Esto es lo que usarás cada vez que "vendas" el sistema a una nueva constructora.
router.post('/registro-empresa', async (req, res) => {
  try {
    const { nombreEmpresa, nombreAdmin, email, password } = req.body;

    if (!nombreEmpresa || !nombreAdmin || !email || !password) {
      return res.status(400).json({ error: 'Faltan datos obligatorios' });
    }

    const existente = await prisma.usuario.findUnique({ where: { email } });
    if (existente) {
      return res.status(409).json({ error: 'Ese correo ya está registrado' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const empresa = await prisma.empresa.create({
      data: {
        nombre: nombreEmpresa,
        usuarios: {
          create: {
            nombre: nombreAdmin,
            email,
            passwordHash,
            rol: 'ADMIN',
          },
        },
      },
      include: { usuarios: true },
    });

    res.status(201).json({
      empresa: { id: empresa.id, nombre: empresa.nombre },
      admin: { id: empresa.usuarios[0].id, email: empresa.usuarios[0].email },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al registrar la empresa' });
  }
});

// Login: devuelve un JWT con userId, empresaId y rol.
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const usuario = await prisma.usuario.findUnique({
      where: { email },
      include: { empresa: { select: { nombre: true } } },
    });

    if (!usuario || !usuario.activo) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const passwordOk = await bcrypt.compare(password, usuario.passwordHash);
    if (!passwordOk) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = jwt.sign(
      { userId: usuario.id, empresaId: usuario.empresaId, rol: usuario.rol },
      process.env.JWT_SECRET,
      { expiresIn: '12h' }
    );

    res.json({
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
        fotoUrl: usuario.fotoUrl,
        empresaNombre: usuario.empresa.nombre,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});

// Paso 1: el usuario pide recuperar su contraseña con solo su correo.
// Siempre responde igual (haya o no una cuenta con ese correo) para no
// revelar qué correos están registrados en el sistema.
router.post('/olvide-password', async (req, res) => {
  const { email } = req.body;
  const mensaje = { ok: true, mensaje: 'Si ese correo está registrado, te enviamos un enlace para recuperar tu contraseña.' };

  if (!email) return res.status(400).json({ error: 'Falta el correo' });

  try {
    const usuario = await prisma.usuario.findUnique({ where: { email } });
    if (!usuario || !usuario.activo) {
      return res.json(mensaje); // mismo mensaje, no delatamos si el correo existe o no
    }

    const token = crypto.randomBytes(32).toString('hex');
    const resetTokenExpira = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    await prisma.usuario.update({
      where: { id: usuario.id },
      data: { resetToken: token, resetTokenExpira },
    });

    const enlace = `${process.env.FRONTEND_URL}/restablecer-password?token=${token}`;
    // El correo se envia sin esperar su resultado: asi la respuesta es igual
    // de rapida exista o no el usuario (no se puede adivinar quien esta
    // registrado) y un servidor de correo lento no deja la peticion colgada.
    enviarCorreoRecuperacion(usuario.email, usuario.nombre, enlace).catch((err) => {
      console.error('No se pudo enviar el correo de recuperación:', err.message);
    });

    res.json(mensaje);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'No se pudo procesar la solicitud' });
  }
});

// Paso 2: el usuario llega desde el enlace del correo con el token, y manda
// su contraseña nueva.
router.post('/restablecer-password', async (req, res) => {
  const { token, passwordNueva } = req.body;

  if (!token || !passwordNueva) {
    return res.status(400).json({ error: 'Faltan datos' });
  }
  if (passwordNueva.length < 6) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
  }

  try {
    const usuario = await prisma.usuario.findFirst({
      where: { resetToken: token, resetTokenExpira: { gt: new Date() } },
    });

    if (!usuario) {
      return res.status(400).json({ error: 'El enlace no es válido o ya venció. Pide uno nuevo.' });
    }

    const passwordHash = await bcrypt.hash(passwordNueva, 10);
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: { passwordHash, resetToken: null, resetTokenExpira: null },
    });

    res.json({ ok: true, mensaje: 'Tu contraseña se actualizó. Ya puedes iniciar sesión.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'No se pudo actualizar la contraseña' });
  }
});

module.exports = router;
