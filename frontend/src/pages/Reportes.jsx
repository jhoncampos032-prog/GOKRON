import React, { useEffect, useState } from 'react';
import { api } from '../api.js';

const ETIQUETAS_PERIODO = {
  dia: 'Hoy',
  semana: 'Esta semana',
  mes: 'Este mes',
};

export default function Reportes() {
  const [periodo, setPeriodo] = useState('semana');
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState('');
  const [guardandoPreferencia, setGuardandoPreferencia] = useState(false);
  const [descargando, setDescargando] = useState(false);
  const [driveConectado, setDriveConectado] = useState(null);
  const [conectandoDrive, setConectandoDrive] = useState(false);
  const [actualizandoDrive, setActualizandoDrive] = useState(false);

  useEffect(() => {
    api.estadoGoogleDrive().then((r) => setDriveConectado(r.conectado)).catch(() => setDriveConectado(false));
  }, []);

  async function conectarGoogleDrive() {
    setConectandoDrive(true);
    try {
      const { url } = await api.conectarGoogleDrive();
      // Se abre en una pestaña nueva porque el flujo de Google termina en
      // una pagina de confirmacion aparte, no dentro del panel.
      window.open(url, '_blank');
    } catch (err) {
      setError(err.message);
    } finally {
      setConectandoDrive(false);
    }
  }

  async function actualizarDriveAhora() {
    setActualizandoDrive(true);
    setError('');
    try {
      const resultado = await api.actualizarDriveAhora(periodo);
      if (!resultado.subido) {
        setError(resultado.razon || 'No se pudo actualizar Google Drive.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setActualizandoDrive(false);
    }
  }

  async function descargarExcel(p) {
    setDescargando(true);
    setError('');
    try {
      const blob = await api.descargarReporteExcel(p);
      const url = window.URL.createObjectURL(blob);
      const enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = `Gokron_Reporte_${p}.xlsx`;
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('No se pudo descargar el Excel: ' + err.message);
    } finally {
      setDescargando(false);
    }
  }

  async function cargar(p) {
    setError('');
    try {
      const resultado = await api.obtenerReporte(p);
      setDatos(resultado);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => { cargar(periodo); }, [periodo]);

  async function guardarComoPredeterminado() {
    setGuardandoPreferencia(true);
    try {
      const frecuencia = periodo === 'dia' ? 'DIARIO' : periodo === 'mes' ? 'MENSUAL' : 'SEMANAL';
      await api.guardarFrecuenciaReporte(frecuencia);
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardandoPreferencia(false);
    }
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>Reportes</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          {['dia', 'semana', 'mes'].map((p) => (
            <button
              key={p}
              className="boton-chico"
              style={{ background: periodo === p ? 'var(--menta-oscuro, #0E7F6D)' : undefined }}
              onClick={() => setPeriodo(p)}
            >
              {ETIQUETAS_PERIODO[p]}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="error-texto" style={{ padding: '12px 20px 0' }}>{error}</div>}

      {!datos ? (
        <div className="vacio">Cargando...</div>
      ) : (
        <>
          <div style={{ padding: '4px 20px 0', fontSize: 13, color: 'var(--texto-secundario)' }}>
            Del {new Date(datos.desde).toLocaleDateString()} a hoy — datos siempre calculados al momento, nunca desactualizados.
          </div>

          <div className="kpis" style={{ padding: 20 }}>
            <TarjetaKpi etiqueta="Marcaciones registradas" valor={datos.asistencia.totalMarcaciones} />
            <TarjetaKpi etiqueta="Horas trabajadas" valor={`${datos.asistencia.horasTrabajadas} h`} />
            <TarjetaKpi etiqueta="Tareas completadas" valor={datos.tareas.completadas} />
            <TarjetaKpi etiqueta="Herramientas prestadas ahora" valor={datos.herramientas.prestadasAhora} />
          </div>

          <div style={{ padding: '0 20px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="panel" style={{ margin: 0 }}>
              <div className="panel-header"><h2 style={{ fontSize: 15 }}>Materiales</h2></div>
              <div style={{ padding: 16, fontSize: 14 }}>
                <p>Entradas: <strong>{datos.materiales.entradas}</strong></p>
                <p>Salidas: <strong>{datos.materiales.salidas}</strong></p>
              </div>
            </div>
            <div className="panel" style={{ margin: 0 }}>
              <div className="panel-header"><h2 style={{ fontSize: 15 }}>Tareas</h2></div>
              <div style={{ padding: 16, fontSize: 14 }}>
                <p>Pendientes: <strong>{datos.tareas.pendientes}</strong></p>
                <p>En progreso: <strong>{datos.tareas.enProgreso}</strong></p>
                <p>Completadas: <strong>{datos.tareas.completadas}</strong></p>
              </div>
            </div>
            <div className="panel" style={{ margin: 0 }}>
              <div className="panel-header"><h2 style={{ fontSize: 15 }}>Herramientas</h2></div>
              <div style={{ padding: 16, fontSize: 14 }}>
                <p>En el catálogo: <strong>{datos.herramientas.totalCatalogo}</strong></p>
                <p>Entregadas en este período: <strong>{datos.herramientas.entregasEnPeriodo}</strong></p>
                <p>Regresadas en este período: <strong>{datos.herramientas.devolucionesEnPeriodo}</strong></p>
              </div>
            </div>
          </div>

          <div style={{ padding: '0 20px 20px', display: 'flex', gap: 10 }}>
            <button className="boton-primario" onClick={guardarComoPredeterminado} disabled={guardandoPreferencia}>
              {guardandoPreferencia ? 'Guardando...' : `Usar "${ETIQUETAS_PERIODO[periodo]}" como vista predeterminada`}
            </button>
            <button
              className="boton-primario"
              style={{ background: 'var(--acero)' }}
              onClick={() => descargarExcel(periodo)}
              disabled={descargando}
            >
              {descargando ? 'Generando...' : '📊 Descargar Excel de este período'}
            </button>
          </div>

          <div className="panel" style={{ margin: '0 20px 20px' }}>
            <div className="panel-header"><h2 style={{ fontSize: 15 }}>☁️ Google Drive</h2></div>
            <div style={{ padding: 16 }}>
              {driveConectado === null ? (
                <p style={{ fontSize: 13, color: 'var(--texto-secundario)' }}>Revisando conexión...</p>
              ) : driveConectado ? (
                <>
                  <p style={{ fontSize: 13, color: 'var(--texto-secundario)', marginBottom: 12 }}>
                    ✅ Conectado — el reporte se sube automáticamente a tu Google Drive todos los días.
                  </p>
                  <button className="boton-chico" onClick={actualizarDriveAhora} disabled={actualizandoDrive}>
                    {actualizandoDrive ? 'Actualizando...' : 'Actualizar ahora mismo'}
                  </button>
                </>
              ) : (
                <>
                  <p style={{ fontSize: 13, color: 'var(--texto-secundario)', marginBottom: 12 }}>
                    Conecta tu Google Drive para que el reporte se guarde y actualice ahí automáticamente todos los días, sin que nadie tenga que descargarlo a mano.
                  </p>
                  <button className="boton-primario" onClick={conectarGoogleDrive} disabled={conectandoDrive}>
                    {conectandoDrive ? 'Abriendo...' : '☁️ Conectar Google Drive'}
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function TarjetaKpi({ etiqueta, valor }) {
  return (
    <div className="kpi-card">
      <div className="kpi-valor">{valor}</div>
      <div className="kpi-etiqueta">{etiqueta}</div>
    </div>
  );
}
