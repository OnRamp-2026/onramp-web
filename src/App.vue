<script setup lang="ts">
import { storeToRefs } from "pinia";
import AppLayout from "@/layouts/AppLayout.vue";
import LoginView from "@/views/LoginView.vue";
import { useAuthStore } from "@/stores/auth";

const { isAuthenticated } = storeToRefs(useAuthStore());
</script>

<template>
  <LoginView v-if="!isAuthenticated" />
  <AppLayout v-else />
</template>
