const express = require('express');
const { RtcTokenBuilder, RtcRole } = require('agora-token');
const prisma = require('../lib/prisma');
const { autenticar } = require('../middleware/auth');

const router = express.Router();
router.use(autenticar);

const DURACION_TOKEN_SEGUNDOS = 3600; // el permiso dura 1 hora, luego hay que pedir uno nuevo

function generarToken(canal) {
  const appId = process.env.AGORA_APP_ID;
  const appCertificate = process.env.AGORA_APP_CERTIFICATE;
  if (!appId || !appCertificate) {
    throw new Error('El radio todavía no está configurado en el servidor (faltan las llaves de Agora)');
  }

  const uid = 0; // 0 = el cliente puede unirse con cualquier identificador propio
  const ahora = Math.floor(Date.now() / 1000);
  const expiracion = ahora + DURACION_TOKEN_SEGUNDOS;

  const token = RtcTokenBuilder.buildTokenWithUid(appId, appCertificate, canal, uid, RtcRole.PUBLISHER, expiracion, expiracion);
  return { token, appId, canal, expiraEn: expiracion };
}

// Canal de OBRA: cualquiera de la misma empresa puede pedir entrar al canal
// de una obra real de su empresa (todos los que estan ahi se escuchan).
router.post('/canal-obra', async (req, res) => {
  const { obraId } = req.body;
  if (!obraId) return res.status(400).json({ error: 'Falta indicar la obra' });

  const obra = await prisma.obra.findFirst({
    where: { id: obraId, empresaId: req.user.empresaId },
  });
  if (!obra) return res.status(404).json({ error: 'Obra no encontrada' });

  try {
    const resultado = generarToken(`obra-${obraId}`);
    res.json({ ...resultado, nombreCanal: obra.nombre });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Canal DIRECTO: llamada uno a uno entre dos personas de la misma empresa.
// El nombre del canal se arma igual sin importar quien lo pida primero,
// para que ambos terminen en el mismo canal.
router.post('/canal-directo', async (req, res) => {
  const { otroUsuarioId } = req.body;
  if (!otroUsuarioId) return res.status(400).json({ error: 'Falta indicar a quien llamar' });

  const otroUsuario = await prisma.usuario.findFirst({
    where: { id: otroUsuarioId, empresaId: req.user.empresaId, activo: true },
  });
  if (!otroUsuario) return res.status(404).json({ error: 'Esa persona no existe o no pertenece a tu empresa' });

  const par = [req.user.userId, otroUsuarioId].sort();
  const canal = `directo-${par[0]}-${par[1]}`;

  try {
    const resultado = generarToken(canal);
    res.json({ ...resultado, nombreCanal: otroUsuario.nombre });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
