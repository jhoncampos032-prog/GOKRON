import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { useIdioma } from '../context/LanguageContext';
import { api } from '../api/cliente';
import { colores, espaciado } from '../theme';

export default function HerramientasScreen() {
  const { token } = useAuth();
  const { t, idioma } = useIdioma();
  const [herramientas, setHerramientas] = useState([]);
  const [personal, setPersonal] = useState([]);
  const [refrescando, setRefrescando] = useState(false);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [herramientaActiva, setHerramientaActiva] = useState(null);
  const [modoAccion, setModoAccion] = useState('prestar'); // 'prestar' | 'devolver'
  const [vistaModal, setVistaModal] = useState('formulario'); // 'formulario' | 'personas'
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null);
  const [esOficina, setEsOficina] = useState(false);
  const [nota, setNota] = useState('');
  const [fotoAccion, setFotoAccion] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const [h, p] = await Promise.all([api.listarHerramientas(token), api.listarPersonalTodos(token)]);
      setHerramientas(h);
      setPersonal(p.filter((persona) => persona.activo));
    } catch (err) {
      Alert.alert(t('herramientasErrorCargar'), err.message);
    } finally {
      setRefrescando(false);
    }
  }, [token, t]);

  useEffect(() => { cargar(); }, [cargar]);

  function abrirPrestar(herramienta) {
    setHerramientaActiva(herramienta);
    setModoAccion('prestar');
    setVistaModal('formulario');
    setUsuarioSeleccionado(null);
    setEsOficina(false);
    setNota('');
    setFotoAccion(null);
    setModalAbierto(true);
  }

  function abrirDevolver(herramienta) {
    setHerramientaActiva(herramienta);
    setModoAccion('devolver');
    setVistaModal('formulario');
    setNota('');
    setFotoAccion(null);
    setModalAbierto(true);
  }

  function elegirFotoAccion() {
    Alert.alert(t('tareasFotoTitulo'), t('tareasFotoPregunta'), [
      { text: t('tareasTomarFoto'), onPress: tomarFotoAccion },
      { text: t('tareasElegirGaleria'), onPress: elegirFotoGaleriaAccion },
      { text: t('punchCancelar'), style: 'cancel' },
    ]);
  }

  async function tomarFotoAccion() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('tareasPermisoCamaraTitulo'), t('tareasPermisoCamaraMensaje'));
      return;
    }
    const resultado = await ImagePicker.launchCameraAsync({ quality: 0.4, base64: true });
    if (resultado.canceled) return;
    setFotoAccion(`data:image/jpeg;base64,${resultado.assets[0].base64}`);
  }

  async function elegirFotoGaleriaAccion() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('tareasPermisoGaleriaTitulo'), t('tareasPermisoGaleriaMensaje'));
      return;
    }
    const resultado = await ImagePicker.launchImageLibraryAsync({ quality: 0.4, base64: true });
    if (resultado.canceled) return;
    setFotoAccion(`data:image/jpeg;base64,${resultado.assets[0].base64}`);
  }

  async function confirmar() {
    if (modoAccion === 'prestar' && !usuarioSeleccionado && !esOficina) {
      Alert.alert(t('herramientasSeleccionaPersonaTitulo'), t('herramientasSeleccionaPersonaMensaje'));
      return;
    }
    setGuardando(true);
    try {
      if (modoAccion === 'prestar') {
        await api.prestarHerramienta(token, herramientaActiva.id, {
          usuarioId: esOficina ? undefined : usuarioSeleccionado.id,
          entregarAOficina: esOficina || undefined,
          nota: nota || undefined,
          fotoUrl: fotoAccion || undefined,
        });
        Alert.alert(t('herramientasPrestamoOk'));
      } else {
        await api.devolverHerramienta(token, herramientaActiva.id, {
          nota: nota || undefined,
          fotoUrl: fotoAccion || undefined,
        });
        Alert.alert(t('herramientasDevolucionOk'));
      }
      setModalAbierto(false);
      cargar();
    } catch (err) {
      Alert.alert(
        modoAccion === 'prestar' ? t('herramientasErrorPrestar') : t('herramientasErrorDevolver'),
        err.message
      );
    } finally {
      setGuardando(false);
    }
  }

  const personalFiltrado = personal.filter((p) => p.nombre.toLowerCase().includes(busqueda.toLowerCase()));

  return (
    <View style={estilos.contenedor}>
      <FlatList
        data={herramientas}
        keyExtractor={(h) => h.id}
        refreshControl={
          <RefreshControl refreshing={refrescando} onRefresh={() => { setRefrescando(true); cargar(); }} />
        }
        ListHeaderComponent={<View style={estilos.franja} />}
        contentContainerStyle={herramientas.length === 0 && estilos.vacioContenedor}
        ListEmptyComponent={<Text style={estilos.vacio}>{t('herramientasSinHerramientas')}</Text>}
        renderItem={({ item }) => (
          <View style={estilos.tarjeta}>
            <View style={estilos.tarjetaFila}>
              {item.fotoUrl ? (
                <Image source={{ uri: item.fotoUrl }} style={estilos.miniatura} />
              ) : (
                <View style={estilos.miniaturaVacia}>
                  <Text style={estilos.miniaturaVaciaTexto}>🔧</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <View style={estilos.tarjetaHeader}>
                  <Text style={estilos.nombre}>{item.nombre}</Text>
                  <View style={[estilos.etiquetaEstado, item.estado === 'PRESTADA' ? estilos.estadoPrestada : estilos.estadoDisponible]}>
                    <Text style={estilos.etiquetaEstadoTexto}>
                      {item.estado === 'PRESTADA' ? t('herramientasPrestada') : t('herramientasDisponible')}
                    </Text>
                  </View>
                </View>
                {item.codigo ? <Text style={estilos.codigo}>{item.codigo}</Text> : null}
                {item.prestamoActivo && (
                  <Text style={estilos.prestamoInfo}>
                    {t('herramientasEnManosDe', {
                      nombre: item.prestamoActivo.esOficina ? t('herramientasOficina') : item.prestamoActivo.usuarioNombre,
                    })}{' '}
                    ·{' '}
                    {t('herramientasDesde', {
                      fecha: new Date(item.prestamoActivo.fechaPrestamo).toLocaleDateString(idioma === 'en' ? 'en-US' : 'es'),
                    })}
                  </Text>
                )}
              </View>
            </View>

            {item.estado === 'PRESTADA' ? (
              <TouchableOpacity style={estilos.boton} onPress={() => abrirDevolver(item)}>
                <Text style={estilos.botonTexto}>{t('herramientasDevolver')}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={estilos.boton} onPress={() => abrirPrestar(item)}>
                <Text style={estilos.botonTexto}>{t('herramientasPrestar')}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      />

      {/* Un solo Modal para prestar/devolver: el selector de persona es una
          vista interna, nunca un <Modal> nuevo apilado (falla en iOS). */}
      <Modal visible={modalAbierto} animationType="slide" onRequestClose={() => setModalAbierto(false)}>
        <View style={estilos.modalContenedor}>
          {vistaModal === 'formulario' && (
            <>
              <View style={estilos.modalHeader}>
                <TouchableOpacity onPress={() => setModalAbierto(false)}>
                  <Text style={estilos.modalCancelar}>{t('punchCancelar')}</Text>
                </TouchableOpacity>
                <Text style={estilos.modalTitulo}>{herramientaActiva?.nombre}</Text>
                <View style={{ width: 70 }} />
              </View>

              <View style={estilos.modalCuerpo}>
                {modoAccion === 'prestar' && (
                  <>
                    <Text style={estilos.etiqueta}>{t('herramientasPrestarA')}</Text>
                    <TouchableOpacity
                      style={estilos.filaSelector}
                      onPress={() => { setBusqueda(''); setVistaModal('personas'); }}
                    >
                      <Text style={(usuarioSeleccionado || esOficina) ? estilos.filaSelectorValor : estilos.filaSelectorPlaceholder}>
                        {esOficina
                          ? t('herramientasOficina')
                          : usuarioSeleccionado
                          ? usuarioSeleccionado.nombre
                          : t('herramientasSeleccionarPersona')}
                      </Text>
                      <Text style={estilos.filaSelectorFlecha}>{'\u203A'}</Text>
                    </TouchableOpacity>
                  </>
                )}

                <Text style={estilos.etiqueta}>
                  {modoAccion === 'prestar' ? t('materialesNotaOpcional') : t('herramientasNotaDevolucion')}
                </Text>
                <TextInput
                  style={estilos.input}
                  value={nota}
                  onChangeText={setNota}
                  placeholderTextColor={colores.textoSecundario}
                  multiline
                />

                <TouchableOpacity style={estilos.botonFotoAccion} onPress={elegirFotoAccion}>
                  <Text style={estilos.botonFotoAccionTexto}>
                    {fotoAccion ? t('herramientasCambiarFoto') : t('herramientasAgregarFoto')}
                  </Text>
                </TouchableOpacity>
                {fotoAccion && <Image source={{ uri: fotoAccion }} style={estilos.previaFoto} />}

                <TouchableOpacity style={estilos.botonConfirmar} onPress={confirmar} disabled={guardando}>
                  <Text style={estilos.botonConfirmarTexto}>
                    {guardando
                      ? t('materialesGuardando')
                      : modoAccion === 'prestar'
                      ? t('herramientasConfirmarPrestamo')
                      : t('herramientasConfirmarDevolucion')}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {vistaModal === 'personas' && (
            <>
              <View style={estilos.modalHeader}>
                <TouchableOpacity onPress={() => setVistaModal('formulario')}>
                  <Text style={estilos.modalCancelar}>{t('punchVolver')}</Text>
                </TouchableOpacity>
                <Text style={estilos.modalTitulo}>{t('herramientasSeleccionarPersona')}</Text>
                <View style={{ width: 70 }} />
              </View>

              <TextInput
                style={estilos.modalBuscador}
                placeholder={t('herramientasBuscarPersona')}
                placeholderTextColor={colores.textoSecundario}
                value={busqueda}
                onChangeText={setBusqueda}
                autoFocus
              />

              {/* Opcion fija: entregar a la oficina/compania, sin persona especifica */}
              <TouchableOpacity
                style={estilos.modalFilaOficina}
                onPress={() => {
                  setEsOficina(true);
                  setUsuarioSeleccionado(null);
                  setVistaModal('formulario');
                  setBusqueda('');
                }}
              >
                <Text style={estilos.modalFilaOficinaTexto}>🏢 {t('herramientasOficina')}</Text>
              </TouchableOpacity>

              <FlatList
                data={personalFiltrado}
                keyExtractor={(p) => p.id}
                ListEmptyComponent={<Text style={estilos.modalVacio}>{t('herramientasNoPersonal')}</Text>}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={estilos.modalFila}
                    onPress={() => {
                      setUsuarioSeleccionado(item);
                      setEsOficina(false);
                      setVistaModal('formulario');
                      setBusqueda('');
                    }}
                  >
                    <Text style={estilos.modalFilaTexto}>{item.nombre}</Text>
                    <Text style={estilos.modalFilaSubtexto}>{item.rol}</Text>
                  </TouchableOpacity>
                )}
              />
            </>
          )}
        </View>
      </Modal>
    </View>
  );
}

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
  tarjetaFila: { flexDirection: 'row', gap: espaciado.md, marginBottom: espaciado.md },
  miniatura: { width: 56, height: 56, borderRadius: 6, backgroundColor: colores.hueso },
  miniaturaVacia: {
    width: 56,
    height: 56,
    borderRadius: 6,
    backgroundColor: colores.hueso,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniaturaVaciaTexto: { fontSize: 22 },
  tarjetaHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  nombre: { fontSize: 16, fontWeight: '700', color: colores.grafito, flex: 1, marginRight: 8 },
  codigo: { fontSize: 12, color: colores.textoSecundario, marginTop: 2 },
  prestamoInfo: { fontSize: 12, color: colores.textoSecundario, marginTop: 4 },
  etiquetaEstado: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 3 },
  estadoDisponible: { backgroundColor: 'rgba(70,240,210,0.2)' },
  estadoPrestada: { backgroundColor: '#FBEAE8' },
  etiquetaEstadoTexto: { fontSize: 11, fontWeight: '600', color: colores.grafito },
  boton: {
    backgroundColor: colores.grafito,
    borderRadius: 4,
    paddingVertical: 10,
    alignItems: 'center',
  },
  botonTexto: { color: colores.blanco, fontWeight: '600', fontSize: 14 },
  modalContenedor: { flex: 1, backgroundColor: colores.blanco },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: espaciado.lg,
    paddingVertical: espaciado.md,
    paddingTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: colores.huesoFuerte,
  },
  modalCancelar: { fontSize: 15, color: colores.acero },
  modalTitulo: { fontSize: 16, fontWeight: '700', color: colores.grafito },
  modalCuerpo: { flex: 1, padding: espaciado.lg },
  etiqueta: { fontSize: 13, color: colores.textoSecundario, marginBottom: espaciado.sm, marginTop: espaciado.md },
  filaSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colores.huesoFuerte,
    borderRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  filaSelectorValor: { fontSize: 15, color: colores.textoPrincipal, fontWeight: '600' },
  filaSelectorPlaceholder: { fontSize: 15, color: colores.textoSecundario },
  filaSelectorFlecha: { fontSize: 20, color: colores.textoSecundario },
  input: {
    borderWidth: 1,
    borderColor: colores.huesoFuerte,
    borderRadius: 4,
    padding: 12,
    fontSize: 14,
    color: colores.textoPrincipal,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  botonConfirmar: {
    backgroundColor: colores.menta,
    borderRadius: 4,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: espaciado.xl,
  },
  botonFotoAccion: {
    backgroundColor: colores.hueso,
    borderWidth: 1,
    borderColor: colores.huesoFuerte,
    borderRadius: 4,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: espaciado.md,
  },
  botonFotoAccionTexto: { color: colores.textoPrincipal, fontWeight: '600', fontSize: 13 },
  previaFoto: { width: '100%', height: 140, borderRadius: 6, marginTop: espaciado.sm, backgroundColor: colores.hueso },
  botonConfirmarTexto: { color: colores.grafito, fontWeight: '700', fontSize: 16 },
  modalBuscador: {
    margin: espaciado.lg,
    marginBottom: espaciado.sm,
    borderWidth: 1,
    borderColor: colores.huesoFuerte,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    backgroundColor: colores.hueso,
  },
  modalFilaOficina: {
    paddingHorizontal: espaciado.lg,
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: colores.huesoFuerte,
    backgroundColor: colores.hueso,
  },
  modalFilaOficinaTexto: { fontSize: 16, color: colores.textoPrincipal, fontWeight: '700' },
  modalVacio: { textAlign: 'center', color: colores.textoSecundario, marginTop: espaciado.xl, fontSize: 14 },
  modalFila: {
    paddingHorizontal: espaciado.lg,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colores.hueso,
  },
  modalFilaTexto: { fontSize: 16, color: colores.textoPrincipal },
  modalFilaSubtexto: { fontSize: 13, color: colores.textoSecundario, marginTop: 2 },
});
