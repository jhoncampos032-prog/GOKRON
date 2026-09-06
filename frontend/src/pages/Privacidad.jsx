import React from 'react';
import { Link } from 'react-router-dom';

export default function Privacidad() {
  return (
    <div className="login-pantalla">
      <div className="franja-precaucion" />
      <div className="login-centro">
        <div className="login-tarjeta" style={{ maxWidth: 640, textAlign: 'left' }}>
          <div className="login-marca">Gokron</div>
          <h1 className="login-titulo">Política de Privacidad</h1>

          <p style={{ fontSize: 12, color: 'var(--ladrillo)', marginBottom: 20, fontWeight: 600 }}>
            ⚠️ Esta es una plantilla genérica de ejemplo. Antes de usarla con clientes reales,
            debe ser revisada y ajustada por un abogado según las leyes de tu país/estado
            (por ejemplo, leyes de protección de datos aplicables).
          </p>

          <Seccion titulo="1. Información que recopilamos">
            Recopilamos datos que tú y tu equipo ingresan directamente: nombres, correos,
            registros de asistencia, ubicación GPS al marcar entrada/salida, fotos de avance
            de tareas, y datos de materiales y herramientas.
          </Seccion>

          <Seccion titulo="2. Cómo usamos la información">
            Usamos estos datos únicamente para prestar el servicio: mostrar reportes de
            asistencia, verificar ubicación en obras, y llevar el control de inventario de tu
            empresa. No usamos tus datos para publicidad.
          </Seccion>

          <Seccion titulo="3. Ubicación GPS">
            La ubicación se solicita únicamente al marcar entrada o salida, para verificar que
            la persona esté en el sitio de trabajo correcto. No se rastrea la ubicación en
            ningún otro momento.
          </Seccion>

          <Seccion titulo="4. Con quién compartimos información">
            No vendemos ni compartimos tus datos con terceros para fines comerciales. Los
            datos de tu empresa solo son visibles para los usuarios de tu propia empresa.
          </Seccion>

          <Seccion titulo="5. Seguridad">
            Las contraseñas se almacenan de forma encriptada. Tomamos medidas razonables
            para proteger la información, aunque ningún sistema es 100% infalible.
          </Seccion>

          <Seccion titulo="6. Tus derechos">
            Puedes solicitar la corrección o eliminación de tus datos personales
            contactándonos a través del botón de ayuda dentro de la app.
          </Seccion>

          <Seccion titulo="7. Cambios a esta política">
            Podemos actualizar esta política ocasionalmente. Notificaremos cambios
            importantes a través de la app o por correo.
          </Seccion>

          <Seccion titulo="8. Contacto">
            Para dudas sobre esta política, contáctanos a través del botón de ayuda dentro de
            la app.
          </Seccion>

          <p style={{ marginTop: 24, fontSize: 13, textAlign: 'center' }}>
            <Link to="/registro" style={{ color: 'var(--acero)' }}>← Volver al registro</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function Seccion({ titulo, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <h3 style={{ fontSize: 15, marginBottom: 6, color: 'var(--grafito)' }}>{titulo}</h3>
      <p style={{ fontSize: 14, color: 'var(--texto-secundario)', lineHeight: 1.6, margin: 0 }}>{children}</p>
    </div>
  );
}
