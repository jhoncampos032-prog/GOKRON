const express = require('express');
const { google } = require('googleapis');
const { Readable } = require('stream');
const prisma = require('../lib/prisma');
const { autenticar } = require('../middleware/auth');
const { generarLibroExcel } = require('../lib/generarReporteExcel');

const router = express.Router();

function crearClienteOAuth() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

// Paso 1: el admin, desde el panel, pide conectar su Google Drive.
// Lo mandamos a la pantalla de permiso de Google. Guardamos el empresaId
// en el "state" para saber, cuando Google nos devuelva la respuesta, a
// cuál empresa pertenece esta autorización.
router.get('/conectar', autenticar, (req, res) => {
  // TEMPORAL: diagnóstico de invalid_client. Quitar después de confirmar.
  console.log('Longitud del Client ID:', process.env.GOOGLE_CLIENT_ID?.length);
  console.log('Client ID empieza con:', process.env.GOOGLE_CLIENT_ID?.substring(0, 10));
  const cliente = crearClienteOAuth();
  const url = cliente.generateAuthUrl({
    access_type: 'offline', // necesario para recibir un refresh_token reutilizable
    prompt: 'consent', // fuerza a que siempre entregue el refresh_token, no solo la primera vez
    scope: ['https://www.googleapis.com/auth/drive.file'],
    state: req.user.empresaId,
  });
  res.json({ url });
});

// Paso 2: Google redirige aquí después de que el usuario da "Permitir".
// Esta ruta NO lleva token de sesión normal (Google no lo manda), por
// eso la empresa se identifica con el "state" del paso 1.
router.get('/callback', async (req, res) => {
  const { code, state: empresaId } = req.query;
  if (!code || !empresaId) {
    return res.status(400).send('Falta información para completar la conexión con Google Drive.');
  }

  try {
    const cliente = crearClienteOAuth();

    // TEMPORAL: diagnóstico de invalid_client. Quitar después de confirmar.
    console.log('Longitud del Client Secret:', process.env.GOOGLE_CLIENT_SECRET?.length);
    console.log('Client Secret empieza con:', process.env.GOOGLE_CLIENT_SECRET?.substring(0, 8));

    let tokens;
    try {
      ({ tokens } = await cliente.getToken(code));
    } catch (err) {
      console.log('ERROR DETALLADO DE GOOGLE:', JSON.stringify(err.response?.data || err.message));
      throw err;
    }

    if (!tokens.refresh_token) {
      // Esto pasa si la empresa ya había autorizado antes y Google no
      // vuelve a mandar un refresh_token nuevo. Si no tenemos uno guardado
      // ya, hay que pedirle que revoque el acceso desde su cuenta de
      // Google y lo intente de nuevo.
      const empresaExistente = await prisma.empresa.findUnique({ where: { id: empresaId } });
      if (!empresaExistente?.googleDriveRefreshToken) {
        return res.status(400).send(
          'No se pudo completar la conexión. Ve a myaccount.google.com/permissions, quita el acceso de "Gokron", y vuelve a intentarlo.'
        );
      }
    } else {
      await prisma.empresa.update({
        where: { id: empresaId },
        data: { googleDriveRefreshToken: tokens.refresh_token, googleDriveConectado: true },
      });
    }

    // Página simple de confirmación (esto lo ve el navegador del admin)
    res.send(`
      <html><body style="font-family: sans-serif; text-align: center; padding: 60px;">
        <h2>✅ Google Drive conectado</h2>
        <p>Ya puedes cerrar esta pestaña y volver al panel de Gokron.</p>
      </body></html>
    `);
  } catch (err) {
    res.status(500).send('Ocurrió un error conectando con Google Drive: ' + err.message);
  }
});

// El panel consulta esto para saber si ya está conectado o no.
router.get('/estado', autenticar, async (req, res) => {
  const empresa = await prisma.empresa.findUnique({ where: { id: req.user.empresaId } });
  res.json({ conectado: !!empresa?.googleDriveConectado });
});

// Sube (o reemplaza) el archivo de reporte de HOY en el Drive de la
// empresa. Busca si ya existe un archivo con el mismo nombre y lo
// actualiza en vez de crear uno nuevo cada vez, para no llenar su Drive
// de copias repetidas.
async function subirReporteADrive(empresaId, periodo) {
  const empresa = await prisma.empresa.findUnique({ where: { id: empresaId } });
  if (!empresa?.googleDriveConectado || !empresa.googleDriveRefreshToken) {
    return { subido: false, razon: 'Esta empresa no tiene Google Drive conectado' };
  }

  const cliente = crearClienteOAuth();
  cliente.setCredentials({ refresh_token: empresa.googleDriveRefreshToken });
  const drive = google.drive({ version: 'v3', auth: cliente });

  const { buffer, nombreArchivo } = await generarLibroExcel(empresaId, periodo);

  const existentes = await drive.files.list({
    q: `name='${nombreArchivo}' and trashed=false`,
    fields: 'files(id)',
  });

  const media = { mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', body: Readable.from(buffer) };

  if (existentes.data.files.length > 0) {
    await drive.files.update({ fileId: existentes.data.files[0].id, media });
  } else {
    await drive.files.create({
      requestBody: { name: nombreArchivo },
      media,
    });
  }

  return { subido: true };
}

// Ruta protegida con una llave secreta (no con sesión de usuario), pensada
// para que un servicio externo gratuito (como GitHub Actions o cron-job.org)
// la llame una vez al día y actualice el Drive de TODAS las empresas
// conectadas. Esto evita depender de que el propio servidor este despierto
// en un momento programado, ya que en el plan gratis se apaga solo.
router.post('/actualizar-todas', async (req, res) => {
  if (req.headers['x-cron-secret'] !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  const empresas = await prisma.empresa.findMany({ where: { googleDriveConectado: true } });
  const resultados = [];
  for (const empresa of empresas) {
    try {
      await subirReporteADrive(empresa.id, 'semana');
      resultados.push({ empresa: empresa.nombre, ok: true });
    } catch (err) {
      resultados.push({ empresa: empresa.nombre, ok: false, error: err.message });
    }
  }
  res.json({ actualizadas: resultados.length, resultados });
});

// El admin también puede pedir la actualización manual, de una vez, desde el panel.
router.post('/actualizar-ahora', autenticar, async (req, res) => {
  const periodo = ['dia', 'semana', 'mes'].includes(req.body.periodo) ? req.body.periodo : 'semana';
  try {
    const resultado = await subirReporteADrive(req.user.empresaId, periodo);
    res.json(resultado);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
