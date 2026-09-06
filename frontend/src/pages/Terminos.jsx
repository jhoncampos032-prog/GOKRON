import React from 'react';
import { Link } from 'react-router-dom';

export default function Terminos() {
  return (
    <div className="login-pantalla">
      <div className="franja-precaucion" />
      <div className="login-centro">
        <div className="login-tarjeta" style={{ maxWidth: 640, textAlign: 'left' }}>
          <div className="login-marca">Gokron</div>
          <h1 className="login-titulo">Términos de Uso</h1>

          <p style={{ fontSize: 12, color: 'var(--ladrillo)', marginBottom: 20, fontWeight: 600 }}>
            ⚠️ Esta es una plantilla genérica de ejemplo. Antes de usarla con clientes reales,
            debe ser revisada y ajustada por un abogado según las leyes de tu país/estado.
          </p>

          <Seccion titulo="1. Aceptación de los términos">
            Al crear una cuenta y usar Gokron, aceptas estos Términos de Uso en su totalidad.
            Si no estás de acuerdo con alguna parte, no debes usar el servicio.
          </Seccion>

          <Seccion titulo="2. Descripción del servicio">
            Gokron es una herramienta de gestión para empresas constructoras que permite
            registrar asistencia, tareas, materiales, herramientas, y datos relacionados con
            la operación de la empresa.
          </Seccion>

          <Seccion titulo="3. Cuentas y responsabilidad">
            Eres responsable de mantener la confidencialidad de tu contraseña y de toda
            actividad realizada desde tu cuenta. Debes notificarnos de inmediato ante
            cualquier uso no autorizado.
          </Seccion>

          <Seccion titulo="4. Uso aceptable">
            Te comprometes a usar el servicio de forma lícita, sin infringir derechos de
            terceros, y sin intentar dañar, sobrecargar, o acceder sin autorización a los
            sistemas de Gokron.
          </Seccion>

          <Seccion titulo="5. Datos de la empresa">
            La información que ingreses (empleados, obras, materiales, asistencia, etc.) es
            propiedad de tu empresa. Gokron la almacena para prestar el servicio, y no la
            vende a terceros.
          </Seccion>

          <Seccion titulo="6. Limitación de responsabilidad">
            El servicio se ofrece "tal cual". Gokron no garantiza que el servicio esté libre
            de errores en todo momento, y no se hace responsable por daños indirectos
            derivados del uso o la imposibilidad de uso del servicio.
          </Seccion>

          <Seccion titulo="7. Cambios a estos términos">
            Podemos actualizar estos términos ocasionalmente. Notificaremos cambios
            importantes a través de la app o por correo.
          </Seccion>

          <Seccion titulo="8. Contacto">
            Para dudas sobre estos términos, contáctanos a través del botón de ayuda dentro
            de la app.
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
