import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import Kpi from '../components/Kpi.jsx';

export default function Resumen() {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    async function cargar() {
      try {
        const [obras, asistencia, materiales, tareas, herramientas] = await Promise.all([
          api.listarObras(),
          api.listarAsistencia(),
          api.listarMateriales(),
          api.listarTareas(),
          api.listarHerramientas(),
        ]);
        setDatos({ obras, asistencia, materiales, tareas, herramientas });
      } catch (err) {
        setError(err.message);
      }
    }
    cargar();
  }, []);

  if (error) return <div className="vacio">No se pudo cargar el resumen: {error}</div>;
  if (!datos) return <div className="vacio">Cargando…</div>;

  const obrasEnCurso = datos.obras.filter((o) => o.estado === 'EN_CURSO').length;
  const enObraAhora = datos.asistencia.filter((a) => !a.checkOut).length;
  const materialesBajos = datos.materiales.filter((m) => m.stockBajo).length;
  const tareasPendientes = datos.tareas.filter((t) => t.estado !== 'COMPLETADA').length;
  const herramientasPrestadas = datos.herramientas.filter((h) => h.estado === 'PRESTADA').length;

  return (
    <>
      <div className="kpis">
        <Kpi etiqueta="Obras en curso" valor={obrasEnCurso} />
        <Kpi etiqueta="Personal en obra ahora" valor={enObraAhora} />
        <Kpi etiqueta="Materiales con stock bajo" valor={materialesBajos} alerta={materialesBajos > 0} />
        <Kpi etiqueta="Tareas pendientes" valor={tareasPendientes} />
      </div>

      <div className="panel">
        <div className="panel-header">
          <h2>Inventario general</h2>
        </div>
        <table>
          <thead>
            <tr>
              <th>Tipo</th>
              <th>Total registrado</th>
              <th>Requiere atención</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Materiales (catálogo)</td>
              <td className="dato-mono">{datos.materiales.length}</td>
              <td>
                {materialesBajos > 0 ? (
                  <span className="etiqueta-estado estado-bajo">{materialesBajos} con stock bajo</span>
                ) : (
                  <span style={{ color: 'var(--texto-secundario)', fontSize: 13 }}>todo en orden</span>
                )}
              </td>
            </tr>
            <tr>
              <td>Herramientas (catálogo)</td>
              <td className="dato-mono">{datos.herramientas.length}</td>
              <td>
                {herramientasPrestadas > 0 ? (
                  <span className="etiqueta-estado estado-bajo">{herramientasPrestadas} prestadas ahora</span>
                ) : (
                  <span style={{ color: 'var(--texto-secundario)', fontSize: 13 }}>todas disponibles</span>
                )}
              </td>
            </tr>
          </tbody>
        </table>
        {herramientasPrestadas > 0 && (
          <div style={{ padding: '12px 20px', fontSize: 13, color: 'var(--texto-secundario)' }}>
            {datos.herramientas
              .filter((h) => h.estado === 'PRESTADA')
              .map((h) => (
                <div key={h.id}>
                  · <strong>{h.nombre}</strong> — con {h.prestamoActivo?.usuarioNombre} desde{' '}
                  {new Date(h.prestamoActivo?.fechaPrestamo).toLocaleDateString()}
                </div>
              ))}
          </div>
        )}
      </div>

      <div className="panel">
        <div className="panel-header">
          <h2>Actividad reciente de asistencia</h2>
        </div>
        {datos.asistencia.length === 0 ? (
          <div className="vacio">Todavía no hay registros de asistencia.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Trabajador</th>
                <th>Obra</th>
                <th>Entrada</th>
                <th>Salida</th>
              </tr>
            </thead>
            <tbody>
              {datos.asistencia.slice(0, 6).map((a) => (
                <tr key={a.id}>
                  <td>{a.usuario?.nombre}</td>
                  <td>{a.obra?.nombre}</td>
                  <td className="dato-mono">{new Date(a.checkIn).toLocaleString()}</td>
                  <td className="dato-mono">
                    {a.checkOut ? new Date(a.checkOut).toLocaleString() : '— en obra —'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
