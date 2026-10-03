const nodemailer = require('nodemailer');

// Robot de correo: usa una cuenta de Gmail + "contraseña de aplicación"
// (no la contraseña normal de la cuenta) solo para ENVIAR correos salientes,
// nunca para leer nada. Las credenciales viven solo en el .env del servidor.
const transportador = nodemailer.createTransport({
  service: 'gmail',
  // Si el servidor no deja salir por SMTP (pasa en planes gratis como el de
  // Render), falla rapido en vez de quedarse esperando minutos.
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 15000,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

async function enviarCorreoRecuperacion(destinatario, nombre, enlace) {
  await transportador.sendMail({
    from: `"Gokron" <${process.env.GMAIL_USER}>`,
    to: destinatario,
    subject: 'Recupera tu contraseña de Gokron',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #131321;">Hola${nombre ? ', ' + nombre : ''}</h2>
        <p>Pediste recuperar tu contraseña de Gokron. Haz clic en el siguiente botón para poner una contraseña nueva:</p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${enlace}" style="background: #46F0D2; color: #131321; padding: 12px 24px; border-radius: 4px; text-decoration: none; font-weight: bold;">
            Poner nueva contraseña
          </a>
        </p>
        <p style="color: #666; font-size: 13px;">Este enlace vale por 1 hora. Si tú no pediste esto, puedes ignorar este correo — tu contraseña actual sigue funcionando normal.</p>
      </div>
    `,
  });
}

module.exports = { enviarCorreoRecuperacion };
