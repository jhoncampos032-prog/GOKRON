import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import Kpi from '../components/Kpi.jsx';
import { UserCheck, Clock, ListChecks, Wrench, Package, Cloud } from 'lucide-react';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

// Misma paleta de marca que ya usa el Excel de reportes (generarReporteExcel.js),
// en hex plano porque Chart.js no resuelve variables CSS.
const PALETA_GRAFICA = {
  menta: '#46F0D2',
  acero: '#3E5C76',
  crema: '#FBE2B4',
  grafito: '#131321',
};

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
  const [exitoDrive, setExitoDrive] = useState('');

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
    setExitoDrive('');
    try {
      const resultado = await api.actualizarDriveAhora(periodo);
      if (!resultado.subido) {
        setError(resultado.razon || 'No se pudo actualizar Google Drive.');
      } else {
        setExitoDrive('✅ Actualizado — revisa tu Google Drive, el archivo ya debería estar ahí.');
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
            <Kpi
              Icono={UserCheck}
              color="menta"
              etiqueta="Marcaciones registradas"
              valor={datos.asistencia.totalMarcaciones}
              variacion={datos.asistencia.variacionMarcaciones}
            />
            <Kpi
              Icono={Clock}
              color="acero"
              etiqueta="Horas trabajadas"
              valor={`${datos.asistencia.horasTrabajadas} h`}
              variacion={datos.asistencia.variacionHoras}
            />
            <Kpi Icono={ListChecks} color="crema" etiqueta="Tareas completadas" valor={datos.tareas.completadas} />
            <Kpi Icono={Wrench} color="grafito" etiqueta="Herramientas prestadas ahora" valor={datos.herramientas.prestadasAhora} />
          </div>

          <div style={{ padding: '0 20px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="panel" style={{ margin: 0 }}>
              <div className="panel-header" style={{ display: 'flex', alignItems: 'center' }}>
                <Package size={17} style={{ marginRight: 10, flexShrink: 0, color: 'var(--acero)' }} />
                <h2 style={{ fontSize: 15 }}>Materiales</h2>
              </div>
              <div style={{ padding: 16, fontSize: 14 }}>
                <p>Entradas: <strong>{datos.materiales.entradas}</strong></p>
                <p>Salidas: <strong>{datos.materiales.salidas}</strong></p>
                {datos.materiales.entradas + datos.materiales.salidas === 0 ? (
                  <p style={{ fontSize: 12, color: 'var(--texto-secundario)' }}>Sin movimientos en este período</p>
                ) : (
                  <div style={{ height: 90, marginTop: 8 }}>
                    <Bar
                      data={{
                        labels: ['Entradas', 'Salidas'],
                        datasets: [{ data: [datos.materiales.entradas, datos.materiales.salidas], backgroundColor: [PALETA_GRAFICA.menta, PALETA_GRAFICA.acero] }],
                      }}
                      options={{
                        indexAxis: 'y',
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: { x: { display: false }, y: { grid: { display: false } } },
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
            <div className="panel" style={{ margin: 0 }}>
              <div className="panel-header" style={{ display: 'flex', alignItems: 'center' }}>
                <ListChecks size={17} style={{ marginRight: 10, flexShrink: 0, color: 'var(--crema-oscuro)' }} />
                <h2 style={{ fontSize: 15 }}>Tareas</h2>
              </div>
              <div style={{ padding: 16, fontSize: 14, display: 'flex', gap: 16, alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <p>Pendientes: <strong>{datos.tareas.pendientes}</strong></p>
                  <p>En progreso: <strong>{datos.tareas.enProgreso}</strong></p>
                  <p>Completadas: <strong>{datos.tareas.completadas}</strong></p>
                </div>
                {datos.tareas.pendientes + datos.tareas.enProgreso + datos.tareas.completadas === 0 ? (
                  <p style={{ fontSize: 12, color: 'var(--texto-secundario)' }}>Sin tareas en este período</p>
                ) : (
                  <div style={{ width: 110, height: 110, flexShrink: 0 }}>
                    <Doughnut
                      data={{
                        labels: ['Pendientes', 'En progreso', 'Completadas'],
                        datasets: [{
                          data: [datos.tareas.pendientes, datos.tareas.enProgreso, datos.tareas.completadas],
                          backgroundColor: [PALETA_GRAFICA.crema, PALETA_GRAFICA.acero, PALETA_GRAFICA.menta],
                          borderWidth: 0,
                        }],
                      }}
                      options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }}
                    />
                  </div>
                )}
              </div>
            </div>
            <div className="panel" style={{ margin: 0 }}>
              <div className="panel-header" style={{ display: 'flex', alignItems: 'center' }}>
                <Wrench size={17} style={{ marginRight: 10, flexShrink: 0, color: 'var(--grafito)' }} />
                <h2 style={{ fontSize: 15 }}>Herramientas</h2>
              </div>
              <div style={{ padding: 16, fontSize: 14, display: 'flex', gap: 16, alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <p>En el catálogo: <strong>{datos.herramientas.totalCatalogo}</strong></p>
                  <p>Entregadas en este período: <strong>{datos.herramientas.entregasEnPeriodo}</strong></p>
                  <p>Regresadas en este período: <strong>{datos.herramientas.devolucionesEnPeriodo}</strong></p>
                </div>
                {datos.herramientas.totalCatalogo === 0 ? (
                  <p style={{ fontSize: 12, color: 'var(--texto-secundario)' }}>Sin herramientas en el catálogo</p>
                ) : (
                  <div style={{ width: 110, height: 110, flexShrink: 0 }}>
                    <Doughnut
                      data={{
                        labels: datos.herramientas.otro > 0 ? ['Disponibles', 'Prestadas', 'Otro'] : ['Disponibles', 'Prestadas'],
                        datasets: [{
                          data: datos.herramientas.otro > 0
                            ? [datos.herramientas.disponibles, datos.herramientas.prestadasAhora, datos.herramientas.otro]
                            : [datos.herramientas.disponibles, datos.herramientas.prestadasAhora],
                          backgroundColor: datos.herramientas.otro > 0
                            ? [PALETA_GRAFICA.menta, PALETA_GRAFICA.acero, PALETA_GRAFICA.crema]
                            : [PALETA_GRAFICA.menta, PALETA_GRAFICA.acero],
                          borderWidth: 0,
                        }],
                      }}
                      options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }}
                    />
                  </div>
                )}
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
            <div className="panel-header" style={{ display: 'flex', alignItems: 'center' }}>
              <Cloud size={17} style={{ marginRight: 10, flexShrink: 0, color: 'var(--acero)' }} />
              <h2 style={{ fontSize: 15 }}>Google Drive</h2>
            </div>
            <div style={{ padding: 16 }}>
              {driveConectado === null ? (
                <p style={{ fontSize: 13, color: 'var(--texto-secundario)' }}>Revisando conexión...</p>
              ) : driveConectado ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <span
                      style={{
                        background: 'var(--menta)',
                        color: 'var(--grafito)',
                        padding: '2px 8px',
                        borderRadius: 12,
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      Conectado
                    </span>
                    <p style={{ fontSize: 13, color: 'var(--texto-secundario)', margin: 0 }}>
                      El reporte se sube automáticamente a tu Google Drive todos los días.
                    </p>
                  </div>
                  <button className="boton-chico" onClick={actualizarDriveAhora} disabled={actualizandoDrive}>
                    {actualizandoDrive ? 'Actualizando...' : 'Actualizar ahora mismo'}
                  </button>
                  {exitoDrive && (
                    <p style={{ fontSize: 13, color: 'var(--menta-oscuro, #0E7F6D)', marginTop: 10, fontWeight: 600 }}>
                      {exitoDrive}
                    </p>
                  )}
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
