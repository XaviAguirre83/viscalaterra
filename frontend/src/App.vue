<script setup lang="ts">
import CabeceraApp from '@/components/CabeceraApp.vue'
</script>

<template>
  <div class="app-layout">
    <CabeceraApp />
    <RouterView class="app-layout__contingut" />
  </div>
</template>

<style scoped>
.app-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

.app-layout__contingut {
  flex: 1;
  min-height: 0;
}
</style>
