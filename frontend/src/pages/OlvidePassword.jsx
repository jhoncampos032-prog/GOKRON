import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import Logo from '../components/Logo.jsx';

export default function OlvidePassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  async function manejarSubmit(e) {
    e.preventDefault();
    setError('');
    setCargando(true);
    try {
      await api.olvidePassword(email);
      setEnviado(true);
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
          <h1 className="login-titulo">Recupera tu contraseña</h1>

          {enviado ? (
            <p style={{ color: 'var(--texto-secundario)', marginBottom: 20, lineHeight: 1.5 }}>
              Si ese correo está registrado, te enviamos un enlace para poner una contraseña nueva. Revisa tu bandeja de entrada (y la carpeta de spam).
            </p>
          ) : (
            <>
              <p style={{ color: 'var(--texto-secundario)', marginBottom: 20, lineHeight: 1.5 }}>
                Escribe el correo con el que inicias sesión y te mandamos un enlace para poner una contraseña nueva.
              </p>

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
                <button className="boton-primario" type="submit" disabled={cargando}>
                  {cargando ? 'Enviando...' : 'Enviar enlace'}
                </button>
              </form>
            </>
          )}

          <p style={{ marginTop: 18, fontSize: 13, textAlign: 'center' }}>
            <Link to="/login" style={{ color: 'var(--acero)' }}>Volver a iniciar sesión</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
