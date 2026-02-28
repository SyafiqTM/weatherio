<template>
  <main class="dashboard-shell">
    <section class="dashboard-left">
      <header class="toolbar">
        <form class="search" @submit.prevent="fetchWeather">
          <input
            v-model="cityInput"
            type="text"
            placeholder="Search new place"
            aria-label="City name"
          />
        </form>
        <button
          ref="placesBtnRef"
          class="places-btn"
          type="button"
          @click="openPlacesModal"
        >
          All places
        </button>
      </header>

      <h1 class="title">Weather <strong>Forecast</strong></h1>

      <section class="city-grid" aria-label="City quick picks">
        <button
          v-for="city in cityCards"
          :key="city"
          type="button"
          class="city-tile"
          @click="selectCity(city)"
        >
          <div
            class="city-tile__art"
            :class="{ 'city-tile__art--photo': hasCityPhoto(city) }"
            :style="cityArtStyle(city)"
          />
          <span>{{ city }}</span>
        </button>
        <button type="button" class="city-tile city-tile--add" @click="fetchCities">
          <span class="add-sign">+</span>
          <span>Add city</span>
        </button>
      </section>

      <section v-if="dailyForecast.length" class="forecast-board">
        <h2 class="forecast-board__title">Daily Forecast (10 Days)</h2>

        <!-- Day selector row -->
        <div class="day-selector">
          <button
            v-for="(day, i) in dailyForecast"
            :key="i"
            class="day-card"
            :class="{ 'day-card--active': selectedDayIndex === i }"
            type="button"
            @click="selectedDayIndex = i"
          >
            <span class="day-card__label">{{ day.dayLabel }}</span>
            <span class="day-card__date">{{ day.dateLabel }}</span>
            <img
              v-if="day.iconUri"
              :src="day.iconUri"
              class="day-card__icon"
              alt="weather icon"
            />
            <span v-else class="day-card__icon-fallback">🌤️</span>
            <span class="day-card__temp">{{ day.maxTemp }}°</span>
          </button>
        </div>

        <!-- Detail panel for selected day -->
        <div v-if="selectedDay" class="day-detail">
          <!-- Daytime + Nighttime -->
          <div class="detail-row">
            <div class="detail-card" v-for="period in ['daytime', 'nighttime']" :key="period">
              <p class="detail-card__heading">{{ period === 'daytime' ? 'Daytime' : 'Nighttime' }} Forecast:</p>
              <div class="detail-card__condition">
                <img
                  v-if="selectedDay[period]?.iconUri"
                  :src="selectedDay[period].iconUri"
                  class="detail-card__cond-icon"
                  alt=""
                />
                <span>{{ selectedDay[period]?.condition || '—' }}</span>
              </div>
              <div class="detail-card__stats">
                <span class="stat">🌧️ {{ selectedDay[period]?.rainProb ?? '—' }}%</span>
                <span class="stat">💧 {{ selectedDay[period]?.rainMm ?? '—' }} mm &nbsp; {{ selectedDay[period]?.humidity ?? '—' }}%</span>
              </div>
              <div class="detail-card__stats">
                <span class="stat">🌅 {{ selectedDay[period]?.humidity ?? '—' }}%</span>
                <span class="stat">☁️ {{ selectedDay[period]?.cloudCover ?? '—' }}%</span>
                <span class="stat">☀️ UV-{{ selectedDay.uvIndex ?? '—' }}</span>
              </div>
            </div>
          </div>


        </div>
      </section>

      <!-- <p v-if="loading" class="status">Fetching weather…</p> -->
      <p v-else-if="error" class="status status--error">{{ error }}</p>
    </section>

    <aside class="dashboard-right" v-if="weather">
      <header class="right-top">
        <div class="bell-wrap">
          <p class="mr-2">Notifications</p>
          <svg class="bell-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
            <path d="M12 22a2 2 0 0 0 2-2H10a2 2 0 0 0 2 2zm6-6V11a6 6 0 0 0-5-5.91V4a1 1 0 0 0-2 0v1.09A6 6 0 0 0 6 11v5l-2 2v1h16v-1l-2-2z"/>
          </svg>
          <span class="bell-badge">4</span>
        </div>
        <div class="avatar" aria-hidden="true" />
      </header>

      <section class="today-block" aria-label="Today weather overview">
        <p class="today">🌧️ Today</p>
        <p class="date">{{ weather.date }}</p>
        <p class="temp">{{ weather.temp }}<span>°C</span></p>
        <p class="city">{{ weather.city }}</p>
        <p class="meta">Feels like {{ weather.high }}° · Wind {{ weather.wind }} · Humidity {{ weather.humidity }}</p>
      </section>

      <section class="hourly-forecast" aria-label="Hourly forecast">
        <h2 class="hourly-forecast__title">Hourly Forecast: Today · 08:00–20:00</h2>
        <div class="hourly-forecast__day-label"></div>

        <!-- Cards row with hour-page arrows -->
        <div class="hourly-forecast__row">
          <button class="nav-arrow" type="button" @click="prevHourPage" :disabled="hourlyHourPage === 0">&#8249;</button>
          <div class="hourly-forecast__cards" v-if="pagedHours.length">
            <div v-for="h in pagedHours" :key="h.time" class="hour-card">
              <span class="hour-card__time">{{ h.time }}</span>
              <img v-if="h.iconUri" :src="h.iconUri" class="hour-card__icon" alt="" />
              <span v-else class="hour-card__icon-fallback">🌤️</span>
              <span class="hour-card__wind">{{ h.wind }}</span>
              <span class="hour-card__dir" :style="{ transform: `rotate(${h.windDeg}deg)` }">▲</span>
            </div>
          </div>
          <p v-else class="hourly-forecast__empty">No data.</p>
          <button class="nav-arrow" type="button" @click="nextHourPage" :disabled="hourlyHourPage >= hourlyHourMaxPage">&#8250;</button>
        </div>

        <!-- Temp row -->
        <div class="hourly-forecast__temps" v-if="pagedHours.length">
          <p class="temps-label">Actual temperature / feels like</p>
          <div class="temps-row">
            <span v-for="h in pagedHours" :key="h.time" class="temp-cell">
              <span class="temp-actual">{{ h.temp }}°</span>
              <span class="temp-feels">{{ h.feelsLike }}°</span>
            </span>
          </div>
        </div>
      </section>
    </aside>

    <Transition name="places-modal-zoom">
      <div
        v-if="showPlacesModal"
        class="places-modal-backdrop"
        @click.self="showPlacesModal = false"
      >
        <div
          class="places-modal"
          role="dialog"
          aria-modal="true"
          aria-label="All places"
          :style="{ '--btn-vx': modalOrigin.x, '--btn-vy': modalOrigin.y }"
        >
          <header class="places-modal__header">
            <h3>All places</h3>
            <button class="places-modal__close" type="button" @click="showPlacesModal = false">✕</button>
          </header>

          <div class="places-modal__list" v-if="cities.length">
            <button
              v-for="city in cities"
              :key="city"
              type="button"
              class="places-modal__item"
              :class="{ 'places-modal__item--active': city === cityInput }"
              @click="selectCityFromModal(city)"
            >
              {{ city }}
            </button>
          </div>
          <p v-else class="places-modal__empty">No places added yet.</p>
        </div>
      </div>
    </Transition>
  </main>
