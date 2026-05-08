const COUNTRY_GEOJSON_URL =
  "https://cdn.jsdelivr.net/gh/datasets/geo-countries@master/data/countries.geojson";
const REST_COUNTRIES_URL = "https://restcountries.com/v3.1/alpha";
const WEATHER_URL = "https://api.open-meteo.com/v1/forecast";
const FAVORITES_KEY = "interactive-map-favorites-v1";

const map = L.map("map", {
  worldCopyJump: true,
  minZoom: 2,
  maxZoom: 7,
  maxBoundsViscosity: 0.8,
  attributionControl: false,
  preferCanvas: true,
  scrollWheelZoom: true,
  wheelPxPerZoomLevel: 90,
  zoomAnimation: false,
  fadeAnimation: false,
  markerZoomAnimation: false,
}).setView([22, 8], 2);

L.control
  .attribution({
    prefix: false,
  })
  .addAttribution("Country boundaries: geo-countries")
  .addTo(map);

const detailsEl = document.querySelector("#countryDetails");
const favoritesListEl = document.querySelector("#favoritesList");
const favoriteCountEl = document.querySelector("#favoriteCount");
const showFavoritesBtn = document.querySelector("#showFavoritesBtn");
const clearFavoritesBtn = document.querySelector("#clearFavoritesBtn");

const countryLayers = new Map();
let selectedLayer = null;
let selectedCountry = null;
let favorites = loadFavorites();

const baseStyle = {
  color: "#ffffff",
  weight: 0.7,
  opacity: 0.9,
  fillColor: "#8fb8a6",
  fillOpacity: 0.72,
};

const favoriteStyle = {
  ...baseStyle,
  fillColor: "#e0aa3e",
  fillOpacity: 0.86,
};

const selectedStyle = {
  color: "#1f2933",
  weight: 2,
  fillOpacity: 0.92,
};

init();

async function init() {
  renderFavorites();

  try {
    const response = await fetch(COUNTRY_GEOJSON_URL);
    if (!response.ok) {
      throw new Error("Karten-Daten konnten nicht geladen werden.");
    }

    const geojson = await response.json();
    L.geoJSON(geojson, {
      style: getCountryStyle,
      onEachFeature,
    }).addTo(map);
  } catch (error) {
    detailsEl.innerHTML = `
      <p class="eyebrow">Fehler</p>
      <h2>Karte nicht geladen</h2>
      <p class="muted">${error.message}</p>
    `;
  }
}

function onEachFeature(feature, layer) {
  const country = normalizeFeature(feature, layer);
  if (!country.code) {
    return;
  }

  countryLayers.set(country.code, layer);
  layer.countryData = country;
  layer.bindTooltip(country.name, {
    sticky: true,
    className: "country-tooltip",
  });

  layer.on({
    mouseover: () => highlightLayer(layer),
    mouseout: () => resetLayerStyle(layer),
    click: () => selectCountry(layer),
  });
}

async function selectCountry(layer) {
  selectedLayer = layer;
  selectedCountry = layer.countryData;
  applyAllLayerStyles();
  map.fitBounds(layer.getBounds(), { padding: [34, 34], maxZoom: 5 });
  renderCountryLoading(selectedCountry);

  const [countryInfo, weather] = await Promise.all([
    fetchCountryInfo(selectedCountry),
    fetchWeather(selectedCountry.center),
  ]);

  selectedCountry = {
    ...selectedCountry,
    ...countryInfo,
  };
  layer.countryData = selectedCountry;
  renderCountryDetails(selectedCountry, weather);
}

function normalizeFeature(feature, layer) {
  const props = feature.properties || {};
  const code =
    props.ISO_A3 ||
    props.iso_a3 ||
    props.ADM0_A3 ||
    props.cca3 ||
    props.ISO3166_1_Alpha_3 ||
    props["ISO3166-1-Alpha-3"] ||
    "";
  const name =
    props.ADMIN ||
    props.name ||
    props.NAME ||
    props.sovereignt ||
    props.SOVEREIGNT ||
    "Unbekanntes Land";
  const center = layer.getBounds().getCenter();

  return {
    code: code.toUpperCase(),
    name,
    center: {
      lat: Number(center.lat.toFixed(4)),
      lng: Number(center.lng.toFixed(4)),
    },
  };
}

async function fetchCountryInfo(country) {
  try {
    const response = await fetch(
      `${REST_COUNTRIES_URL}/${country.code}?fields=name,capital,population,region,subregion,languages,currencies,flags,cca2,cca3`
    );
    if (!response.ok) {
      throw new Error("Keine Länderdaten verfügbar.");
    }
    const data = await response.json();

    return {
      code: data.cca3 || country.code,
      code2: data.cca2 || "",
      name: data.name?.common || country.name,
      officialName: data.name?.official || "",
      capital: Array.isArray(data.capital) ? data.capital.join(", ") : "",
      population: data.population || null,
      region: [data.region, data.subregion].filter(Boolean).join(", "),
      languages: formatObjectValues(data.languages),
      currencies: formatCurrencies(data.currencies),
      flag: data.cca2 ? countryCodeToFlag(data.cca2) : "",
    };
  } catch {
    return {
      name: country.name,
      region: "Nicht verfügbar",
      capital: "",
      population: null,
      languages: "",
      currencies: "",
      flag: "",
    };
  }
}

