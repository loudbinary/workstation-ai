<template>
  <div class="app">
    <!-- Navigation Header -->
    <header class="app-header">
      <div class="container">
        <div class="nav-brand">
          <h1>🎱 WTF Replay System</h1>
        </div>
        <nav class="nav-menu">
          <router-link to="/" class="nav-link">Tables</router-link>
          <router-link to="/replays" class="nav-link">Replays</router-link>
        </nav>
      </div>
    </header>

    <!-- Main Content -->
    <main class="app-main">
      <router-view />
    </main>

    <!-- Toast Notifications -->
    <div class="toast-container">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        :class="['toast', `toast-${toast.type}`]"
      >
        {{ toast.message }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useWebSocketStore } from './stores/websocket'
import { useToastStore } from './stores/toast'

const wsStore = useWebSocketStore()
const toastStore = useToastStore()
const toasts = ref([])

onMounted(() => {
  // Initialize WebSocket connection
  wsStore.connect()

  // Subscribe to toast notifications
  toastStore.$subscribe(() => {
    toasts.value = toastStore.toasts
  })
})

onUnmounted(() => {
  wsStore.disconnect()
})
</script>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-header {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  box-shadow: 0 2px 20px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 1000;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 70px;
}

.nav-brand h1 {
  font-size: 1.5rem;
  color: #2a5298;
  font-weight: 700;
}

.nav-menu {
  display: flex;
  gap: 30px;
}

.nav-link {
  color: #555;
  text-decoration: none;
  font-weight: 500;
  padding: 8px 16px;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.nav-link:hover,
.nav-link.router-link-active {
  color: #2a5298;
  background: rgba(42, 82, 152, 0.1);
}

.app-main {
  flex: 1;
  padding: 20px;
}

.toast-container {
  position: fixed;
  top: 90px;
  right: 20px;
  z-index: 1100;
  pointer-events: none;
}

.toast {
  background: white;
  color: #333;
  padding: 12px 20px;
  border-radius: 8px;
  margin-bottom: 10px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  border-left: 4px solid #2a5298;
  animation: slideIn 0.3s ease;
  pointer-events: auto;
  max-width: 300px;
  word-wrap: break-word;
}

.toast-success {
  border-left-color: #28a745;
}

.toast-error {
  border-left-color: #dc3545;
}

.toast-warning {
  border-left-color: #ffc107;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@media (max-width: 768px) {
  .container {
    flex-direction: column;
    height: auto;
    padding: 15px 20px;
  }
  
  .nav-brand {
    margin-bottom: 10px;
  }
  
  .nav-menu {
    gap: 20px;
  }
  
  .nav-link {
    padding: 6px 12px;
    font-size: 0.9rem;
  }
  
  .toast-container {
    top: 120px;
    right: 10px;
    left: 10px;
  }
  
  .toast {
    max-width: none;
  }
}
</style>