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

export default function MaterialesScreen() {
  const { token } = useAuth();
  const { t } = useIdioma();
  const [materiales, setMateriales] = useState([]);
  const [obras, setObras] = useState([]);
  const [refrescando, setRefrescando] = useState(false);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [materialActivo, setMaterialActivo] = useState(null);
  const [tipo, setTipo] = useState('ENTRADA');
  const [cantidad, setCantidad] = useState('');
  const [obraId, setObraId] = useState('');
  const [nota, setNota] = useState('');
  const [fotoMovimiento, setFotoMovimiento] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [selectorObraAbierto, setSelectorObraAbierto] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const [m, o] = await Promise.all([api.listarMateriales(token), api.listarObras(token)]);
      setMateriales(m);
      setObras(o);
    } catch (err) {
      Alert.alert(t('materialesErrorCargar'), err.message);
    } finally {
      setRefrescando(false);
    }
  }, [token, t]);

  useEffect(() => { cargar(); }, [cargar]);

  function abrirModal(material) {
    setMaterialActivo(material);
    setTipo('ENTRADA');
    setCantidad('');
    setObraId('');
    setNota('');
    setFotoMovimiento(null);
    setModalAbierto(true);
  }

  function elegirFotoMovimiento() {
    Alert.alert(t('tareasFotoTitulo'), t('tareasFotoPregunta'), [
      { text: t('tareasTomarFoto'), onPress: tomarFotoMovimiento },
      { text: t('tareasElegirGaleria'), onPress: elegirFotoGaleriaMovimiento },
      { text: t('punchCancelar'), style: 'cancel' },
    ]);
  }

  async function tomarFotoMovimiento() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('tareasPermisoCamaraTitulo'), t('tareasPermisoCamaraMensaje'));
      return;
    }
    const resultado = await ImagePicker.launchCameraAsync({ quality: 0.4, base64: true });
    if (resultado.canceled) return;
    setFotoMovimiento(`data:image/jpeg;base64,${resultado.assets[0].base64}`);
  }

  async function elegirFotoGaleriaMovimiento() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('tareasPermisoGaleriaTitulo'), t('tareasPermisoGaleriaMensaje'));
      return;
    }
    const resultado = await ImagePicker.launchImageLibraryAsync({ quality: 0.4, base64: true });
    if (resultado.canceled) return;
    setFotoMovimiento(`data:image/jpeg;base64,${resultado.assets[0].base64}`);
  }

  async function confirmarMovimiento() {
    const cantidadNum = Number(cantidad);
    if (!cantidadNum || cantidadNum <= 0) {
      Alert.alert(t('materialesCantidadInvalidaTitulo'), t('materialesCantidadInvalidaMensaje'));
      return;
    }
    if (!obraId) {
      Alert.alert(t('materialesSeleccionaObraTitulo'), t('materialesSeleccionaObraMensaje'));
      return;
    }

    setGuardando(true);
    try {
      const resultado = await api.registrarMovimiento(token, materialActivo.id, {
        obraId,
        tipo,
        cantidad: cantidadNum,
        nota: nota || undefined,
        fotoUrl: fotoMovimiento || undefined,
      });
      if (resultado?.guardadoLocalmente) {
        Alert.alert(t('materialesSinSenal'), t('materialesSinSenalMensaje'));
      } else {
        Alert.alert(t('materialesRegistradoTitulo'), t('materialesRegistradoMensaje'));
      }
      setModalAbierto(false);
      cargar();
    } catch (err) {
      Alert.alert(t('materialesErrorRegistrar'), err.message);
    } finally {
      setGuardando(false);
    }
  }

  const obraSeleccionada = obras.find((o) => o.id === obraId);

  return (
    <View style={estilos.contenedor}>
      <FlatList
        data={materiales}
        keyExtractor={(m) => m.id}
        refreshControl={
          <RefreshControl refreshing={refrescando} onRefresh={() => { setRefrescando(true); cargar(); }} />
        }
        ListHeaderComponent={<View style={estilos.franja} />}
        contentContainerStyle={materiales.length === 0 && estilos.vacioContenedor}
        ListEmptyComponent={
          <Text style={estilos.vacio}>{t('materialesSinMateriales')}</Text>
        }
        renderItem={({ item }) => (
          <View style={estilos.tarjeta}>
            <View style={estilos.tarjetaFila}>
              {item.fotoUrl ? (
                <Image source={{ uri: item.fotoUrl }} style={estilos.miniatura} />
              ) : (
                <View style={estilos.miniaturaVacia}>
                  <Text style={estilos.miniaturaVaciaTexto}>📦</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <View style={estilos.tarjetaHeader}>
                  <Text style={estilos.nombre}>{item.nombre}</Text>
                  <View style={[estilos.etiquetaEstado, item.stockBajo ? estilos.estadoBajo : estilos.estadoOk]}>
                    <Text style={estilos.etiquetaEstadoTexto}>{item.stockBajo ? t('materialesStockBajo') : t('materialesOk')}</Text>
                  </View>
                </View>
                <Text style={estilos.stock}>
                  {t('materialesDisponibles', { stock: item.stockActual, unidad: item.unidad })}
                </Text>
                <Text style={estilos.stockMinimo}>{t('materialesMinimo', { stock: item.stockMinimo, unidad: item.unidad })}</Text>
              </View>
            </View>

            <TouchableOpacity style={estilos.boton} onPress={() => abrirModal(item)}>
              <Text style={estilos.botonTexto}>{t('materialesRegistrarMovimiento')}</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      {/* Formulario de movimiento (entrada/salida) */}
      <Modal visible={modalAbierto} animationType="slide" onRequestClose={() => setModalAbierto(false)}>
        <View style={estilos.modalContenedor}>
          <View style={estilos.modalHeader}>
            <TouchableOpacity onPress={() => setModalAbierto(false)}>
              <Text style={estilos.modalCancelar}>{t('materialesCancelar')}</Text>
            </TouchableOpacity>
            <Text style={estilos.modalTitulo}>{materialActivo?.nombre}</Text>
            <View style={{ width: 70 }} />
          </View>

          <View style={estilos.modalCuerpo}>
            <Text style={estilos.etiqueta}>{t('materialesTipoMovimiento')}</Text>
            <View style={estilos.filaTipos}>
              <TouchableOpacity
                style={[estilos.botonTipo, tipo === 'ENTRADA' && estilos.botonTipoActivoEntrada]}
                onPress={() => setTipo('ENTRADA')}
              >
                <Text style={[estilos.botonTipoTexto, tipo === 'ENTRADA' && estilos.botonTipoTextoActivo]}>
                  {t('materialesEntrada')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[estilos.botonTipo, tipo === 'SALIDA' && estilos.botonTipoActivoSalida]}
                onPress={() => setTipo('SALIDA')}
              >
                <Text style={[estilos.botonTipoTexto, tipo === 'SALIDA' && estilos.botonTipoTextoActivo]}>
                  {t('materialesSalida')}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={estilos.etiqueta}>{t('materialesCantidad', { unidad: materialActivo?.unidad })}</Text>
            <TextInput
              style={estilos.input}
              value={cantidad}
              onChangeText={setCantidad}
              keyboardType="numeric"
              placeholder="Ej: 10"
              placeholderTextColor={colores.textoSecundario}
            />

            <Text style={estilos.etiqueta}>{t('materialesObra')}</Text>
            <TouchableOpacity style={estilos.filaSelector} onPress={() => setSelectorObraAbierto(true)}>
              <Text style={obraSeleccionada ? estilos.filaSelectorValor : estilos.filaSelectorPlaceholder}>
                {obraSeleccionada ? obraSeleccionada.nombre : t('materialesSeleccionar')}
              </Text>
              <Text style={estilos.filaSelectorFlecha}>{'\u203A'}</Text>
            </TouchableOpacity>

            <Text style={estilos.etiqueta}>{t('materialesNotaOpcional')}</Text>
            <TextInput
              style={[estilos.input, estilos.inputNota]}
              value={nota}
              onChangeText={setNota}
              placeholder="Ej: usado en cimentación"
              placeholderTextColor={colores.textoSecundario}
              multiline
            />

            <TouchableOpacity style={estilos.botonFotoMovimiento} onPress={elegirFotoMovimiento}>
              <Text style={estilos.botonFotoMovimientoTexto}>
                {fotoMovimiento ? t('materialesCambiarFoto') : t('materialesAgregarFoto')}
              </Text>
            </TouchableOpacity>
            {fotoMovimiento && (
              <Image source={{ uri: fotoMovimiento }} style={estilos.previaFoto} />
            )}

            <TouchableOpacity
              style={estilos.botonConfirmar}
              onPress={confirmarMovimiento}
              disabled={guardando}
            >
              <Text style={estilos.botonConfirmarTexto}>
                {guardando ? t('materialesGuardando') : t('materialesConfirmar')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Selector de obra en pantalla completa */}
      <Modal visible={selectorObraAbierto} animationType="slide" onRequestClose={() => setSelectorObraAbierto(false)}>
        <View style={estilos.modalContenedor}>
          <View style={estilos.modalHeader}>
            <TouchableOpacity onPress={() => setSelectorObraAbierto(false)}>
              <Text style={estilos.modalCancelar}>{t('materialesCancelar')}</Text>
            </TouchableOpacity>
            <Text style={estilos.modalTitulo}>{t('materialesObra')}</Text>
            <View style={{ width: 70 }} />
          </View>
          <FlatList
            data={obras}
            keyExtractor={(o) => o.id}
            ListEmptyComponent={<Text style={estilos.modalVacio}>{t('materialesNoObras')}</Text>}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={estilos.modalFila}
                onPress={() => {
                  setObraId(item.id);
                  setSelectorObraAbierto(false);
                }}
              >
                <Text style={estilos.modalFilaTexto}>{item.nombre}</Text>
              </TouchableOpacity>
            )}
          />
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
  tarjetaHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
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
  nombre: { fontSize: 16, fontWeight: '700', color: colores.grafito, flex: 1, marginRight: 8 },
  stock: { fontSize: 15, color: colores.textoPrincipal, marginTop: 6, fontWeight: '600' },
  stockMinimo: { fontSize: 12, color: colores.textoSecundario, marginTop: 2 },
  etiquetaEstado: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 3 },
  estadoBajo: { backgroundColor: '#FBEAE8' },
  estadoOk: { backgroundColor: 'rgba(70,240,210,0.2)' },
  etiquetaEstadoTexto: { fontSize: 11, fontWeight: '600', color: colores.grafito },
  boton: {
    backgroundColor: colores.grafito,
    borderRadius: 4,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: espaciado.md,
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
  filaTipos: { flexDirection: 'row', gap: espaciado.sm },
  botonTipo: {
    flex: 1,
    borderWidth: 1,
    borderColor: colores.huesoFuerte,
    borderRadius: 4,
    paddingVertical: 12,
    alignItems: 'center',
  },
  botonTipoActivoEntrada: { backgroundColor: 'rgba(70,240,210,0.2)', borderColor: colores.menta },
  botonTipoActivoSalida: { backgroundColor: '#FBEAE8', borderColor: colores.ladrillo },
  botonTipoTexto: { fontSize: 14, color: colores.textoSecundario, fontWeight: '600' },
  botonTipoTextoActivo: { color: colores.textoPrincipal },
  input: {
    borderWidth: 1,
    borderColor: colores.huesoFuerte,
    borderRadius: 4,
    padding: 12,
    fontSize: 15,
    color: colores.textoPrincipal,
  },
  inputNota: { minHeight: 60, textAlignVertical: 'top' },
  botonFotoMovimiento: {
    backgroundColor: colores.hueso,
    borderWidth: 1,
    borderColor: colores.huesoFuerte,
    borderRadius: 4,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: espaciado.md,
  },
  botonFotoMovimientoTexto: { color: colores.textoPrincipal, fontWeight: '600', fontSize: 13 },
  previaFoto: { width: '100%', height: 140, borderRadius: 6, marginTop: espaciado.sm, backgroundColor: colores.hueso },
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
  botonConfirmar: {
    backgroundColor: colores.menta,
    borderRadius: 4,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: espaciado.xl,
  },
  botonConfirmarTexto: { color: colores.grafito, fontWeight: '700', fontSize: 16 },
  modalVacio: { textAlign: 'center', color: colores.textoSecundario, marginTop: espaciado.xl, fontSize: 14 },
  modalFila: {
    paddingHorizontal: espaciado.lg,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colores.hueso,
  },
  modalFilaTexto: { fontSize: 16, color: colores.textoPrincipal },
});
