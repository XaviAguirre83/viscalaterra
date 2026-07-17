<script setup lang="ts">
// Peu de pàgina fix i prim: marca + enllaços legals. Es mostra a totes les
// pàgines excepte al joc immersiu (vegeu App.vue).
const ANY = new Date().getFullYear()
</script>

<template>
  <footer class="peu">
    <span class="peu__marca">© {{ ANY }} viscalaterra.cat</span>
    <nav class="peu__enllacos" :aria-label="$t('peu.aria')">
      <RouterLink to="/legal" class="peu__enllac">{{ $t('nav.seccions.legal') }}</RouterLink>
      <span class="peu__sep" aria-hidden="true">·</span>
      <RouterLink to="/contacte" class="peu__enllac">{{ $t('nav.seccions.contacte') }}</RouterLink>
    </nav>
  </footer>
</template>

<style scoped>
.peu {
  flex-shrink: 0;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 14px;
  background: linear-gradient(100deg, #131d29 0%, #1a2635 70%, #1c2f24 100%);
  color: rgba(255, 255, 255, 0.65);
  font-size: var(--text-xs);
}

.peu__enllacos {
  display: flex;
  align-items: center;
  gap: 8px;
}

.peu__enllac {
  color: rgba(255, 255, 255, 0.85);
  text-decoration: none;
  padding: 2px 4px;
  border-radius: 4px;
  transition:
    color var(--mou-rapid, 0.13s),
    background var(--mou-rapid, 0.13s);
}

.peu__enllac:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.1);
}

.peu__sep {
  color: rgba(255, 255, 255, 0.4);
}

@media (max-width: 768px) {
  .peu {
    height: 32px;
    padding: 0 10px;
  }
}
</style>
