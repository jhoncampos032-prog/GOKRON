import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function Kpi({ etiqueta, valor, alerta, Icono, color = 'menta', variacion }) {
  return (
    <div className={`kpi-card kpi-card--${color}`}>
      {Icono && (
        <div className={`kpi-icono kpi-icono--${color}`}>
          <Icono size={18} />
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
        <div className={'kpi-valor' + (alerta ? ' alerta' : '')}>{valor}</div>
        {typeof variacion === 'number' && (
          <span className={'kpi-variacion ' + (variacion >= 0 ? 'kpi-variacion--positiva' : 'kpi-variacion--negativa')}>
            {variacion >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(variacion)}%
          </span>
        )}
      </div>
      <div className="kpi-etiqueta">{etiqueta}</div>
    </div>
  );
}
