import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import Logo from '../components/Logo.jsx';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  async function manejarSubmit(e) {
    e.preventDefault();
    setError('');
    setCargando(true);
    try {
      const data = await api.login(email, password);
      localStorage.setItem('token', data.token);
      localStorage.setItem('usuario', JSON.stringify(data.usuario));
      onLogin(data.usuario);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="login-pantalla">
      <div className="franja-precaucion" />
      <div className="login-centro">
        <div className="login-tarjeta">
          <div className="login-marca"><Logo altura={22} variante="oscuro" />Gokron</div>
          <h1 className="login-titulo">Inicia sesión</h1>

          {error && <div className="error-texto">{error}</div>}

          <form onSubmit={manejarSubmit}>
            <div className="campo">
              <label htmlFor="email">Correo</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="campo">
              <label htmlFor="password">Contraseña</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button className="boton-primario" type="submit" disabled={cargando}>
              {cargando ? 'Ingresando…' : 'Ingresar'}
            </button>
          </form>

          <p style={{ marginTop: 14, fontSize: 13, textAlign: 'center' }}>
            <Link to="/olvide-password" style={{ color: 'var(--acero)' }}>¿Olvidaste tu contraseña?</Link>
          </p>
          <p style={{ marginTop: 10, fontSize: 13, textAlign: 'center' }}>
            <Link to="/registro" style={{ color: 'var(--acero)' }}>¿Primera vez? Registra tu empresa</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
