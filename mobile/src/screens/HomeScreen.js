import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  RefreshControl,
  TextInput,
  Modal,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useAuth } from '../context/AuthContext';
import { useIdioma } from '../context/LanguageContext';
import { api, sincronizarPendientes } from '../api/cliente';
import { colores, espaciado } from '../theme';
import MapaUbicacion from '../components/MapaUbicacion';

const DISTANCIA_MAXIMA_METROS = 150;

function calcularDistanciaMetros(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const rad = (x) => (x * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function obtenerHora12(fecha) {
  let horas = fecha.getHours();
  const minutos = fecha.getMinutes();
  const esPM = horas >= 12;
  horas = horas % 12;
  if (horas === 0) horas = 12;
  return { hh: String(horas).padStart(2, '0'), mm: String(minutos).padStart(2, '0'), esPM };
}

function formatearFechaLarga(fecha, idioma) {
  return fecha.toLocaleDateString(idioma === 'en' ? 'en-US' : 'es', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

function formatearFechaHoraCompleta(fecha, idioma) {
  const locale = idioma === 'en' ? 'en-US' : 'es';
  const hora = fecha.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: true });
  const diaSemana = fecha.toLocaleDateString(locale, { weekday: 'long' });
  const fechaCorta = fecha.toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });
  return `${hora}, ${diaSemana} ${fechaCorta}`;
}

function DigitoReloj({ valor }) {
  return (
    <View style={estilos.digitoCaja}>
      <Text style={estilos.digitoTexto}>{valor}</Text>
    </View>
  );
}

