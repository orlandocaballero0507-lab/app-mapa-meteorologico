const boton = document.getElementById('search-btn');
const entrada = document.getElementById('city-input');
const tarjeta = document.getElementById('weather-card');

// Traduce el código del clima de Open-Meteo a texto
function describirClima(codigo) {
  if (codigo === 0) return 'Despejado ☀️';
  if (codigo <= 3) return 'Parcialmente nublado ⛅';
  if (codigo <= 48) return 'Niebla 🌫️';
  if (codigo <= 67) return 'Lluvia 🌧️';
  if (codigo <= 77) return 'Nieve ❄️';
  if (codigo <= 82) return 'Chubascos 🌦️';
  return 'Tormenta ⛈️';
}

// Busca las coordenadas en México: primero Nominatim, y si falla usa Open-Meteo
async function buscarLugar(ciudad) {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(ciudad)}&limit=1&countrycodes=mx`;
    const resp = await fetch(url);
    const datos = await resp.json();
    if (datos.length > 0) {
      return {
        nombre: datos[0].display_name,
        lat: parseFloat(datos[0].lat),
        lon: parseFloat(datos[0].lon)
      };
    }
  } catch (error) {
    console.warn('Nominatim falló, usando Open-Meteo:', error);
  }

  // Plan B: buscador de lugares de Open-Meteo
  const urlB = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(ciudad)}&count=1&language=es&countryCode=MX`;
  const respB = await fetch(urlB);
  const datosB = await respB.json();
  if (datosB.results && datosB.results.length > 0) {
    const r = datosB.results[0];
    return {
      nombre: `${r.name}, ${r.admin1 || ''}, ${r.country || ''}`,
      lat: r.latitude,
      lon: r.longitude
    };
  }
  return null;
}

async function buscarClima() {
  const ciudad = entrada.value.trim();

  if (!ciudad) {
    tarjeta.innerHTML = '<p>⚠️ Por favor escribe un lugar válido.</p>';
    return;
  }

  tarjeta.innerHTML = '<p>🔄 Consultando datos...</p>';

  try {
    // 1) Coordenadas del lugar
    const lugar = await buscarLugar(ciudad);
    if (!lugar) {
      tarjeta.innerHTML = '<p>❌ No se encontró esa ubicación en México.</p>';
      return;
    }

    // 2) Clima actual con Open-Meteo
    const urlClima = `https://api.open-meteo.com/v1/forecast?latitude=${lugar.lat}&longitude=${lugar.lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code`;
    const respClima = await fetch(urlClima);
    const datosClima = await respClima.json();
    const actual = datosClima.current;

    // 3) Mapa de OpenStreetMap con marcador
    const margen = 0.05;
    const urlMapa = `https://www.openstreetmap.org/export/embed.html?bbox=${lugar.lon - margen},${lugar.lat - margen},${lugar.lon + margen},${lugar.lat + margen}&layer=mapnik&marker=${lugar.lat},${lugar.lon}`;

    // 4) Mostrar todo en la tarjeta
    tarjeta.innerHTML = `
      <h3>🗺️ ${ciudad}</h3>
      <p class="description">${lugar.nombre}</p>

      <div class="geo-data">
        <p><strong>Latitud:</strong> ${lugar.lat.toFixed(4)} | <strong>Longitud:</strong> ${lugar.lon.toFixed(4)}</p>
      </div>

      <hr>

      <div class="weather-data">
        <h4>Clima actual</h4>
        <p><strong>Temperatura:</strong> ${actual.temperature_2m} °C</p>
        <p><strong>Humedad:</strong> ${actual.relative_humidity_2m} %</p>
        <p><strong>Viento:</strong> ${actual.wind_speed_10m} km/h</p>
        <p><strong>Condición:</strong> ${describirClima(actual.weather_code)}</p>
      </div>

      <iframe class="map" src="${urlMapa}"></iframe>

      <div class="success-footer">✓ Datos sincronizados con éxito.</div>
    `;
  } catch (error) {
    console.error(error);
    tarjeta.innerHTML = '<p>❌ Error al conectar con el servidor.</p>';
  }
}

boton.addEventListener('click', buscarClima);

// Que también funcione con la tecla Enter
entrada.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') buscarClima();
});