import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, Modal, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useIdioma } from '../context/LanguageContext';
import { colores, espaciado } from '../theme';

// Contacto de soporte: deja aqui el correo y/o telefono reales cuando los
// tengas listos. Si se dejan vacios, el boton de ayuda avisa que el
// contacto todavia no esta configurado, en vez de fallar o mostrar algo
// vacio sin explicacion.
const CONTACTO_SOPORTE = {
  correo: 'daquilema357@gmail.com',
  telefono: '+19143931286',
};

export default function LoginScreen() {
  const { iniciarSesion } = useAuth();
  const { t, idioma, elegirIdioma } = useIdioma();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const [ayudaVisible, setAyudaVisible] = useState(false);

  async function manejarIngreso() {
    setError('');
    setCargando(true);
    try {
      await iniciarSesion(email, password);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  const hayContacto = CONTACTO_SOPORTE.correo || CONTACTO_SOPORTE.telefono;

  return (
    <SafeAreaView style={estilos.contenedor} edges={['top']}>
      <TouchableOpacity style={estilos.botonAyuda} onPress={() => setAyudaVisible(true)}>
        <Ionicons name="headset-outline" size={24} color={colores.blanco} />
      </TouchableOpacity>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
      <View style={estilos.franja} />
      <View style={estilos.centro}>
        <Text style={estilos.marca}>{t('loginMarca')}</Text>
        <Text style={estilos.titulo}>{t('loginTitulo')}</Text>

        {error ? <Text style={estilos.error}>{error}</Text> : null}

        <Text style={estilos.etiqueta}>{t('loginCorreo')}</Text>
        <TextInput
          style={estilos.input}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="tu@empresa.com"
        />

        <Text style={estilos.etiqueta}>{t('loginContrasena')}</Text>
        <TextInput
          style={estilos.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="••••••••"
        />

        <TouchableOpacity style={estilos.boton} onPress={manejarIngreso} disabled={cargando}>
          {cargando ? (
            <ActivityIndicator color={colores.grafito} />
          ) : (
            <Text style={estilos.botonTexto}>{t('loginBoton')}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => elegirIdioma(idioma === 'es' ? 'en' : 'es')} style={estilos.cambiarIdioma}>
          <Text style={estilos.cambiarIdiomaTexto}>{t('loginCambiarIdioma')}</Text>
        </TouchableOpacity>
      </View>
      </KeyboardAvoidingView>

      {/* Panel de ayuda: se abre con el icono de audifono de arriba */}
      <Modal visible={ayudaVisible} animationType="slide" transparent onRequestClose={() => setAyudaVisible(false)}>
        <View style={estilos.ayudaFondo}>
          <View style={estilos.ayudaPanel}>
            <View style={estilos.ayudaHeader}>
              <Ionicons name="headset-outline" size={22} color={colores.grafito} />
              <Text style={estilos.ayudaTitulo}>Ayuda y soporte</Text>
            </View>

            {hayContacto ? (
              <>
                {CONTACTO_SOPORTE.correo ? (
                  <TouchableOpacity
                    style={estilos.ayudaFila}
                    onPress={() => Linking.openURL(`mailto:${CONTACTO_SOPORTE.correo}`)}
                  >
                    <Ionicons name="mail-outline" size={18} color={colores.acero} />
                    <Text style={estilos.ayudaFilaTexto}>{CONTACTO_SOPORTE.correo}</Text>
                  </TouchableOpacity>
                ) : null}
                {CONTACTO_SOPORTE.telefono ? (
                  <TouchableOpacity
                    style={estilos.ayudaFila}
                    onPress={() => Linking.openURL(`tel:${CONTACTO_SOPORTE.telefono}`)}
                  >
                    <Ionicons name="call-outline" size={18} color={colores.acero} />
                    <Text style={estilos.ayudaFilaTexto}>{CONTACTO_SOPORTE.telefono}</Text>
                  </TouchableOpacity>
                ) : null}
              </>
            ) : (
              <Text style={estilos.ayudaVacio}>
                El contacto de soporte todavía no está configurado. Se puede agregar en{' '}
                <Text style={{ fontFamily: 'monospace' }}>mobile/src/screens/LoginScreen.js</Text>.
              </Text>
            )}

            <TouchableOpacity style={estilos.ayudaCerrar} onPress={() => setAyudaVisible(false)}>
              <Text style={estilos.ayudaCerrarTexto}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: colores.grafito },
  franja: { height: 6, backgroundColor: colores.menta },
  botonAyuda: {
    position: 'absolute',
    top: 50,
    right: espaciado.lg,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centro: { flex: 1, justifyContent: 'center', paddingHorizontal: espaciado.xl },
  marca: { color: colores.menta, fontSize: 14, fontWeight: '700', letterSpacing: 2, marginBottom: 16 },
  titulo: { color: colores.blanco, fontSize: 26, fontWeight: '700', marginBottom: 24 },
  etiqueta: { color: 'rgba(255,255,255,0.6)', fontSize: 13, marginBottom: 6, marginTop: 14 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 4,
    padding: 12,
    color: colores.blanco,
    fontSize: 15,
  },
  boton: {
    backgroundColor: colores.menta,
    borderRadius: 4,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: espaciado.xl,
  },
  botonTexto: { color: colores.grafito, fontWeight: '700', fontSize: 16 },
  error: { color: '#F5A9A0', marginBottom: 8, fontSize: 13 },
  cambiarIdioma: { marginTop: espaciado.lg, alignItems: 'center' },
  cambiarIdiomaTexto: { color: 'rgba(255,255,255,0.5)', fontSize: 13 },

  ayudaFondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  ayudaPanel: { backgroundColor: colores.blanco, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: espaciado.lg },
  ayudaHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: espaciado.lg },
  ayudaTitulo: { fontSize: 17, fontWeight: '700', color: colores.grafito },
  ayudaFila: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  ayudaFilaTexto: { fontSize: 15, color: colores.textoPrincipal },
  ayudaVacio: { fontSize: 13, color: colores.textoSecundario, lineHeight: 20 },
  ayudaCerrar: { marginTop: espaciado.lg, paddingVertical: 12, alignItems: 'center' },
  ayudaCerrarTexto: { color: colores.acero, fontWeight: '600', fontSize: 15 },
});
