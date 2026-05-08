// script.js

// MAP
const map = L.map("map").setView([48.1374, 11.5755], 4);

//Cesium Map
Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJiOWRlMDJmNi1iNjY1LTQzOWYtOTBjMy0yZDI0ZjkxMTE0MWMiLCJpZCI6NDI3OTY3LCJpc3MiOiJodHRwczovL2lvbi5jZXNpdW0uY29tIiwiYXVkIjoidW5kZWZpbmVkX2RlZmF1bHQiLCJpYXQiOjE3NzgwNzIxOTR9.kKzEHDrNciJYRs9XQiWJVdjwIpkdf1iZ7VF5EZ5H3Q8';

const viewer = new Cesium.Viewer('cesiumContainer', {
  terrain: Cesium.Terrain.fromWorldTerrain(),
  animation: false,
  baseLayerPicker: false,
  fullscreenButton: false,
  geocoder: false,
  homeButton: false,
  infoBox: false,
  sceneModePicker: false,
  selectionIndicator: false,
  timeline: false,
  navigationHelpButton: false,
  navigationInstructionsInitiallyVisible: false,
});    

viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(11.5755, 48.1374, 6000000),
});
// Hide Credits
viewer.cesiumWidget.creditContainer.style.display = "none";
// Disable Rotation
viewer.scene.screenSpaceCameraController.enableTilt = false;
// Get latitude and longitude
const camera = viewer.camera;

const cartographic = Cesium.Cartographic.fromCartesian(
    camera.position
);

const longitude = Cesium.Math.toDegrees(cartographic.longitude);
const latitude  = Cesium.Math.toDegrees(cartographic.latitude);
const height    = cartographic.height;

// Set Map with L.map *1
const map = L.map("map").setView([20, 0], 2);

// Load Tiles with L.tileLayer *2
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);

// Load Favorites from localStorage
let favorites =
  JSON.parse(localStorage.getItem("favorites")) || [];

// Save Favorites to localStorage
function saveFavorites() {

  localStorage.setItem(
    "favorites",
    JSON.stringify(favorites)
  );
}

// Display Favorites
function renderFavorites() {

  const favoritesList =
    document.getElementById("favorites-list");

  favoritesList.innerHTML = "";

  favorites.forEach(country => {

    const li = document.createElement("li");

    // List item HTML
    li.innerHTML = `
      <span>${country}</span>

      <button class="remove-btn">
        ❌
      </button>
    `;

    // Removal Button Function
    li.querySelector(".remove-btn")
      .addEventListener("click", () => {

        favorites =
          favorites.filter(c => c !== country);

        saveFavorites();

        renderFavorites();
      });

    favoritesList.appendChild(li);
  });
}

// Add Favorites
function addFavorite(countryName) {

  if (!favorites.includes(countryName)) {

    favorites.push(countryName);

    saveFavorites();

    renderFavorites();
  }
}

// First Display of Favorites
renderFavorites();

