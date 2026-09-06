import React from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar.jsx';
import Resumen from './Resumen.jsx';
import Obras from './Obras.jsx';
import Personal from './Personal.jsx';
import Asistencia from './Asistencia.jsx';
import Materiales from './Materiales.jsx';
import Herramientas from './Herramientas.jsx';
import Tareas from './Tareas.jsx';

const titulos = {
  '/': 'Resumen general',
  '/obras': 'Obras',
  '/personal': 'Personal',
  '/asistencia': 'Asistencia',
  '/materiales': 'Materiales',
  '/herramientas': 'Herramientas',
  '/tareas': 'Tareas y avance de obra',
};

export default function Dashboard({ usuario, onSalir }) {
  const ubicacion = useLocation();
  const navegar = useNavigate();
  const titulo = titulos[ubicacion.pathname] || 'Gokron';
  const enResumen = ubicacion.pathname === '/';

  return (
    <div className="app-layout">
      <Sidebar usuario={usuario} onSalir={onSalir} />
      <div className="contenido">
        <div className="franja-precaucion" />
        <div className="contenido-header" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {!enResumen && (
            <button
              onClick={() => navegar('/')}
              aria-label="Volver al resumen"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 22,
                color: 'var(--ladrillo)',
                lineHeight: 1,
                padding: 0,
              }}
            >
              ←
            </button>
          )}
          <h1>{titulo}</h1>
        </div>
        <div className="contenido-body">
          <Routes>
            <Route path="/" element={<Resumen />} />
            <Route path="/obras" element={<Obras />} />
            <Route path="/personal" element={<Personal />} />
            <Route path="/asistencia" element={<Asistencia />} />
            <Route path="/materiales" element={<Materiales />} />
            <Route path="/herramientas" element={<Herramientas />} />
            <Route path="/tareas" element={<Tareas />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}
