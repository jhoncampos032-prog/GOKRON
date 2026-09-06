import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Alert, RefreshControl, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { useIdioma } from '../context/LanguageContext';
import { api } from '../api/cliente';
import { colores, espaciado } from '../theme';

const ESTADOS_SIGUIENTE = {
  PENDIENTE: 'EN_PROGRESO',
  EN_PROGRESO: 'COMPLETADA',
};

export default function TareasScreen() {
  const { token, usuario } = useAuth();
  const { t } = useIdioma();
  const [tareas, setTareas] = useState([]);
  const [refrescando, setRefrescando] = useState(false);
  const [subiendoFotoId, setSubiendoFotoId] = useState(null);

  const ETIQUETA_BOTON = {
    PENDIENTE: t('tareasIniciar'),
    EN_PROGRESO: t('tareasCompletar'),
  };

  const cargar = useCallback(async () => {
    try {
      const data = await api.listarTareas(token, usuario?.id);
      setTareas(data);
    } catch (err) {
      Alert.alert(t('tareasErrorCargar'), err.message);
    } finally {
      setRefrescando(false);
    }
  }, [token, usuario, t]);

  useEffect(() => { cargar(); }, [cargar]);

  async function avanzarTarea(tarea) {
    const nuevoEstado = ESTADOS_SIGUIENTE[tarea.estado];
    if (!nuevoEstado) return;
    try {
      const resultado = await api.actualizarTarea(token, tarea.id, { estado: nuevoEstado });
      if (resultado?.guardadoLocalmente) {
        Alert.alert(t('tareasSinSenal'), t('tareasSinSenalMensaje'));
      }
      cargar();
    } catch (err) {
      Alert.alert(t('tareasErrorActualizar'), err.message);
    }
  }

  function elegirFoto(tarea) {
    Alert.alert(t('tareasFotoTitulo'), t('tareasFotoPregunta'), [
      { text: t('tareasTomarFoto'), onPress: () => tomarFoto(tarea) },
      { text: t('tareasElegirGaleria'), onPress: () => elegirDeGaleria(tarea) },
      { text: t('punchCancelar'), style: 'cancel' },
    ]);
  }

  async function tomarFoto(tarea) {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('tareasPermisoCamaraTitulo'), t('tareasPermisoCamaraMensaje'));
      return;
    }
    const resultado = await ImagePicker.launchCameraAsync({ quality: 0.4, base64: true, allowsEditing: false });
    if (resultado.canceled) return;
    await subirFoto(tarea, resultado.assets[0]);
  }

  async function elegirDeGaleria(tarea) {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('tareasPermisoGaleriaTitulo'), t('tareasPermisoGaleriaMensaje'));
      return;
    }
    const resultado = await ImagePicker.launchImageLibraryAsync({ quality: 0.4, base64: true, allowsEditing: false });
    if (resultado.canceled) return;
    await subirFoto(tarea, resultado.assets[0]);
  }

  async function subirFoto(tarea, foto) {
    if (!foto?.base64) {
      Alert.alert(t('tareasFotoNoProcesadaTitulo'), t('tareasFotoNoProcesadaMensaje'));
      return;
    }

    setSubiendoFotoId(tarea.id);
    try {
      const fotoEvidenciaUrl = `data:image/jpeg;base64,${foto.base64}`;
      const respuesta = await api.actualizarTarea(token, tarea.id, { fotoEvidenciaUrl });
      if (respuesta?.guardadoLocalmente) {
        Alert.alert(t('tareasSinSenal'), t('tareasSinSenalMensaje'));
      } else {
        Alert.alert(t('tareasFotoGuardadaTitulo'), t('tareasFotoGuardadaMensaje'));
      }
      cargar();
    } catch (err) {
      Alert.alert(t('tareasErrorSubirFoto'), err.message);
    } finally {
      setSubiendoFotoId(null);
    }
  }

  return (
    <View style={estilos.contenedor}>
      <FlatList
        data={tareas}
        keyExtractor={(t) => t.id}
        refreshControl={
          <RefreshControl refreshing={refrescando} onRefresh={() => { setRefrescando(true); cargar(); }} />
        }
        ListHeaderComponent={<View style={estilos.franja} />}
        contentContainerStyle={tareas.length === 0 && estilos.vacioContenedor}
        ListEmptyComponent={<Text style={estilos.vacio}>{t('tareasSinTareas')}</Text>}
        renderItem={({ item }) => (
          <View style={estilos.tarjeta}>
            <View style={estilos.tarjetaHeader}>
              <Text style={estilos.titulo}>{item.titulo}</Text>
              <View style={[estilos.etiquetaEstado, estilosEstado[item.estado]]}>
                <Text style={estilos.etiquetaEstadoTexto}>{item.estado.replace('_', ' ').toLowerCase()}</Text>
              </View>
            </View>
            <Text style={estilos.obra}>{item.obra?.nombre}</Text>
            {item.descripcion ? <Text style={estilos.descripcion}>{item.descripcion}</Text> : null}

            {item.fotoEvidenciaUrl ? (
              <Image source={{ uri: item.fotoEvidenciaUrl }} style={estilos.miniatura} />
            ) : null}

            <View style={estilos.filaBotones}>
              <TouchableOpacity
                style={estilos.botonFoto}
                onPress={() => elegirFoto(item)}
                disabled={subiendoFotoId === item.id}
              >
                <Text style={estilos.botonFotoTexto}>
                  {subiendoFotoId === item.id
                    ? t('tareasSubiendo')
                    : item.fotoEvidenciaUrl
                    ? t('tareasCambiarFoto')
                    : t('tareasAgregarFoto')}
                </Text>
              </TouchableOpacity>

              {ESTADOS_SIGUIENTE[item.estado] && (
                <TouchableOpacity style={estilos.boton} onPress={() => avanzarTarea(item)}>
                  <Text style={estilos.botonTexto}>{ETIQUETA_BOTON[item.estado]}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      />
    </View>
  );
}

const estilosEstado = StyleSheet.create({
  PENDIENTE: { backgroundColor: colores.crema },
  EN_PROGRESO: { backgroundColor: '#E4EEF6' },
  COMPLETADA: { backgroundColor: 'rgba(70, 240, 210, 0.25)' },
});

const estilos = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: colores.hueso },
  franja: { height: 6, backgroundColor: colores.menta, marginBottom: espaciado.md },
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
  tarjetaHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  titulo: { fontSize: 16, fontWeight: '700', color: colores.grafito, flex: 1, marginRight: 8 },
  obra: { fontSize: 13, color: colores.textoSecundario, marginTop: 4 },
  descripcion: { fontSize: 14, color: colores.textoPrincipal, marginTop: espaciado.sm },
  etiquetaEstado: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 3 },
  etiquetaEstadoTexto: { fontSize: 11, fontWeight: '600', color: colores.grafito },
  miniatura: {
    width: '100%',
    height: 160,
    borderRadius: 6,
    marginTop: espaciado.sm,
    backgroundColor: colores.hueso,
  },
  filaBotones: { marginTop: espaciado.md, gap: espaciado.sm },
  botonFoto: {
    backgroundColor: colores.hueso,
    borderWidth: 1,
    borderColor: colores.huesoFuerte,
    borderRadius: 4,
    paddingVertical: 10,
    alignItems: 'center',
  },
  botonFotoTexto: { color: colores.textoPrincipal, fontWeight: '600', fontSize: 13 },
  boton: {
    backgroundColor: colores.grafito,
    borderRadius: 4,
    paddingVertical: 10,
    alignItems: 'center',
  },
  botonTexto: { color: colores.blanco, fontWeight: '600', fontSize: 14 },
});
