// Cliente central de la API. Todas las páginas pasan por aquí,
// así que cambiar la URL del backend o el manejo de auth se hace en un solo lugar.

const API_URL = import.meta.env.VITE_API_URL || 'https://gokron-backend.onrender.com/api';

function getToken() {
  return localStorage.getItem('token');
}

async function request(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Error de conexión con el servidor');
  }
  return data;
}

export const api = {
  login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password } }),
  registroEmpresa: (payload) => request('/auth/registro-empresa', { method: 'POST', body: payload }),

  listarObras: () => request('/obras'),
  crearObra: (payload) => request('/obras', { method: 'POST', body: payload }),

  listarAsistencia: () => request('/asistencia'),

  listarMateriales: () => request('/materiales'),
  crearMaterial: (payload) => request('/materiales', { method: 'POST', body: payload }),
  registrarMovimiento: (materialId, payload) =>
    request(`/materiales/${materialId}/movimiento`, { method: 'POST', body: payload }),
  historialMovimientosMateriales: (materialId) =>
    request(`/materiales/movimientos${materialId ? `?materialId=${materialId}` : ''}`),
  actualizarFotoMaterial: (id, fotoUrl) => request(`/materiales/${id}/foto`, { method: 'PATCH', body: { fotoUrl } }),

  listarTareas: () => request('/tareas'),
  crearTarea: (payload) => request('/tareas', { method: 'POST', body: payload }),

  listarPersonal: () => request('/usuarios?todos=1'),
  crearTrabajador: (payload) => request('/usuarios', { method: 'POST', body: payload }),
  cambiarEstadoTrabajador: (id, activo) =>
    request(`/usuarios/${id}/estado`, { method: 'PATCH', body: { activo } }),

  listarHerramientas: () => request('/herramientas'),
  crearHerramienta: (payload) => request('/herramientas', { method: 'POST', body: payload }),
  prestarHerramienta: (id, payload) => request(`/herramientas/${id}/prestar`, { method: 'POST', body: payload }),
  devolverHerramienta: (id, payload) => request(`/herramientas/${id}/devolver`, { method: 'POST', body: payload }),
  historialHerramienta: (id) => request(`/herramientas/${id}/historial`),
  actualizarFotoHerramienta: (id, fotoUrl) => request(`/herramientas/${id}/foto`, { method: 'PATCH', body: { fotoUrl } }),
};

export { getToken };
