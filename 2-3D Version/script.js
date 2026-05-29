// script.js

// MAP
const mapEl = document.getElementById("map");
const cesiumEl = document.getElementById("cesiumContainer");

const SWITCH_CAMERA_HEIGHT = 6000000;
const SWITCH_LEAFLET_ZOOM = 4;
const CESIUM_ZOOM_HEIGHT_EPSILON = 10000;

const map = L.map("map", {
  preferCanvas: true,
}).setView([48.1374, 11.5755], SWITCH_LEAFLET_ZOOM);

//Cesium Map
if (!window.CESIUM_ION_TOKEN) {
  throw new Error("Missing Cesium Ion token. Create cesium-token.js next to script.js.");
}

Cesium.Ion.defaultAccessToken = window.CESIUM_ION_TOKEN;

const viewer = new Cesium.Viewer('cesiumContainer', {
  terrain: Cesium.Terrain.fromWorldTerrain(),
  requestRenderMode: true,
  maximumRenderTimeChange: Infinity,
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

let activeMapMode = "3d";

function setMapMode(mode) {

  if (activeMapMode === mode) return;

  activeMapMode = mode;

  if (mode === "2d") {
    if (mapEl) mapEl.classList.add("active");
    if (cesiumEl) cesiumEl.classList.remove("active");

    viewer.scene.screenSpaceCameraController.enableInputs = false;
    viewer.useDefaultRenderLoop = false;
    map.invalidateSize();

    return;
  }

  if (mapEl) mapEl.classList.remove("active");
  if (cesiumEl) cesiumEl.classList.add("active");

  viewer.scene.screenSpaceCameraController.enableInputs = true;
  viewer.useDefaultRenderLoop = true;
  viewer.resize();
  viewer.scene.requestRender();
}

if (cesiumEl) cesiumEl.classList.add("active");

viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(
      11.5755,
      48.1374,
      SWITCH_CAMERA_HEIGHT
    ),
});
// Hide Credits
viewer.cesiumWidget.creditContainer.style.display = "none";
// Disable Rotation
const cameraController =
  viewer.scene.screenSpaceCameraController;

cameraController.enableTilt = false;
cameraController.inertiaSpin = 0;
cameraController.inertiaTranslate = 0;
cameraController.inertiaZoom = 0;
// Get latitude and longitude
const camera = viewer.camera;

const cartographic = Cesium.Cartographic.fromCartesian(
    camera.position
);

const longitude = Cesium.Math.toDegrees(cartographic.longitude);
const latitude  = Cesium.Math.toDegrees(cartographic.latitude);
const height    = cartographic.height;

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
let cesiumMoveStartHeight = null;
let cesiumSwitchFrame = null;

function getCesiumCameraState() {

  const cartographic = Cesium.Cartographic.fromCartesian(
    viewer.camera.positionWC,
    Cesium.Ellipsoid.WGS84
  );

  return {
    height: cartographic.height,
    lat: Cesium.Math.toDegrees(cartographic.latitude),
    lng: Cesium.Math.toDegrees(cartographic.longitude),
  };
}

function switchCesiumToLeaflet(cameraState) {

  syncing = true;

  map.setView(
    [cameraState.lat, cameraState.lng],
    SWITCH_LEAFLET_ZOOM,
    { animate: false }
  );

  viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(
      cameraState.lng,
      cameraState.lat,
      SWITCH_CAMERA_HEIGHT
    ),
  });

  setMapMode("2d");

  cesiumMoveStartHeight = null;
  syncing = false;
}

function checkCesiumToLeafletSwitch() {

  cesiumSwitchFrame = null;

  if (syncing || activeMapMode !== "3d") return;

  const cameraState =
    getCesiumCameraState();

  if (cesiumMoveStartHeight === null) {
    cesiumMoveStartHeight =
      cameraState.height;
  }

  const zoomedIn =
    cesiumMoveStartHeight -
      cameraState.height >
    CESIUM_ZOOM_HEIGHT_EPSILON;

  if (
    zoomedIn &&
    cameraState.height <=
      SWITCH_CAMERA_HEIGHT
  ) {
    switchCesiumToLeaflet(cameraState);
  }
}

// --- Cesium → Leaflet sync ---
viewer.camera.moveStart.addEventListener(() => {

  if (syncing || activeMapMode !== "3d") return;

  cesiumMoveStartHeight =
    getCesiumCameraState().height;
});

viewer.camera.changed.addEventListener(() => {

  if (syncing || activeMapMode !== "3d") return;
  if (cesiumSwitchFrame !== null) return;

  cesiumSwitchFrame =
    requestAnimationFrame(
      checkCesiumToLeafletSwitch
    );
});

viewer.camera.moveEnd.addEventListener(() => {
  cesiumMoveStartHeight = null;
});


// --- Leaflet → Cesium sync ---
map.on("zoomend", () => {
  if (syncing) return;

  const zoom = map.getZoom();
  const center = map.getCenter();

  // Switch to Cesium if zoomed out
  if (zoom >= SWITCH_LEAFLET_ZOOM) return;

  syncing = true;

  viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(
      center.lng,
      center.lat,
      SWITCH_CAMERA_HEIGHT
    ),
  });

  map.setView(
    [center.lat, center.lng],
    SWITCH_LEAFLET_ZOOM,
    { animate: false }
  );

  setMapMode("3d");

  syncing = false;
});
