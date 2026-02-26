const weatherState = {
  city: "San Francisco",
  condition: "Partly Cloudy",
  temp: 21,
  high: 24,
  low: 17,
  wind: "12 km/h",
  humidity: "66%",
  timeline: [
    { slot: "Morning", icon: "🌤️", temp: 18 },
    { slot: "Noon", icon: "☀️", temp: 23 },
    { slot: "Evening", icon: "🌥️", temp: 20 },
    { slot: "Tonight", icon: "🌙", temp: 16 }
  ]
};

function renderWeather(state) {
  document.getElementById("city-name").textContent = state.city;
  document.getElementById("condition").textContent = state.condition;
  document.getElementById("temperature").textContent = `${state.temp}°`;
  document.getElementById("high-low").textContent = `H: ${state.high}° • L: ${state.low}°`;
  document.getElementById("wind").textContent = state.wind;
  document.getElementById("humidity").textContent = state.humidity;

  const now = new Date();
  document.getElementById("current-date").textContent = now.toLocaleString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric"
  });

  const track = document.getElementById("timeline-track");
  track.innerHTML = "";

  state.timeline.forEach((entry) => {
    const card = document.createElement("article");
    card.className = "time-slot";
    card.innerHTML = `
      <span class="label">${entry.slot}</span>
      <span class="icon" aria-hidden="true">${entry.icon}</span>
      <span class="temp">${entry.temp}°</span>
    `;
    track.appendChild(card);
  });
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {
      // noop: app should still work even if SW registration fails.
    });
  });
}

renderWeather(weatherState);
