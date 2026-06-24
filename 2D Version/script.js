
const ZOOM_SNAP = 0.25;
const MIN_ZOOM = 3.25;
const START_ZOOM = MIN_ZOOM;
const WORLD_BOUNDS = L.latLngBounds(
  [-85.05112878, -180],
  [85.05112878, 180]
);

// Initialize Map
const map = L.map("map", {
  center: [20, 0],
  zoom: START_ZOOM,
  minZoom: MIN_ZOOM,
  maxBounds: WORLD_BOUNDS,
  maxBoundsViscosity: 1.0,
  zoomSnap: ZOOM_SNAP,
  zoomDelta: 0.5
});

function keepMapInsideWorldBounds() {
  map.panInsideBounds(WORLD_BOUNDS, { animate: false });
}

function refreshMapLayout() {
  map.invalidateSize({ animate: false });
  keepMapInsideWorldBounds();
}

map.on("drag moveend zoomend", keepMapInsideWorldBounds);

const mapContainer = document.getElementById("mapcontainer");
let resizeFrame = null;

function scheduleMapLayoutRefresh() {
  if (resizeFrame) {
    window.cancelAnimationFrame(resizeFrame);
  }

  resizeFrame = window.requestAnimationFrame(() => {
    resizeFrame = null;
    refreshMapLayout();
  });
}

if (window.ResizeObserver && mapContainer) {
  const mapResizeObserver = new ResizeObserver(scheduleMapLayoutRefresh);

  mapResizeObserver.observe(mapContainer);
} else {
  window.addEventListener("resize", scheduleMapLayoutRefresh);
}
 
// Load Tiles with L.tileLayer
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  noWrap: true,
  bounds: WORLD_BOUNDS
}).addTo(map);
 
// Load Favorites from localStorage
let favorites = JSON.parse(localStorage.getItem("favorites")) || [];
 
// Save Favorites to localStorage
function saveFavorites() {
  localStorage.setItem("favorites", JSON.stringify(favorites));
}
 
// Display Favorites
function renderFavorites() {
  const favoritesList = document.getElementById("favorites-list");
  
  if (!favoritesList) {
    console.warn("Element 'favorites-list' not found");
    return;
  }
 
  favoritesList.innerHTML = "";
 
  favorites.forEach(country => {
    const li = document.createElement("li");
 
    li.innerHTML = `
      <span>${country}</span>
      <button class="remove-btn">❌</button>
    `;
 
    li.querySelector(".remove-btn").addEventListener("click", () => {
      favorites = favorites.filter(c => c !== country);
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
 
// Update favorite button state
function updateFavoriteButton(countryName) {
  const favoriteBtn = document.getElementById("favorite-btn");
  
  if (!favoriteBtn) return;
 
  if (favorites.includes(countryName)) {
    favoriteBtn.classList.add("saved");
    favoriteBtn.innerText = "✅ Favored";
  } else {
    favoriteBtn.classList.remove("saved");
    favoriteBtn.innerText = "⭐ Add to Favorites";
  }
}
 
// Initial Display of Favorites
renderFavorites();
 
// Load GeoJSON
fetch("https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json")
  .then(res => {
    if (!res.ok) throw new Error("Failed to load GeoJSON");
    return res.json();
  })
  .then(data => {
    L.geoJSON(data, {
      style: {
        color: "#2563eb",
        weight: 1,
        fillColor: "#60a5fa",
        fillOpacity: 0.4
      },
 
      onEachFeature: (feature, layer) => {
        // Hover effect
        layer.on("mouseover", () => {
          layer.setStyle({ fillOpacity: 0.7 });
        });
 
        layer.on("mouseout", () => {
          layer.setStyle({ fillOpacity: 0.4 });
        });
 
        // Click handler
        layer.on("click", async () => {
          try {
            const countryName = feature.properties.name;
 
            // Fetch country info
            const countryRes = await fetch(
              `https://studies.cs.helsinki.fi/restcountries/api/name/${encodeURIComponent(countryName)}`
            );

            if (!countryRes.ok) throw new Error("Country not found");

            const country = await countryRes.json();
 
            const capital = country.capital ? country.capital[0] : "Unknown";
            let weatherText = "No Weather Data";
 
            // Fetch weather data
            if (capital !== "Unknown") {
              try {
                const geoRes = await fetch(
                  `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(capital)}`
                );
 
                const geoData = await geoRes.json();
 
                if (geoData.results && geoData.results.length > 0) {
                  const lat = geoData.results[0].latitude;
                  const lon = geoData.results[0].longitude;
 
                  const weatherRes = await fetch(
                    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`
                  );
 
                  const weatherData = await weatherRes.json();
 
                  if (weatherData.current_weather) {
                    weatherText = `${weatherData.current_weather.temperature}°C`;
                  }
                }
              } catch (weatherError) {
                console.warn("Weather data unavailable:", weatherError);
              }
            }
 
            // Display country information
            const infoDiv = document.getElementById("info");
            if (!infoDiv) {
              console.warn("Element 'info' not found");
              return;
            }
 
            infoDiv.innerHTML = `
              <h2>${country.name.common}</h2>
              <img src="${country.flags.png}" alt="${country.name.common} flag">
              <p><strong>Capital:</strong> ${capital}</p>
              <p><strong>Region:</strong> ${country.region}</p>
              <p><strong>Population:</strong> ${country.population.toLocaleString()}</p>
              <p><strong>Currency:</strong> ${Object.values(country.currencies || {})[0]?.name || "?"}</p>
              <p><strong>Weather:</strong> ${weatherText}</p>
              <button id="favorite-btn">⭐ Add to Favorites</button>
            `;
 
            // Update favorite button state
            updateFavoriteButton(country.name.common);
 
            // Add single event listener (only once)
            const favoriteBtn = document.getElementById("favorite-btn");
            if (favoriteBtn) {
              favoriteBtn.addEventListener("click", () => {
                addFavorite(country.name.common);
                updateFavoriteButton(country.name.common);
              });
            }
 
          } catch (error) {
            console.error("Error fetching country data:", error);
            const infoDiv = document.getElementById("info");
            if (infoDiv) {
              infoDiv.innerHTML = `<p>Error loading country information. Please try again.</p>`;
            }
          }
        });
      }
    }).addTo(map);
  })
  .catch(error => {
    console.error("Error loading GeoJSON:", error);
  });
