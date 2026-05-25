import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/cerca',
    },
    {
      path: '/cerca',
      name: 'cerca',
      component: () => import('@/views/CercaView.vue'),
    },
    {
      path: '/agenda',
      name: 'agenda',
      component: () => import('@/views/AgendaView.vue'),
    },
    {
      path: '/jocs',
      name: 'jocs',
      component: () => import('@/views/JocsView.vue'),
    },
  ],
})

export default router
