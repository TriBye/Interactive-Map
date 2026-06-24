// script.js 

// STRUCTURE
//1. Cesium Map
//2. Databases
//  2.1 OpenStreetMap Nominatim API for geocoding
//  2.2 Open-Meteo API for weather data
//  2.3 World Bank API for country income level
//  2.4 Wikimedia REST API for country flag and info
//3. Search functionality
//4. Favorite locations functionality


//Cesium Map
// documentation: https://cesium.com/learn/cesiumjs-learn/cesiumjs-quickstart/

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

// start FLYTO (Munich)
viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(11.5755, 48.1374, 20000000), //Munich
});

// Hide Credits
viewer.cesiumWidget.creditContainer.style.display = "none";

// Disable Rotation
viewer.scene.screenSpaceCameraController.enableTilt = false;

// Get latitude and longitude
const camera = viewer.camera; 


// Database for OSM data with coordinates --> lan, lon (Public API, without API key, but with usage limits)
// Documentation: https://nominatim.org/release-docs/latest/api/Search/

// Automatic Search
searchLocation("Germany")

// main function
function searchLocation(query) {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
    let searchedlat, searchedlon;
    let height;

    // Fetch from Nominatim
    fetch(url)
        .then((response) => response.json())
        .then((data) => {

            // DEBUG
            console.log(data);

            if (data.length > 0) {

                // Variables for flyTo function
                let searchedlat = parseFloat(data[0].lat);
                let searchedlon = parseFloat(data[0].lon);
                let searchedplacerank = data[0].place_rank;

                // other variables for display
                let searchedtype = data[0].addresstype;
                let searchedcategory = data[0].type;
                let searchedname = data[0].name;
                let searchedaddress = data[0].display_name;

                // DEBUG
                console.log(`Coordinates for ${query}: Latitude: ${searchedlat}, Longitude: ${searchedlon}`);
                
                // Quantitized height through place rank (Bucketmapping)
                if (searchedplacerank >= 2 && searchedplacerank <= 4) {
                    height = 5000000; // FOR COUNTRIES
                } else if (searchedplacerank > 4 && searchedplacerank <= 8) {
                    height = 1000000; // FOR STATE/PROVINCE
                } else if (searchedplacerank > 8 && searchedplacerank <= 12) {
                    height = 50000; // FOR CITIES, VILLAGES
                } else if (searchedplacerank > 12 && searchedplacerank <= 16) {
                    height = 10000; // FOR TOWNS
                } else if (searchedplacerank > 16 && searchedplacerank <= 18) {
                    height = 8000; 
                } else if (searchedplacerank > 18 && searchedplacerank <= 20) {
                    height = 5000; 
                } else if (searchedplacerank > 20 && searchedplacerank <= 24) {
                    height = 4000; 
                } else if (searchedplacerank > 24 && searchedplacerank <= 26) {
                    height = 3000; 
                } else if (searchedplacerank > 26 && searchedplacerank <= 28) {
                    height = 1000; 
                } else if (searchedplacerank > 28 && searchedplacerank <= 30) {
                    height = 800; // FOR STREETS, BUILDINGS
                } else {
                    height = 10000000; // Default height if outside range
                }

                //display geoinfos
                document.getElementById("geoinfos").innerHTML = `
                    <h1>${searchedname}</h1>
                    <p>${searchedaddress}</p>
                    <p>Type: ${searchedtype}, ${searchedcategory}</p>
                `;

                // DEBUG
                console.log(`Place rank: ${searchedplacerank}, Calculated height: ${height}`);                
                
                // FLYTO
                viewer.camera.flyTo({
                    destination: Cesium.Cartesian3.fromDegrees(searchedlon, searchedlat, height),
                    duration: 3,
                });

                let roundedlat = searchedlat.toFixed(2);
                let roundedlon = searchedlon.toFixed(2);

                // Other INFOS
                fetchWeatherData(roundedlat, roundedlon);
                if (searchedtype == "country") {
                    fetchCountryCode(roundedlat, roundedlon);
                    fetchCountryInfoWIKI(searchedname);
                }
            }
            else {
                alert("No results found unfortunately :(  Please try again");
            }
        })
        .catch((error) => {
            console.error("Oops, API has an error :(  ", error);
        });
}

