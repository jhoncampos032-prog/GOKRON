import React, { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, HardHat, Users, Clock, Package, Wrench, ListChecks, BarChart3, Building2, LogOut, ChevronUp } from 'lucide-react';
import Logo from './Logo.jsx';

const secciones = [
  { path: '/', etiqueta: 'Resumen', Icono: LayoutDashboard, fin: true },
  { path: '/obras', etiqueta: 'Obras', Icono: HardHat },
  { path: '/personal', etiqueta: 'Personal', Icono: Users },
  { path: '/asistencia', etiqueta: 'Asistencia', Icono: Clock },
  { path: '/materiales', etiqueta: 'Materiales', Icono: Package },
  { path: '/herramientas', etiqueta: 'Herramientas', Icono: Wrench },
  { path: '/tareas', etiqueta: 'Tareas', Icono: ListChecks },
  { path: '/reportes', etiqueta: 'Reportes', Icono: BarChart3 },
];

export default function Sidebar({ usuario, onSalir }) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const pieRef = useRef(null);
  const navegar = useNavigate();

  useEffect(() => {
    if (!menuAbierto) return undefined;
    function cerrarSiClicFuera(e) {
      if (pieRef.current && !pieRef.current.contains(e.target)) setMenuAbierto(false);
    }
    document.addEventListener('mousedown', cerrarSiClicFuera);
    return () => document.removeEventListener('mousedown', cerrarSiClicFuera);
  }, [menuAbierto]);

  function irADatosEmpresa() {
    setMenuAbierto(false);
    navegar('/empresa');
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-marca">
        <Logo altura={26} variante="claro" />
        <span>Gokron</span>
      </div>
      <nav className="sidebar-nav">
        {secciones.map((s) => {
          const Icono = s.Icono;
          return (
            <NavLink
              key={s.path}
              to={s.path}
              end={s.fin}
              className={({ isActive }) => 'sidebar-link' + (isActive ? ' activo' : '')}
              style={{ display: 'flex', alignItems: 'center' }}
            >
              <Icono size={17} style={{ marginRight: 10, flexShrink: 0 }} />
              {s.etiqueta}
            </NavLink>
          );
        })}
      </nav>
      <div className="sidebar-pie" ref={pieRef}>
        {menuAbierto && (
          <div className="sidebar-menu" role="menu">
            <button className="sidebar-menu-opcion" role="menuitem" onClick={irADatosEmpresa}>
              <Building2 size={16} />
              Datos de la empresa
            </button>
            <button className="sidebar-menu-opcion" role="menuitem" onClick={onSalir}>
              <LogOut size={16} />
              Cerrar sesión
            </button>
          </div>
        )}
        <button
          className="sidebar-cuenta"
          onClick={() => setMenuAbierto((abierto) => !abierto)}
          aria-expanded={menuAbierto}
          aria-haspopup="menu"
        >
          <div className="sidebar-cuenta-textos">
            {usuario?.empresaNombre && (
              <div className="sidebar-empresa" title={usuario.empresaNombre}>
                {usuario.empresaNombre}
              </div>
            )}
            <div className="sidebar-usuario">
              {usuario?.nombre} · {usuario?.rol}
            </div>
          </div>
          <ChevronUp size={16} className={'sidebar-cuenta-flecha' + (menuAbierto ? ' abierto' : '')} />
        </button>
      </div>
    </aside>
  );
}
