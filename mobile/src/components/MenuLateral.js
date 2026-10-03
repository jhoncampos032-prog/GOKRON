import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, TextInput, Image, Alert } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { useIdioma } from '../context/LanguageContext';
import { api } from '../api/cliente';
import { colores, espaciado } from '../theme';

// Selector de idioma reutilizable: se usa dentro de la vista de Perfil y
// tambien dentro de la de Preferencias, sin duplicar la logica.
function SelectorIdioma() {
  const { idioma, elegirIdioma, t } = useIdioma();
  return (
    <View style={estilos.selectorIdioma}>
      <Text style={estilos.selectorIdiomaTitulo}>{t('menuIdioma')}</Text>
      <View style={estilos.selectorIdiomaFila}>
        <TouchableOpacity
          style={[estilos.idiomaBoton, idioma === 'es' && estilos.idiomaBotonActivo]}
          onPress={() => elegirIdioma('es')}
        >
          <Text style={[estilos.idiomaBotonTexto, idioma === 'es' && estilos.idiomaBotonTextoActivo]}>
            {t('idiomaEspanol')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[estilos.idiomaBoton, idioma === 'en' && estilos.idiomaBotonActivo]}
          onPress={() => elegirIdioma('en')}
        >
          <Text style={[estilos.idiomaBotonTexto, idioma === 'en' && estilos.idiomaBotonTextoActivo]}>
            {t('idiomaIngles')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Vista de Perfil: foto, nombre y correo editables. Vive dentro del MISMO
// modal del menu (nunca abrimos un <Modal> nuevo apilado encima).
function VistaPerfil({ inicial }) {
  const { token, usuario, actualizarUsuario } = useAuth();
  const { t } = useIdioma();
  const [nombre, setNombre] = useState(usuario?.nombre || '');
  const [email, setEmail] = useState(usuario?.email || '');
  const [guardando, setGuardando] = useState(false);
  const [subiendoFoto, setSubiendoFoto] = useState(false);

  function elegirFoto() {
    Alert.alert(t('perfilFotoTitulo'), t('perfilFotoPregunta'), [
      { text: t('tareasTomarFoto'), onPress: tomarFoto },
      { text: t('tareasElegirGaleria'), onPress: elegirDeGaleria },
      { text: t('punchCancelar'), style: 'cancel' },
    ]);
  }

  async function tomarFoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('perfilPermisoCamaraTitulo'), t('perfilPermisoCamaraMensaje'));
      return;
    }
    const resultado = await ImagePicker.launchCameraAsync({
      quality: 0.4,
      base64: true,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (resultado.canceled) return;
    await subirFoto(resultado.assets[0]);
  }

  async function elegirDeGaleria() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('perfilPermisoGaleriaTitulo'), t('perfilPermisoGaleriaMensaje'));
      return;
    }
    const resultado = await ImagePicker.launchImageLibraryAsync({
      quality: 0.4,
      base64: true,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (resultado.canceled) return;
    await subirFoto(resultado.assets[0]);
  }

  async function subirFoto(foto) {
    if (!foto?.base64) return;
    setSubiendoFoto(true);
    try {
      const fotoUrl = `data:image/jpeg;base64,${foto.base64}`;
      const actualizado = await api.actualizarPerfil(token, { fotoUrl });
      await actualizarUsuario(actualizado);
    } catch (err) {
      Alert.alert(t('perfilErrorActualizar'), err.message);
    } finally {
      setSubiendoFoto(false);
    }
  }

  async function guardarCambios() {
    setGuardando(true);
    try {
      const actualizado = await api.actualizarPerfil(token, { nombre, email });
      await actualizarUsuario(actualizado);
      Alert.alert(t('perfilActualizado'), t('perfilActualizadoMensaje'));
    } catch (err) {
      Alert.alert(t('perfilErrorActualizar'), err.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <>
      <TouchableOpacity style={estilos.avatarGrandeContenedor} onPress={elegirFoto} disabled={subiendoFoto}>
        {usuario?.fotoUrl ? (
          <Image source={{ uri: usuario.fotoUrl }} style={estilos.avatarGrandeImagen} />
        ) : (
          <View style={estilos.avatarGrande}>
            <Text style={estilos.avatarGrandeTexto}>{inicial}</Text>
          </View>
        )}
        <Text style={estilos.cambiarFotoTexto}>
          {subiendoFoto ? t('tareasSubiendo') : t('perfilCambiarFoto')}
        </Text>
      </TouchableOpacity>

      <Text style={estilos.campoEtiqueta}>{t('perfilNombre')}</Text>
      <TextInput style={estilos.campoInput} value={nombre} onChangeText={setNombre} placeholderTextColor="rgba(255,255,255,0.4)" />

      <Text style={estilos.campoEtiqueta}>{t('perfilCorreo')}</Text>
      <TextInput
        style={estilos.campoInput}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholderTextColor="rgba(255,255,255,0.4)"
      />

      <TouchableOpacity style={estilos.botonGuardar} onPress={guardarCambios} disabled={guardando}>
        <Text style={estilos.botonGuardarTexto}>{guardando ? t('perfilGuardando') : t('perfilGuardar')}</Text>
      </TouchableOpacity>
    </>
  );
}

export default function MenuLateral({ visible, onCerrar, pantallaActiva, onSeleccionar, usuario, onSalir }) {
  const { t } = useIdioma();
  const OPCIONES = [
    { clave: 'Home', etiqueta: t('menuHome'), icono: 'home' },
    { clave: 'Punch', etiqueta: t('menuPunch'), icono: 'finger-print' },
    { clave: 'TimeCard', etiqueta: t('menuTimeCard'), icono: 'time' },
    { clave: 'Materiales', etiqueta: t('menuMateriales'), icono: 'cube' },
    { clave: 'Herramientas', etiqueta: t('menuHerramientas'), icono: 'hammer' },
    { clave: 'Tareas', etiqueta: t('menuTareas'), icono: 'clipboard' },
    { clave: 'Radio', etiqueta: t('menuRadio'), icono: 'radio' },
  ];
  const inicial = usuario?.nombre?.charAt(0)?.toUpperCase() || '?';
  const [cuentaAbierta, setCuentaAbierta] = useState(false);
  // 'principal' | 'perfil' | 'preferencias' — vistas internas del MISMO modal,
  // nunca un <Modal> nuevo apilado (eso falla en silencio en iOS).
  const [vista, setVista] = useState('principal');

  function cerrarTodo() {
    setVista('principal');
    setCuentaAbierta(false);
    onCerrar();
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={cerrarTodo}>
      <SafeAreaProvider>
        <View style={estilos.fondoOscuro}>
          <SafeAreaView edges={['top', 'bottom']} style={estilos.panel}>

            {vista === 'principal' && (
              <>
                <View style={estilos.marcaHeader}>
                  <Image source={require('../../assets/logo.png')} style={estilos.marcaLogo} resizeMode="contain" />
                  <Text style={estilos.marcaTexto}>GOKRON</Text>
                </View>

                <TouchableOpacity
                  style={estilos.perfil}
                  onPress={() => setCuentaAbierta((v) => !v)}
                  activeOpacity={0.7}
                >
                  <View style={estilos.perfilFila}>
                    {usuario?.fotoUrl ? (
                      <Image source={{ uri: usuario.fotoUrl }} style={estilos.avatarImagen} />
                    ) : (
                      <View style={estilos.avatar}>
                        <Text style={estilos.avatarTexto}>{inicial}</Text>
                      </View>
                    )}
                    <View style={estilos.perfilTextos}>
                      <Text style={estilos.nombre}>{usuario?.nombre}</Text>
                      <Text style={estilos.rol}>{usuario?.rol}</Text>
                    </View>
                    <Ionicons
                      name={cuentaAbierta ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color="rgba(255,255,255,0.5)"
                    />
                  </View>
                </TouchableOpacity>

                {cuentaAbierta && (
                  <View style={estilos.cuentaLista}>
                    <TouchableOpacity style={estilos.cuentaOpcion} onPress={() => setVista('perfil')}>
                      <Ionicons name="person-outline" size={16} color="rgba(255,255,255,0.6)" style={estilos.opcionIcono} />
                      <Text style={estilos.cuentaOpcionTexto}>{t('menuPerfil')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={estilos.cuentaOpcion} onPress={() => setVista('preferencias')}>
                      <Ionicons name="settings-outline" size={16} color="rgba(255,255,255,0.6)" style={estilos.opcionIcono} />
                      <Text style={estilos.cuentaOpcionTexto}>{t('menuPreferencias')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={estilos.cuentaOpcion} onPress={onSalir}>
                      <Ionicons name="log-out-outline" size={16} color="rgba(255,255,255,0.6)" style={estilos.opcionIcono} />
                      <Text style={estilos.cuentaOpcionTexto}>{t('menuCerrarSesion')}</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <View style={estilos.lista}>
                  {OPCIONES.map((op) => {
                    const activa = op.clave === pantallaActiva;
                    return (
                      <TouchableOpacity
                        key={op.clave}
                        style={[estilos.opcion, activa && estilos.opcionActiva]}
                        onPress={() => onSeleccionar(op.clave)}
                      >
                        <Ionicons
                          name={op.icono}
                          size={18}
                          color={activa ? colores.menta : 'rgba(255,255,255,0.6)'}
                          style={estilos.opcionIcono}
                        />
                        <Text style={[estilos.opcionTexto, activa && estilos.opcionTextoActivo]}>{op.etiqueta}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}

            {vista === 'perfil' && (
              <>
                <View style={estilos.subvistaHeader}>
                  <TouchableOpacity onPress={() => setVista('principal')}>
                    <Text style={estilos.subvistaVolver}>{t('menuVolver')}</Text>
                  </TouchableOpacity>
                  <Text style={estilos.subvistaTitulo}>{t('menuPerfil')}</Text>
                </View>
                <View style={estilos.subvistaCuerpo}>
                  <VistaPerfil inicial={inicial} />
                </View>
              </>
            )}

            {vista === 'preferencias' && (
              <>
                <View style={estilos.subvistaHeader}>
                  <TouchableOpacity onPress={() => setVista('principal')}>
                    <Text style={estilos.subvistaVolver}>{t('menuVolver')}</Text>
                  </TouchableOpacity>
                  <Text style={estilos.subvistaTitulo}>{t('menuPreferencias')}</Text>
                </View>
                <View style={estilos.subvistaCuerpo}>
                  <Text style={estilos.subvistaDescripcion}>{t('preferenciasDescripcion')}</Text>
                  <SelectorIdioma />
                </View>
              </>
            )}
          </SafeAreaView>

          <TouchableOpacity style={estilos.areaCierre} onPress={cerrarTodo} activeOpacity={1} />
        </View>
      </SafeAreaProvider>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  fondoOscuro: { flex: 1, flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.4)' },
  panel: { width: 260, backgroundColor: colores.grafito },
  areaCierre: { flex: 1 },
  marcaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: espaciado.lg,
    paddingVertical: espaciado.md,
  },
  marcaLogo: { width: 20, height: 28, marginRight: 10 },
  marcaTexto: { color: colores.blanco, fontSize: 13, fontWeight: '700', letterSpacing: 1.5 },
  perfil: {
    padding: espaciado.lg,
    paddingTop: espaciado.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  perfilFila: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colores.menta,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarImagen: { width: 48, height: 48, borderRadius: 24, marginRight: 12 },
  avatarTexto: { fontSize: 18, fontWeight: '700', color: colores.grafito },
  perfilTextos: { flex: 1 },
  nombre: { color: colores.blanco, fontSize: 16, fontWeight: '700' },
  rol: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 2 },
  cuentaLista: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  cuentaOpcion: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: espaciado.lg,
    paddingVertical: 10,
  },
  cuentaOpcionTexto: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
  lista: { flex: 1, paddingVertical: 8 },
  opcion: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: espaciado.lg,
    paddingVertical: 14,
  },
  opcionActiva: {
    backgroundColor: 'rgba(70,240,210,0.12)',
    borderLeftWidth: 3,
    borderLeftColor: colores.menta,
  },
  opcionIcono: { marginRight: 12 },
  opcionTexto: { color: 'rgba(255,255,255,0.75)', fontSize: 14 },
  opcionTextoActivo: { color: colores.blanco, fontWeight: '700' },

  subvistaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: espaciado.lg,
    paddingVertical: espaciado.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    gap: 12,
  },
  subvistaVolver: { color: colores.menta, fontSize: 14, fontWeight: '600' },
  subvistaTitulo: { color: colores.blanco, fontSize: 15, fontWeight: '700' },
  subvistaCuerpo: { flex: 1, padding: espaciado.lg },
  subvistaDescripcion: { color: 'rgba(255,255,255,0.6)', fontSize: 13, marginBottom: espaciado.lg },

  avatarGrandeContenedor: { alignItems: 'center', marginBottom: espaciado.lg },
  avatarGrande: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colores.menta,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  avatarGrandeImagen: { width: 80, height: 80, borderRadius: 40, marginBottom: 8 },
  avatarGrandeTexto: { fontSize: 30, fontWeight: '700', color: colores.grafito },
  cambiarFotoTexto: { color: colores.menta, fontSize: 13, fontWeight: '600' },

  campoEtiqueta: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 6, marginTop: espaciado.md },
  campoInput: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colores.blanco,
    fontSize: 14,
  },
  botonGuardar: {
    backgroundColor: colores.menta,
    borderRadius: 4,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: espaciado.lg,
  },
  botonGuardarTexto: { color: colores.grafito, fontWeight: '700', fontSize: 14 },

  selectorIdioma: { marginTop: espaciado.xl },
  selectorIdiomaTitulo: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: espaciado.sm,
  },
  selectorIdiomaFila: { flexDirection: 'row', gap: espaciado.sm },
  idiomaBoton: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 4,
    paddingVertical: 12,
    alignItems: 'center',
  },
  idiomaBotonActivo: { backgroundColor: colores.menta, borderColor: colores.menta },
  idiomaBotonTexto: { color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '600' },
  idiomaBotonTextoActivo: { color: colores.grafito },
});
