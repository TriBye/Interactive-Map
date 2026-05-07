// script.js

// MAP
const map = L.map("map").setView([20, 0], 2);

// OpenStreetMap
L.tileLayer(
  "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  {
    attribution: "&copy; OpenStreetMap"
  }
).addTo(map);

// Load Favorites
let favorites =
  JSON.parse(localStorage.getItem("favorites")) || [];

// Save Favorites
function saveFavorites() {

  localStorage.setItem(
    "favorites",
    JSON.stringify(favorites)
  );
}

// Show Favorites
function renderFavorites() {

  const favoritesList =
    document.getElementById("favorites-list");

  favoritesList.innerHTML = "";

  favorites.forEach(country => {

    const li = document.createElement("li");

    li.innerHTML = `
      <span>${country}</span>

      <button class="remove-btn">
        ❌
      </button>
    `;

    // Remove Favorites
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

// Erste Anzeige
renderFavorites();

// GeoJSON Länder laden
fetch(
  "https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json"
)
  .then(res => res.json())
  .then(data => {

    L.geoJSON(data, {

      style: {
        color: "#2563eb",
        weight: 1,
        fillColor: "#60a5fa",
        fillOpacity: 0.4
      },

      onEachFeature: (feature, layer) => {

        // Hover
        layer.on("mouseover", () => {

          layer.setStyle({
            fillOpacity: 0.7
          });
        });

        // Hover verlassen
        layer.on("mouseout", () => {

          layer.setStyle({
            fillOpacity: 0.4
          });
        });

        // Klick auf Land
        layer.on("click", async () => {

          const countryName =
            feature.properties.name;

          // Ladeanzeige
          document.getElementById("info").innerHTML = `
            <h2>${countryName}</h2>

            <p>Load informations...</p>
          `;

          // Länderinfos laden
          const countryRes = await fetch(
            `https://restcountries.com/v3.1/name/${countryName}`
          );

          const countryData =
            await countryRes.json();

          const country = countryData[0];

          // Hauptstadt
          const capital =
            country.capital
              ? country.capital[0]
              : "Unknown";

          // Wetter
          let weatherText =
            "No Weatherdata";

          // Geocoding
          const geoRes = await fetch(
            `https://geocoding-api.open-meteo.com/v1/search?name=${capital}`
          );

          const geoData =
            await geoRes.json();

          if (geoData.results) {

            const lat =
              geoData.results[0].latitude;

            const lon =
              geoData.results[0].longitude;

            // Wetter API
            const weatherRes = await fetch(
              `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`
            );

            const weatherData =
              await weatherRes.json();

            weatherText =
              `${weatherData.current_weather.temperature}°C`;
          }

          // Länderinfos anzeigen
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