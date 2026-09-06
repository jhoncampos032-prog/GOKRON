import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Alert, RefreshControl } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useIdioma } from '../context/LanguageContext';
import { api } from '../api/cliente';
import { colores, espaciado } from '../theme';

function calcularHoras(checkIn, checkOut) {
  if (!checkOut) return null;
  const ms = new Date(checkOut) - new Date(checkIn);
  const horas = ms / (1000 * 60 * 60);
  return horas.toFixed(1);
}

function formatearFecha(fecha, idioma) {
  return new Date(fecha).toLocaleDateString(idioma === 'en' ? 'en-US' : 'es', {
    weekday: 'short', day: 'numeric', month: 'short',
  });
}

function formatearHora(fecha, idioma) {
  return new Date(fecha).toLocaleTimeString(idioma === 'en' ? 'en-US' : 'es', { hour: '2-digit', minute: '2-digit' });
}

export default function TimeCardScreen() {
  const { token, usuario } = useAuth();
  const { t, idioma } = useIdioma();
  const [registros, setRegistros] = useState([]);
  const [refrescando, setRefrescando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const data = await api.historialAsistencia(token, usuario?.id);
      setRegistros(data);
    } catch (err) {
      Alert.alert(t('timeCardErrorCargar'), err.message);
    } finally {
      setRefrescando(false);
    }
  }, [token, usuario, t]);

  useEffect(() => { cargar(); }, [cargar]);

  const totalHorasSemana = registros
    .filter((r) => r.checkOut)
    .reduce((acc, r) => acc + Number(calcularHoras(r.checkIn, r.checkOut)), 0);

  return (
    <View style={estilos.contenedor}>
      <FlatList
      data={registros}
      keyExtractor={(r) => r.id}
      refreshControl={
        <RefreshControl refreshing={refrescando} onRefresh={() => { setRefrescando(true); cargar(); }} />
      }
      ListHeaderComponent={
        <>
          <View style={estilos.franja} />
          <View style={estilos.resumen}>
            <Text style={estilos.resumenEtiqueta}>{t('timeCardTotalHoras')}</Text>
            <Text style={estilos.resumenValor}>{totalHorasSemana.toFixed(1)} h</Text>
          </View>
        </>
      }
      contentContainerStyle={registros.length === 0 && estilos.vacioContenedor}
      ListEmptyComponent={<Text style={estilos.vacio}>{t('timeCardSinMarcaciones')}</Text>}
      renderItem={({ item }) => {
        const horas = calcularHoras(item.checkIn, item.checkOut);
        return (
          <View style={estilos.tarjeta}>
            <View style={estilos.filaSuperior}>
              <Text style={estilos.fecha}>{formatearFecha(item.checkIn, idioma)}</Text>
              {horas && <Text style={estilos.horasBadge}>{horas} h</Text>}
            </View>
            <Text style={estilos.obra}>{item.obra?.nombre}</Text>

            <View style={estilos.filaHorario}>
              <View style={estilos.puntoEntrada}>
                <Text style={estilos.horarioEtiqueta}>{t('timeCardEntrada')}</Text>
                <Text style={estilos.horarioValor}>{formatearHora(item.checkIn, idioma)}</Text>
              </View>
              <View style={estilos.puntoSalida}>
                <Text style={estilos.horarioEtiqueta}>{t('timeCardSalida')}</Text>
                <Text style={estilos.horarioValor}>
                  {item.checkOut ? formatearHora(item.checkOut, idioma) : t('timeCardEnObra')}
                </Text>
              </View>
            </View>

            {(item.notaCheckIn || item.notaCheckOut) && (
              <View style={estilos.notas}>
                {item.notaCheckIn ? <Text style={estilos.notaTexto}>· {item.notaCheckIn}</Text> : null}
                {item.notaCheckOut ? <Text style={estilos.notaTexto}>· {item.notaCheckOut}</Text> : null}
              </View>
            )}
          </View>
        );
      }}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: colores.hueso },
  franja: { height: 6, backgroundColor: colores.menta, marginBottom: espaciado.md },
  resumen: {
    backgroundColor: colores.grafito,
    marginHorizontal: espaciado.lg,
    marginBottom: espaciado.md,
    padding: espaciado.lg,
    borderRadius: 6,
  },
  resumenEtiqueta: { color: 'rgba(255,255,255,0.65)', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  resumenValor: { color: colores.menta, fontSize: 28, fontWeight: '700', marginTop: 4 },
  vacioContenedor: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
  vacio: { color: colores.textoSecundario, fontSize: 14, textAlign: 'center', padding: espaciado.lg },
  tarjeta: {
    backgroundColor: colores.blanco,
    marginHorizontal: espaciado.lg,
    marginBottom: espaciado.md,
    padding: espaciado.md,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colores.huesoFuerte,
  },
  filaSuperior: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fecha: { fontSize: 13, fontWeight: '600', color: colores.textoSecundario, textTransform: 'capitalize' },
  horasBadge: {
    fontSize: 13,
    fontWeight: '700',
    color: colores.mentaOscuro,
    backgroundColor: 'rgba(70, 240, 210, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 3,
  },
  obra: { fontSize: 16, fontWeight: '700', color: colores.grafito, marginTop: 4, marginBottom: espaciado.sm },
  filaHorario: { flexDirection: 'row', justifyContent: 'space-between' },
  puntoEntrada: { flex: 1 },
  puntoSalida: { flex: 1, alignItems: 'flex-end' },
  horarioEtiqueta: { fontSize: 11, color: colores.textoSecundario, textTransform: 'uppercase' },
  horarioValor: { fontSize: 16, fontWeight: '600', color: colores.textoPrincipal, marginTop: 2 },
  notas: { marginTop: espaciado.sm, paddingTop: espaciado.sm, borderTopWidth: 1, borderTopColor: colores.hueso },
  notaTexto: { fontSize: 13, color: colores.textoSecundario, fontStyle: 'italic' },
});
