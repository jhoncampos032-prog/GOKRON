import React from 'react';

// Logo de Gokron: 4 barras inclinadas en dos grupos. "claro" es para fondos
// oscuros (sidebar), "oscuro" para fondos claros (pantallas de login).
const COLORES = {
  claro: { izq: '#FFFFFF', der: '#46F0D2' },
  oscuro: { izq: '#131321', der: '#0E7F6D' },
};

export default function Logo({ altura = 28, variante = 'claro' }) {
  const c = COLORES[variante] || COLORES.claro;
  return (
    <svg
      height={altura}
      viewBox="0 0 195 270"
      role="img"
      aria-label="Gokron"
      style={{ flexShrink: 0 }}
    >
      <polygon points="0,102 116,0 116,40 0,138" fill={c.izq} />
      <polygon points="23,148 116,60 116,100 23,185" fill={c.izq} />
      <polygon points="53,170 195,53 195,110 53,228" fill={c.der} />
      <polygon points="84,222 195,126 195,172 84,270" fill={c.der} />
    </svg>
  );
}
