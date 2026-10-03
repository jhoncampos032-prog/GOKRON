require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth.routes');
const obrasRoutes = require('./routes/obras.routes');
const asistenciaRoutes = require('./routes/asistencia.routes');
const materialesRoutes = require('./routes/materiales.routes');
const tareasRoutes = require('./routes/tareas.routes');
const usuariosRoutes = require('./routes/usuarios.routes');
const herramientasRoutes = require('./routes/herramientas.routes');

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));

// Salud del servicio (útil para monitoreo cuando esto esté en producción)
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/obras', obrasRoutes);
app.use('/api/asistencia', asistenciaRoutes);
app.use('/api/materiales', materialesRoutes);
app.use('/api/tareas', tareasRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/herramientas', herramientasRoutes);
app.use('/api/empresa', require('./routes/empresa.routes'));
app.use('/api/radio', require('./routes/radio.routes'));
app.use('/api/reportes', require('./routes/reportes.routes'));
app.use('/api/auth/google-drive', require('./routes/googleDrive.routes'));

// Manejo de errores no capturados
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`API de gestión para constructoras corriendo en el puerto ${PORT}`);
});
