import './assets/main.css'
// Banderes pròpies (3 SVG) en lloc de flag-icons: la dependència inlinava 400
// banderes com a data-URI al CSS crític (−80 KB gz al treure-la).
import './assets/banderes.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { i18n } from './i18n'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(i18n)

app.mount('#app')
