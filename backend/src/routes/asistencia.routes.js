const express = require('express');
const prisma = require('../lib/prisma');
const { autenticar } = require('../middleware/auth');

const router = express.Router();
router.use(autenticar);

const DISTANCIA_MAXIMA_METROS = 150;

// Misma fórmula que usa la app móvil, para que la regla sea idéntica
// en los dos lados y no se pueda saltar llamando a la API directamente.
function calcularDistanciaMetros(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const rad = (x) => (x * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Check-in: el trabajador marca su llegada a la obra desde el celular
router.post('/checkin', async (req, res) => {
  const { obraId, lat, lng, nota, encargadoId } = req.body;

  // Evita doble check-in sin haber cerrado el anterior
  const abierta = await prisma.asistencia.findFirst({
    where: { usuarioId: req.user.userId, checkOut: null },
  });
  if (abierta) {
    return res.status(409).json({ error: 'Ya tienes una asistencia abierta, cierra el check-out primero' });
  }

  // Verificación real de ubicación en el servidor (no solo en la app):
  // si la obra tiene coordenadas configuradas, el check-in debe venir
  // desde dentro del radio permitido.
  const obra = await prisma.obra.findFirst({
    where: { id: obraId, empresaId: req.user.empresaId },
  });
  if (!obra) {
    return res.status(404).json({ error: 'Obra no encontrada' });
  }
  if (obra.latitud != null && obra.longitud != null) {
    if (lat == null || lng == null) {
      return res.status(400).json({ error: 'No se recibió tu ubicación GPS, es obligatoria para esta obra' });
    }
    const distancia = calcularDistanciaMetros(lat, lng, obra.latitud, obra.longitud);
    if (distancia > DISTANCIA_MAXIMA_METROS) {
      return res.status(403).json({
        error: `Estás a ${Math.round(distancia)} m de la obra. Debes estar a menos de ${DISTANCIA_MAXIMA_METROS} m para marcar entrada.`,
      });
    }
  }

  const asistencia = await prisma.asistencia.create({
    data: {
      empresaId: req.user.empresaId,
      usuarioId: req.user.userId,
      obraId,
      encargadoId: encargadoId || null,
      latCheckIn: lat,
      lngCheckIn: lng,
      notaCheckIn: nota,
    },
  });
  res.status(201).json(asistencia);
});

// Check-out: cierra la jornada
router.post('/checkout', async (req, res) => {
  const { lat, lng, nota } = req.body;

  const abierta = await prisma.asistencia.findFirst({
    where: { usuarioId: req.user.userId, checkOut: null },
  });
  if (!abierta) {
    return res.status(404).json({ error: 'No tienes una asistencia abierta' });
  }

  const asistencia = await prisma.asistencia.update({
    where: { id: abierta.id },
    data: { checkOut: new Date(), latCheckOut: lat, lngCheckOut: lng, notaCheckOut: nota },
  });
  res.json(asistencia);
});

// Listado de asistencias de la empresa (para el panel web de administración,
// o filtrado por usuarioId para el Time Card personal del trabajador)
router.get('/', async (req, res) => {
  const { obraId, usuarioId, desde, hasta } = req.query;
  const asistencias = await prisma.asistencia.findMany({
    where: {
      empresaId: req.user.empresaId,
      ...(obraId && { obraId }),
      ...(usuarioId && { usuarioId }),
      ...(desde || hasta
        ? { checkIn: { ...(desde && { gte: new Date(desde) }), ...(hasta && { lte: new Date(hasta) }) } }
        : {}),
    },
    include: { usuario: { select: { nombre: true } }, obra: { select: { nombre: true } }, encargado: { select: { nombre: true } } },
    orderBy: { checkIn: 'desc' },
  });
  res.json(asistencias);
});

module.exports = router;
