const boton = document.getElementById('search-btn');
const entrada = document.getElementById('city-input');
const tarjeta = document.getElementById('weather-card');
const contenedorMapa = document.getElementById('map-container');
const mapa = document.getElementById('map-frame');

// Convierte el código de Open-Meteo en icono y texto
function describirClima(codigo) {
  if (codigo === 0) return { icono: '☀️', texto: 'Despejado' };
  if (codigo <= 3) return { icono: '⛅', texto: 'Parcialmente nublado' };
  if (codigo <= 48) return { icono: '🌫️', texto: 'Niebla' };
  if (codigo <= 67) return { icono: '🌧️', texto: 'Lluvia' };
  if (codigo <= 77) return { icono: '❄️', texto: 'Nieve' };
  if (codigo <= 82) return { icono: '🌦️', texto: 'Chubascos' };
  return { icono: '⛈️', texto: 'Tormenta' };
}

// Busca las coordenadas dentro de México: primero Nominatim, y si falla, Open-Meteo
async function buscarLugar(ciudad) {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(ciudad)}&limit=1&countrycodes=mx`;
    const resp = await fetch(url);
    const datos = await resp.json();
    if (datos.length > 0) {
      return {
        nombre: datos[0].display_name.split(',').slice(0, 3).join(','),
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
    tarjeta.innerHTML = '<p>⚠️ Escribe una ciudad de México.</p>';
    return;
  }

  tarjeta.innerHTML = '<p>🔄 Buscando datos en México...</p>';

  try {
    // 1) Coordenadas del lugar
    const lugar = await buscarLugar(ciudad);
    if (!lugar) {
      tarjeta.innerHTML = '<p>❌ Ciudad no encontrada en México.</p>';
      contenedorMapa.hidden = true;
      return;
    }

    // 2) Clima real con Open-Meteo
    const urlClima = `https://api.open-meteo.com/v1/forecast?latitude=${lugar.lat}&longitude=${lugar.lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,pressure_msl,weather_code&timezone=auto`;
    const respClima = await fetch(urlClima);
    const datosClima = await respClima.json();
    const actual = datosClima.current;
    const clima = describirClima(actual.weather_code);

    // 3) Mostrar la tarjeta
    tarjeta.innerHTML = `
      <div class="weather-icon">${clima.icono}</div>
      <h2>${ciudad}, México</h2>
      <p>${lugar.nombre}</p>

      <hr>

      <p class="temp-grande">${actual.temperature_2m}°C</p>
      <p><b>🌥 Condición:</b> ${clima.texto}</p>
      <p><b>🌡 Sensación térmica:</b> ${actual.apparent_temperature}°C</p>
      <p><b>💧 Humedad:</b> ${actual.relative_humidity_2m}%</p>
      <p><b>💨 Viento:</b> ${actual.wind_speed_10m} km/h</p>
      <p><b>🧭 Presión:</b> ${actual.pressure_msl} hPa</p>
      <p><b>📍 Lat:</b> ${lugar.lat.toFixed(4)} | <b>Lng:</b> ${lugar.lon.toFixed(4)}</p>
    `;

    // 4) Mapa de OpenStreetMap con marcador
    const margen = 0.05;
    contenedorMapa.hidden = false;
    mapa.src = `https://www.openstreetmap.org/export/embed.html?bbox=${lugar.lon - margen},${lugar.lat - margen},${lugar.lon + margen},${lugar.lat + margen}&layer=mapnik&marker=${lugar.lat},${lugar.lon}`;

  } catch (error) {
    console.error(error);
    tarjeta.innerHTML = '<p>❌ Error de conexión.</p>';
  }
}

boton.addEventListener('click', buscarClima);

// También funciona con la tecla Enter
entrada.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') buscarClima();
});