async function fetchWeather(center) {
  try {
    const params = new URLSearchParams({
      latitude: center.lat,
      longitude: center.lng,
      current:
        "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m",
      timezone: "auto",
    });
    const response = await fetch(`${WEATHER_URL}?${params.toString()}`);
    if (!response.ok) {
      throw new Error("Wetter nicht verfügbar.");
    }
    return await response.json();
  } catch {
    return null;
  }
}

function renderCountryLoading(country) {
  detailsEl.innerHTML = `
    <p class="eyebrow">Lädt</p>
    <h2>${escapeHtml(country.name)}</h2>
    <p class="loading">Informationen und Wetter werden abgerufen...</p>
  `;
}

function renderCountryDetails(country, weather) {
  const weatherData = weather?.current;
  const tempUnit = weather?.current_units?.temperature_2m || "°C";
  const windUnit = weather?.current_units?.wind_speed_10m || "km/h";
  const humidityUnit = weather?.current_units?.relative_humidity_2m || "%";
  const precipitationUnit = weather?.current_units?.precipitation || "mm";
  const isFavorite = favorites.has(country.code);

  detailsEl.innerHTML = `
    <div class="country-heading">
      <div>
        <p class="eyebrow">Land</p>
        <div class="country-title">
          <span class="flag" aria-hidden="true">${country.flag || "○"}</span>
          <h2>${escapeHtml(country.name)}</h2>
        </div>
      </div>
      <button id="toggleFavoriteBtn" class="favorite-button ${isFavorite ? "active" : ""}" type="button" title="Favorit umschalten">
        ${isFavorite ? "★" : "☆"}
      </button>
    </div>

    <div class="stat-grid">
      ${renderStat("Hauptstadt", country.capital || "Nicht verfügbar")}
      ${renderStat("Region", country.region || "Nicht verfügbar")}
      ${renderStat("Einwohner", country.population ? formatNumber(country.population) : "Nicht verfügbar")}
      ${renderStat("Sprachen", country.languages || "Nicht verfügbar")}
      ${renderStat("Währungen", country.currencies || "Nicht verfügbar")}
      ${renderStat("Code", country.code)}
    </div>

    <div class="weather-panel">
      <p class="eyebrow">Aktuelles Wetter</p>
      ${
        weatherData
          ? `
            <div class="weather-status">
              <div>
                <strong>${Math.round(weatherData.temperature_2m)}${tempUnit}</strong>
                <span class="muted">${weatherDescription(weatherData.weather_code)}</span>
              </div>
              <span class="muted">${formatWeatherTime(weatherData.time)}</span>
            </div>
            <div class="weather-grid">
              ${renderWeatherCard("Gefühlt", `${Math.round(weatherData.apparent_temperature)}${tempUnit}`)}
              ${renderWeatherCard("Wind", `${Math.round(weatherData.wind_speed_10m)} ${windUnit}`)}
              ${renderWeatherCard("Luftfeuchte", `${weatherData.relative_humidity_2m}${humidityUnit}`)}
              ${renderWeatherCard("Niederschlag", `${weatherData.precipitation} ${precipitationUnit}`)}
            </div>
          `
          : '<p class="muted">Für dieses Land konnte gerade kein Wetter geladen werden.</p>'
      }
    </div>
  `;

  document.querySelector("#toggleFavoriteBtn").addEventListener("click", () => {
    toggleFavorite(country);
  });
}

function renderStat(label, value) {
  return `
    <div class="stat">
      <span>${label}</span>
      <strong>${escapeHtml(String(value))}</strong>
    </div>
  `;
}

function renderWeatherCard(label, value) {
  return `
    <div class="weather-card">
      <span>${label}</span>
      <strong>${escapeHtml(String(value))}</strong>
    </div>
  `;
}

function toggleFavorite(country) {
  if (favorites.has(country.code)) {
    favorites.delete(country.code);
  } else {
    favorites.set(country.code, {
      code: country.code,
      name: country.name,
      region: country.region || "",
      flag: country.flag || "",
    });
  }

  saveFavorites();
  renderFavorites();
  applyAllLayerStyles();
  renderCountryDetails(country, null);
  if (selectedLayer === countryLayers.get(country.code)) {
    fetchWeather(country.center).then((weather) => {
      renderCountryDetails(country, weather);
    });
  }
}

