import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  TextInput,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import Constants from 'expo-constants';
import { useAuth } from '../context/AuthContext';
import { useIdioma } from '../context/LanguageContext';
import { api } from '../api/cliente';
import { colores, espaciado } from '../theme';

// El radio usa audio en tiempo real (react-native-agora), que es una libreria
// con codigo nativo. Eso NO funciona dentro de Expo Go (solo en la app ya
// compilada e instalada de verdad) - asi que detectamos el entorno con
// cuidado, sin dejar que un import roto tumbe el resto de la app, igual que
// hicimos antes con el mapa en la version web.
const enExpoGo = Constants.appOwnership === 'expo';

let createAgoraRtcEngine = null;
let ChannelProfileType = null;
let ClientRoleType = null;
if (!enExpoGo) {
  try {
    // eslint-disable-next-line global-require
    const Agora = require('react-native-agora');
    createAgoraRtcEngine = Agora.createAgoraRtcEngine;
    ChannelProfileType = Agora.ChannelProfileType;
    ClientRoleType = Agora.ClientRoleType;
  } catch (err) {
    // Libreria no disponible en este entorno (ej. todavia no se compilo con ella).
  }
}

export default function RadioScreen() {
  const { token, usuario } = useAuth();
  const { t } = useIdioma();

  // 'menu' | 'obras' | 'personas' | 'conectado'
  const [vista, setVista] = useState('menu');
  const [obras, setObras] = useState([]);
  const [personal, setPersonal] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [nombreCanalActivo, setNombreCanalActivo] = useState('');
  const [conectando, setConectando] = useState(false);
  const [conectado, setConectado] = useState(false);
  const [hablando, setHablando] = useState(false);

  const engineRef = useRef(null);

  const radioDisponible = !enExpoGo && !!createAgoraRtcEngine;

  const cargarListas = useCallback(async () => {
    try {
      const [o, p] = await Promise.all([api.listarObras(token), api.listarPersonalTodos(token)]);
      setObras(o);
      setPersonal(p.filter((persona) => persona.activo && persona.id !== usuario?.id));
    } catch (err) {
      // silencioso: no bloquea el menu principal
    }
  }, [token, usuario]);

  useEffect(() => {
    if (radioDisponible) cargarListas();
    // Al salir de la pantalla, aseguramos dejar el canal y liberar el motor.
    return () => {
      salirDelCanal();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function pedirPermisoMicrofono() {
    if (Platform.OS === 'android') {
      const resultado = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
      return resultado === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true; // en iOS, el propio SDK de Agora dispara el permiso nativo al usar el microfono
  }

  async function conectarACanal(datosCanal) {
    const tienePermiso = await pedirPermisoMicrofono();
    if (!tienePermiso) {
      Alert.alert(t('radioErrorMicrofono'), t('radioErrorMicrofonoMensaje'));
      return;
    }

    setConectando(true);
    try {
      const engine = createAgoraRtcEngine();
      engineRef.current = engine;
      engine.initialize({ appId: datosCanal.appId, channelProfile: ChannelProfileType.ChannelProfileCommunication });
      engine.enableAudio();
      engine.muteLocalAudioStream(true); // empieza en silencio: solo se habla al mantener presionado

      engine.joinChannel(datosCanal.token, datosCanal.canal, 0, {
        clientRoleType: ClientRoleType.ClientRoleBroadcaster,
      });

      setNombreCanalActivo(datosCanal.nombreCanal);
      setConectado(true);
      setVista('conectado');
    } catch (err) {
      Alert.alert(t('radioErrorConectar'), err.message);
    } finally {
      setConectando(false);
    }
  }

  async function entrarACanalObra(obra) {
    try {
      const datos = await api.obtenerCanalObra(token, obra.id);
      await conectarACanal(datos);
    } catch (err) {
      Alert.alert(t('radioErrorConectar'), err.message);
    }
  }

  async function entrarALlamadaDirecta(persona) {
    try {
      const datos = await api.obtenerCanalDirecto(token, persona.id);
      await conectarACanal(datos);
    } catch (err) {
      Alert.alert(t('radioErrorConectar'), err.message);
    }
  }

  function salirDelCanal() {
    try {
      if (engineRef.current) {
        engineRef.current.leaveChannel();
        engineRef.current.release();
        engineRef.current = null;
      }
    } catch (err) {
      // silencioso: puede que ya estuviera liberado
    }
    setConectado(false);
    setHablando(false);
    setVista('menu');
  }

  function empezarAHablar() {
    if (!engineRef.current) return;
    engineRef.current.muteLocalAudioStream(false);
    setHablando(true);
  }

  function dejarDeHablar() {
    if (!engineRef.current) return;
    engineRef.current.muteLocalAudioStream(true);
    setHablando(false);
  }

  const obrasFiltradas = obras.filter((o) => o.nombre.toLowerCase().includes(busqueda.toLowerCase()));
  const personalFiltrado = personal.filter((p) => p.nombre.toLowerCase().includes(busqueda.toLowerCase()));

  // Si el radio no esta disponible en este entorno (Expo Go), avisamos claro
  // en vez de dejar que la pantalla truene o se vea rota.
  if (!radioDisponible) {
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

  if (vista === 'conectado') {
    return (
      <View style={estilos.contenedorConectado}>
        <View style={estilos.franja} />
        <View style={estilos.conectadoCentro}>
          <Text style={estilos.conectadoEtiqueta}>{t('radioConectado')}</Text>
          <Text style={estilos.conectadoNombre}>{nombreCanalActivo}</Text>

          <TouchableOpacity
            style={[estilos.botonHablar, hablando && estilos.botonHablarActivo]}
            onPressIn={empezarAHablar}
            onPressOut={dejarDeHablar}
            activeOpacity={0.85}
          >
            <Text style={estilos.botonHablarTexto}>
              {hablando ? '🎙️' : '🎧'}
            </Text>
          </TouchableOpacity>
          <Text style={estilos.estadoTexto}>
            {hablando ? t('radioHablando') : t('radioMantenPresionado')}
          </Text>

          <TouchableOpacity style={estilos.botonSalir} onPress={salirDelCanal}>
            <Text style={estilos.botonSalirTexto}>{t('radioColgar')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (vista === 'obras') {
    return (
      <View style={estilos.contenedor}>
        <View style={estilos.subHeader}>
          <TouchableOpacity onPress={() => { setVista('menu'); setBusqueda(''); }}>
            <Text style={estilos.subHeaderVolver}>{t('radioVolver')}</Text>
          </TouchableOpacity>
          <Text style={estilos.subHeaderTitulo}>{t('radioSeleccionarObra')}</Text>
        </View>
        <TextInput
          style={estilos.buscador}
          value={busqueda}
          onChangeText={setBusqueda}
          placeholder={t('punchBuscarObra')}
          placeholderTextColor={colores.textoSecundario}
          autoFocus
        />
        <FlatList
          data={obrasFiltradas}
          keyExtractor={(o) => o.id}
          renderItem={({ item }) => (
            <TouchableOpacity style={estilos.fila} onPress={() => entrarACanalObra(item)} disabled={conectando}>
              <Text style={estilos.filaTexto}>{item.nombre}</Text>
            </TouchableOpacity>
          )}
        />
      </View>
    );
  }

  if (vista === 'personas') {
    return (
      <View style={estilos.contenedor}>
        <View style={estilos.subHeader}>
          <TouchableOpacity onPress={() => { setVista('menu'); setBusqueda(''); }}>
            <Text style={estilos.subHeaderVolver}>{t('radioVolver')}</Text>
          </TouchableOpacity>
          <Text style={estilos.subHeaderTitulo}>{t('radioSeleccionarPersona')}</Text>
        </View>
        <TextInput
          style={estilos.buscador}
          value={busqueda}
          onChangeText={setBusqueda}
          placeholder={t('herramientasBuscarPersona')}
          placeholderTextColor={colores.textoSecundario}
          autoFocus
        />
        <FlatList
          data={personalFiltrado}
          keyExtractor={(p) => p.id}
          renderItem={({ item }) => (
            <TouchableOpacity style={estilos.fila} onPress={() => entrarALlamadaDirecta(item)} disabled={conectando}>
              <Text style={estilos.filaTexto}>{item.nombre}</Text>
              <Text style={estilos.filaSubtexto}>{item.rol}</Text>
            </TouchableOpacity>
          )}
        />
      </View>
    );
  }

  // vista === 'menu'
  return (
    <View style={estilos.contenedor}>
      <View style={estilos.franja} />
      <Text style={estilos.pregunta}>{t('radioElegirModo')}</Text>

      <TouchableOpacity style={estilos.tarjetaOpcion} onPress={() => { setBusqueda(''); setVista('obras'); }}>
        <Text style={estilos.tarjetaOpcionIcono}>📡</Text>
        <View style={{ flex: 1 }}>
          <Text style={estilos.tarjetaOpcionTitulo}>{t('radioCanalObra')}</Text>
          <Text style={estilos.tarjetaOpcionDescripcion}>{t('radioCanalObraDescripcion')}</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={estilos.tarjetaOpcion} onPress={() => { setBusqueda(''); setVista('personas'); }}>
        <Text style={estilos.tarjetaOpcionIcono}>👤</Text>
        <View style={{ flex: 1 }}>
          <Text style={estilos.tarjetaOpcionTitulo}>{t('radioLlamadaDirecta')}</Text>
          <Text style={estilos.tarjetaOpcionDescripcion}>{t('radioLlamadaDirectaDescripcion')}</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: colores.hueso },
  franja: { height: 6, backgroundColor: colores.menta, marginBottom: espaciado.lg },
  avisoContenedor: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: espaciado.xl },
  avisoTitulo: { fontSize: 18, fontWeight: '700', color: colores.grafito, marginBottom: espaciado.sm, textAlign: 'center' },
  avisoTexto: { fontSize: 14, color: colores.textoSecundario, textAlign: 'center', lineHeight: 20 },
  pregunta: { fontSize: 15, color: colores.textoSecundario, paddingHorizontal: espaciado.lg, marginBottom: espaciado.md },
  tarjetaOpcion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.md,
    backgroundColor: colores.blanco,
    marginHorizontal: espaciado.lg,
    marginBottom: espaciado.md,
    padding: espaciado.lg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colores.huesoFuerte,
  },
  tarjetaOpcionIcono: { fontSize: 32 },
  tarjetaOpcionTitulo: { fontSize: 16, fontWeight: '700', color: colores.grafito },
  tarjetaOpcionDescripcion: { fontSize: 13, color: colores.textoSecundario, marginTop: 2 },
  subHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: espaciado.lg,
    paddingVertical: espaciado.md,
    borderBottomWidth: 1,
    borderBottomColor: colores.huesoFuerte,
    backgroundColor: colores.blanco,
  },
  subHeaderVolver: { color: colores.acero, fontSize: 14, fontWeight: '600' },
  subHeaderTitulo: { fontSize: 15, fontWeight: '700', color: colores.grafito },
  buscador: {
    margin: espaciado.lg,
    marginBottom: espaciado.sm,
    borderWidth: 1,
    borderColor: colores.huesoFuerte,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    backgroundColor: colores.blanco,
  },
  fila: {
    paddingHorizontal: espaciado.lg,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colores.huesoFuerte,
    backgroundColor: colores.blanco,
  },
  filaTexto: { fontSize: 16, color: colores.textoPrincipal },
  filaSubtexto: { fontSize: 13, color: colores.textoSecundario, marginTop: 2 },

  contenedorConectado: { flex: 1, backgroundColor: colores.grafito },
  conectadoCentro: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: espaciado.xl },
  conectadoEtiqueta: { color: colores.menta, fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  conectadoNombre: { color: colores.blanco, fontSize: 22, fontWeight: '700', marginTop: 6, marginBottom: espaciado.xl },
  botonHablar: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 3,
    borderColor: colores.acero,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonHablarActivo: { backgroundColor: colores.menta, borderColor: colores.menta },
  botonHablarTexto: { fontSize: 52 },
  estadoTexto: { color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: espaciado.lg },
  botonSalir: {
    marginTop: espaciado.xl,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: colores.ladrillo,
  },
  botonSalirTexto: { color: colores.blanco, fontWeight: '700', fontSize: 14 },
});
