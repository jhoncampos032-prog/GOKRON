import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';

export default function RegistroEmpresa() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ nombreEmpresa: '', nombreAdmin: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const [listo, setListo] = useState(false);

  function actualizar(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  async function manejarSubmit(e) {
    e.preventDefault();
    setError('');
    setCargando(true);
    try {
      await api.registroEmpresa(form);
      setListo(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  if (listo) {
    return (
      <div className="login-pantalla">
        <div className="franja-precaucion" />
        <div className="login-centro">
          <div className="login-tarjeta">
            <div className="login-marca">Gokron</div>
            <h1 className="login-titulo">Empresa registrada</h1>
            <p style={{ color: 'var(--texto-secundario)', marginBottom: 20, lineHeight: 1.5 }}>
              Ya puedes iniciar sesión con el correo y la contraseña que acabas de crear.
            </p>
            <button className="boton-primario" onClick={() => navigate('/login')}>
              Ir a iniciar sesión
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-pantalla">
      <div className="franja-precaucion" />
      <div className="login-centro">
        <div className="login-tarjeta">
          <div className="login-marca">Gokron</div>
          <h1 className="login-titulo">Registra tu empresa</h1>

          {error && <div className="error-texto">{error}</div>}

          <form onSubmit={manejarSubmit}>
            <div className="campo">
              <label htmlFor="nombreEmpresa">Nombre de la empresa</label>
              <input
                id="nombreEmpresa"
                value={form.nombreEmpresa}
                onChange={(e) => actualizar('nombreEmpresa', e.target.value)}
                required
              />
            </div>
            <div className="campo">
              <label htmlFor="nombreAdmin">Tu nombre (administrador)</label>
              <input
                id="nombreAdmin"
                value={form.nombreAdmin}
                onChange={(e) => actualizar('nombreAdmin', e.target.value)}
                required
              />
            </div>
            <div className="campo">
              <label htmlFor="email">Correo</label>
              <input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => actualizar('email', e.target.value)}
                required
              />
            </div>
            <div className="campo">
              <label htmlFor="password">Contraseña</label>
              <input
                id="password"
                type="password"
                value={form.password}
                onChange={(e) => actualizar('password', e.target.value)}
                required
              />
            </div>
            <button className="boton-primario" type="submit" disabled={cargando}>
              {cargando ? 'Creando…' : 'Crear empresa'}
            </button>
          </form>

          <p style={{ marginTop: 18, fontSize: 13, textAlign: 'center' }}>
            <Link to="/login" style={{ color: 'var(--acero)' }}>¿Ya tienes cuenta? Inicia sesión</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
