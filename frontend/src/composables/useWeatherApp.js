import { computed, onMounted, ref } from "vue";

export function useWeatherApp() {
  const cityInput = ref("Kuala Lumpur");
  const weather = ref(null);
  const dailyForecast = ref([]);
  const selectedDayIndex = ref(0);
  const loading = ref(false);
  const error = ref(null);
  const cities = ref(["Kuala Lumpur", "George Town", "Johor Bahru"]);
  const showPlacesModal = ref(false);
  const placesBtnRef = ref(null);
  const modalOrigin = ref({ x: "50%", y: "50%" });
  const hourlyForecast = ref([]);  // flat array of parsed hour objects
  const hourlyHourPage = ref(0);   // which page of 4 hours within the day
  const CARDS_PER_PAGE = 4;

  const cityCards = computed(() => cities.value.slice(0, 3));
  const selectedDay = computed(() => dailyForecast.value[selectedDayIndex.value] ?? null);

  const cityBackgrounds = {
    "Kuala Lumpur": "/city-backgrounds/kuala-lumpur-klcc.jpg",
    "George Town": "/city-backgrounds/george-town.jpg",
    "Johor Bahru": "/city-backgrounds/johor-bahru.jpg",
  };

  function hasCityPhoto(city) {
    return Boolean(cityBackgrounds[city]);
  }

  function cityArtStyle(city) {
    const imageUrl = cityBackgrounds[city];
    if (!imageUrl) return {};
    return { "--city-photo": `url('${imageUrl}')` };
  }

  const todayKey = computed(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  });

  const currentDayHours = computed(() => {
    return hourlyForecast.value
      .filter((h) => h.dateKey === todayKey.value && h.hourNum >= 8 && h.hourNum <= 20)
      .sort((a, b) => a.hourNum - b.hourNum);
  });

  const hourlyHourMaxPage = computed(() =>
    Math.max(0, Math.ceil(currentDayHours.value.length / CARDS_PER_PAGE) - 1)
  );

  const pagedHours = computed(() => {
    const start = hourlyHourPage.value * CARDS_PER_PAGE;
    return currentDayHours.value.slice(start, start + CARDS_PER_PAGE);
  });

  function prevHourPage() {
    if (hourlyHourPage.value > 0) hourlyHourPage.value--;
  }

  function nextHourPage() {
    if (hourlyHourPage.value < hourlyHourMaxPage.value) hourlyHourPage.value++;
  }

  // ── Hourly localStorage cache ─────────────────────────────────────
  function _hourlyCacheKey(city, dateKey) {
    return `hourly_${city}_${dateKey}`;
  }

  function _loadHourlyCache(city, dateKey) {
    try {
      const raw = localStorage.getItem(_hourlyCacheKey(city, dateKey));
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function _saveHourlyCache(city, dateKey, hours) {
    try {
      localStorage.setItem(_hourlyCacheKey(city, dateKey), JSON.stringify(hours));
    } catch { /* storage quota – silently ignore */ }
  }
  // ─────────────────────────────────────────────────────────────────────

  function parseHourlyForecast(hours) {
    return hours.map((h) => {
      const dt = new Date(h.interval?.startTime ?? h.startTime ?? Date.now());
      const dateKey = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
      const hourNum = dt.getHours();
      const time = dt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
      const iconBase = h.weatherCondition?.iconBaseUri ?? null;
      const windVal = h.wind?.speed?.value ?? h.wind?.speed?.metersPerSecond ?? null;
      const windKmh = windVal != null ? Math.round(windVal) : null;
      const windDeg = h.wind?.direction?.degrees ?? 0;
      return {
        dateKey,
        hourNum,
        time,
        iconUri: iconBase ? `${iconBase}.png` : null,
        wind: windKmh != null ? `${windKmh} km/h` : "—",
        windDeg,
        temp: h.temperature?.degrees != null ? Math.round(h.temperature.degrees) : "—",
        feelsLike: h.feelsLikeTemperature?.degrees != null ? Math.round(h.feelsLikeTemperature.degrees) : "—",
      };
    });
  }

  function parsePeriod(p) {
    if (!p) return null;
    const iconBase = (p.weatherCondition?.iconBaseUri) ?? null;
    return {
      condition: p.weatherCondition?.description?.text ?? p.weatherCondition?.type ?? "—",
      iconUri: iconBase ? `${iconBase}.png` : null,
      rainProb: p.precipitation?.probability?.percent ?? null,
      rainMm: p.precipitation?.qpf?.millimeters != null
        ? p.precipitation.qpf.millimeters.toFixed(1)
        : null,
      humidity: p.relativeHumidity ?? null,
      cloudCover: p.cloudCover ?? null,
      wind: p.wind?.speed?.value != null
        ? `${Math.round(p.wind.speed.value)} km/h`
        : p.wind?.speed?.metersPerSecond != null
          ? `${p.wind.speed.metersPerSecond.toFixed(1)} m/s`
          : "—",
    };
  }

  function parseForecastDays(days) {
    return days.map((day) => {
      let date;
      if (day.interval?.startTime) {
        date = new Date(day.interval.startTime);
      } else if (day.displayDate) {
        const d = day.displayDate;
        date = new Date(d.year ?? new Date().getFullYear(), (d.month ?? 1) - 1, d.day ?? 1);
      } else {
        date = new Date();
      }
      const dayLabel = date.toLocaleDateString("en-US", { weekday: "short" });
      const dateLabel = `${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

      const dayPeriodRaw = day.daytime ?? day.daytimeForecast ?? null;
      const nightPeriodRaw = day.nighttime ?? day.nighttimeForecast ?? null;
      const dayParsed = parsePeriod(dayPeriodRaw);
      const nightParsed = parsePeriod(nightPeriodRaw);

      const iconBase = dayPeriodRaw?.weatherCondition?.iconBaseUri ?? null;

      const fmt = (iso) => iso
        ? new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })
        : "—";

      return {
        dayLabel,
        dateLabel,
        iconUri: iconBase ? `${iconBase}.png` : null,
        maxTemp: Math.round(day.maxTemperature?.degrees ?? day.temperature?.max?.degrees ?? 0),
        minTemp: Math.round(day.minTemperature?.degrees ?? day.temperature?.min?.degrees ?? 0),
        feelsLikeMax: Math.round(day.feelsLikeMaxTemperature?.degrees ?? 0),
        feelsLikeMin: Math.round(day.feelsLikeMinTemperature?.degrees ?? 0),
        uvIndex: day.uvIndex ?? "—",
        wind: dayParsed?.wind ?? "—",
        sunrise: fmt(day.sunEvents?.sunriseTime),
        sunset: fmt(day.sunEvents?.sunsetTime),
        moonrise: fmt(day.moonEvents?.moonriseTime),
        moonset: fmt(day.moonEvents?.moonsetTime),
        daytime: dayParsed,
        nighttime: nightParsed,
      };
    });
  }

  const rainTimeline = computed(() => {
    if (!weather.value) return [];
    const labels = ["10AM", "12AM", "2PM", "4PM", "6PM", "8PM"];
    return labels.map((time, index) => ({
      time,
      value: 28 + (index * 12) % 62,
      focus: time === "2PM",
    }));
  });

  async function fetchWeather() {
    loading.value = true;
    error.value = null;
    try {
      const [weatherRes, forecastRes, hourlyRes] = await Promise.all([
        fetch(`/api/weather?city=${encodeURIComponent(cityInput.value)}`),
        fetch(`/api/daily-forecast?city=${encodeURIComponent(cityInput.value)}`),
        fetch(`/api/hourly-forecast?city=${encodeURIComponent(cityInput.value)}`),
      ]);

      if (!weatherRes.ok) {
        const payload = await weatherRes.json().catch(() => null);
        throw new Error(payload?.error || payload?.details || `Server responded with ${weatherRes.status}`);
      }
      weather.value = await weatherRes.json();

      if (!forecastRes.ok) {
        const payload = await forecastRes.json().catch(() => null);
        throw new Error(payload?.error || `Forecast error ${forecastRes.status}`);
      }
      const forecastData = await forecastRes.json();
      dailyForecast.value = parseForecastDays(forecastData.forecastDays ?? []);
      selectedDayIndex.value = 0;

      if (hourlyRes.ok) {
        const hourlyData = await hourlyRes.json();
        const freshHours = parseHourlyForecast(hourlyData.forecastHours ?? []);

        // Restore past hours of today from localStorage so they remain
        // visible even though the API no longer returns them.
        const dateKey = todayKey.value;
        const cachedHours = _loadHourlyCache(cityInput.value, dateKey);
        const freshKeys = new Set(freshHours.map((h) => `${h.dateKey}_${h.hourNum}`));
        const merged = [
          ...cachedHours.filter(
            (h) => h.dateKey === dateKey && !freshKeys.has(`${h.dateKey}_${h.hourNum}`)
          ),
          ...freshHours,
        ];

        // Persist the merged set so future page loads also have past hours.
        _saveHourlyCache(cityInput.value, dateKey, merged.filter((h) => h.dateKey === dateKey));

        hourlyForecast.value = merged;
        hourlyHourPage.value = 0;
      }
    } catch (err) {
      error.value = `Could not load weather data. Is the backend running? (${err.message})`;
    } finally {
      loading.value = false;
    }
  }

  async function fetchCities() {
    try {
      const res = await fetch("/api/cities");
      if (!res.ok) throw new Error("Failed to fetch city list");
      const payload = await res.json();
      if (Array.isArray(payload.cities) && payload.cities.length) {
        cities.value = payload.cities;
      }
    } catch {
      cities.value = ["Kuala Lumpur", "George Town", "Johor Bahru"];
    }
  }

  function selectCity(city) {
    cityInput.value = city;
    fetchWeather();
  }

  function openPlacesModal() {
    const button = placesBtnRef.value;
    if (button) {
      const rect = button.getBoundingClientRect();
      modalOrigin.value = {
        x: `${rect.left + rect.width / 2}px`,
        y: `${rect.top + rect.height / 2}px`,
      };
    } else {
      modalOrigin.value = { x: "50vw", y: "50vh" };
    }
    showPlacesModal.value = true;
  }

  function selectCityFromModal(city) {
    showPlacesModal.value = false;
    selectCity(city);
  }

  onMounted(async () => {
    await fetchCities();
    await fetchWeather();
  });

  return {
    // State
    cityInput,
    weather,
    dailyForecast,
    selectedDayIndex,
    loading,
    error,
    cities,
    showPlacesModal,
    placesBtnRef,
    modalOrigin,
    hourlyForecast,
    hourlyHourPage,
    // Computed
    cityCards,
    selectedDay,
    todayKey,
    currentDayHours,
    hourlyHourMaxPage,
    pagedHours,
    rainTimeline,
    // Methods
    hasCityPhoto,
    cityArtStyle,
    prevHourPage,
    nextHourPage,
    fetchWeather,
    fetchCities,
    selectCity,
    openPlacesModal,
    selectCityFromModal,
  };
}
