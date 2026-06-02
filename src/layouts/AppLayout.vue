<script setup lang="ts">
import AppSidebar from "@/components/layout/AppSidebar.vue";
</script>

<template>
  <div class="flex h-screen">
    <AppSidebar />
    <RouterView />
  </div>
</template>
