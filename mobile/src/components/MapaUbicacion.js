import React from 'react';
import MapView, { Marker, Circle } from 'react-native-maps';

// Version para celular: mapa real con el marcador de tu ubicacion y el
// circulo de rango permitido alrededor de la obra.
export default function MapaUbicacion({ ubicacionModal, obraSeleccionada, distanciaMaxima, colores, estiloMapa }) {
  return (
    <MapView
      style={estiloMapa}
      initialRegion={{
        latitude: ubicacionModal.lat,
        longitude: ubicacionModal.lng,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      }}
      scrollEnabled={false}
      zoomEnabled={false}
    >
      <Marker coordinate={{ latitude: ubicacionModal.lat, longitude: ubicacionModal.lng }} pinColor={colores.menta} />
      {obraSeleccionada?.latitud != null && obraSeleccionada?.longitud != null && (
        <Circle
          center={{ latitude: obraSeleccionada.latitud, longitude: obraSeleccionada.longitud }}
          radius={distanciaMaxima}
          strokeColor={colores.acero}
          fillColor="rgba(62,92,118,0.15)"
        />
      )}
    </MapView>
  );
}
