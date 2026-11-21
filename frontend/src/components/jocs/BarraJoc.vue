<script setup lang="ts">
import './jocs.css'

// Context i pregunta de la partida a la barra de navegació (slot del
// PanellFiltres): la barra queda buida durant el joc i s'hi posa això, que
// deixa més espai de joc al mapa. La pregunta (slot) la formula cada joc; el
// nom del lloc, en <strong>, va ressaltat (regla a jocs.css: el <strong> pot
// arribar de dins d'un altre component, com <I18nT>, on els estils scoped
// d'aquí no hi arriben).
defineProps<{
  context: string
  // Re-munta la pregunta (micro-animació d'entrada) a cada torn i objectiu:
  // més robust que una <Transition> que es pot interrompre.
  clauPregunta: string
  mostraPregunta: boolean
  // Jugador del torn (multijugador); null amb un sol jugador.
  jugador: { nom: string; color: string } | null
}>()
</script>

<template>
  <div class="joc-barra">
    <span class="joc-barra__context">{{ context }}</span>
    <span
      v-if="mostraPregunta"
      :key="clauPregunta"
      class="joc-barra__pregunta"
      role="status"
      aria-live="polite"
    >
      <template v-if="jugador">
        <span class="joc-colorjug joc-barra__colorjug" :style="{ background: jugador.color }"></span
        >{{ jugador.nom }}&nbsp;·&nbsp;
      </template>
      <slot />
    </span>
  </div>
</template>

<style scoped>
.joc-barra {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-left: 12px;
  min-width: 0;
  flex: 1;
}

.joc-barra__context {
  font-size: var(--text-sm);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--color-text-secundari);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.3;
}

/* Micro-animació d'entrada de la pregunta (es re-dispara amb cada
   re-muntat per canvi de torn o d'objectiu) */
.joc-barra__pregunta {
  font-family: var(--font-display);
  font-size: 1.25rem;
  color: var(--color-text-fort);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.3;
  animation: pregunta-entra 0.18s ease;
}

.joc-barra__colorjug {
  margin-right: 5px;
}

@keyframes pregunta-entra {
  from {
    opacity: 0;
    transform: translateY(-5px);
  }
}

/* En pantalles estretes, context i pregunta passen a dues línies centrades
   i tornen a la mida compacta */
@media (max-width: 920px) {
  .joc-barra {
    flex-direction: column;
    gap: 0;
  }

  .joc-barra__context {
    font-size: var(--text-xs);
  }

  /* La pregunta pot ocupar dues línies abans que tallar-se: el nom que es
     pregunta (p. ex. «Santa Coloma de Farners») no es pot perdre en una
     el·lipsi. La barra de navegació creix en alçada si cal. */
  .joc-barra__pregunta {
    font-size: 1rem;
    white-space: normal;
    text-align: center;
  }
}

@media (prefers-reduced-motion: reduce) {
  .joc-barra__pregunta {
    animation: none;
  }
}
</style>
