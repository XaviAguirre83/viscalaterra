import { createRouter, createWebHistory } from 'vue-router'

// Vista placeholder per a seccions encara no desenvolupades (amb o sense mapa).
const placeholder = () => import('@/views/VistaPlaceholder.vue')

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', redirect: '/cerca' },
    { path: '/cerca', name: 'cerca', component: () => import('@/views/CercaView.vue') },

    // Seccions que requereixen el mapa (en construcció)
    { path: '/agenda', name: 'agenda', component: placeholder, props: { ambMapa: true } },
    { path: '/anuncis', name: 'anuncis', component: placeholder, props: { ambMapa: true } },
    {
      path: '/fet-a-la-terra',
      name: 'fet-a-la-terra',
      component: placeholder,
      props: { ambMapa: true },
    },
    { path: '/jocs', name: 'jocs', component: placeholder, props: { ambMapa: true } },

    // Seccions que no requereixen el mapa (en construcció)
    {
      path: '/merchandising',
      name: 'merchandising',
      component: placeholder,
      props: { ambMapa: false },
    },
    { path: '/sobre', name: 'sobre', component: placeholder, props: { ambMapa: false } },
    { path: '/contacte', name: 'contacte', component: placeholder, props: { ambMapa: false } },
    {
      path: '/suggeriments',
      name: 'suggeriments',
      component: placeholder,
      props: { ambMapa: false },
    },

    // Espai d'usuari (accessible des del menú d'usuari, no del menú principal)
    { path: '/espai', name: 'espai', component: placeholder, props: { ambMapa: false } },
  ],
})

export default router
