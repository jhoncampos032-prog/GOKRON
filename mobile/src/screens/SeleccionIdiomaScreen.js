import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useIdioma } from '../context/LanguageContext';
import { colores, espaciado } from '../theme';

export default function SeleccionIdiomaScreen() {
  const { elegirIdioma, t } = useIdioma();

  return (
    <View style={estilos.contenedor}>
      <View style={estilos.franja} />
      <View style={estilos.centro}>
        <Text style={estilos.marca}>GOKRON</Text>
        <Text style={estilos.titulo}>{t('seleccionIdiomaTitulo')}</Text>
        <Text style={estilos.subtitulo}>{t('seleccionIdiomaSubtitulo')}</Text>

        <TouchableOpacity style={estilos.boton} onPress={() => elegirIdioma('es')}>
          <Text style={estilos.botonTexto}>Español</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[estilos.boton, estilos.botonSecundario]} onPress={() => elegirIdioma('en')}>
          <Text style={estilos.botonTexto}>English</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: colores.grafito },
  franja: { height: 6, backgroundColor: colores.menta },
  centro: { flex: 1, justifyContent: 'center', paddingHorizontal: espaciado.xl },
  marca: { color: colores.menta, fontSize: 14, fontWeight: '700', letterSpacing: 2, marginBottom: 16 },
  titulo: { color: colores.blanco, fontSize: 26, fontWeight: '700', marginBottom: 8 },
  subtitulo: { color: 'rgba(255,255,255,0.6)', fontSize: 14, marginBottom: espaciado.xl },
  boton: {
    backgroundColor: colores.menta,
    borderRadius: 4,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: espaciado.md,
  },
  botonSecundario: { backgroundColor: colores.acero },
  botonTexto: { color: colores.grafito, fontWeight: '700', fontSize: 16 },
});