function renderFavorites() {
  favoriteCountEl.textContent = String(favorites.size);

  if (!favorites.size) {
    favoritesListEl.innerHTML = '<p class="muted">Noch keine Länder gespeichert.</p>';
    return;
  }

  favoritesListEl.innerHTML = [...favorites.values()]
    .sort((a, b) => a.name.localeCompare(b.name, "de"))
    .map(
      (country) => `
        <button class="favorite-row" type="button" data-code="${country.code}">
          <span class="flag" aria-hidden="true">${country.flag || "○"}</span>
          <span>
            <strong>${escapeHtml(country.name)}</strong>
            <span>${escapeHtml(country.region || country.code)}</span>
          </span>
          <span class="remove-favorite" data-remove="${country.code}" title="Favorit entfernen">×</span>
        </button>
      `
    )
    .join("");

  favoritesListEl.querySelectorAll(".favorite-row").forEach((row) => {
    row.addEventListener("click", (event) => {
      const removeCode = event.target.dataset.remove;
      if (removeCode) {
        favorites.delete(removeCode);
        saveFavorites();
        renderFavorites();
        applyAllLayerStyles();
        if (selectedCountry?.code === removeCode) {
          renderCountryDetails(selectedCountry, null);
          fetchWeather(selectedCountry.center).then((weather) => {
            renderCountryDetails(selectedCountry, weather);
          });
        }
        return;
      }

      const layer = countryLayers.get(row.dataset.code);
      if (layer) {
        selectCountry(layer);
      }
    });
  });
}

function getCountryStyle(feature) {
  const props = feature.properties || {};
  const code = (
    props.ISO_A3 ||
    props.iso_a3 ||
    props.ADM0_A3 ||
    props.cca3 ||
    props.ISO3166_1_Alpha_3 ||
    props["ISO3166-1-Alpha-3"] ||
    ""
  ).toUpperCase();
  return favorites.has(code) ? favoriteStyle : baseStyle;
}

function highlightLayer(layer) {
  const code = layer.countryData?.code;
  layer.setStyle({
    fillColor: favorites.has(code) ? "#bd7f20" : "#4f8d78",
    fillOpacity: 0.95,
    weight: selectedLayer === layer ? 2 : 1.3,
  });
  layer.bringToFront();
}

function resetLayerStyle(layer) {
  const code = layer.countryData?.code;
  const style = favorites.has(code) ? favoriteStyle : baseStyle;
  layer.setStyle(selectedLayer === layer ? { ...style, ...selectedStyle } : style);
}

function applyAllLayerStyles() {
  countryLayers.forEach((layer) => resetLayerStyle(layer));
}

function loadFavorites() {
  try {
    const stored = JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]");
    return new Map(stored.map((country) => [country.code, country]));
  } catch {
    return new Map();
  }
}

function saveFavorites() {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favorites.values()]));
}

function formatObjectValues(value) {
  if (!value || typeof value !== "object") {
    return "";
  }
  return Object.values(value).join(", ");
}

function formatCurrencies(currencies) {
  if (!currencies || typeof currencies !== "object") {
    return "";
  }
  return Object.values(currencies)
    .map((currency) => currency.name)
    .filter(Boolean)
    .join(", ");
}

function countryCodeToFlag(code) {
  return code
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt()));
}

function formatNumber(value) {
  return new Intl.NumberFormat("de-DE").format(value);
}

function formatWeatherTime(value) {
  if (!value) {
    return "";
  }
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function weatherDescription(code) {
  const descriptions = {
    0: "Klarer Himmel",
    1: "Überwiegend klar",
    2: "Teilweise bewölkt",
    3: "Bewölkt",
    45: "Nebel",
    48: "Reifnebel",
    51: "Leichter Nieselregen",
    53: "Nieselregen",
    55: "Starker Nieselregen",
    61: "Leichter Regen",
    63: "Regen",
    65: "Starker Regen",
    71: "Leichter Schnee",
    73: "Schnee",
    75: "Starker Schnee",
    80: "Leichte Regenschauer",
    81: "Regenschauer",
    82: "Starke Regenschauer",
    95: "Gewitter",
    96: "Gewitter mit Hagel",
    99: "Starkes Gewitter mit Hagel",
  };
  return descriptions[code] || "Wetterdaten verfügbar";
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return entities[char];
  });
}

showFavoritesBtn.addEventListener("click", () => {
  document.querySelector(".favorites-section").scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
});

clearFavoritesBtn.addEventListener("click", () => {
  favorites.clear();
  saveFavorites();
  renderFavorites();
  applyAllLayerStyles();
  if (selectedCountry) {
    renderCountryDetails(selectedCountry, null);
    fetchWeather(selectedCountry.center).then((weather) => {
      renderCountryDetails(selectedCountry, weather);
    });
  }
});
