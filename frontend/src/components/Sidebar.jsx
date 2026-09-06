import React from 'react';
import { NavLink } from 'react-router-dom';

const secciones = [
  { path: '/', etiqueta: 'Resumen', fin: true },
  { path: '/obras', etiqueta: 'Obras' },
  { path: '/personal', etiqueta: 'Personal' },
  { path: '/asistencia', etiqueta: 'Asistencia' },
  { path: '/materiales', etiqueta: 'Materiales' },
  { path: '/herramientas', etiqueta: 'Herramientas' },
  { path: '/tareas', etiqueta: 'Tareas' },
];

export default function Sidebar({ usuario, onSalir }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-marca">
        Gokron
      </div>
      <nav className="sidebar-nav">
        {secciones.map((s) => (
          <NavLink
            key={s.path}
            to={s.path}
            end={s.fin}
            className={({ isActive }) => 'sidebar-link' + (isActive ? ' activo' : '')}
          >
            {s.etiqueta}
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-pie">
        {usuario?.nombre} · {usuario?.rol}
        <br />
        <button className="sidebar-salir" onClick={onSalir}>
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
