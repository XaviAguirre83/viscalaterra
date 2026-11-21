import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import {
  calculaPunts,
  configuracioBuida,
  configuracioCompleta,
  nivellPerId,
  type ConfiguracioGeoFreak,
  type ModalitatJoc,
} from '@/data/geofreak'
import { useMotorJoc } from '@/composables/useMotorJoc'

// Estat del joc GeoFreak. Independent dels stores de cerca (filtres/territoris):
// jugar no toca mai la selecció territorial de l'usuari.
//
// El store és la configuració pròpia del joc (modalitat, nivell i territori
// contenidor) + el motor de partida comú (fases, jugadors i torns, rellotges,
// pausa, pista: composables/useMotorJoc.ts). Les demarcacions es juguen pel
// seu codi: a «On és...?» la resposta és un clic al mapa i a «Com es diu...?»
// un nom escrit.

export const useGeofreakStore = defineStore('geofreak', () => {
  const configuracio = ref<ConfiguracioGeoFreak>(configuracioBuida())
  const configCompleta = computed(() => configuracioCompleta(configuracio.value))

  const motor = useMotorJoc({
    configCompleta: () => configCompleta.value,
    // Amb la partida acabada el nivell sempre és triat (sense ell no comença).
    puntua: (dades) => calculaPunts({ ...dades, nivell: configuracio.value.nivell ?? 0 }),
  })

  // Metadades del nivell triat (demarcació que s'endevina, contenidor que cal).
  const nivellActual = computed(() =>
    configuracio.value.nivell !== null ? (nivellPerId(configuracio.value.nivell) ?? null) : null
  )

  // Les accions reassignen l'objecte sencer (patró dels stores filtres/territoris):
  // una sola operació reactiva per canvi.

  function defineixModalitat(modalitat: ModalitatJoc) {
    configuracio.value = { ...configuracio.value, modalitat }
  }

  // Canviar de nivell invalida el contenidor triat: el nou nivell pot demanar
  // un contenidor d'un altre tipus (o cap), i un codi residual seria incoherent.
  function defineixNivell(nivell: number) {
    configuracio.value = { ...configuracio.value, nivell, codiContenidor: null }
  }

  function defineixContenidor(codiContenidor: string | null) {
    configuracio.value = { ...configuracio.value, codiContenidor }
  }

  // Reset complet (en sortir del joc): el proper cop s'arrenca de zero.
  function reinicia() {
    configuracio.value = configuracioBuida()
    motor.reiniciaMotor()
  }

  return {
    ...motor,
    configuracio,
    configCompleta,
    nivellActual,
    defineixModalitat,
    defineixNivell,
    defineixContenidor,
    reinicia,
  }
})
