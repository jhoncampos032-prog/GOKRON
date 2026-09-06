import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useIdioma } from '../context/LanguageContext';
import { api } from '../api/cliente';
import { colores, espaciado } from '../theme';

export default function InicioScreen({ onNavegar }) {
  const { token, usuario } = useAuth();
  const { t, idioma } = useIdioma();
  const [ultimasMarcaciones, setUltimasMarcaciones] = useState([]);
  const [refrescando, setRefrescando] = useState(false);

  function formatearFecha(fecha) {
    return fecha.toLocaleDateString(idioma === 'en' ? 'en-US' : 'es', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  }

  const cargar = useCallback(async () => {
    try {
      const data = await api.historialAsistencia(token, usuario?.id);
      setUltimasMarcaciones(data.slice(0, 2));
    } catch (err) {
      // silencioso: esta pantalla es informativa
    } finally {
      setRefrescando(false);
    }
  }, [token, usuario]);

  useEffect(() => { cargar(); }, [cargar]);

  return (
    <ScrollView
      style={estilos.contenedor}
      refreshControl={
        <RefreshControl refreshing={refrescando} onRefresh={() => { setRefrescando(true); cargar(); }} />
      }
    >
      <View style={estilos.encabezado}>
        <Text style={estilos.saludo}>{t('inicioSaludo', { nombre: usuario?.nombre?.split(' ')[0] })}</Text>
        <Text style={estilos.fecha}>{formatearFecha(new Date())}</Text>
      </View>

      <TouchableOpacity style={estilos.tarjeta} onPress={() => onNavegar('Punch')}>
        <View style={estilos.tarjetaHeaderFila}>
          <Text style={estilos.tarjetaTitulo}>{t('inicioMarcarEntradaSalida')}</Text>
          <Text style={estilos.flecha}>{'\u203A'}</Text>
        </View>

        {ultimasMarcaciones.length === 0 ? (
          <Text style={estilos.vacio}>{t('inicioSinMarcaciones')}</Text>
        ) : (
          ultimasMarcaciones.map((m) => (
            <View key={m.id} style={estilos.filaMarcacion}>
              <View style={[estilos.pill, estilos.pillEntrada]}>
                <Text style={estilos.pillHora}>
                  {new Date(m.checkIn).toLocaleTimeString(idioma === 'en' ? 'en-US' : 'es', { hour: '2-digit', minute: '2-digit' })}
                </Text>
                <Text style={estilos.pillEtiqueta}>{t('inicioEntrada')}</Text>
              </View>
              {m.checkOut && (
                <View style={[estilos.pill, estilos.pillSalida]}>
                  <Text style={estilos.pillHora}>
                    {new Date(m.checkOut).toLocaleTimeString(idioma === 'en' ? 'en-US' : 'es', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                  <Text style={estilos.pillEtiqueta}>{t('inicioSalida')}</Text>
                </View>
              )}
            </View>
          ))
        )}
        <Text style={estilos.masReciente}>{t('inicioMasRecientes')}</Text>
      </TouchableOpacity>

      <View style={estilos.filaAccesos}>
        <TouchableOpacity style={estilos.accesoDirecto} onPress={() => onNavegar('TimeCard')}>
          <Text style={estilos.accesoTitulo}>{t('inicioIrTimeCard')}</Text>
          <Text style={estilos.flecha}>{'\u203A'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={estilos.accesoDirecto} onPress={() => onNavegar('Materiales')}>
          <Text style={estilos.accesoTitulo}>{t('inicioIrMateriales')}</Text>
          <Text style={estilos.flecha}>{'\u203A'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={estilos.accesoDirecto} onPress={() => onNavegar('Herramientas')}>
          <Text style={estilos.accesoTitulo}>{t('menuHerramientas')}</Text>
          <Text style={estilos.flecha}>{'\u203A'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={estilos.accesoDirecto} onPress={() => onNavegar('Tareas')}>
          <Text style={estilos.accesoTitulo}>{t('inicioIrTareas')}</Text>
          <Text style={estilos.flecha}>{'\u203A'}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: colores.hueso },
  encabezado: { padding: espaciado.lg, paddingBottom: espaciado.sm },
  saludo: { fontSize: 24, fontWeight: '700', color: colores.grafito },
  fecha: { fontSize: 14, color: colores.textoSecundario, marginTop: 4, textTransform: 'capitalize' },
  tarjeta: {
    backgroundColor: colores.blanco,
    marginHorizontal: espaciado.lg,
    marginBottom: espaciado.md,
    padding: espaciado.lg,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colores.huesoFuerte,
  },
  tarjetaHeaderFila: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: espaciado.sm,
  },
  tarjetaTitulo: { fontSize: 16, fontWeight: '700', color: colores.grafito },
  flecha: { fontSize: 20, color: colores.textoSecundario },
  vacio: { color: colores.textoSecundario, fontSize: 14, fontStyle: 'italic' },
  filaMarcacion: { flexDirection: 'row', gap: espaciado.sm, marginBottom: espaciado.sm },
  pill: { flex: 1, borderRadius: 6, padding: 12 },
  pillEntrada: { backgroundColor: 'rgba(70, 240, 210, 0.18)' },
  pillSalida: { backgroundColor: '#E4EEF6' },
  pillHora: { fontSize: 18, fontWeight: '700', color: colores.grafito },
  pillEtiqueta: { fontSize: 12, color: colores.textoSecundario, marginTop: 2 },
  masReciente: { fontSize: 12, color: colores.textoSecundario, marginTop: 4 },
  filaAccesos: { paddingHorizontal: espaciado.lg, marginBottom: espaciado.xl },
  accesoDirecto: {
    backgroundColor: colores.blanco,
    borderWidth: 1,
    borderColor: colores.huesoFuerte,
    borderRadius: 6,
    padding: espaciado.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: espaciado.sm,
  },
  accesoTitulo: { fontSize: 15, fontWeight: '600', color: colores.textoPrincipal },
});
