<script setup lang="ts">
import { onMounted } from "vue";
import { storeToRefs } from "pinia";
import AppLayout from "@/layouts/AppLayout.vue";
import LoginView from "@/views/LoginView.vue";
import { useAuthStore } from "@/stores/auth";

const auth = useAuthStore();
const { isAuthenticated, ready } = storeToRefs(auth);

// 실 OIDC 모드: 진입 시 백엔드 세션 복원(mock 모드는 즉시 ready)
onMounted(() => auth.init());
</script>

<template>
  <div v-if="!ready" class="fixed inset-0 grid place-items-center bg-[#0c1428]">
    <div class="auth-spin" />
  </div>
  <LoginView v-else-if="!isAuthenticated" />
  <AppLayout v-else />
</template>

<style scoped>
.auth-spin {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 3px solid rgba(120, 170, 220, 0.2);
  border-top-color: #22cbb0;
  animation: auth-spin 0.8s linear infinite;
}
@keyframes auth-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
