import React, { useEffect, useState } from 'react';
import { api } from '../api.js';

const CAMPOS = [
  { clave: 'nombre', etiqueta: 'Nombre de la empresa', requerido: true },
  { clave: 'ruc', etiqueta: 'RUC / identificación fiscal' },
  { clave: 'direccion', etiqueta: 'Dirección' },
  { clave: 'ciudad', etiqueta: 'Ciudad' },
  { clave: 'telefono', etiqueta: 'Teléfono' },
  { clave: 'emailContacto', etiqueta: 'Correo de contacto', tipo: 'email' },
  { clave: 'sitioWeb', etiqueta: 'Sitio web' },
];

export default function Empresa({ usuario, onEmpresaActualizada }) {
  const [form, setForm] = useState(null);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');
  const [guardando, setGuardando] = useState(false);
  const puedeEditar = usuario?.rol === 'ADMIN';

  useEffect(() => {
    api.obtenerEmpresa()
      .then((e) => setForm(Object.fromEntries(CAMPOS.map((c) => [c.clave, e[c.clave] || '']))))
      .catch((err) => setError(err.message));
  }, []);

  function actualizar(clave, valor) {
    setExito('');
    setForm((f) => ({ ...f, [clave]: valor }));
  }

  async function guardar(e) {
    e.preventDefault();
    setError('');
    setExito('');
    setGuardando(true);
    try {
      const guardada = await api.actualizarEmpresa(form);
      onEmpresaActualizada?.(guardada.nombre);
      setExito('Información guardada.');
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>Información de la empresa</h2>
      </div>

      {error && <div className="error-texto" style={{ padding: '12px 20px 0' }}>{error}</div>}

      {!form ? (
        !error && <div className="vacio">Cargando...</div>
      ) : (
        <form onSubmit={guardar} style={{ padding: 20, maxWidth: 560 }}>
          {!puedeEditar && (
            <p style={{ fontSize: 13, color: 'var(--texto-secundario)', marginBottom: 16 }}>
              Solo el administrador puede modificar estos datos.
            </p>
          )}
          {CAMPOS.map((c) => (
            <div className="campo" key={c.clave}>
              <label htmlFor={c.clave}>{c.etiqueta}</label>
              <input
                id={c.clave}
                type={c.tipo || 'text'}
                value={form[c.clave]}
                onChange={(e) => actualizar(c.clave, e.target.value)}
                required={c.requerido}
                disabled={!puedeEditar}
              />
            </div>
          ))}
          {puedeEditar && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 8 }}>
              <button className="boton-primario" type="submit" disabled={guardando} style={{ width: 'auto', padding: '10px 24px' }}>
                {guardando ? 'Guardando...' : 'Guardar cambios'}
              </button>
              {exito && <span style={{ fontSize: 13, color: 'var(--menta-oscuro)', fontWeight: 600 }}>{exito}</span>}
            </div>
          )}
        </form>
      )}
    </div>
  );
}
