import { createRouter, createWebHistory } from 'vue-router'

// Vista placeholder per a seccions encara no desenvolupades (amb o sense mapa).
const placeholder = () => import('@/views/VistaPlaceholder.vue')

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', redirect: '/llocs' },
    // Llocs (atemporal: On?/Què?) i Agenda (temporal: On?/Què?/Quan?) comparteixen
    // vista (mapa + filtres); el panell decideix si mostra el tab Quan? segons la secció.
    { path: '/llocs', name: 'llocs', component: () => import('@/views/ExploradorView.vue') },
    { path: '/agenda', name: 'agenda', component: () => import('@/views/ExploradorView.vue') },
    { path: '/cerca', redirect: '/llocs' }, // compatibilitat amb enllaços antics

    // Seccions que requereixen el mapa (en construcció)
    { path: '/anuncis', name: 'anuncis', component: placeholder, props: { ambMapa: true } },
    {
      path: '/fet-a-la-terra',
      name: 'fet-a-la-terra',
      component: placeholder,
      props: { ambMapa: true },
    },
    { path: '/jocs', name: 'jocs', component: () => import('@/views/JocsView.vue') },
    {
      path: '/jocs/geofreak',
      name: 'geofreak',
      component: () => import('@/views/GeoFreakView.vue'),
    },

    // Seccions que no requereixen el mapa (en construcció)
    {
      path: '/merchandising',
      name: 'merchandising',
      component: placeholder,
      props: { ambMapa: false },
    },
    { path: '/sobre', name: 'sobre', component: placeholder, props: { ambMapa: false } },
    { path: '/contacte', name: 'contacte', component: placeholder, props: { ambMapa: false } },
    { path: '/legal', name: 'legal', component: () => import('@/views/LegalView.vue') },
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
