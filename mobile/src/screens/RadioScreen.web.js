import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useIdioma } from '../context/LanguageContext';
import { colores, espaciado } from '../theme';

// Version para navegador (solo para pruebas mientras se compila la app real):
// react-native-agora tiene un componente nativo que Metro no puede empaquetar
// para web bajo ninguna circunstancia, ni siquiera con try/catch en tiempo de
// ejecucion, asi que esta version NUNCA lo importa - evita que Metro rompa
// el resto de la app al intentar compilarlo para el navegador.
export default function RadioScreen() {
  const { t } = useIdioma();

  return (
    <View style={estilos.contenedor}>
      <View style={estilos.franja} />
      <View style={estilos.avisoContenedor}>
        <Text style={estilos.avisoTitulo}>{t('radioNoDisponibleTitulo')}</Text>
        <Text style={estilos.avisoTexto}>{t('radioNoDisponibleMensaje')}</Text>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: colores.hueso },
  franja: { height: 6, backgroundColor: colores.menta, marginBottom: espaciado.lg },
  avisoContenedor: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: espaciado.xl },
  avisoTitulo: { fontSize: 18, fontWeight: '700', color: colores.grafito, marginBottom: espaciado.sm, textAlign: 'center' },
  avisoTexto: { fontSize: 14, color: colores.textoSecundario, textAlign: 'center', lineHeight: 20 },
});
