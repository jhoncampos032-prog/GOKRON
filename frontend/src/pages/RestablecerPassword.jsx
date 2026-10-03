import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import Logo from '../components/Logo.jsx';

export default function RestablecerPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const [listo, setListo] = useState(false);

  async function manejarSubmit(e) {
    e.preventDefault();
    setError('');

    if (password !== confirmar) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setCargando(true);
    try {
      await api.restablecerPassword(token, password);
      setListo(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  if (!token) {
    return (
      <div className="login-pantalla">
        <div className="franja-precaucion" />
        <div className="login-centro">
          <div className="login-tarjeta">
            <div className="login-marca"><Logo altura={22} variante="oscuro" />Gokron</div>
            <h1 className="login-titulo">Enlace inválido</h1>
            <p style={{ color: 'var(--texto-secundario)', marginBottom: 20 }}>
              Este enlace no es válido. Pide uno nuevo desde la pantalla de inicio de sesión.
            </p>
            <Link to="/olvide-password" style={{ color: 'var(--acero)' }}>Pedir un enlace nuevo</Link>
          </div>
        </div>
      </div>
    );
  }

  if (listo) {
    return (
      <div className="login-pantalla">
        <div className="franja-precaucion" />
        <div className="login-centro">
          <div className="login-tarjeta">
            <div className="login-marca"><Logo altura={22} variante="oscuro" />Gokron</div>
            <h1 className="login-titulo">Contraseña actualizada</h1>
            <p style={{ color: 'var(--texto-secundario)', marginBottom: 20 }}>
              Ya puedes iniciar sesión con tu contraseña nueva.
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
          <div className="login-marca"><Logo altura={22} variante="oscuro" />Gokron</div>
          <h1 className="login-titulo">Pon tu contraseña nueva</h1>

          {error && <div className="error-texto">{error}</div>}

          <form onSubmit={manejarSubmit}>
            <div className="campo">
              <label htmlFor="password">Contraseña nueva</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <div className="campo">
              <label htmlFor="confirmar">Confirma la contraseña</label>
              <input
                id="confirmar"
                type="password"
                value={confirmar}
                onChange={(e) => setConfirmar(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <button className="boton-primario" type="submit" disabled={cargando}>
              {cargando ? 'Guardando...' : 'Guardar contraseña nueva'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