// Load GeoJSON
fetch(
  "https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json"
)
  .then(res => res.json())
  .then(data => {

    // L.geoJSON Function -> display countries outline
    L.geoJSON(data, {

      // Outline and Fill Style
      style: {
        color: "#2563eb",
        weight: 1,
        fillColor: "#60a5fa",
        fillOpacity: 0.4
      },

      // Hover and Click Logic
      onEachFeature: (feature, layer) => {

        // Hover
        layer.on("mouseover", () => {

          layer.setStyle({
            fillOpacity: 0.7
          });
        });

        // leave Hover
        layer.on("mouseout", () => {

          layer.setStyle({
            fillOpacity: 0.4
          });
        });

        // Click
        layer.on("click", async () => {

          const countryName =
            feature.properties.name;

          // Country Info API
          const countryRes = await fetch(
            `https://restcountries.com/v3.1/name/${countryName}`
          );

          // Whole JSON
          const countryData =
            await countryRes.json();

          // First JSON Element = Country
          const country = countryData[0];

          // country.capital -> capital. If multiple capital -> first one
          const capital =
            country.capital
              ? country.capital[0]
              : "Unknown";

          // Weather Text (currently empty)
          let weatherText =
            "No Weatherdata";

          // Geocoding for Coordinates to use for Weather API
          const geoRes = await fetch(
            `https://geocoding-api.open-meteo.com/v1/search?name=${capital}`
          );

          const geoData =
            await geoRes.json();

          // Coordinates for the Capital: latitude and longitude
          if (geoData.results) {
            
            // latitude
            const lat =
              geoData.results[0].latitude;

            // longitude
            const lon =
              geoData.results[0].longitude;

            // Weather API with the Coordinates
            const weatherRes = await fetch(
              `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`
            );
            
            const weatherData =
              await weatherRes.json();

            // update the weather text to the temperature
            weatherText =
              `${weatherData.current_weather.temperature}°C`;
          }

          // Show Country information HTML
          document.getElementById("info").innerHTML = `
            <h2>${country.name.common}</h2>

            <img src="${country.flags.png}">

            <p>
              <strong>Capital:</strong>
              ${capital}
            </p>

            <p>
              <strong>Region:</strong>
              ${country.region}
            </p>

            <p>
              <strong>Population:</strong>
              ${country.population.toLocaleString()}
            </p>

            <p>
              <strong>Currency:</strong>
              ${
                Object.values(
                  country.currencies || {}
                )[0]?.name || "?"
              }
            </p>

            <p>
              <strong>Weather:</strong>
              ${weatherText}
            </p>

            <button id="favorite-btn">
              ⭐ Add to Favorites
            </button>
          `;

          // Favoriten Button
          const favoriteBtn =
            document.getElementById(
              "favorite-btn"
            );

          // Bereits favorisiert?
          if (
            favorites.includes(
              country.name.common
            )
          ) {

            favoriteBtn.classList.add(
              "saved"
            );

            favoriteBtn.innerText =
              "✅ Favored";
          }

          // Klick auf Favorisieren
          favoriteBtn.addEventListener(
            "click",
            () => {

              addFavorite(
                country.name.common
              );

              favoriteBtn.classList.add(
                "saved"
              );

              favoriteBtn.innerText =
                "✅ Favored";
            }
          );

        });

      }

    }).addTo(map);

  });

  let syncing = false;

// --- Cesium → Leaflet sync ---
viewer.camera.changed.addEventListener(() => {
  if (syncing) return;
  syncing = true;

  const cartographic = Cesium.Cartographic.fromCartesian(
    viewer.camera.positionWC,
    Cesium.Ellipsoid.WGS84
  );

  const height = cartographic.height;

  const lat = Cesium.Math.toDegrees(cartographic.latitude);
  const lng = Cesium.Math.toDegrees(cartographic.longitude);

  const mapEl = document.getElementById("map");
  const cesiumEl = document.getElementById("cesiumContainer");

  // Switch to Leaflet if zoomed in (low altitude)
  if (height < 6000000) {
    map.setView([lat, lng], 4);
    viewer.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(
        lng,
        lat,
        6000000
      ),
    });

    if (mapEl) mapEl.style.opacity = "1";
    if (cesiumEl) cesiumEl.style.opacity = "0";
  }

  syncing = false;
});


// --- Leaflet → Cesium sync ---
map.on("zoom", () => {
  if (syncing) return;
  syncing = true;

  const zoom = map.getZoom();
  const center = map.getCenter();

  const mapEl = document.getElementById("map");
  const cesiumEl = document.getElementById("cesiumContainer");

  // Switch to Cesium if zoomed out
  if (zoom < 4) {
    viewer.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(
        center.lng,
        center.lat,
        6000000
      ),
    });
    map.setView([center.lat, center.lng], 4);

    if (mapEl) mapEl.style.opacity = "0";
    if (cesiumEl) cesiumEl.style.opacity = "1";
  }

  syncing = false;
});