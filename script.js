// script.js

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