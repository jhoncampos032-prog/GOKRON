const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

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

module.exports = router;
