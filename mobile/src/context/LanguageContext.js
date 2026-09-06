import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { traducciones, interpolar } from '../i18n/traducciones';

const CLAVE_IDIOMA = '@constructora/idioma';
const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  // null = todavia no se pregunto; 'es' | 'en' = ya elegido
  const [idioma, setIdioma] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(CLAVE_IDIOMA).then((valor) => {
      if (valor === 'es' || valor === 'en') setIdioma(valor);
      setCargando(false);
    });
  }, []);

  async function elegirIdioma(nuevo) {
    await AsyncStorage.setItem(CLAVE_IDIOMA, nuevo);
    setIdioma(nuevo);
  }

  function t(clave, valores) {
    const dict = traducciones[idioma || 'es'];
    const texto = dict[clave] || clave;
    return interpolar(texto, valores);
  }

  return (
    <LanguageContext.Provider value={{ idioma, cargando, elegirIdioma, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useIdioma() {
  return useContext(LanguageContext);
}
