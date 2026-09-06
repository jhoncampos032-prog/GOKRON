import React, { useEffect, useState, useRef } from 'react';
import { api } from '../api.js';

function leerArchivoComoBase64(archivo) {
  return new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onload = () => resolve(lector.result);
    lector.onerror = reject;
    lector.readAsDataURL(archivo);
  });
}

const selectEstilo = {
  width: '100%',
  padding: '9px 10px',
  border: '1px solid var(--hueso-fuerte)',
  borderRadius: 3,
  fontSize: 14,
  fontFamily: 'inherit',
  background: 'white',
};

export default function Herramientas() {
  const [herramientas, setHerramientas] = useState([]);
  const [personal, setPersonal] = useState([]);
  const [obras, setObras] = useState([]);
  const [error, setError] = useState('');
  const [mostrarForm, setMostrarForm] = useState(false);
  const [nombre, setNombre] = useState('');
  const [codigo, setCodigo] = useState('');
  const [yaPrestada, setYaPrestada] = useState(false);
  const [usuarioIdInicial, setUsuarioIdInicial] = useState('');
  const [obraIdInicial, setObraIdInicial] = useState('');
  const [fotoNueva, setFotoNueva] = useState(null);
  const inputsFotoFila = useRef({});

  // Fila que tiene abierto el mini-formulario de prestar/devolver
  const [filaActiva, setFilaActiva] = useState(null);
  const [usuarioId, setUsuarioId] = useState('');
  const [obraId, setObraId] = useState('');
  const [nota, setNota] = useState('');

  const [modoMasivo, setModoMasivo] = useState(false);
  const [textoMasivo, setTextoMasivo] = useState('');
  const [resultadoMasivo, setResultadoMasivo] = useState('');
  const [guardandoMasivo, setGuardandoMasivo] = useState(false);

  async function cargar() {
    try {
      const [h, p, o] = await Promise.all([api.listarHerramientas(), api.listarPersonal(), api.listarObras()]);
      setHerramientas(h);
      setPersonal(p.filter((persona) => persona.activo));
      setObras(o);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => { cargar(); }, []);

  async function manejarFotoNueva(e) {
    const archivo = e.target.files[0];
    if (!archivo) return;
    try {
      const base64 = await leerArchivoComoBase64(archivo);
      setFotoNueva(base64);
    } catch (err) {
      setError('No se pudo leer la imagen.');
    }
  }

  async function cambiarFotoExistente(herramientaId, e) {
    const archivo = e.target.files[0];
    if (!archivo) return;
    try {
      const base64 = await leerArchivoComoBase64(archivo);
      await api.actualizarFotoHerramienta(herramientaId, base64);
      cargar();
    } catch (err) {
      setError(err.message);
    }
  }

  async function crear(e) {
    e.preventDefault();
    setError('');
    try {
      const nueva = await api.crearHerramienta({ nombre, codigo, fotoUrl: fotoNueva || undefined });
      if (yaPrestada && usuarioIdInicial) {
        await api.prestarHerramienta(nueva.id, {
          usuarioId: usuarioIdInicial,
          obraId: obraIdInicial || undefined,
          nota: 'Registrada como ya prestada al momento de agregarla al catálogo',
        });
      }
      setNombre('');
      setCodigo('');
      setYaPrestada(false);
      setUsuarioIdInicial('');
      setObraIdInicial('');
      setFotoNueva(null);
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
      setError('Escribe al menos una línea con una herramienta.');
      return;
    }

    setGuardandoMasivo(true);
    let creados = 0;
    const fallidos = [];
    for (const linea of lineas) {
      const partes = linea.split(',').map((p) => p.trim());
      const [nombreItem, codigoItem] = partes;
      if (!nombreItem) {
        fallidos.push(linea);
        continue;
      }
      try {
        await api.crearHerramienta({ nombre: nombreItem, codigo: codigoItem || undefined });
        creados += 1;
      } catch (err) {
        fallidos.push(linea);
      }
    }
    setGuardandoMasivo(false);
    setResultadoMasivo(
      `${creados} herramienta(s) creada(s) correctamente.` +
        (fallidos.length > 0 ? ` ${fallidos.length} línea(s) con error: ${fallidos.join(' | ')}` : '')
    );
    setTextoMasivo('');
    cargar();
  }

  function abrirPrestar(id) {
    setFilaActiva({ id, modo: 'prestar' });
    setUsuarioId('');
    setObraId('');
    setNota('');
  }

  function abrirDevolver(id) {
    setFilaActiva({ id, modo: 'devolver' });
    setNota('');
  }

  async function confirmarPrestamo(id) {
    setError('');
    try {
      await api.prestarHerramienta(id, { usuarioId, obraId: obraId || undefined, nota: nota || undefined });
      setFilaActiva(null);
      cargar();
    } catch (err) {
      setError(err.message);
    }
  }

  async function confirmarDevolucion(id) {
    setError('');
    try {
      await api.devolverHerramienta(id, { nota: nota || undefined });
      setFilaActiva(null);
      cargar();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>Herramientas</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="boton-chico" onClick={() => { setModoMasivo((v) => !v); setMostrarForm(false); setError(''); }}>
            {modoMasivo ? 'Cancelar' : '+ Agregar varias a la vez'}
          </button>
          <button className="boton-chico" onClick={() => { setMostrarForm((v) => !v); setModoMasivo(false); setError(''); }}>
            {mostrarForm ? 'Cancelar' : '+ Nueva herramienta'}
          </button>
        </div>
      </div>

      {modoMasivo && (
        <form onSubmit={crearMasivo} style={{ padding: '16px 20px', borderBottom: '1px solid var(--hueso-fuerte)' }}>
          <div className="campo">
            <label>
              Una herramienta por línea, separado por comas: <strong>nombre, código (opcional)</strong>
              <br />
              <span style={{ fontSize: 12, color: 'var(--texto-secundario)' }}>
                Ejemplo:<br />
                Taladro, TAL-001<br />
                Amoladora, AMO-002<br />
                Nivel láser
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
              placeholder="Taladro, TAL-001&#10;Amoladora, AMO-002"
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
            <label>Nombre</label>
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} required />
          </div>
          <div className="campo">
            <label>Código o número de serie (opcional)</label>
            <input value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="Ej: TAL-003" />
          </div>

          <div className="campo">
            <label>Foto (opcional)</label>
            <input type="file" accept="image/*" onChange={manejarFotoNueva} />
            {fotoNueva && (
              <img src={fotoNueva} alt="Vista previa" style={{ width: 80, height: 60, objectFit: 'cover', borderRadius: 4, marginTop: 8 }} />
            )}
          </div>

          <div className="campo" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              id="yaPrestada"
              checked={yaPrestada}
              onChange={(e) => setYaPrestada(e.target.checked)}
              style={{ width: 16, height: 16 }}
            />
            <label htmlFor="yaPrestada" style={{ marginBottom: 0, cursor: 'pointer' }}>
              Ya está en manos de alguien (registrarla directo como prestada)
            </label>
          </div>

          {yaPrestada && (
            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12, color: 'var(--texto-secundario)' }}>¿Quién la tiene?</label>
                <select value={usuarioIdInicial} onChange={(e) => setUsuarioIdInicial(e.target.value)} style={selectEstilo} required={yaPrestada}>
                  <option value="">Selecciona un trabajador</option>
                  {personal.map((p) => (
                    <option key={p.id} value={p.id}>{p.nombre} ({p.rol})</option>
                  ))}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12, color: 'var(--texto-secundario)' }}>Obra (opcional)</label>
                <select value={obraIdInicial} onChange={(e) => setObraIdInicial(e.target.value)} style={selectEstilo}>
                  <option value="">Sin especificar</option>
                  {obras.map((o) => (
                    <option key={o.id} value={o.id}>{o.nombre}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <button className="boton-primario" type="submit">Guardar herramienta</button>
        </form>
      )}

      {error && <div className="error-texto" style={{ padding: '12px 20px 0' }}>{error}</div>}

      {herramientas.length === 0 ? (
        <div className="vacio">Todavía no hay herramientas en el catálogo. Crea la primera arriba.</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Foto</th>
              <th>Herramienta</th>
              <th>Código</th>
              <th>Estado</th>
              <th>En manos de</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {herramientas.map((h) => (
              <React.Fragment key={h.id}>
                <tr>
                  <td>
                    <div style={{ position: 'relative', width: 44, height: 44 }}>
                      {h.fotoUrl ? (
                        <img
                          src={h.fotoUrl}
                          alt={h.nombre}
                          style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 4, cursor: 'pointer' }}
                          onClick={() => inputsFotoFila.current[h.id]?.click()}
                        />
                      ) : (
                        <button
                          className="boton-chico"
                          style={{ width: 44, height: 44, padding: 0, fontSize: 16 }}
                          onClick={() => inputsFotoFila.current[h.id]?.click()}
                          title="Agregar foto"
                        >
                          📷
                        </button>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        ref={(el) => (inputsFotoFila.current[h.id] = el)}
                        onChange={(e) => cambiarFotoExistente(h.id, e)}
                      />
                    </div>
                  </td>
                  <td>{h.nombre}</td>
                  <td className="dato-mono" style={{ fontSize: 13 }}>{h.codigo || '—'}</td>
                  <td>
                    <span className={'etiqueta-estado ' + (h.estado === 'PRESTADA' ? 'estado-bajo' : 'estado-ok')}>
                      {h.estado.toLowerCase()}
                    </span>
                  </td>
                  <td style={{ fontSize: 13 }}>
                    {h.prestamoActivo ? (
                      <>
                        <strong>{h.prestamoActivo.usuarioNombre}</strong>
                        {h.prestamoActivo.obraNombre && <> · {h.prestamoActivo.obraNombre}</>}
                        <br />
                        <span className="dato-mono" style={{ color: 'var(--texto-secundario)' }}>
                          desde {new Date(h.prestamoActivo.fechaPrestamo).toLocaleDateString()}
                        </span>
                      </>
                    ) : (
                      <span style={{ color: 'var(--texto-secundario)' }}>—</span>
                    )}
                  </td>
                  <td>
                    {h.estado === 'PRESTADA' ? (
                      <button className="boton-chico" onClick={() => abrirDevolver(h.id)}>Devolver</button>
                    ) : h.estado === 'DISPONIBLE' ? (
                      <button className="boton-chico" onClick={() => abrirPrestar(h.id)}>Prestar</button>
                    ) : null}
                  </td>
                </tr>

                {filaActiva?.id === h.id && filaActiva.modo === 'prestar' && (
                  <tr>
                    <td colSpan={6} style={{ background: 'var(--hueso)', padding: 16 }}>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                        <div style={{ minWidth: 180 }}>
                          <label style={{ fontSize: 12, color: 'var(--texto-secundario)' }}>Prestar a</label>
                          <select value={usuarioId} onChange={(e) => setUsuarioId(e.target.value)} style={selectEstilo}>
                            <option value="">Selecciona un trabajador</option>
                            {personal.map((p) => (
                              <option key={p.id} value={p.id}>{p.nombre} ({p.rol})</option>
                            ))}
                          </select>
                        </div>
                        <div style={{ minWidth: 180 }}>
                          <label style={{ fontSize: 12, color: 'var(--texto-secundario)' }}>Obra (opcional)</label>
                          <select value={obraId} onChange={(e) => setObraId(e.target.value)} style={selectEstilo}>
                            <option value="">Sin especificar</option>
                            {obras.map((o) => (
                              <option key={o.id} value={o.id}>{o.nombre}</option>
                            ))}
                          </select>
                        </div>
                        <div style={{ flex: 1, minWidth: 180 }}>
                          <label style={{ fontSize: 12, color: 'var(--texto-secundario)' }}>Nota (opcional)</label>
                          <input value={nota} onChange={(e) => setNota(e.target.value)} style={selectEstilo} />
                        </div>
                        <button className="boton-primario" style={{ width: 'auto', padding: '9px 18px' }} onClick={() => confirmarPrestamo(h.id)}>
                          Confirmar préstamo
                        </button>
                        <button className="boton-chico" onClick={() => setFilaActiva(null)}>Cancelar</button>
                      </div>
                    </td>
                  </tr>
                )}

                {filaActiva?.id === h.id && filaActiva.modo === 'devolver' && (
                  <tr>
                    <td colSpan={6} style={{ background: 'var(--hueso)', padding: 16 }}>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: 180 }}>
                          <label style={{ fontSize: 12, color: 'var(--texto-secundario)' }}>
                            Nota de devolución (opcional, ej. estado de la herramienta)
                          </label>
                          <input value={nota} onChange={(e) => setNota(e.target.value)} style={selectEstilo} />
                        </div>
                        <button className="boton-primario" style={{ width: 'auto', padding: '9px 18px' }} onClick={() => confirmarDevolucion(h.id)}>
                          Confirmar devolución
                        </button>
                        <button className="boton-chico" onClick={() => setFilaActiva(null)}>Cancelar</button>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