// Weather API for weather for locations of interest and capital cities of countries
// Documentation: https://open-meteo.com/en/docs

function fetchWeatherData(latitude, longitude) {

  // DEBUG  
  console.log(`Fetching weather data for Latitude: ${latitude}, Longitude: ${longitude}`);

  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=is_day,rain,temperature_2m`;
  fetch(weatherUrl)
    .then((response) => response.json())
    .then((data) => {

      // DEBUG  
      console.log("Weather data received:", data);

      // Process the weather data, works
      const elevation = data.elevation;
      const currenttemperature = data.current.temperature_2m;
      const isDay = data.current.is_day;
      const isRaining = data.current.rain > 0;
      const temperatureunit = data.current_units.temperature_2m;

      // Display weatherinfo
      document.getElementById("weatherinfos").innerHTML = `
        <h1 id="temp">${currenttemperature} ${temperatureunit}</h1>
        <p>Elevation: ${elevation} m</p>
        <p>${isDay ? "Daytime" : "Nighttime"}</p>
        <p>${isRaining ? "Raining" : "Not raining"}</p>
      `;

      // DEBUG
      console.log("Current temperature:", currenttemperature, temperatureunit);
      console.log("Elevation:", elevation);
      console.log("Is day:", isDay);
      console.log("Is raining:", isRaining);

    })
    .catch((error) => {
      console.error("Error fetching weather data :( ", error);
    });
}

// Get Country Code
// Documentation: https://nominatim.org/release-docs/latest/api/Reverse/

function fetchCountryCode(latitude, longitude) {
    const countrycodeUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&addressdetails=1`;
    fetch(countrycodeUrl)
    .then((response) => response.json())
    .then((data) => {
      const countrycode = data.address.country_code;
      const uppercaseCountryCode = countrycode.toUpperCase();

      // DEBUG
      console.log("Country code received:", data);
      console.log("Extracted country code:", uppercaseCountryCode);
      
      fetchCountryInfoWB(uppercaseCountryCode);
    })
    .catch((error) => {
      console.error("Error fetching country code:", error);
    });
}

// Fetch infos regarding Income Level
// Documentation: https://datahelpdesk.worldbank.org/knowledgebase/articles/1886674-new-features-and-enhancements-in-the-v2-api

function fetchCountryInfoWB(countrycode) {
    const countryInfoUrlWB = `https://api.worldbank.org/v2/country/${countrycode}?format=json`;
    fetch(countryInfoUrlWB)
    .then((response) => response.json())
    .then((data) => {

        // DEBUG
        console.log("Country info received:", data);  

        // income level
        const incomeLevel = data[1][0].incomeLevel.value;

        // DEBUG
        console.log("Income level:", incomeLevel);

        document.getElementById("countryinfos").innerHTML = `
            <p>${incomeLevel} country</p>
        `;
    })
    .catch((error) => {
      console.error("Error fetching country info:", error);
    });
}

// fetch for country flag and infos
// Documentation: https://www.mediawiki.org/wiki/Wikimedia_REST_API

function fetchCountryInfoWIKI(country) {
    const countryInfoUrlWIKI = `https://en.wikipedia.org/api/rest_v1/page/summary/${country}`;
    fetch(countryInfoUrlWIKI)
    .then((response) => response.json())
    .then((data) => {
        
        // DEBUG
        console.log("Country info received:", data);

        // Infos
        const flagsource = data.thumbnail.source;

        // DEBUG
        console.log("Flag source:", flagsource);

        document.getElementById("countryflag").src = flagsource;
    })
    .catch((error) => {
        console.error("Error fetching country info:", error);
    });
}

// Search bar functionality
// searchbar + searchdatabase functions

const searchBar = document.getElementById("search-bar");

searchBar.addEventListener("keydown", function (event) {
  if (event.key === "Enter") {
    const query = searchBar.value;

    // DEBUG
    console.log("Query:", query);

    // Remove Infos
    document.getElementById("geoinfos").innerHTML = "";
    document.getElementById("weatherinfos").innerHTML = "";
    document.getElementById("countryinfos").innerHTML = "";
    document.getElementById("countryflag").src = "";

    searchDatabase(query);
  }
});

function searchDatabase(text) {
  searchLocation(text);

  // DEBUG
  console.log("Searching for:", text);
}