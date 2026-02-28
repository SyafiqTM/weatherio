<template>
  <section class="city-card" aria-label="Current city weather card">
    <div class="city-card__meta">
      <p class="city-name">{{ city }}</p>
      <p class="current-date">{{ date }}</p>
    </div>
    <div class="city-card__main">
      <div>
        <p class="condition">{{ condition }}</p>
        <p class="temperature">{{ temp }}°</p>
      </div>
      <p class="high-low">H: {{ high }}° &bull; L: {{ low }}°</p>
    </div>
  </section>
</template>

<script setup>
defineProps({
  city:      { type: String, required: true },
  date:      { type: String, required: true },
  condition: { type: String, required: true },
  temp:      { type: Number, required: true },
  high:      { type: Number, required: true },
  low:       { type: Number, required: true },
});
</script>