export default function HomeScreen() {
  const { token, usuario } = useAuth();
  const { t, idioma } = useIdioma();
  const [ahora, setAhora] = useState(new Date());
  const [obras, setObras] = useState([]);
  const [encargados, setEncargados] = useState([]);
  const [obraSeleccionada, setObraSeleccionada] = useState(null);
  const [encargadoSeleccionado, setEncargadoSeleccionado] = useState(null);
  const [enObra, setEnObra] = useState(false);
  const [nota, setNota] = useState('');
  const [cargando, setCargando] = useState(false);
  const [mensajeSync, setMensajeSync] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [ultimaMarcacion, setUltimaMarcacion] = useState(null);
  // null = cerrado, 'entrada' o 'salida' = modal de registro abierto en ese modo
  const [modoRegistro, setModoRegistro] = useState(null);
  // Dentro del MISMO modal de registro, que vista se muestra ahora:
  // 'formulario' | 'obras' | 'encargados'. IMPORTANTE: nunca abrimos un
  // segundo <Modal> nativo encima de otro (falla en silencio en iOS),
  // asi que el selector de obra/encargado vive dentro del mismo modal.
  const [vistaModal, setVistaModal] = useState('formulario');
  const [ubicacionModal, setUbicacionModal] = useState(null);
  const [obteniendoUbicacion, setObteniendoUbicacion] = useState(false);

  // Distancia entre donde estas parado ahora y la obra elegida, para exigir
  // que se marque entrada solo si de verdad estas en el sitio de trabajo.
  const distanciaMetros =
    obraSeleccionada?.latitud != null && obraSeleccionada?.longitud != null && ubicacionModal
      ? calcularDistanciaMetros(
          ubicacionModal.lat,
          ubicacionModal.lng,
          obraSeleccionada.latitud,
          obraSeleccionada.longitud
        )
      : null;
  const fueraDeRango = modoRegistro === 'entrada' && distanciaMetros !== null && distanciaMetros > DISTANCIA_MAXIMA_METROS;

  useEffect(() => {
    const intervalo = setInterval(() => setAhora(new Date()), 1000);
    return () => clearInterval(intervalo);
  }, []);

  const cargarObras = useCallback(async () => {
    try {
      const data = await api.listarObras(token);
      setObras(data.filter((o) => o.estado === 'EN_CURSO' || o.estado === 'PLANIFICADA'));
    } catch (err) {
      Alert.alert(t('punchErrorCargarObras'), err.message);
    }
  }, [token, t]);

  const cargarEncargados = useCallback(async () => {
    try {
      const data = await api.listarEncargados(token);
      setEncargados(data);
    } catch (err) {
      // silencioso: no bloquea el flujo principal
    }
  }, [token]);

  const cargarUltimaMarcacion = useCallback(async () => {
    try {
      const data = await api.historialAsistencia(token, usuario?.id);
      setUltimaMarcacion(data[0] || null);
    } catch (err) {
      // silencioso
    }
  }, [token, usuario]);

  useEffect(() => {
    cargarObras();
    cargarEncargados();
    cargarUltimaMarcacion();
    sincronizarPendientes(token).then(({ sincronizados }) => {
      if (sincronizados > 0) {
        setMensajeSync(idioma === 'en'
          ? `${sincronizados} pending record(s) synced from when you had no signal.`
          : `Se sincronizaron ${sincronizados} registro(s) pendientes de cuando no habia senal.`);
      }
    });
  }, [cargarObras, cargarEncargados, cargarUltimaMarcacion, token, idioma]);

  async function obtenerUbicacion() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('punchPermisoUbicacionTitulo'), t('punchPermisoUbicacionMensaje'));
      return null;
    }
    const posicion = await Location.getCurrentPositionAsync({});
    return { lat: posicion.coords.latitude, lng: posicion.coords.longitude };
  }

  // Cada vez que se abre el formulario de entrada/salida, capturamos la
  // ubicacion actual para mostrar el mapa y poder validar la distancia.
  useEffect(() => {
    let activo = true;
    if (modoRegistro) {
      setVistaModal('formulario');
      setObteniendoUbicacion(true);
      obtenerUbicacion().then((ubic) => {
        if (activo) {
          setUbicacionModal(ubic);
          setObteniendoUbicacion(false);
        }
      });
    } else {
      setUbicacionModal(null);
    }
    return () => { activo = false; };
  }, [modoRegistro]);

  function abrirRegistro(modo) {
    if (modo === 'entrada' && enObra) return;
    if (modo === 'salida' && !enObra) return;
    setModoRegistro(modo);
  }

  function cerrarRegistro() {
    setModoRegistro(null);
  }

  function abrirSelectorObra() {
    setBusqueda('');
    setVistaModal('obras');
    cargarObras(); // trae la lista fresca, por si se creó algo nuevo despues de abrir la app
  }

  function abrirSelectorEncargado() {
    setBusqueda('');
    setVistaModal('encargados');
    cargarEncargados(); // trae la lista fresca, por si se creó algo nuevo despues de abrir la app
  }

  function volverAlFormulario() {
    setBusqueda('');
    setVistaModal('formulario');
  }

  async function confirmarRegistro() {
    if (fueraDeRango) {
      Alert.alert(
        t('punchFueraDeRangoTitulo'),
        t('punchFueraDeRango', { distancia: Math.round(distanciaMetros), maximo: DISTANCIA_MAXIMA_METROS })
      );
      return;
    }
    if (modoRegistro === 'entrada') {
      await manejarCheckIn();
    } else if (modoRegistro === 'salida') {
      await manejarCheckOut();
    }
  }

  async function manejarCheckIn() {
    if (!obraSeleccionada) {
      Alert.alert(t('punchSeleccionaObraTitulo'), t('punchSeleccionaObraMensaje'));
      return;
    }
    if (!encargadoSeleccionado) {
      Alert.alert(t('punchSeleccionaEncargadoTitulo'), t('punchSeleccionaEncargadoMensaje'));
      return;
    }
    setCargando(true);
    try {
      const ubicacion = ubicacionModal || (await obtenerUbicacion());
      const resultado = await api.checkIn(
        token,
        obraSeleccionada.id,
        ubicacion?.lat,
        ubicacion?.lng,
        nota || undefined,
        encargadoSeleccionado?.id
      );
      setEnObra(true);
      setNota('');
      setModoRegistro(null);
      cargarUltimaMarcacion();
      Alert.alert(
        resultado?.guardadoLocalmente ? t('punchSinSenal') : t('punchEntradaRegistrada'),
        resultado?.guardadoLocalmente ? t('punchSinSenalMensaje') : t('punchEntradaOk')
      );
    } catch (err) {
      Alert.alert(t('punchErrorCargarEntrada'), err.message);
    } finally {
      setCargando(false);
    }
  }

  async function manejarCheckOut() {
    setCargando(true);
    try {
      const ubicacion = ubicacionModal || (await obtenerUbicacion());
      const resultado = await api.checkOut(token, ubicacion?.lat, ubicacion?.lng, nota || undefined);
      setEnObra(false);
      setNota('');
      setModoRegistro(null);
      cargarUltimaMarcacion();
      Alert.alert(
        resultado?.guardadoLocalmente ? t('punchSinSenal') : t('punchSalidaRegistrada'),
        resultado?.guardadoLocalmente ? t('punchSinSenalMensaje') : t('punchSalidaOk')
      );
    } catch (err) {
      Alert.alert(t('punchErrorCargarSalida'), err.message);
    } finally {
      setCargando(false);
    }
  }

  const obrasFiltradas = obras
    .filter((o) => o.nombre.toLowerCase().includes(busqueda.toLowerCase()))
    .map((o) => ({
      ...o,
      _distancia:
        o.latitud != null && o.longitud != null && ubicacionModal
          ? calcularDistanciaMetros(ubicacionModal.lat, ubicacionModal.lng, o.latitud, o.longitud)
          : null,
    }))
    .sort((a, b) => {
      if (a._distancia == null && b._distancia == null) return 0;
      if (a._distancia == null) return 1; // sin ubicacion configurada, va al final
      if (b._distancia == null) return -1;
      return a._distancia - b._distancia; // la mas cercana primero
    });
  const encargadosFiltrados = encargados.filter((e) => e.nombre.toLowerCase().includes(busqueda.toLowerCase()));

  const { hh, mm, esPM } = obtenerHora12(ahora);

  return (
    <View style={estilos.contenedor}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={() => { cargarObras(); cargarEncargados(); cargarUltimaMarcacion(); }}
          />
        }
      >
        <View style={estilos.header}>
          <Text style={estilos.saludo}>{t('inicioSaludo', { nombre: usuario?.nombre?.split(' ')[0] })}</Text>
        </View>

        {/* Reloj tipo tablero, formato 12 horas con AM/PM, como Punch de la referencia */}
        <View style={estilos.tableroReloj}>
          <View style={estilos.filaDigitos}>
            <DigitoReloj valor={hh[0]} />
            <DigitoReloj valor={hh[1]} />
            <Text style={estilos.dosPuntos}>:</Text>
            <DigitoReloj valor={mm[0]} />
            <DigitoReloj valor={mm[1]} />
            <View style={estilos.ampmColumna}>
              <Text style={[estilos.ampmTexto, !esPM && estilos.ampmActivo]}>AM</Text>
              <Text style={[estilos.ampmTexto, esPM && estilos.ampmActivo]}>PM</Text>
            </View>
          </View>
          <Text style={estilos.tableroFecha}>{formatearFechaLarga(ahora, idioma)}</Text>
        </View>

        {mensajeSync ? (
          <View style={estilos.avisoSync}><Text style={estilos.avisoSyncTexto}>{mensajeSync}</Text></View>
        ) : null}

        <View style={estilos.tarjetaUltimaMarcacion}>
          {ultimaMarcacion ? (
            <>
              <Text style={estilos.ultimaMarcacionEtiqueta}>
                {ultimaMarcacion.checkOut ? t('punchUltimaSalida') : t('punchMarcasteEntrada')}
              </Text>
              <Text style={estilos.ultimaMarcacionValor}>
                {new Date(ultimaMarcacion.checkOut || ultimaMarcacion.checkIn).toLocaleTimeString(idioma === 'en' ? 'en-US' : 'es', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true,
                })}
              </Text>
              <Text style={estilos.ultimaMarcacionFecha}>
                {new Date(ultimaMarcacion.checkOut || ultimaMarcacion.checkIn).toLocaleDateString(idioma === 'en' ? 'en-US' : 'es', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
              </Text>
            </>
          ) : (
            <Text style={estilos.ultimaMarcacionVacio}>{t('punchSinMarcaciones')}</Text>
          )}
        </View>

        {enObra && obraSeleccionada ? (
          <View style={estilos.tarjetaEstado}>
            <Text style={estilos.tarjetaEstadoTexto}>{t('punchEstasMarcadoEn', { obra: obraSeleccionada.nombre })}</Text>
          </View>
        ) : null}

        {/* Botones circulares grandes: solo abren el formulario, no registran directo */}
        <View style={estilos.filaBotonesCirculares}>
          <TouchableOpacity
            style={[estilos.botonCircular, estilos.botonCircularEntrada, enObra && estilos.botonCircularInactivo]}
            onPress={() => abrirRegistro('entrada')}
            disabled={enObra}
          >
            <Text style={estilos.botonCircularTexto}>{t('punchEntrada')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[estilos.botonCircular, estilos.botonCircularSalida, !enObra && estilos.botonCircularInactivo]}
            onPress={() => abrirRegistro('salida')}
            disabled={!enObra}
          >
            <Text style={estilos.botonCircularTexto}>{t('punchSalida')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[estilos.botonCircular, estilos.botonCircularTransferir]}
            onPress={() => Alert.alert(t('punchTransferirTitulo'), t('punchTransferirMensaje'))}
          >
            <Text style={estilos.botonCircularTextoTransferir}>{t('punchTransferir')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Un solo Modal para todo el flujo de registro: formulario, selector de
          obra, y selector de encargado son "vistas" internas del mismo modal,
          nunca modales apilados (eso falla en silencio en iOS). */}
      <Modal visible={modoRegistro !== null} animationType="slide" onRequestClose={cerrarRegistro}>
        <View style={estilos.modalContenedor}>

          {vistaModal === 'formulario' && (
            <>
              <View style={estilos.modalHeaderRegistro}>
                <TouchableOpacity onPress={cerrarRegistro}>
                  <Text style={estilos.modalCancelarClaro}>{t('punchCancelar')}</Text>
                </TouchableOpacity>
                <Text style={estilos.modalTituloRegistro}>
                  {modoRegistro === 'entrada' ? t('punchMarcarEntrada') : t('punchMarcarSalida')}
                </Text>
                <TouchableOpacity onPress={confirmarRegistro} disabled={cargando || fueraDeRango}>
                  <Ionicons
                    name="checkmark"
                    size={26}
                    color={fueraDeRango ? 'rgba(255,255,255,0.3)' : colores.menta}
                  />
                </TouchableOpacity>
              </View>

              <ScrollView style={estilos.modalCuerpo}>
                <Text style={estilos.modalFechaHora}>{formatearFechaHoraCompleta(ahora, idioma)}</Text>

                {/* Mapa con la ubicacion actual, para verificar que estas en el sitio correcto */}
                <View style={estilos.mapaContenedor}>
                  {obteniendoUbicacion || !ubicacionModal ? (
                    <View style={estilos.mapaCargando}>
                      <ActivityIndicator color={colores.acero} />
                      <Text style={estilos.mapaCargandoTexto}>{t('punchObteniendoUbicacion')}</Text>
                    </View>
                  ) : (
                    <MapaUbicacion
                      ubicacionModal={ubicacionModal}
                      obraSeleccionada={obraSeleccionada}
                      distanciaMaxima={DISTANCIA_MAXIMA_METROS}
                      colores={colores}
                      estiloMapa={estilos.mapa}
                    />
                  )}
                </View>

                {fueraDeRango && (
                  <View style={estilos.avisoFueraDeRango}>
                    <Text style={estilos.avisoFueraDeRangoTexto}>
                      {t('punchFueraDeRango', { distancia: Math.round(distanciaMetros), maximo: DISTANCIA_MAXIMA_METROS })}
                    </Text>
                  </View>
                )}
                {distanciaMetros !== null && !fueraDeRango && modoRegistro === 'entrada' && (
                  <View style={estilos.avisoEnRango}>
                    <Text style={estilos.avisoEnRangoTexto}>
                      {t('punchEnRango', { distancia: Math.round(distanciaMetros) })}
                    </Text>
                  </View>
                )}
                {modoRegistro === 'entrada' &&
                  obraSeleccionada &&
                  (obraSeleccionada.latitud == null || obraSeleccionada.longitud == null) && (
                    <View style={estilos.avisoSinUbicacion}>
                      <Text style={estilos.avisoSinUbicacionTexto}>
                        {t('punchSinUbicacionConfigurada')}
                      </Text>
                    </View>
                  )}

                {modoRegistro === 'entrada' && (
                  <>
                    <Text style={estilos.etiqueta}>{t('punchObra')}</Text>
                    <TouchableOpacity style={estilos.filaSelector} onPress={abrirSelectorObra}>
                      <Text style={obraSeleccionada ? estilos.filaSelectorValor : estilos.filaSelectorPlaceholder}>
                        {obraSeleccionada ? obraSeleccionada.nombre : t('punchSeleccionar')}
                      </Text>
                      <Text style={estilos.filaSelectorFlecha}>{'\u203A'}</Text>
                    </TouchableOpacity>

                    <Text style={estilos.etiqueta}>{t('punchEncargado')}</Text>
                    <TouchableOpacity style={estilos.filaSelector} onPress={abrirSelectorEncargado}>
                      <Text style={encargadoSeleccionado ? estilos.filaSelectorValor : estilos.filaSelectorPlaceholder}>
                        {encargadoSeleccionado ? encargadoSeleccionado.nombre : t('punchSeleccionar')}
                      </Text>
                      <Text style={estilos.filaSelectorFlecha}>{'\u203A'}</Text>
                    </TouchableOpacity>
                  </>
                )}

                <Text style={estilos.etiqueta}>{t('punchNotaOpcional')}</Text>
                <TextInput
                  style={estilos.inputNota}
                  value={nota}
                  onChangeText={setNota}
                  placeholder={
                    modoRegistro === 'entrada' ? t('punchNotaPlaceholderEntrada') : t('punchNotaPlaceholderSalida')
                  }
                  placeholderTextColor={colores.textoSecundario}
                  multiline
                />

                {cargando ? <Text style={estilos.modalProcesando}>{t('punchProcesando')}</Text> : null}
              </ScrollView>
            </>
          )}

          {vistaModal === 'obras' && (
            <>
              <View style={estilos.modalHeader}>
                <TouchableOpacity onPress={volverAlFormulario}>
                  <Text style={estilos.modalCancelar}>{t('punchVolver')}</Text>
                </TouchableOpacity>
                <Text style={estilos.modalTitulo}>{t('punchObra')}</Text>
                <View style={{ width: 70 }} />
              </View>

              <TextInput
                style={estilos.modalBuscador}
                placeholder={t('punchBuscarObra')}
                placeholderTextColor={colores.textoSecundario}
                value={busqueda}
                onChangeText={setBusqueda}
                autoFocus
              />

              <FlatList
                data={obrasFiltradas}
                keyExtractor={(o) => o.id}
                ListEmptyComponent={<Text style={estilos.modalVacio}>{t('punchNoObras')}</Text>}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={estilos.modalFila}
                    onPress={() => {
                      setObraSeleccionada(item);
                      volverAlFormulario();
                    }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <View style={{ flex: 1 }}>
                        <Text style={estilos.modalFilaTexto}>{item.nombre}</Text>
                        {item.direccion ? <Text style={estilos.modalFilaSubtexto}>{item.direccion}</Text> : null}
                      </View>
                      {item._distancia != null && (
                        <Text style={estilos.distanciaTexto}>
                          {item._distancia < 1000
                            ? `${Math.round(item._distancia)} m`
                            : `${(item._distancia / 1000).toFixed(1)} km`}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                )}
              />
            </>
          )}

          {vistaModal === 'encargados' && (
            <>
              <View style={estilos.modalHeader}>
                <TouchableOpacity onPress={volverAlFormulario}>
                  <Text style={estilos.modalCancelar}>{t('punchVolver')}</Text>
                </TouchableOpacity>
                <Text style={estilos.modalTitulo}>{t('punchEncargado')}</Text>
                <View style={{ width: 70 }} />
              </View>

              <TextInput
                style={estilos.modalBuscador}
                placeholder={t('punchBuscarEncargado')}
                placeholderTextColor={colores.textoSecundario}
                value={busqueda}
                onChangeText={setBusqueda}
                autoFocus
              />

              <FlatList
                data={encargadosFiltrados}
                keyExtractor={(e) => e.id}
                ListEmptyComponent={<Text style={estilos.modalVacio}>{t('punchNoEncargados')}</Text>}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={estilos.modalFila}
                    onPress={() => {
                      setEncargadoSeleccionado(item);
                      volverAlFormulario();
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: espaciado.lg,
    paddingTop: espaciado.md,
    paddingBottom: espaciado.sm,
  },
  saludo: { fontSize: 20, fontWeight: '700', color: colores.grafito },
  tableroReloj: {
    alignItems: 'center',
    paddingVertical: espaciado.lg,
    marginHorizontal: espaciado.lg,
    marginBottom: espaciado.md,
    backgroundColor: colores.grafito,
    borderRadius: 6,
  },
  filaDigitos: { flexDirection: 'row', alignItems: 'center' },
  digitoCaja: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 6,
    width: 34,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 2,
  },
  digitoTexto: { fontSize: 28, fontWeight: '700', color: colores.menta, fontVariant: ['tabular-nums'] },
  dosPuntos: { fontSize: 24, fontWeight: '700', color: colores.menta, marginHorizontal: 2 },
  ampmColumna: { marginLeft: 10, justifyContent: 'center' },
  ampmTexto: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.3)' },
  ampmActivo: { color: colores.blanco },
  tableroFecha: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 10, textTransform: 'capitalize' },
  tarjetaUltimaMarcacion: {
    backgroundColor: colores.blanco,
    marginHorizontal: espaciado.lg,
    marginBottom: espaciado.md,
    padding: espaciado.lg,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colores.huesoFuerte,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 220,
  },
  ultimaMarcacionEtiqueta: { fontSize: 12, color: colores.acero, textTransform: 'uppercase', fontWeight: '600' },
  ultimaMarcacionValor: { fontSize: 26, fontWeight: '700', color: colores.acero, marginTop: 4 },
  ultimaMarcacionFecha: { fontSize: 13, color: colores.acero, marginTop: 2, textTransform: 'capitalize' },
  ultimaMarcacionVacio: { fontSize: 14, color: colores.textoSecundario, fontStyle: 'italic' },
  avisoSync: {
    marginHorizontal: espaciado.lg,
    backgroundColor: '#E4EEF6',
    padding: 12,
    borderRadius: 4,
    marginBottom: espaciado.md,
  },
  avisoSyncTexto: { color: colores.acero, fontSize: 13 },
  tarjetaEstado: {
    backgroundColor: 'rgba(70,240,210,0.15)',
    marginHorizontal: espaciado.lg,
    marginBottom: espaciado.md,
    padding: espaciado.md,
    borderRadius: 6,
  },
  tarjetaEstadoTexto: { color: colores.mentaOscuro, fontWeight: '600', fontSize: 13, textAlign: 'center' },
  filaBotonesCirculares: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: espaciado.md,
    marginBottom: espaciado.xl,
    marginTop: espaciado.md,
    paddingHorizontal: espaciado.md,
  },
  botonCircular: {
    width: 92,
    height: 92,
    borderRadius: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonCircularEntrada: { backgroundColor: colores.menta },
  botonCircularSalida: { backgroundColor: colores.acero },
  botonCircularInactivo: { opacity: 0.35 },
  botonCircularTransferir: { backgroundColor: colores.huesoFuerte },
  botonCircularTexto: { color: colores.grafito, fontWeight: '700', fontSize: 14 },
  botonCircularTextoTransferir: { color: colores.textoSecundario, fontWeight: '700', fontSize: 12 },
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
  modalHeaderRegistro: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: espaciado.lg,
    paddingVertical: espaciado.md,
    paddingTop: 50,
    backgroundColor: colores.grafito,
  },
  modalCancelar: { fontSize: 15, color: colores.acero },
  modalCancelarClaro: { fontSize: 15, color: 'rgba(255,255,255,0.75)' },
  modalTitulo: { fontSize: 16, fontWeight: '700', color: colores.grafito },
  modalTituloRegistro: { fontSize: 16, fontWeight: '700', color: colores.blanco },
  modalCuerpo: { flex: 1, padding: espaciado.lg },
  modalFechaHora: {
    textAlign: 'center',
    color: colores.mentaOscuro,
    fontWeight: '600',
    fontSize: 14,
    marginBottom: espaciado.lg,
  },
  mapaContenedor: {
    height: 160,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: espaciado.md,
    backgroundColor: colores.hueso,
  },
  mapa: { flex: 1 },
  mapaCargando: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  mapaCargandoTexto: { color: colores.textoSecundario, fontSize: 13, marginTop: 8 },
  avisoFueraDeRango: {
    backgroundColor: '#FBEAE8',
    borderRadius: 4,
    padding: 12,
    marginBottom: espaciado.md,
  },
  avisoFueraDeRangoTexto: { color: colores.ladrillo, fontSize: 13, fontWeight: '600' },
  avisoEnRango: {
    backgroundColor: 'rgba(70,240,210,0.15)',
    borderRadius: 4,
    padding: 12,
    marginBottom: espaciado.md,
  },
  avisoEnRangoTexto: { color: colores.mentaOscuro, fontSize: 13, fontWeight: '600' },
  avisoSinUbicacion: {
    backgroundColor: colores.hueso,
    borderRadius: 4,
    padding: 12,
    marginBottom: espaciado.md,
  },
  avisoSinUbicacionTexto: { color: colores.textoSecundario, fontSize: 13 },
  modalProcesando: { textAlign: 'center', color: colores.textoSecundario, marginTop: espaciado.md },
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
  modalFila: {
    paddingHorizontal: espaciado.lg,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colores.hueso,
  },
  modalFilaTexto: { fontSize: 16, color: colores.textoPrincipal },
  modalFilaSubtexto: { fontSize: 13, color: colores.textoSecundario, marginTop: 2 },
  distanciaTexto: { fontSize: 12, color: colores.mentaOscuro, fontWeight: '700', marginLeft: 8 },
  modalVacio: { textAlign: 'center', color: colores.textoSecundario, marginTop: espaciado.xl, fontSize: 14 },
  etiqueta: { fontSize: 13, color: colores.textoSecundario, marginBottom: espaciado.sm },
  filaSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colores.huesoFuerte,
    borderRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: espaciado.md,
  },
  filaSelectorValor: { fontSize: 15, color: colores.textoPrincipal, fontWeight: '600' },
  filaSelectorPlaceholder: { fontSize: 15, color: colores.textoSecundario },
  filaSelectorFlecha: { fontSize: 20, color: colores.textoSecundario },
  inputNota: {
    borderWidth: 1,
    borderColor: colores.huesoFuerte,
    borderRadius: 4,
    padding: 12,
    fontSize: 14,
    color: colores.textoPrincipal,
    minHeight: 60,
    textAlignVertical: 'top',
  },
});
