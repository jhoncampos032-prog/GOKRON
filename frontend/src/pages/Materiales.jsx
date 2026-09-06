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

export default function Materiales() {
  const [materiales, setMateriales] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [error, setError] = useState('');
  const [mostrarForm, setMostrarForm] = useState(false);
  const [modoMasivo, setModoMasivo] = useState(false);
  const [nombre, setNombre] = useState('');
  const [unidad, setUnidad] = useState('');
  const [stockMinimo, setStockMinimo] = useState(0);
  const [fotoNueva, setFotoNueva] = useState(null);
  const [textoMasivo, setTextoMasivo] = useState('');
  const [resultadoMasivo, setResultadoMasivo] = useState('');
  const [guardandoMasivo, setGuardandoMasivo] = useState(false);
  const inputsFotoFila = useRef({});

  async function cargar() {
    try {
      const [m, mov] = await Promise.all([api.listarMateriales(), api.historialMovimientosMateriales()]);
      setMateriales(m);
      setMovimientos(mov);
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

  async function crear(e) {
    e.preventDefault();
    try {
      await api.crearMaterial({ nombre, unidad, stockMinimo: Number(stockMinimo), fotoUrl: fotoNueva || undefined });
      setNombre('');
      setUnidad('');
      setStockMinimo(0);
      setFotoNueva(null);
      setMostrarForm(false);
      cargar();
    } catch (err) {
      setError(err.message);
    }
  }

  async function cambiarFotoExistente(materialId, e) {
    const archivo = e.target.files[0];
    if (!archivo) return;
    try {
      const base64 = await leerArchivoComoBase64(archivo);
      await api.actualizarFotoMaterial(materialId, base64);
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
      setError('Escribe al menos una línea con un material.');
      return;
    }

    setGuardandoMasivo(true);
    let creados = 0;
    const fallidos = [];
    for (const linea of lineas) {
      const partes = linea.split(',').map((p) => p.trim());
      const [nombreItem, unidadItem, stockMinItem] = partes;
      if (!nombreItem || !unidadItem) {
        fallidos.push(linea);
        continue;
      }
      try {
        await api.crearMaterial({ nombre: nombreItem, unidad: unidadItem, stockMinimo: Number(stockMinItem) || 0 });
        creados += 1;
      } catch (err) {
        fallidos.push(linea);
      }
    }
    setGuardandoMasivo(false);
    setResultadoMasivo(
      `${creados} material(es) creado(s) correctamente.` +
        (fallidos.length > 0 ? ` ${fallidos.length} línea(s) con error: ${fallidos.join(' | ')}` : '')
    );
    setTextoMasivo('');
    cargar();
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>Materiales</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="boton-chico" onClick={() => { setModoMasivo((v) => !v); setMostrarForm(false); }}>
            {modoMasivo ? 'Cancelar' : '+ Agregar varios a la vez'}
          </button>
          <button className="boton-chico" onClick={() => { setMostrarForm((v) => !v); setModoMasivo(false); }}>
            {mostrarForm ? 'Cancelar' : '+ Nuevo material'}
          </button>
        </div>
      </div>

      {modoMasivo && (
        <form onSubmit={crearMasivo} style={{ padding: '16px 20px', borderBottom: '1px solid var(--hueso-fuerte)' }}>
          <div className="campo">
            <label>
              Un material por línea, separado por comas: <strong>nombre, unidad, stock mínimo</strong>
              <br />
              <span style={{ fontSize: 12, color: 'var(--texto-secundario)' }}>
                (La carga masiva no permite foto — agrégala después con el ícono 📷 en la tabla)
                <br />
                Ejemplo:<br />
                Cemento, sacos, 20<br />
                Arena, m3, 5<br />
                Varilla 3/8, unidades, 50
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
              placeholder="Cemento, sacos, 20&#10;Arena, m3, 5"
            />
          </div>
          <button className="boton-primario" type="submit" disabled={guardandoMasivo}>
            {guardandoMasivo ? 'Guardando...' : 'Crear todos'}
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
            <label>Unidad (ej: sacos, kg, m3)</label>
            <input value={unidad} onChange={(e) => setUnidad(e.target.value)} required />
          </div>
          <div className="campo">
            <label>Stock mínimo de alerta</label>
            <input type="number" value={stockMinimo} onChange={(e) => setStockMinimo(e.target.value)} />
          </div>
          <div className="campo">
            <label>Foto (opcional)</label>
            <input type="file" accept="image/*" onChange={manejarFotoNueva} />
            {fotoNueva && (
              <img src={fotoNueva} alt="Vista previa" style={{ width: 80, height: 60, objectFit: 'cover', borderRadius: 4, marginTop: 8 }} />
            )}
          </div>
          <button className="boton-primario" type="submit">Guardar material</button>
        </form>
      )}

      {error && <div className="error-texto" style={{ padding: '0 20px' }}>{error}</div>}

      {materiales.length === 0 ? (
        <div className="vacio">Todavía no hay materiales en el catálogo.</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Foto</th>
              <th>Material</th>
              <th>Stock actual</th>
              <th>Stock mínimo</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {materiales.map((m) => (
              <tr key={m.id}>
                <td>
                  <div style={{ position: 'relative', width: 44, height: 44 }}>
                    {m.fotoUrl ? (
                      <img
                        src={m.fotoUrl}
                        alt={m.nombre}
                        style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 4, cursor: 'pointer' }}
                        onClick={() => inputsFotoFila.current[m.id]?.click()}
                      />
                    ) : (
                      <button
                        className="boton-chico"
                        style={{ width: 44, height: 44, padding: 0, fontSize: 16 }}
                        onClick={() => inputsFotoFila.current[m.id]?.click()}
                        title="Agregar foto"
                      >
                        📷
                      </button>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      ref={(el) => (inputsFotoFila.current[m.id] = el)}
                      onChange={(e) => cambiarFotoExistente(m.id, e)}
                    />
                  </div>
                </td>
                <td>{m.nombre}</td>
                <td className="dato-mono">{m.stockActual} {m.unidad}</td>
                <td className="dato-mono">{m.stockMinimo} {m.unidad}</td>
                <td>
                  <span className={'etiqueta-estado ' + (m.stockBajo ? 'estado-bajo' : 'estado-ok')}>
                    {m.stockBajo ? 'stock bajo' : 'ok'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="panel-header" style={{ marginTop: 24, borderTop: '1px solid var(--hueso-fuerte)' }}>
        <h2>Historial de movimientos</h2>
      </div>

      {movimientos.length === 0 ? (
        <div className="vacio">Todavía no se ha registrado ningún movimiento.</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Material</th>
              <th>Tipo</th>
              <th>Cantidad</th>
              <th>Trabajador</th>
              <th>Obra</th>
              <th>Nota</th>
            </tr>
          </thead>
          <tbody>
            {movimientos.map((mv) => (
              <tr key={mv.id}>
                <td className="dato-mono" style={{ fontSize: 13 }}>
                  {new Date(mv.fecha).toLocaleString()}
                </td>
                <td>{mv.material?.nombre}</td>
                <td>
                  <span className={'etiqueta-estado ' + (mv.tipo === 'SALIDA' ? 'estado-bajo' : 'estado-ok')}>
                    {mv.tipo.toLowerCase()}
                  </span>
                </td>
                <td className="dato-mono">{mv.cantidad} {mv.material?.unidad}</td>
                <td><strong>{mv.usuario?.nombre}</strong></td>
                <td>{mv.obra?.nombre || '—'}</td>
                <td style={{ fontSize: 13, color: 'var(--texto-secundario)' }}>{mv.nota || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
