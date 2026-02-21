import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'

// Import views
import TableView from './views/TableView.vue'
import TablesListView from './views/TablesListView.vue'
import ReplaysView from './views/ReplaysView.vue'

// Create router
const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'tables',
      component: TablesListView
    },
    {
      path: '/table/:id',
      name: 'table',
      component: TableView,
      props: true
    },
    {
      path: '/replays/:tableId?',
      name: 'replays',
      component: ReplaysView,
      props: true
    }
  ]
})

// Create Pinia store
const pinia = createPinia()

// Create and mount app
const app = createApp(App)
app.use(pinia)
app.use(router)
app.mount('#app')