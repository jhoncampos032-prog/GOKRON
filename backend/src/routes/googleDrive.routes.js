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
    const { tokens } = await cliente.getToken(code);

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

  const MIME_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  const media = { mimeType: MIME_XLSX, body: Readable.from(buffer) };

  // Si ya existe un archivo con este nombre, lo borramos y creamos uno
  // nuevo limpio, en vez de "actualizarlo" — porque si ese archivo viejo
  // ya se habia guardado convertido a Google Sheets (perdiendo el diseño),
  // actualizarlo lo volveria a convertir otra vez, sin arreglar nada.
  for (const archivoViejo of existentes.data.files) {
    await drive.files.delete({ fileId: archivoViejo.id });
  }

  await drive.files.create({
    // mimeType explícito en los metadatos (no solo en "media") para que
    // Drive guarde el archivo tal cual, como Excel real, y NO lo
    // convierta a su formato nativo de Google Sheets — esa conversión es
    // la que estaba perdiendo los colores y el diseño del reporte.
    requestBody: { name: nombreArchivo, mimeType: MIME_XLSX },
    media,
  });

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
