// script.js

// Karte erstellen
const map = L.map("map").setView([20, 0], 2);

// OpenStreetMap Layer
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap"
}).addTo(map);

// Länder GeoJSON laden
fetch("https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json")
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

        layer.on("mouseover", () => {
          layer.setStyle({
            fillOpacity: 0.7
          });
        });

        layer.on("mouseout", () => {
          layer.setStyle({
            fillOpacity: 0.4
          });
        });

        layer.on("click", async () => {

          const countryName = feature.properties.name;

          document.getElementById("info").innerHTML =
            `<h2>${countryName}</h2>
             <p>Lade Informationen...</p>`;

          try {

            // Länderinfos
            const countryRes = await fetch(
              `https://restcountries.com/v3.1/name/${countryName}`
            );

            const countryData = await countryRes.json();
            const country = countryData[0];

            // Hauptstadt
            const capital = country.capital
              ? country.capital[0]
              : "Unbekannt";

            // Wetter API
            let weatherText = "Keine Wetterdaten";

            try {

              // Geocoding
              const geoRes = await fetch(
                `https://geocoding-api.open-meteo.com/v1/search?name=${capital}`
              );

              const geoData = await geoRes.json();

              if (geoData.results) {

                const lat = geoData.results[0].latitude;
                const lon = geoData.results[0].longitude;

                // Wetter laden
                const weatherRes = await fetch(
                  `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`
                );

                const weatherData = await weatherRes.json();

                weatherText =
                  `${weatherData.current_weather.temperature}°C`;
              }

            } catch (err) {
              console.log("Wetter Fehler", err);
            }

            document.getElementById("info").innerHTML = `
              <h2>${country.name.common}</h2>

              <img src="${country.flags.png}">

              <p><strong>Hauptstadt:</strong> ${capital}</p>

              <p><strong>Region:</strong> ${country.region}</p>

              <p><strong>Einwohner:</strong>
              ${country.population.toLocaleString()}</p>

              <p><strong>Währung:</strong>
              ${Object.values(country.currencies || {})[0]?.name || "?"}</p>

              <p><strong>Wetter:</strong> ${weatherText}</p>
            `;

          } catch (err) {

            document.getElementById("info").innerHTML =
              `<h2>${countryName}</h2>
               <p>Fehler beim Laden.</p>`;

            console.log(err);
          }
        });
      }
    }).addTo(map);
  });