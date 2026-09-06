import React, { useEffect, useState } from 'react';
import { api } from '../api.js';

const etiquetaEstado = {
  PENDIENTE: 'estado-planificada',
  EN_PROGRESO: 'estado-en-curso',
  COMPLETADA: 'estado-finalizada',
};

export default function Tareas() {
  const [tareas, setTareas] = useState([]);
  const [obras, setObras] = useState([]);
  const [personal, setPersonal] = useState([]);
  const [error, setError] = useState('');
  const [mostrarForm, setMostrarForm] = useState(false);

  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [obraId, setObraId] = useState('');
  const [asignadoId, setAsignadoId] = useState('');
  const [fechaLimite, setFechaLimite] = useState('');

  async function cargar() {
    try {
      const [t, o, p] = await Promise.all([api.listarTareas(), api.listarObras(), api.listarPersonal()]);
      setTareas(t);
      setObras(o);
      setPersonal(p.filter((persona) => persona.activo));
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => { cargar(); }, []);

  async function crear(e) {
    e.preventDefault();
    setError('');
    try {
      await api.crearTarea({
        titulo,
        descripcion,
        obraId,
        asignadoId: asignadoId || undefined,
        fechaLimite: fechaLimite || undefined,
      });
      setTitulo('');
      setDescripcion('');
      setObraId('');
      setAsignadoId('');
      setFechaLimite('');
      setMostrarForm(false);
      cargar();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>Tareas y avance de obra</h2>
        <button className="boton-chico" onClick={() => { setMostrarForm((v) => !v); setError(''); }}>
          {mostrarForm ? 'Cancelar' : '+ Nueva tarea'}
        </button>
      </div>

      {mostrarForm && (
        <form onSubmit={crear} style={{ padding: '16px 20px', borderBottom: '1px solid var(--hueso-fuerte)' }}>
          <div className="campo">
            <label>Título</label>
            <input value={titulo} onChange={(e) => setTitulo(e.target.value)} required />
          </div>
          <div className="campo">
            <label>Descripción (opcional)</label>
            <input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
          </div>
          <div className="campo">
            <label>Obra</label>
            <select
              value={obraId}
              onChange={(e) => setObraId(e.target.value)}
              required
              style={selectEstilo}
            >
              <option value="">Selecciona una obra</option>
              {obras.map((o) => (
                <option key={o.id} value={o.id}>{o.nombre}</option>
              ))}
            </select>
          </div>
          <div className="campo">
            <label>Asignar a (opcional)</label>
            <select
              value={asignadoId}
              onChange={(e) => setAsignadoId(e.target.value)}
              style={selectEstilo}
            >
              <option value="">Sin asignar todavía</option>
              {personal.map((p) => (
                <option key={p.id} value={p.id}>{p.nombre} ({p.rol})</option>
              ))}
            </select>
          </div>
          <div className="campo">
            <label>Fecha límite (opcional)</label>
            <input type="date" value={fechaLimite} onChange={(e) => setFechaLimite(e.target.value)} />
          </div>
          <button className="boton-primario" type="submit">Crear tarea</button>
        </form>
      )}

      {error && <div className="error-texto" style={{ padding: '12px 20px 0' }}>{error}</div>}

      {tareas.length === 0 ? (
        <div className="vacio">
          Todavía no hay tareas asignadas. Crea la primera arriba.
        </div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Tarea</th>
              <th>Obra</th>
              <th>Asignado a</th>
              <th>Estado</th>
              <th>Fecha límite</th>
              <th>Foto de avance</th>
            </tr>
          </thead>
          <tbody>
            {tareas.map((t) => (
              <tr key={t.id}>
                <td>{t.titulo}</td>
                <td>{t.obra?.nombre}</td>
                <td>{t.asignado?.nombre || '— sin asignar —'}</td>
                <td>
                  <span className={'etiqueta-estado ' + etiquetaEstado[t.estado]}>
                    {t.estado.replace('_', ' ').toLowerCase()}
                  </span>
                </td>
                <td className="dato-mono">
                  {t.fechaLimite ? new Date(t.fechaLimite).toLocaleDateString() : '—'}
                </td>
                <td>
                  {t.fotoEvidenciaUrl ? (
                    <img
                      src={t.fotoEvidenciaUrl}
                      alt="Avance de la tarea"
                      style={{ width: 60, height: 44, objectFit: 'cover', borderRadius: 4, cursor: 'pointer' }}
                      onClick={() => window.open(t.fotoEvidenciaUrl, '_blank')}
                    />
                  ) : (
                    <span style={{ color: 'var(--texto-secundario)', fontSize: 13 }}>—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const selectEstilo = {
  width: '100%',
  padding: '11px 12px',
  border: '1px solid var(--hueso-fuerte)',
  borderRadius: 3,
  fontSize: 15,
  fontFamily: 'inherit',
  background: 'white',
};
