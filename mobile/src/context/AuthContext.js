import React, { createContext, useContext, useEffect, useState } from 'react';
import { api, guardarSesion, obtenerSesion, cerrarSesion } from '../api/cliente';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    obtenerSesion().then(({ token, usuario }) => {
      setToken(token);
      setUsuario(usuario);
      setCargando(false);
    });
  }, []);

  async function iniciarSesion(email, password) {
    const data = await api.login(email, password);
    await guardarSesion(data.token, data.usuario);
    setToken(data.token);
    setUsuario(data.usuario);
  }

  async function salir() {
    await cerrarSesion();
    setToken(null);
    setUsuario(null);
  }

  // Actualiza solo los campos que cambien (nombre, correo, foto), sin perder
  // el resto de los datos ya guardados (como empresaNombre, que el backend
  // no siempre vuelve a mandar). Se usa desde la pantalla de Perfil.
  async function actualizarUsuario(cambios) {
    const nuevoUsuario = { ...usuario, ...cambios };
    await guardarSesion(token, nuevoUsuario);
    setUsuario(nuevoUsuario);
  }

  return (
    <AuthContext.Provider value={{ token, usuario, cargando, iniciarSesion, salir, actualizarUsuario }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
