import React, { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function Asistencia() {
  const [registros, setRegistros] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api.listarAsistencia().then(setRegistros).catch((err) => setError(err.message));
  }, []);

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>Personal y asistencia</h2>
      </div>

      {error && <div className="error-texto" style={{ padding: '0 20px' }}>{error}</div>}

      {registros.length === 0 ? (
        <div className="vacio">
          Todavía no hay check-ins registrados desde la app móvil.
        </div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Trabajador</th>
              <th>Obra</th>
              <th>Entrada</th>
              <th>Salida</th>
              <th>Estado</th>
              <th>Nota</th>
            </tr>
          </thead>
          <tbody>
            {registros.map((r) => (
              <tr key={r.id}>
                <td>{r.usuario?.nombre}</td>
                <td>{r.obra?.nombre}</td>
                <td className="dato-mono">{new Date(r.checkIn).toLocaleString()}</td>
                <td className="dato-mono">
                  {r.checkOut ? new Date(r.checkOut).toLocaleString() : '—'}
                </td>
                <td>
                  <span className={'etiqueta-estado ' + (r.checkOut ? 'estado-finalizada' : 'estado-en-curso')}>
                    {r.checkOut ? 'jornada cerrada' : 'en obra'}
                  </span>
                </td>
                <td style={{ color: 'var(--texto-secundario)', fontSize: 13 }}>
                  {r.notaCheckIn || r.notaCheckOut || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
