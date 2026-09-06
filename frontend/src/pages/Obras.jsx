import React, { useEffect, useState } from 'react';
import { api } from '../api.js';

const etiquetaEstado = {
  PLANIFICADA: 'estado-planificada',
  EN_CURSO: 'estado-en-curso',
  PAUSADA: 'estado-pausada',
  FINALIZADA: 'estado-finalizada',
};

export default function Obras() {
  const [obras, setObras] = useState([]);
  const [error, setError] = useState('');
  const [mostrarForm, setMostrarForm] = useState(false);
  const [modoMasivo, setModoMasivo] = useState(false);
  const [nombre, setNombre] = useState('');
  const [direccion, setDireccion] = useState('');
  const [latitud, setLatitud] = useState('');
  const [longitud, setLongitud] = useState('');
  const [textoMasivo, setTextoMasivo] = useState('');
  const [resultadoMasivo, setResultadoMasivo] = useState('');
  const [guardandoMasivo, setGuardandoMasivo] = useState(false);

  async function cargar() {
    try {
      setObras(await api.listarObras());
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => { cargar(); }, []);

  async function crear(e) {
    e.preventDefault();
    try {
      await api.crearObra({ nombre, direccion, latitud, longitud });
      setNombre('');
      setDireccion('');
      setLatitud('');
      setLongitud('');
      setMostrarForm(false);
      cargar();
    } catch (err) {
      setError(err.message);
    }
  }

  async function crearMasivo(e) {
    e.preventDefault();
    setError('');
    setResultadoMasivo('');
    const lineas = textoMasivo.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lineas.length === 0) {
      setError('Escribe al menos una línea con una obra.');
      return;
    }

    setGuardandoMasivo(true);
    let creados = 0;
    const fallidos = [];
    for (const linea of lineas) {
      const partes = linea.split(',').map((p) => p.trim());
      const [nombreItem, direccionItem, latItem, lngItem] = partes;
      if (!nombreItem) {
        fallidos.push(linea);
        continue;
      }
      try {
        await api.crearObra({
          nombre: nombreItem,
          direccion: direccionItem || undefined,
          latitud: latItem || undefined,
          longitud: lngItem || undefined,
        });
        creados += 1;
      } catch (err) {
        fallidos.push(linea);
      }
    }
    setGuardandoMasivo(false);
    setResultadoMasivo(
      `${creados} obra(s) creada(s) correctamente.` +
        (fallidos.length > 0 ? ` ${fallidos.length} línea(s) con error: ${fallidos.join(' | ')}` : '')
    );
    setTextoMasivo('');
    cargar();
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>Obras</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="boton-chico" onClick={() => { setModoMasivo((v) => !v); setMostrarForm(false); }}>
            {modoMasivo ? 'Cancelar' : '+ Agregar varias a la vez'}
          </button>
          <button className="boton-chico" onClick={() => { setMostrarForm((v) => !v); setModoMasivo(false); }}>
            {mostrarForm ? 'Cancelar' : '+ Nueva obra'}
          </button>
        </div>
      </div>

      {modoMasivo && (
        <form onSubmit={crearMasivo} style={{ padding: '16px 20px', borderBottom: '1px solid var(--hueso-fuerte)' }}>
          <div className="campo">
            <label>
              Una obra por línea, separado por comas: <strong>nombre, dirección, latitud, longitud</strong>
              <br />
              <span style={{ fontSize: 12, color: 'var(--texto-secundario)' }}>
                La dirección, latitud y longitud son opcionales — puedes dejarlas vacías si no las tienes todavía.
                <br />
                Ejemplo:<br />
                Edificio Central, Av. Principal 123, 19.4326, -99.1332<br />
                Casa Los Pinos, Calle 5 #45<br />
                Bodega Norte
              </span>
            </label>
            <textarea
              value={textoMasivo}
              onChange={(e) => setTextoMasivo(e.target.value)}
              rows={6}
              style={{
                width: '100%',
                padding: '11px 12px',
                border: '1px solid var(--hueso-fuerte)',
                borderRadius: 3,
                fontSize: 14,
                fontFamily: 'monospace',
              }}
              placeholder="Edificio Central, Av. Principal 123, 19.4326, -99.1332&#10;Casa Los Pinos, Calle 5 #45"
            />
          </div>
          <button className="boton-primario" type="submit" disabled={guardandoMasivo}>
            {guardandoMasivo ? 'Guardando...' : 'Crear todas'}
          </button>
          {resultadoMasivo && (
            <div style={{ marginTop: 10, fontSize: 13, color: 'var(--texto-secundario)' }}>{resultadoMasivo}</div>
          )}
        </form>
      )}

      {mostrarForm && (
        <form onSubmit={crear} style={{ padding: '16px 20px', borderBottom: '1px solid var(--hueso-fuerte)' }}>
          <div className="campo">
            <label>Nombre de la obra</label>
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} required />
          </div>
          <div className="campo">
            <label>Dirección</label>
            <input value={direccion} onChange={(e) => setDireccion(e.target.value)} />
          </div>
          <div className="campo">
            <label>
              Coordenadas GPS (opcional, pero necesario para verificar la ubicación al marcar entrada) —{' '}
              <a
                href="https://support.google.com/maps/answer/18539"
                target="_blank"
                rel="noreferrer"
                style={{ color: 'var(--acero)' }}
              >
                cómo obtenerlas en Google Maps
              </a>
            </label>
            <div style={{ display: 'flex', gap: 10 }}>
              <input
                placeholder="Latitud (ej: 19.4326)"
                value={latitud}
                onChange={(e) => setLatitud(e.target.value)}
              />
              <input
                placeholder="Longitud (ej: -99.1332)"
                value={longitud}
                onChange={(e) => setLongitud(e.target.value)}
              />
            </div>
          </div>
          <button className="boton-primario" type="submit">Guardar obra</button>
        </form>
      )}

      {error && <div className="error-texto" style={{ padding: '0 20px' }}>{error}</div>}

      {obras.length === 0 ? (
        <div className="vacio">Todavía no hay obras registradas. Crea la primera arriba.</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Dirección</th>
              <th>Estado</th>
              <th>Inicio</th>
              <th>Ubicación GPS</th>
            </tr>
          </thead>
          <tbody>
            {obras.map((o) => (
              <tr key={o.id}>
                <td>{o.nombre}</td>
                <td>{o.direccion || '—'}</td>
                <td>
                  <span className={'etiqueta-estado ' + etiquetaEstado[o.estado]}>
                    {o.estado.replace('_', ' ').toLowerCase()}
                  </span>
                </td>
                <td className="dato-mono">
                  {o.fechaInicio ? new Date(o.fechaInicio).toLocaleDateString() : '—'}
                </td>
                <td>
                  {o.latitud && o.longitud ? (
                    <span className="etiqueta-estado estado-ok">configurada</span>
                  ) : (
                    <span style={{ color: 'var(--texto-secundario)', fontSize: 13 }}>sin configurar</span>
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