</template>

<script setup>
import { useWeatherApp } from "./composables/useWeatherApp.js";

const {
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
  hourlyHourPage,
  cityCards,
  selectedDay,
  hourlyHourMaxPage,
  pagedHours,
  hasCityPhoto,
  cityArtStyle,
  prevHourPage,
  nextHourPage,
  fetchWeather,
  fetchCities,
  selectCity,
  openPlacesModal,
  selectCityFromModal,
} = useWeatherApp();
</script>

<style src="./App.css" scoped>
</style>

<style src="./App.css" scoped>
.forecast-board {
  background: rgba(255 255 255 / 0.12);
  border-radius: 16px;
  padding: 14px;
  margin-top: 16px;
}

.forecast-board__title {
  font-size: 0.9rem;
  font-weight: 600;
  color: #1a2f5e;
  margin: 0 0 10px;
}

/* Day selector row */
.day-selector {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 6px;
}

.day-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 8px 6px;
  border-radius: 12px;
  border: none;
  background: rgba(255 255 255 / 0.45);
  color: #1a2f5e;
  cursor: pointer;
  width: 100%;
  transition: background 0.18s;
}
.day-card:hover { background: rgba(255 255 255 / 0.65); }
.day-card--active {
  background: rgba(255 255 255 / 0.85);
  font-weight: 700;
  color: #1a2f5e;
}
.day-card__label { font-size: 0.72rem; color: #2e4a8a; }
.day-card__date  { font-size: 0.62rem; color: #5a7ab5; }
.day-card__icon  { width: 30px; height: 30px; }
.day-card__icon-fallback { font-size: 1.35rem; }
.day-card__temp  { font-size: 0.88rem; font-weight: 600; color: #1a2f5e; }

/* Detail panel */
.day-detail {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detail-row {
  display: flex;
  gap: 8px;
}

.detail-card {
  flex: 1;
  background: rgba(255 255 255 / 0.55);
  border-radius: 12px;
  padding: 16px 16px;
  color: #1a2f5e;
  font-size: 0.82rem;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.detail-card__heading {
  font-size: 0.72rem;
  color: #5a7ab5;
  margin: 0;
}
.detail-card__condition {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 0.88rem;
  color: #1a2f5e;
}
.detail-card__cond-icon { width: 32px; height: 32px; }

.detail-card__stats {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.stat {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 0.72rem;
  color: #2e4a8a;
}

/* ── Hourly Forecast ── */
.hourly-forecast {
  background: rgba(255 255 255 / 0.1);
  border-radius: 16px;
  padding: 14px 12px 10px;
  margin-top: 12px;
  color: #e8eaf6;
}

.hourly-forecast__title {
  font-size: 0.82rem;
  font-weight: 600;
  color: rgba(232, 234, 246, 0.7);
  margin: 0 0 10px;
}

.hourly-forecast__row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.hourly-forecast__cards {
  display: flex;
  flex: 1;
  gap: 6px;
  flex-wrap: nowrap;
  overflow: hidden;
}

.hourly-forecast__day-label {
  font-size: 0.88rem;
  font-weight: 600;
  color: #e8eaf6;
  letter-spacing: 0.03em;
}

.nav-arrow {
  background: rgba(255 255 255 / 0.12);
  border: none;
  border-radius: 8px;
  color: #e8eaf6;
  width: 28px;
  height: 28px;
  font-size: 1.1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
}
.nav-arrow:disabled { opacity: 0.3; cursor: default; }
.nav-arrow:not(:disabled):hover { background: rgba(255 255 255 / 0.25); }

.hour-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 8px 4px 6px;
  background: rgba(255 255 255 / 0.09);
  border-radius: 10px;
  border: 1px solid rgba(255 255 255 / 0.08);
  flex: 1 1 0;
  min-width: 0;
}

.hour-card__time {
  font-size: 0.65rem;
  color: rgba(232, 234, 246, 0.65);
  font-weight: 500;
}

.hour-card__icon { width: 28px; height: 28px; }
.hour-card__icon-fallback { font-size: 1.1rem; }

.hour-card__wind {
  font-size: 0.62rem;
  color: #e8eaf6;
  font-weight: 500;
}

.hour-card__dir {
  font-size: 0.55rem;
  color: rgba(232, 234, 246, 0.5);
  display: inline-block;
}

.hourly-forecast__empty {
  font-size: 0.78rem;
  color: rgba(232, 234, 246, 0.5);
  text-align: center;
  padding: 12px 0;
}

.hourly-forecast__temps {
  margin-top: 10px;
  border-top: 1px solid rgba(255 255 255 / 0.1);
  padding-top: 8px;
  padding-left: 34px;
  padding-right: 34px;
}

.temps-label {
  font-size: 0.7rem;
  color: rgba(232, 234, 246, 0.55);
  margin: 0 0 6px;
}

.temps-row {
  display: flex;
  gap: 6px;
}

.temp-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  flex: 1;
}

.temp-actual {
  font-size: 0.72rem;
  font-weight: 600;
  color: #e8eaf6;
}

.temp-feels {
  font-size: 0.62rem;
  color: rgba(232, 234, 246, 0.5);
}

/* ── All Places Modal ── */
.bell-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.bell-icon {
  cursor: pointer;
  color: #ee334f;
  filter: drop-shadow(0 0 4px rgba(240, 95, 124, 0.55));
}

.bell-badge {
  position: absolute;
  top: -5px;  
  right: -6px;
  min-width: 16px;
  height: 16px;
  border-radius: 999px;
  background: #ffffff;
  color: #d82b2b;
  font-size: 0.6rem;
  font-weight: 700;
  display: grid;
  place-content: center;
  padding: 0 3px;
  line-height: 1;
}

/* ── All Places Modal ── */
.places-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(12 17 45 / 0.55);
  display: grid;
  place-items: center;
  z-index: 50;
  padding: 16px;
}

.places-modal {
  width: min(540px, 100%);
  max-height: min(78vh, 720px);
  overflow: auto;
  border-radius: 16px;
  background: #ecf2f6;
  box-shadow: 0 18px 36px rgba(16, 33, 68, 0.28);
  padding: 14px;
  /* Map viewport btn coords to modal-local coords: modal is centered at 50vw/50vh */
  transform-origin:
    calc(var(--btn-vx, 50vw) - 50vw + 50%)
    calc(var(--btn-vy, 50vh) - 50vh + 50%);
  will-change: transform, opacity;
}

/* Backdrop fades in/out */
.places-modal-zoom-enter-active,
.places-modal-zoom-leave-active {
  transition: opacity 220ms ease;
}
.places-modal-zoom-enter-from,
.places-modal-zoom-leave-to {
  opacity: 0;
}

/* Modal scales from button origin */
.places-modal-zoom-enter-active .places-modal,
.places-modal-zoom-leave-active .places-modal {
  transition: transform 260ms cubic-bezier(0.22, 0.61, 0.36, 1),
              opacity 200ms ease;
}
.places-modal-zoom-enter-from .places-modal,
.places-modal-zoom-leave-to .places-modal {
  transform: scale(0.05);
  opacity: 0;
}

.places-modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.places-modal__header h3 {
  margin: 0;
  font-size: 1rem;
  color: #1a2f5e;
}

.places-modal__close {
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 8px;
  background: rgba(255 255 255 / 0.85);
  color: #2e4a8a;
  cursor: pointer;
}

.places-modal__list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.places-modal__item {
  border: none;
  border-radius: 10px;
  padding: 10px 12px;
  text-align: left;
  background: rgba(255 255 255 / 0.75);
  color: #1a2f5e;
  font-weight: 600;
  cursor: pointer;
}

.places-modal__item:hover {
  background: rgba(255 255 255 / 0.95);
}

.places-modal__item--active {
  background: #d8e4f7;
}

.places-modal__empty {
  margin: 6px 0 0;
  color: #5a7ab5;
}

@media (max-width: 560px) {
  .places-modal__list {
    grid-template-columns: 1fr;
  }
}
</style>
