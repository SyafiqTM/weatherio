<template>
  <section class="timeline" aria-label="Weather across morning to tonight">
    <h2>Morning &rarr; Tonight</h2>
    <div class="timeline-track">
      <article
        v-for="entry in entries"
        :key="entry.slot"
        class="time-slot"
      >
        <span class="label">{{ entry.slot }}</span>
        <span class="icon" aria-hidden="true">{{ entry.icon }}</span>
        <span class="temp">{{ entry.temp }}°</span>
      </article>
    </div>
  </section>
</template>

<script setup>
defineProps({
  entries: {
    type: Array,
    required: true,
    // Each entry: { slot: string, icon: string, temp: number }
  },
});
</script>
