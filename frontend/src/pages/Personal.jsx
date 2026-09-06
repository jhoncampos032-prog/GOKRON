import React, { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function Personal() {
  const [personal, setPersonal] = useState([]);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');
  const [mostrarForm, setMostrarForm] = useState(false);
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rol, setRol] = useState('TRABAJADOR');

  async function cargar() {
    try {
      setPersonal(await api.listarPersonal());
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => { cargar(); }, []);

  async function crear(e) {
    e.preventDefault();
    setError('');
    setExito('');
    try {
      await api.crearTrabajador({ nombre, email, password, rol });
      setExito(`Cuenta creada para ${nombre}. Comparte con ${email} este correo y la contraseña temporal para que inicie sesión en la app.`);
      setNombre('');
      setEmail('');
      setPassword('');
      setRol('TRABAJADOR');
      setMostrarForm(false);
      cargar();
    } catch (err) {
      setError(err.message);
    }
  }

  async function cambiarEstado(persona) {
    try {
      await api.cambiarEstadoTrabajador(persona.id, !persona.activo);
      cargar();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>Personal</h2>
        <button className="boton-chico" onClick={() => { setMostrarForm((v) => !v); setError(''); setExito(''); }}>
          {mostrarForm ? 'Cancelar' : '+ Nuevo trabajador'}
        </button>
      </div>

      {mostrarForm && (
        <form onSubmit={crear} style={{ padding: '16px 20px', borderBottom: '1px solid var(--hueso-fuerte)' }}>
          <div className="campo">
            <label>Nombre completo</label>
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} required />
          </div>
          <div className="campo">
            <label>Correo</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="campo">
            <label>Contraseña temporal (mínimo 6 caracteres)</label>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
          </div>
          <div className="campo">
            <label>Rol</label>
            <select
              value={rol}
              onChange={(e) => setRol(e.target.value)}
              style={{
                width: '100%',
                padding: '11px 12px',
                border: '1px solid var(--hueso-fuerte)',
                borderRadius: 3,
                fontSize: 15,
                fontFamily: 'inherit',
                background: 'white',
              }}
            >
              <option value="TRABAJADOR">Trabajador</option>
              <option value="SUPERVISOR">Supervisor</option>
            </select>
          </div>
          <button className="boton-primario" type="submit">Crear cuenta</button>
        </form>
      )}

      {error && <div className="error-texto" style={{ padding: '12px 20px 0' }}>{error}</div>}
      {exito && (
        <div style={{ padding: '12px 20px 0', color: 'var(--verde-ok, #3D7A56)', fontSize: 13 }}>{exito}</div>
      )}

      {personal.length === 0 ? (
        <div className="vacio">Todavía no hay trabajadores registrados. Crea el primero arriba.</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Correo</th>
              <th>Rol</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {personal.map((p) => (
              <tr key={p.id}>
                <td>{p.nombre}</td>
                <td className="dato-mono" style={{ fontSize: 13 }}>{p.email}</td>
                <td>{p.rol}</td>
                <td>
                  <span className={'etiqueta-estado ' + (p.activo ? 'estado-ok' : 'estado-bajo')}>
                    {p.activo ? 'activo' : 'desactivado'}
                  </span>
                </td>
                <td>
                  {p.rol !== 'ADMIN' && (
                    <button
                      className="boton-chico"
                      style={{ background: p.activo ? 'var(--ladrillo)' : 'var(--acero)' }}
                      onClick={() => cambiarEstado(p)}
                    >
                      {p.activo ? 'Desactivar' : 'Activar'}
                    </button>
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
