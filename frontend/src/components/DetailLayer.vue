<template>
  <article class="detail-layer">
    <h2>{{ label }}</h2>
    <p class="detail-value">{{ value }}</p>
    <p class="detail-sub">{{ sub }}</p>
  </article>
</template>

<script setup>
defineProps({
  label: { type: String, required: true },
  value: { type: String, required: true },
  sub:   { type: String, default: "" },
});
</script>
