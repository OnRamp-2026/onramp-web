<script setup lang="ts">
const props = defineProps<{ size?: number }>();
const s = props.size ?? 34;
const gid = `og-${s}`;
</script>

<template>
  <svg :width="s" :height="s" viewBox="0 0 40 40" fill="none">
    <defs>
      <linearGradient :id="gid" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#3E9BE9" />
        <stop offset="1" stop-color="#22CBB0" />
      </linearGradient>
    </defs>
    <circle cx="20" cy="20" r="15.6" fill="#F2FAFF" :stroke="`url(#${gid})`" stroke-width="3.3" />
    <path d="M10.5 26.5 C 15 30, 25 27.5, 27.5 13.5" fill="none" :stroke="`url(#${gid})`" stroke-width="3.6" stroke-linecap="round" />
    <path d="M27.8 13 L 22.4 14.4 M27.8 13 L 26.3 18.6" fill="none" :stroke="`url(#${gid})`" stroke-width="3.6" stroke-linecap="round" />
  </svg>
</template>
