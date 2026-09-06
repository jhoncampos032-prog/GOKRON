import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// Version para navegador (solo para pruebas mientras se resuelve el bug
// de Expo Go): react-native-maps no funciona en web, asi que mostramos
// un aviso simple en su lugar, sin romper el resto de la pantalla.
export default function MapaUbicacion({ estiloMapa }) {
  return (
    <View style={[estiloMapa, estilos.contenedor]}>
      <Text style={estilos.texto}>
        🗺️ El mapa con tu ubicación solo está disponible en la app del celular (iOS/Android), no en el navegador.
      </Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#F5F6F8',
  },
  texto: { textAlign: 'center', color: '#666', fontSize: 13 },
});
