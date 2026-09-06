import React, { useState } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { LanguageProvider, useIdioma } from './src/context/LanguageContext';
import LoginScreen from './src/screens/LoginScreen';
import SeleccionIdiomaScreen from './src/screens/SeleccionIdiomaScreen';
import InicioScreen from './src/screens/InicioScreen';
import HomeScreen from './src/screens/HomeScreen';
import TareasScreen from './src/screens/TareasScreen';
import TimeCardScreen from './src/screens/TimeCardScreen';
import MaterialesScreen from './src/screens/MaterialesScreen';
import HerramientasScreen from './src/screens/HerramientasScreen';
import MenuLateral from './src/components/MenuLateral';
import { colores, espaciado } from './src/theme';

// Cada pantalla vive aqui, y se elige cual mostrar segun el menu lateral.
// No usamos una libreria de navegacion para mantener el proyecto simple y estable.
const PANTALLAS = {
  Home: InicioScreen,
  Punch: HomeScreen,
  TimeCard: TimeCardScreen,
  Materiales: MaterialesScreen,
  Herramientas: HerramientasScreen,
  Tareas: TareasScreen,
};

const TITULOS = {
  Home: 'GOKRON',
  Punch: 'Punch',
  TimeCard: 'Time Card',
  Materiales: 'Materiales',
  Tareas: 'Tareas',
};

function Navegacion() {
  const { token, cargando, usuario, salir } = useAuth();
  const { idioma, cargando: cargandoIdioma, t } = useIdioma();
  const [pantallaActiva, setPantallaActiva] = useState('Home');
  const [menuAbierto, setMenuAbierto] = useState(false);

  if (cargando || cargandoIdioma) {
    return (
      <View style={estilos.cargandoContenedor}>
        <ActivityIndicator color={colores.menta} size="large" />
      </View>
    );
  }

  // Antes que cualquier otra cosa (incluso antes del login), se pregunta
  // el idioma la primera vez que alguien abre la app en este celular.
  if (!idioma) return <SeleccionIdiomaScreen />;

  if (!token) return <LoginScreen />;

  const TITULOS = {
    Home: 'GOKRON',
    Punch: t('menuPunch'),
    TimeCard: t('menuTimeCard'),
    Materiales: t('menuMateriales'),
    Herramientas: t('menuHerramientas'),
    Tareas: t('menuTareas'),
  };

  const PantallaActual = PANTALLAS[pantallaActiva] || HomeScreen;

  return (
    <View style={estilos.raiz}>
      <SafeAreaView edges={['top']} style={estilos.barraSuperior}>
        <TouchableOpacity
          onPress={() => setMenuAbierto(true)}
          style={estilos.botonMenu}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <View style={estilos.raya} />
          <View style={estilos.raya} />
          <View style={estilos.raya} />
        </TouchableOpacity>
        <Text style={estilos.marca}>{TITULOS[pantallaActiva] || 'GOKRON'}</Text>
        <View style={{ width: 22 }} />
      </SafeAreaView>

      <View style={estilos.contenido}>
        <PantallaActual onNavegar={setPantallaActiva} />
      </View>

      <MenuLateral
        visible={menuAbierto}
        onCerrar={() => setMenuAbierto(false)}
        pantallaActiva={pantallaActiva}
        onSeleccionar={(clave) => {
          setPantallaActiva(clave);
          setMenuAbierto(false);
        }}
        usuario={usuario}
        onSalir={() => {
          setMenuAbierto(false);
          salir();
        }}
      />
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <AuthProvider>
          <Navegacion />
        </AuthProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}

const estilos = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: colores.hueso },
  cargandoContenedor: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colores.grafito,
  },
  barraSuperior: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: espaciado.lg,
    paddingVertical: 14,
    backgroundColor: colores.grafito,
  },
  botonMenu: { justifyContent: 'space-between', height: 16, width: 22 },
  raya: { height: 2, backgroundColor: colores.blanco, borderRadius: 2 },
  marca: { color: colores.blanco, fontSize: 14, fontWeight: '700', letterSpacing: 1.5 },
  contenido: { flex: 1 },
});
