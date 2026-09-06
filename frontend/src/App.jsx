import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login.jsx';
import RegistroEmpresa from './pages/RegistroEmpresa.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Terminos from './pages/Terminos.jsx';
import Privacidad from './pages/Privacidad.jsx';

export default function App() {
  const [usuario, setUsuario] = useState(() => {
    const guardado = localStorage.getItem('usuario');
    return guardado ? JSON.parse(guardado) : null;
  });

  function manejarLogin(usuarioLogueado) {
    setUsuario(usuarioLogueado);
  }

  function manejarSalida() {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    setUsuario(null);
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={usuario ? <Navigate to="/" /> : <Login onLogin={manejarLogin} />}
      />
      <Route
        path="/registro"
        element={usuario ? <Navigate to="/" /> : <RegistroEmpresa />}
      />
      <Route path="/terminos" element={<Terminos />} />
      <Route path="/privacidad" element={<Privacidad />} />
      <Route
        path="/*"
        element={
          usuario ? (
            <Dashboard usuario={usuario} onSalir={manejarSalida} />
          ) : (
            <Navigate to="/login" />
          )
        }
      />
    </Routes>
  );
}
