// =====================
// OOP: Sensor classes (Encapsulation + Inheritance)
class Sensor {
  #name; #value; // private properties
  constructor(name, value, desc = "", city = "", lat = null, lon = null) {
    this.#name = name;
    this.#value = value;
    this.description = desc;
    this.city = city;
    this.lat = lat;
    this.lon = lon;
  }
  getName() { return this.#name; }
  getValue() { return this.#value; }
  setValue(v) { this.#value = v; }
  toJSON() { // custom serialize for storage
    return {
      name: this.getName(),
      value: this.getValue(),
      description: this.description,
      city: this.city,
      lat: this.lat,
      lon: this.lon
    };
  }
  display() { return `${this.getName()}: ${this.getValue()}`; }
}

// TemperatureSensor inherits Sensor — demonstrates Inheritance
class TemperatureSensor extends Sensor {
  constructor(name, value, desc = "", city = "", lat = null, lon = null, unit = "°C") {
    super(name, value, desc, city, lat, lon);
    this.unit = unit;
  }
  display() { return `${this.getName()}: ${this.getValue()} ${this.unit}`; }
  toJSON() {
    const base = super.toJSON();
    base.unit = this.unit;
    base.type = "temperature";
    return base;
  }
}

// =====================
// Storage helpers (localStorage)
const STORAGE_KEY = "eco_sensors_v1";

function readRawSensors() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
}

// Reconstruct objects: convert stored plain objects back to Sensor/TemperatureSensor instances
function getAllSensors() {
  const raw = readRawSensors();
  return raw.map(obj => {
    if (obj.type === "temperature" || (obj.name && obj.name.toLowerCase().includes("temp"))) {
      return new TemperatureSensor(obj.name, obj.value, obj.description || "", obj.city || "", obj.lat || null, obj.lon || null, obj.unit || "°C");
    } else {
      return new Sensor(obj.name, obj.value, obj.description || "", obj.city || "", obj.lat || null, obj.lon || null);
    }
  });
}

function saveAllSensors(instances) {
  const plain = instances.map(s => s.toJSON());
  localStorage.setItem(STORAGE_KEY, JSON.stringify(plain));
}

// =====================
// Manage Sensors UI (Add / Update / Delete)
// Elements
const dataList = document.getElementById("dataList");
const cityInputField = document.getElementById("cityInput");
// Checkboxes
const checkboxes = {
  "Air Quality": document.getElementById("cbAir"),
  "Water Quality": document.getElementById("cbWater"),
  "Soil Quality": document.getElementById("cbSoil"),
  "Ecosystem Health": document.getElementById("cbEco")
};
let currentWeatherData = null;
let currentCity = null;

// Utility: generate a demo random value
function randomValueForDemo() {
  return +(Math.random() * 100).toFixed(1); // 0.0 - 100.0
}

// Render Manage Sensors (all sensors)
function renderManageList() {
  const sensors = getAllSensors();
  dataList.innerHTML = "";
  sensors.forEach((s, idx) => {
    const li = document.createElement("li");
    const left = document.createElement("div");
    left.innerHTML = `<strong>${s.getName()}</strong><br><small>${s.description || ""}</small><br><small>City: ${s.city || "-"}</small>`;
    const right = document.createElement("div");
    right.style.display = "flex";
    right.style.gap = "8px";
    right.style.alignItems = "center";

    const val = document.createElement("span");
    val.textContent = s.getValue();
    right.appendChild(val);

    // edit button removed (form replaced by checkboxes)

    // delete button
    const delBtn = document.createElement("button");
    delBtn.textContent = "Delete";
    delBtn.addEventListener("click", () => {
      sensors.splice(idx, 1);
      saveAllSensors(sensors);
      renderManageList();
      // if current city view matches, refresh city rendering
      if (currentCity) renderCityView(currentCity);
    });
    right.appendChild(delBtn);

    li.appendChild(left);
    li.appendChild(right);
    dataList.appendChild(li);
  });
}

// Handle add/update form submit
// Handle Checkbox Changes
async function toggleSensor(type, isChecked) {
  if (!currentCity) {
    alert("Please search for a city first.");
    // Reset checkbox if no city
    Object.values(checkboxes).forEach(cb => { if (cb.value === type) cb.checked = !isChecked; });
    return;
  }

  const allSensors = getAllSensors();
  const sensorName = `${currentCity} ${type}`;
  const existingIdx = allSensors.findIndex(s => s.getName() === sensorName);

  if (isChecked) {
    if (existingIdx === -1) {
      // Need weather data
      if (!currentWeatherData) {
        currentWeatherData = await fetchWeatherForCity(currentCity);
      }
      if (!currentWeatherData) return;

      let value = 0;
      let unit = "";
      let desc = "";

      // Generate Mock Data for Environmental Stats
      if (type === "Air Quality") {
        value = Math.floor(Math.random() * 150) + 20; // 20-170 AQI
        unit = "AQI";
        desc = "PM2.5 Index";
      }
      else if (type === "Water Quality") {
        value = (Math.random() * 3 + 6).toFixed(1); // 6.0 - 9.0 pH
        unit = "pH";
        desc = "Acidity Level";
      }
      else if (type === "Soil Quality") {
        value = Math.floor(Math.random() * 100);
        unit = "%";
        desc = "Moisture Level";
      }
      else if (type === "Ecosystem Health") {
        value = Math.floor(Math.random() * 100);
        unit = "Index";
        desc = "Biodiversity Score";
      }

      const newSensor = new TemperatureSensor(sensorName, value, desc, currentCity, currentWeatherData.coord.lat, currentWeatherData.coord.lon, unit);
      allSensors.push(newSensor);
    }
  } else {
    if (existingIdx !== -1) {
      allSensors.splice(existingIdx, 1);
    }
  }
  saveAllSensors(allSensors);
  renderManageList();

  // Refresh view to update chart/map
  const filtered = allSensors.filter(s => s.city && s.city.toLowerCase() === currentCity.toLowerCase());
  updateChartForSensors(filtered);
  updateMapForSensors(filtered, currentWeatherData?.coord?.lat, currentWeatherData?.coord?.lon);
}

Object.values(checkboxes).forEach(cb => {
  cb.addEventListener('change', (e) => {
    toggleSensor(e.target.value, e.target.checked);
  });
});

// initialize manage list
renderManageList();

// =====================
// Chart.js setup (shows sensors for the current city only)
const ctx = document.getElementById('envChart').getContext('2d');
const envChart = new Chart(ctx, {
  type: 'bar',
  data: { labels: [], datasets: [{ label: 'Sensor Values', data: [], backgroundColor: [] }] },
  options: { responsive: true, maintainAspectRatio: false }
});

function updateChartForSensors(sensorArray) {
  envChart.data.labels = sensorArray.map(s => s.getName());
  envChart.data.datasets[0].data = sensorArray.map(s => s.getValue());
  envChart.data.datasets[0].backgroundColor = sensorArray.map(() => '#2e8b57');
  envChart.update();
}

// =====================
// Leaflet Map setup
const map = L.map('map').setView([8.2280, 125.2433], 5);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);
let cityMarkersLayer = L.layerGroup().addTo(map);

// Show only sensors for selected city on the map
function updateMapForSensors(sensorArray, focusLat = null, focusLon = null) {
  cityMarkersLayer.clearLayers();
  if (!sensorArray || sensorArray.length === 0) {
    if (focusLat && focusLon) map.setView([focusLat, focusLon], 8);
    return;
  }

  sensorArray.forEach(s => {
    const lat = s.lat ?? focusLat;
    const lon = s.lon ?? focusLon;
    if (lat != null && lon != null) {
      const m = L.marker([lat, lon]).addTo(cityMarkersLayer);
      m.bindPopup(`<strong>${s.getName()}</strong><br>${s.description || ""}<br>Value: ${s.getValue()}`);
    }
  });

  // center map on first sensor or provided focus coords
  const center = (sensorArray[0].lat && sensorArray[0].lon) ? [sensorArray[0].lat, sensorArray[0].lon] : (focusLat && focusLon ? [focusLat, focusLon] : null);
  if (center) map.setView(center, 10);
}

// Weather Circle Layer
let weatherCircle = null;

function updateMapWeatherCircle(lat, lon, color) {
  if (weatherCircle) {
    map.removeLayer(weatherCircle);
  }
  if (lat && lon && color) {
    weatherCircle = L.circle([lat, lon], {
      color: color,
      fillColor: color,
      fillOpacity: 0.3,
      radius: 5000 // 5km radius
    }).addTo(map);
  }
}

// =====================
// Weather integration: search city and render city view
const OPENWEATHER_KEY = "96bc625a9a03c36253c2ea64cba0f9e3"; // <<< REPLACE THIS

async function fetchWeatherForCity(city) {
  try {
    const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${OPENWEATHER_KEY}&units=metric`);
    if (!res.ok) return null;
    const data = await res.json();
    return data;
  } catch (e) { console.error(e); return null; }
}

// Resolve coords helper (returns {lat,lon} or null)
async function resolveCityCoords(city) {
  const data = await fetchWeatherForCity(city);
  if (data && data.coord) return { lat: data.coord.lat, lon: data.coord.lon, raw: data };
  return null;
}


async function renderCityView(city) {
  currentCity = city;
  const data = await fetchWeatherForCity(city);
  currentWeatherData = data;

  const resultDiv = document.getElementById("weatherResult");
  const analyticsDiv = document.getElementById("weatherAnalytics");

  if (!data) {
    if (resultDiv) resultDiv.innerHTML = `<p style="color:red;">Could not fetch weather for "${city}".</p>`;
    if (analyticsDiv) analyticsDiv.style.display = "none";
    updateMapWeatherCircle(null, null, null);
    return;
  }

  // Display basic weather info
  const { main, weather, wind } = data;
  const temp = main.temp;
  const desc = weather[0].description;
  const icon = `https://openweathermap.org/img/wn/${weather[0].icon}.png`;

  if (resultDiv) {
    resultDiv.innerHTML = `
      <div style="display:flex; align-items:center; justify-content:space-between;">
        <div>
          <h4>${data.name}, ${data.sys.country}</h4>
          <p style="font-size:1.2em; font-weight:bold;">${temp}°C</p>
          <p style="text-transform:capitalize;">${desc}</p>
        </div>
        <img src="${icon}" alt="${desc}" title="${desc}" />
      </div>
      <div style="margin-top:10px; font-size:0.9em; color:#555;">
        <span>Humidity: ${main.humidity}%</span> | <span>Wind: ${wind.speed} m/s</span>
      </div>
    `;
  }

  // Analytics: Good or Bad
  let status = "Moderate";
  let color = "orange";
  let bgColor = "#fff3cd";
  let textColor = "#856404";

  const isRain = weather[0].main.toLowerCase().includes("rain") || weather[0].main.toLowerCase().includes("thunder");

  if (temp >= 18 && temp <= 32 && !isRain && wind.speed < 10) {
    status = "Good Condition";
    color = "green";
    bgColor = "#d4edda";
    textColor = "#155724";
  } else if (temp > 35 || temp < 5 || isRain || wind.speed > 15) {
    status = "Bad Condition";
    color = "red";
    bgColor = "#f8d7da";
    textColor = "#721c24";
  }

  if (analyticsDiv) {
    analyticsDiv.style.display = "block";
    analyticsDiv.style.backgroundColor = bgColor;
    analyticsDiv.style.color = textColor;
    analyticsDiv.innerHTML = `<strong>Weather Analysis:</strong> ${status}`;
  }

  // Update Map Circle
  if (data.coord) {
    updateMapWeatherCircle(data.coord.lat, data.coord.lon, color);

    // Sync Sensors
    const allSensors = getAllSensors();
    const citySensors = allSensors.filter(s => s.city && s.city.toLowerCase() === city.toLowerCase());

    updateChartForSensors(citySensors);
    updateMapForSensors(citySensors, data.coord.lat, data.coord.lon);

    // Sync Checkboxes
    Object.values(checkboxes).forEach(cb => cb.checked = false);
    citySensors.forEach(s => {
      if (s.getName().indexOf("Air Quality") !== -1) checkboxes["Air Quality"].checked = true;
      if (s.getName().indexOf("Water Quality") !== -1) checkboxes["Water Quality"].checked = true;
      if (s.getName().indexOf("Soil Quality") !== -1) checkboxes["Soil Quality"].checked = true;
      if (s.getName().indexOf("Ecosystem Health") !== -1) checkboxes["Ecosystem Health"].checked = true;
    });
  }
}

// Hook search button
document.getElementById("fetchWeather").addEventListener("click", async () => {
  const city = document.getElementById("cityInput").value.trim();
  if (!city) {
    alert("Enter a city to search");
    return;
  }
  await renderCityView(city);
});


// Initialize: set empty array if nothing
if (!localStorage.getItem(STORAGE_KEY)) localStorage.setItem(STORAGE_KEY, "[]");

// Final initial render of manage list
renderManageList();

// =====================
// Theme Toggle Logic
const themeToggleBtn = document.getElementById("themeToggle");
const body = document.body;
const THEME_KEY = "ecolive_theme";

// Load saved theme
const savedTheme = localStorage.getItem(THEME_KEY);
if (savedTheme === "dark") {
  body.classList.add("dark-mode");
  if (themeToggleBtn) themeToggleBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
}

// Toggle theme on click
if (themeToggleBtn) {
  themeToggleBtn.addEventListener("click", () => {
    body.classList.toggle("dark-mode");
    const isDark = body.classList.contains("dark-mode");

    // Update icon
    themeToggleBtn.innerHTML = isDark ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';

    // Save preference
    localStorage.setItem(THEME_KEY, isDark ? "dark" : "light");

    // Update Chart.js colors if needed (optional, but good for visibility)
    if (window.envChart) {
      const newColor = isDark ? '#4ade80' : '#2e8b57'; // Lighter green for dark mode
      envChart.data.datasets[0].backgroundColor = envChart.data.datasets[0].data.map(() => newColor);
      envChart.update();
    }
  });
}
