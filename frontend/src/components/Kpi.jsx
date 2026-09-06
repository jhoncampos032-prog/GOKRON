import React from 'react';

export default function Kpi({ etiqueta, valor, alerta }) {
  return (
    <div className="kpi-card">
      <div className="kpi-etiqueta">{etiqueta}</div>
      <div className={'kpi-valor' + (alerta ? ' alerta' : '')}>{valor}</div>
    </div>
  );
}
