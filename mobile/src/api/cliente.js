
import AsyncStorage from '@react-native-async-storage/async-storage';

// Cambia esto por la URL real de tu backend desplegado antes de compilar para producción.
const API_URL = 'http://192.168.1.169:4000/api';

const CLAVE_TOKEN = '@constructora/token';
const CLAVE_USUARIO = '@constructora/usuario';
const CLAVE_COLA = '@constructora/cola_pendiente';

export async function guardarSesion(token, usuario) {
  await AsyncStorage.setItem(CLAVE_TOKEN, token);
  await AsyncStorage.setItem(CLAVE_USUARIO, JSON.stringify(usuario));
}

export async function obtenerSesion() {
  const token = await AsyncStorage.getItem(CLAVE_TOKEN);
  const usuarioRaw = await AsyncStorage.getItem(CLAVE_USUARIO);
  return { token, usuario: usuarioRaw ? JSON.parse(usuarioRaw) : null };
}

export async function cerrarSesion() {
  await AsyncStorage.multiRemove([CLAVE_TOKEN, CLAVE_USUARIO]);
}

async function peticion(path, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Error de conexión con el servidor');
  return data;
}

// ----- Cola local para cuando no hay señal en obra -----
// En construcción es común quedarse sin datos/wifi. En vez de perder el
// check-in del trabajador, lo guardamos localmente y lo reintentamos
// automáticamente la próxima vez que la app detecte conexión.

async function encolar(accion) {
  const colaRaw = await AsyncStorage.getItem(CLAVE_COLA);
  const cola = colaRaw ? JSON.parse(colaRaw) : [];
  cola.push({ ...accion, intentadoEn: new Date().toISOString() });
  await AsyncStorage.setItem(CLAVE_COLA, JSON.stringify(cola));
}

export async function sincronizarPendientes(token) {
  const colaRaw = await AsyncStorage.getItem(CLAVE_COLA);
  const cola = colaRaw ? JSON.parse(colaRaw) : [];
  if (cola.length === 0) return { sincronizados: 0 };

  const restantes = [];
  let sincronizados = 0;

  for (const accion of cola) {
    try {
      await peticion(accion.path, { method: accion.method, body: accion.body, token });
      sincronizados += 1;
    } catch (err) {
      restantes.push(accion); // si sigue fallando, se queda en la cola para el próximo intento
    }
  }

  await AsyncStorage.setItem(CLAVE_COLA, JSON.stringify(restantes));
  return { sincronizados, pendientes: restantes.length };
}

// Envuelve una acción crítica (check-in/checkout) con guardado local si falla la red.
async function peticionConRespaldo(path, opciones) {
  try {
    return await peticion(path, opciones);
  } catch (err) {
    // Si es un error de red (no de validación del servidor), lo guardamos para reintentar.
    const esErrorDeRed = err.message === 'Network request failed' || err.message.includes('conexión');
    if (esErrorDeRed) {
      await encolar({ path, method: opciones.method, body: opciones.body });
      return { guardadoLocalmente: true };
    }
    throw err;
  }
}

export const api = {
  login: (email, password) => peticion('/auth/login', { method: 'POST', body: { email, password } }),

  listarObras: (token) => peticion('/obras', { token }),
  guardarUbicacionObra: (token, obraId, lat, lng) =>
    peticion(`/obras/${obraId}/ubicacion`, { method: 'PATCH', body: { latitud: lat, longitud: lng }, token }),

  checkIn: (token, obraId, lat, lng, nota, encargadoId) =>
    peticionConRespaldo('/asistencia/checkin', { method: 'POST', body: { obraId, lat, lng, nota, encargadoId }, token }),
  checkOut: (token, lat, lng, nota) =>
    peticionConRespaldo('/asistencia/checkout', { method: 'POST', body: { lat, lng, nota }, token }),

  // Personal de la empresa (para elegir "encargado" al marcar entrada)
  listarEncargados: (token) => peticion('/usuarios?rol=SUPERVISOR', { token }),
  actualizarPerfil: (token, payload) => peticion('/usuarios/me', { method: 'PATCH', body: payload, token }),

  // Personal completo (cualquier rol), para elegir a quien se le presta una herramienta
  listarPersonalTodos: (token) => peticion('/usuarios', { token }),
  listarHerramientas: (token) => peticion('/herramientas', { token }),
  prestarHerramienta: (token, id, payload) =>
    peticionConRespaldo(`/herramientas/${id}/prestar`, { method: 'POST', body: payload, token }),
  devolverHerramienta: (token, id, payload) =>
    peticionConRespaldo(`/herramientas/${id}/devolver`, { method: 'POST', body: payload, token }),

  // Historial personal de horas trabajadas (Time Card)
  historialAsistencia: (token, usuarioId) =>
    peticion(`/asistencia?usuarioId=${usuarioId}`, { token }),

  listarTareas: (token, asignadoId) =>
    peticion(`/tareas${asignadoId ? `?asignadoId=${asignadoId}` : ''}`, { token }),
  actualizarTarea: (token, tareaId, cambios) =>
    peticionConRespaldo(`/tareas/${tareaId}`, { method: 'PATCH', body: cambios, token }),

  listarMateriales: (token) => peticion('/materiales', { token }),
  registrarMovimiento: (token, materialId, payload) =>
    peticionConRespaldo(`/materiales/${materialId}/movimiento`, { method: 'POST', body: payload, token }),
};