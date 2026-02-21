<template>
  <div class="table-view">
    <!-- Main Header -->
    <div class="app-header">
      <div class="header-content">
        <button @click="goBack" class="back-btn">
          ← Back to Tables
        </button>
        <h1 class="app-title">🎱 WTF Replay System</h1>
      </div>
    </div>

    <!-- Table Header -->
    <div class="table-header">
      <div class="header-info">
        <h2 v-if="table">{{ table.name }}</h2>
        <p v-if="table?.location" class="location">📍 {{ table.location }}</p>
      </div>
      <div class="header-actions">
        <div class="connection-status" :class="connectionStatusClass">
          {{ connectionStatusText }}
        </div>
        <button @click="refreshData" class="refresh-btn" :disabled="loading">
          🔄 Refresh
        </button>
      </div>
    </div>

    <!-- Stats Overview -->
    <div class="stats-grid" v-if="table">
      <div class="stat-card">
        <div class="stat-number">{{ table.cameras?.length || 0 }}</div>
        <div class="stat-label">Total Cameras</div>
      </div>
      <div class="stat-card online">
        <div class="stat-number">{{ onlineCameras }}</div>
        <div class="stat-label">Online</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">{{ replays.length }}</div>
        <div class="stat-label">Replays Today</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${{ (shareFees?.facebook || 0.50).toFixed(2) }}</div>
        <div class="stat-label">Share Fee</div>
      </div>
    </div>

    <!-- WTF Button -->
    <div class="wtf-section">
      <div class="wtf-container">
        <button 
          @click="triggerWTFReplay" 
          :disabled="!canTriggerReplay || processing"
          class="wtf-button"
          :class="{ 'demo-pulse': showDemoMode }"
        >
          <span v-if="processing">🔄 Creating Replay...</span>
          <span v-else-if="!canTriggerReplay">⚠️ No Cameras Online</span>
          <span v-else class="wtf-text">WTF?!</span>
        </button>
        <p class="wtf-description">
          Press the WTF button when something amazing happens!
        </p>
        
        <!-- Demo Mode Toggle -->
        <div class="demo-controls" v-if="!canTriggerReplay">
          <button @click="toggleDemoMode" class="demo-btn">
            {{ showDemoMode ? '🔕 Stop Demo' : '🎬 Show Demo' }}
          </button>
          <p v-if="showDemoMode" class="demo-text">
            This is how the WTF button works when cameras are online!
          </p>
        </div>
      </div>
    </div>

    <!-- Camera Grid -->
    <div class="cameras-section">
      <div class="section-header">
        <h3>📹 Camera Feeds</h3>
        <button @click="openCameraClient" class="add-camera-btn">
          ➕ Add Camera
        </button>
      </div>
      
      <div class="cameras-grid" v-if="table?.cameras?.length > 0">
        <div 
          v-for="camera in table.cameras" 
          :key="camera.id"
          class="camera-card"
          :class="{ online: isCameraLive(camera), offline: !isCameraLive(camera) }"
        >
          <div class="camera-header">
            <h4>{{ camera.name }}</h4>
            <div class="camera-status" :class="getCameraStatusClass(camera)">
              {{ getCameraStatusIcon(camera) }} {{ getCameraStatusText(camera) }}
            </div>
          </div>
          
          <div class="camera-preview">
            <div v-if="camera.status === 'online'" class="live-feed">
              <!-- Live camera frame -->
              <div class="live-frame">
                <div class="live-indicator">🔴 LIVE</div>
                <img 
                  :src="`/api/cameras/${camera.id}/frame/latest.jpg?t=${frameRefreshTimestamp}`"
                  :alt="`Live feed from ${camera.name}`"
                  class="camera-frame"
                  @error="handleFrameError"
                  @load="handleFrameLoad"
                />
                <div class="frame-overlay">
                  <div class="frame-info">{{ camera.position || 'Unknown position' }}</div>
                  <div class="frame-time">{{ lastFrameUpdate }}</div>
                </div>
              </div>
            </div>
            <div v-else class="offline-feed">
              <p>📵 Camera Offline</p>
              <p class="last-seen" v-if="camera.last_seen">
                Last seen: {{ formatDate(camera.last_seen) }}
              </p>
            </div>
          </div>
          
          <div class="camera-actions">
            <button @click="editCamera(camera)" class="edit-btn">✏️ Edit</button>
            <button @click="deleteCamera(camera)" class="delete-btn">🗑️ Delete</button>
          </div>
        </div>
      </div>
      
      <div v-else class="no-cameras">
        <p>📱 No cameras registered for this table</p>
        <div class="camera-setup-form" v-if="showCameraSetup">
          <h4>📹 Add MJPEG Camera</h4>
          <form @submit.prevent="setupCamera">
            <div class="form-row">
              <label>
                <span>Camera Name:</span>
                <input v-model="newCamera.name" type="text" placeholder="e.g., Corner Camera 1" required>
              </label>
              <label>
                <span>Position:</span>
                <select v-model="newCamera.position" required>
                  <option value="corner-1">Corner 1</option>
                  <option value="corner-2">Corner 2</option>
                  <option value="corner-3">Corner 3</option>
                  <option value="corner-4">Corner 4</option>
                  <option value="overhead">Overhead</option>
                </select>
              </label>
            </div>
            <div class="form-row">
              <label>
                <span>Protocol:</span>
                <select v-model="newCamera.protocol" required>
                  <option value="http">HTTP (MJPEG)</option>
                  <option value="rtsp">RTSP</option>
                </select>
              </label>
              <label>
                <span>IP Address:</span>
                <input v-model="newCamera.ipAddress" type="text" placeholder="192.168.1.100" required>
              </label>
            </div>
            <div class="form-row">
              <label>
                <span>Port:</span>
                <input v-model="newCamera.port" type="number" :placeholder="newCamera.protocol === 'rtsp' ? '554' : '8081'" required>
              </label>
              <label>
                <span>Path:</span>
                <input v-model="newCamera.path" type="text" :placeholder="newCamera.protocol === 'rtsp' ? '/live' : '/video'">
              </label>
            </div>
            <div class="form-row">
              <label>
                <span>Username:</span>
                <input v-model="newCamera.username" type="text" placeholder="admin">
              </label>
              <label>
                <span>Password:</span>
                <input v-model="newCamera.password" type="password" placeholder="admin">
              </label>
            </div>

            <div class="form-actions">
              <button type="submit" class="connect-btn" :disabled="connectingCamera">
                {{ connectingCamera ? '🔄 Connecting...' : '🔗 Connect Camera' }}
              </button>
              <button type="button" @click="cancelCameraSetup" class="cancel-btn">
                ❌ Cancel
              </button>
            </div>
          </form>
        </div>
        <button v-else @click="showCameraSetup = true" class="setup-camera-btn">
          📹 Set Up Your First Camera
        </button>
      </div>
    </div>

    <!-- Replays Section -->
    <div class="replays-section">
      <div class="section-header">
        <h3>🎥 Recent Replays</h3>
        <router-link :to="`/replays/${tableId}`" class="view-all-btn">
          View All
        </router-link>
      </div>
      
      <div class="replays-grid" v-if="replays.length > 0">
        <div 
          v-for="replay in replays.slice(0, 6)" 
          :key="replay.id"
          class="replay-card"
          @click="selectReplay(replay)"
        >
          <div class="replay-thumbnail">
            <img v-if="replay.thumbnail_url" :src="replay.thumbnail_url" alt="Replay thumbnail">
            <div v-else class="thumbnail-placeholder">🎥</div>
            <div class="replay-duration">{{ replay.duration }}s</div>
          </div>
          
          <div class="replay-info">
            <div class="replay-time">{{ formatDate(replay.requested_at) }}</div>
            <div class="replay-cameras">{{ replay.cameras?.length || 0 }} cameras</div>
            <div class="replay-status" :class="replay.status">
              {{ replay.status === 'completed' ? '✅' : '🔄' }} {{ replay.status }}
            </div>
          </div>
          
          <div class="replay-actions" @click.stop>
            <button 
              v-if="replay.status === 'completed'"
              @click="shareReplay(replay)"
              class="share-btn"
            >
              🌍 Share
            </button>
            <button @click="downloadReplay(replay)" class="download-btn">
              ⬇️ Download
            </button>
          </div>
        </div>
      </div>
      
      <div v-else class="no-replays">
        <p>🎥 No replays yet</p>
        <p>Press the WTF button to create your first replay!</p>
      </div>
    </div>

    <!-- Share Modal -->
    <ShareReplayModal
      :visible="showShareModal"
      :replay="selectedReplay"
      :table-id="tableId"
      :table-name="table?.name"
      :billiard-hall-id="billiardHallId"
      @close="showShareModal = false"
    />

    <!-- Add Camera Modal -->
    <div v-if="showAddCamera" class="modal-overlay" @click="showAddCamera = false">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h3>Add Camera</h3>
          <button @click="showAddCamera = false" class="close-btn">&times;</button>
        </div>
        <div class="modal-content">
          <p>To add a camera to this table:</p>
          <ol>
            <li>Open the <strong>WTF Camera Client</strong> on your mobile device</li>
            <li>Go to: <code>{{ cameraClientUrl }}</code></li>
            <li>Select this table: <strong>{{ table?.name }}</strong></li>
            <li>Position your phone to capture the table</li>
            <li>Start streaming</li>
          </ol>
          <div class="qr-section">
            <p>Or scan this QR code:</p>
            <div class="qr-placeholder">
              📟 QR Code for {{ cameraClientUrl }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading Overlay -->
    <div v-if="loading" class="loading-overlay">
      <div class="spinner"></div>
      <p>Loading table data...</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useApiStore } from '../stores/api'
import { useWebSocketStore } from '../stores/websocket'
import { useToastStore } from '../stores/toast'
import ShareReplayModal from '../components/ShareReplayModal.vue'

// Router
const route = useRoute()
const tableId = computed(() => route.params.id)

// Stores
const apiStore = useApiStore()
const wsStore = useWebSocketStore()
const toastStore = useToastStore()

// Reactive data
const table = ref(null)
const replays = ref([])
const loading = ref(false)
const processing = ref(false)
const showAddCamera = ref(false)
const showShareModal = ref(false)
const selectedReplay = ref(null)
const shareFees = ref({})
const billiardHallId = ref(null)
const showDemoMode = ref(false)
const frameRefreshTimestamp = ref(Date.now())
const lastFrameUpdate = ref('')
const frameRefreshInterval = ref(null)

// Camera setup
const showCameraSetup = ref(false)
const connectingCamera = ref(false)
const newCamera = ref({
  name: '',
  position: 'corner-1',
  protocol: 'http',
  ipAddress: '192.168.12.215',
  port: 8081,
  username: 'admin', 
  password: 'admin',
  path: '/video'
})

// Computed
const onlineCameras = computed(() => {
  return table.value?.cameras?.filter(camera => camera.status === 'online').length || 0
})

const canTriggerReplay = computed(() => {
  return onlineCameras.value > 0 && !processing.value
})

const connectionStatusClass = computed(() => {
  return wsStore.isConnected ? 'connected' : 'disconnected'
})

const connectionStatusText = computed(() => {
  return wsStore.isConnected ? '🟢 Connected' : '⚫ Disconnected'
})

const cameraClientUrl = computed(() => {
  return `${window.location.protocol}//${window.location.hostname}:3001`
})

// Methods
async function loadTableData() {
  try {
    loading.value = true
    
    // Load table details
    const tableData = await apiStore.tables.getById(tableId.value)
    table.value = tableData
    billiardHallId.value = tableData.billiardHallId || tableData.hall_id
    
    // Load recent replays
    try {
      const replayData = await apiStore.replays.getAll(tableId.value, { limit: 10 })
      replays.value = replayData || []
    } catch (replayError) {
      console.warn('Could not load replays:', replayError)
      replays.value = []
      // Don't show error to user as this is optional data
    }
    
    // Load share fees
    await loadShareFees()
    
    // Subscribe to WebSocket updates for this table
    wsStore.subscribeToTable(tableId.value)
    
  } catch (error) {
    toastStore.error('Failed to load table data')
    console.error('Load table error:', error)
  } finally {
    loading.value = false
  }
}

async function loadShareFees() {
  try {
    if (!billiardHallId.value) return
    
    const response = await fetch('/payment-api/payment/fee-calculator?' + new URLSearchParams({
      billiardHallId: billiardHallId.value,
      tableId: tableId.value
    }))
    
    if (response.ok) {
      const data = await response.json()
      shareFees.value = data.fees || {}
    }
  } catch (error) {
    console.error('Failed to load share fees:', error)
  }
}

async function refreshData() {
  await loadTableData()
  toastStore.success('Data refreshed')
}

function toggleDemoMode() {
  showDemoMode.value = !showDemoMode.value
  if (showDemoMode.value) {
    toastStore.info('Demo mode activated - button will pulse to show functionality')
  }
}

async function triggerWTFReplay() {
  try {
    processing.value = true
    
    if (showDemoMode.value) {
      // Demo mode - simulate replay creation
      toastStore.info('🎬 Demo: Creating replay...')
      
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      toastStore.success('🎬 Demo: Replay would be created here! (30 seconds of footage captured)')
      
      // Add a demo replay to the list
      const demoReplay = {
        id: 'demo-' + Date.now(),
        table_id: tableId.value,
        requested_at: new Date().toISOString(),
        status: 'completed',
        duration: 30,
        file_path: '/demo/replay.mp4',
        cameras: ['demo-camera-1'],
        metadata: { demo: true, note: 'This is a demo replay' }
      }
      
      replays.value.unshift(demoReplay)
      return
    }
    
    toastStore.info('Creating replay...')
    
    const replay = await apiStore.replays.create({
      table_id: tableId.value,
      duration: 30
    })
    
    toastStore.success('Replay created! Processing...')
    
    // Refresh replays list
    setTimeout(refreshData, 2000)
    
  } catch (error) {
    toastStore.error('Failed to create replay')
    console.error('WTF replay error:', error)
  } finally {
    processing.value = false
  }
}

function selectReplay(replay) {
  if (replay.status === 'completed' && replay.url) {
    // Open replay in new tab/window
    window.open(replay.url, '_blank')
  }
}

function shareReplay(replay) {
  selectedReplay.value = replay
  showShareModal.value = true
}

function downloadReplay(replay) {
  if (replay.status === 'completed' && replay.url) {
    const link = document.createElement('a')
    link.href = `/api/replays/${replay.id}/download`
    link.download = `wtf-replay-${replay.id}.mp4`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
}

function editCamera(camera) {
  toastStore.info('Camera editing not implemented yet')
}

function deleteCamera(camera) {
  if (confirm(`Delete camera "${camera.name}"?`)) {
    apiStore.cameras.delete(camera.id)
      .then(() => {
        toastStore.success('Camera deleted')
        refreshData()
      })
      .catch(() => {
        toastStore.error('Failed to delete camera')
      })
  }
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleString()
}

function startFrameRefresh() {
  // Refresh camera frames every 500ms for smoother live preview
  frameRefreshInterval.value = setInterval(() => {
    frameRefreshTimestamp.value = Date.now()
    lastFrameUpdate.value = new Date().toLocaleTimeString()
  }, 500)
}

function stopFrameRefresh() {
  if (frameRefreshInterval.value) {
    clearInterval(frameRefreshInterval.value)
    frameRefreshInterval.value = null
  }
}

function handleFrameLoad() {
  // Frame loaded successfully
  lastFrameUpdate.value = new Date().toLocaleTimeString()
}

function handleFrameError() {
  console.warn('Failed to load camera frame')
}

function openCameraClient() {
  const cameraUrl = 'http://localhost:3001'
  window.open(cameraUrl, '_blank', 'width=400,height=600,scrollbars=yes,resizable=yes')
  toastStore.info('Opening camera client in new window')
}

// Camera setup functions
async function setupCamera() {
  connectingCamera.value = true
  
  try {
    // Build camera URL based on protocol
    // Extract values to avoid reactive object serialization
    const protocol = String(newCamera.value.protocol || 'http')
    const ipAddress = String(newCamera.value.ipAddress || '')
    const port = String(newCamera.value.port || '80')
    const path = String(newCamera.value.path || '/video')
    const username = String(newCamera.value.username || '')
    const password = String(newCamera.value.password || '')
    
    const auth = username && password ? `${username}:${password}@` : ''
    const cameraUrl = `${protocol}://${auth}${ipAddress}:${port}${path}`
    
    toastStore.info('Testing camera connection...')
    
    // Extract all reactive values to plain JavaScript values
    const currentTableId = String(tableId.value || route.params.id)
    const cameraName = String(newCamera.value.name || `${ipAddress}:${port}`)
    const cameraPosition = String(newCamera.value.position || 'center')
    
    // Register camera with API
    const response = await fetch('/api/cameras', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        table_id: currentTableId,
        name: cameraName,
        position: cameraPosition,
        rtsp_url: cameraUrl,
        metadata: {
          type: protocol === 'rtsp' ? 'rtsp' : 'mjpeg',
          source: 'Custom Camera',
          ip: ipAddress,
          port: parseInt(port) || 80,
          protocol: protocol,
          username: username,
          password: password
        }
      })
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to register camera')
    }
    
    const camera = await response.json()
    
    // Start continuous recording
    const streamResponse = await fetch(`/api/cameras/${camera.id}/start-stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        input_source: cameraUrl,
        recording_mode: 'continuous'
      })
    })
    
    if (!streamResponse.ok) {
      const error = await streamResponse.json()
      throw new Error(error.error || 'Failed to start camera stream')
    }
    
    toastStore.success('Camera connected and recording started!')
    
    // Reset and close form
    resetCameraForm()
    
    // Refresh data
    await loadTableData()
    
  } catch (error) {
    console.error('Camera setup failed:', error)
    toastStore.error(`Failed to connect camera: ${error.message}`)
  } finally {
    connectingCamera.value = false
  }
}

function cancelCameraSetup() {
  resetCameraForm()
}

function resetCameraForm() {
  showCameraSetup.value = false
  connectingCamera.value = false
  newCamera.value = {
    name: '',
    position: 'corner-1',
    protocol: 'http',
    ipAddress: '192.168.12.215',
    port: 8081,
    username: 'admin',
    password: 'admin',
    path: '/video'
  }
}

// Camera status functions
function isCameraLive(camera) {
  if (!camera.last_seen) return false
  
  // Consider camera live if last seen within 10 seconds
  const lastSeen = new Date(camera.last_seen)
  const now = new Date()
  const diffSeconds = (now - lastSeen) / 1000
  
  return camera.status === 'online' && diffSeconds < 10
}

function getCameraStatusClass(camera) {
  if (isCameraLive(camera)) return 'online'
  return 'offline'
}

function getCameraStatusIcon(camera) {
  if (isCameraLive(camera)) return '🟢'
  return '🔴'
}

function getCameraStatusText(camera) {
  if (isCameraLive(camera)) return 'Live'
  if (camera.status === 'online') return 'Starting...'
  return 'Offline'
}

// Lifecycle
onMounted(() => {
  loadTableData()
  startFrameRefresh()
})

onUnmounted(() => {
  wsStore.unsubscribeFromTable()
  stopFrameRefresh()
})
</script>

<style scoped>
.table-view {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0;
  min-height: 100vh;
  background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
  color: white;
}

.app-header {
  background: rgba(0, 0, 0, 0.3);
  padding: 15px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.header-content {
  display: flex;
  align-items: center;
  gap: 20px;
}

.back-btn {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  padding: 8px 16px;
  border-radius: 5px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 14px;
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.app-title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: bold;
  color: white;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 30px;
  padding: 20px;
}

.live-indicator.recording {
  background: #ff4444;
  animation: pulse-red 1s infinite;
}

@keyframes pulse-red {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.header-info h2 {
  margin: 0 0 10px 0;
  color: #333;
  font-size: 2rem;
}

.location {
  color: #666;
  margin: 0;
  font-size: 1.1rem;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 15px;
}

.connection-status {
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: bold;
}

.connection-status.connected {
  background: rgba(40, 167, 69, 0.1);
  color: #28a745;
}

.connection-status.disconnected {
  background: rgba(220, 53, 69, 0.1);
  color: #dc3545;
}

.refresh-btn {
  padding: 10px 20px;
  background: #2a5298;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: bold;
  transition: all 0.3s ease;
}

.refresh-btn:hover:not(:disabled) {
  background: #1e3a6f;
  transform: translateY(-2px);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 40px;
}

.stat-card {
  background: white;
  padding: 25px;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  text-align: center;
  border-left: 4px solid #e1e5e9;
  transition: all 0.3s ease;
}

.stat-card.online {
  border-left-color: #28a745;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.stat-number {
  font-size: 2.5rem;
  font-weight: bold;
  color: #2a5298;
  margin-bottom: 8px;
}

.stat-label {
  color: #666;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.wtf-section {
  text-align: center;
  margin: 50px 0;
  padding: 40px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 20px;
  color: white;
}

.wtf-button {
  background: linear-gradient(45deg, #ff6b6b, #ee5a24);
  border: none;
  color: white;
  padding: 25px 50px;
  font-size: 2rem;
  font-weight: bold;
  border-radius: 50px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  text-transform: uppercase;
  letter-spacing: 2px;
  margin-bottom: 20px;
}

.wtf-button:hover:not(:disabled) {
  transform: translateY(-4px);
  box-shadow: 0 15px 40px rgba(0, 0, 0, 0.4);
}

.wtf-button:active:not(:disabled) {
  transform: translateY(-2px);
}

.wtf-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.wtf-text {
  display: inline-block;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

.wtf-description {
  font-size: 1.2rem;
  opacity: 0.9;
  margin: 0;
}

.demo-controls {
  margin-top: 20px;
  text-align: center;
}

.demo-btn {
  background: linear-gradient(45deg, #ff6b6b, #feca57);
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.demo-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
}

.demo-text {
  font-size: 0.9rem;
  color: #666;
  margin-top: 10px;
  font-style: italic;
}

.demo-pulse {
  animation: demo-pulse 1.5s ease-in-out infinite !important;
}

@keyframes demo-pulse {
  0%, 100% { 
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(74, 144, 226, 0.7);
  }
  50% { 
    transform: scale(1.05);
    box-shadow: 0 0 0 10px rgba(74, 144, 226, 0);
  }
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.section-header h3 {
  margin: 0;
  color: #333;
  font-size: 1.5rem;
}

.add-camera-btn, .setup-camera-btn {
  padding: 10px 20px;
  background: #28a745;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: bold;
  text-decoration: none;
  transition: all 0.3s ease;
}

.add-camera-btn:hover, .setup-camera-btn:hover {
  background: #218838;
  transform: translateY(-2px);
}

.cameras-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  margin-bottom: 50px;
}

.camera-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  transition: all 0.3s ease;
}

.camera-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.camera-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  background: #f8f9fa;
  border-bottom: 1px solid #dee2e6;
}

.camera-header h4 {
  margin: 0;
  color: #333;
}

.camera-status {
  font-size: 0.9rem;
  font-weight: bold;
}

.camera-status.online {
  color: #28a745;
}

.camera-status.offline {
  color: #6c757d;
}

.camera-preview {
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.live-feed, .offline-feed {
  text-align: center;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.live-feed {
  background: #000;
  color: white;
  position: relative;
  overflow: hidden;
}

.live-frame {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.camera-frame {
  max-width: 100%;
  max-height: 100%;
  object-fit: cover;
}

.live-indicator {
  position: absolute;
  top: 10px;
  left: 10px;
  background: rgba(255, 0, 0, 0.9);
  color: white;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: bold;
  z-index: 10;
  animation: blink 2s infinite;
}

.frame-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(transparent, rgba(0,0,0,0.7));
  color: white;
  padding: 15px 10px 10px;
  font-size: 0.8rem;
}

.frame-info {
  font-weight: bold;
  margin-bottom: 2px;
}

.frame-time {
  opacity: 0.8;
  font-size: 0.7rem;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0.7; }
}

.offline-feed {
  background: #f8f9fa;
  color: #6c757d;
}

.camera-actions {
  display: flex;
  gap: 10px;
  padding: 15px 20px;
}

.edit-btn, .delete-btn {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #dee2e6;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.3s ease;
}

.edit-btn:hover {
  background: #f8f9fa;
  border-color: #2a5298;
}

.delete-btn:hover {
  background: #f8f9fa;
  border-color: #dc3545;
  color: #dc3545;
}

.replays-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.replay-card {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: all 0.3s ease;
}

.replay-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.replay-thumbnail {
  position: relative;
  height: 140px;
  background: #f8f9fa;
  display: flex;
  align-items: center;
  justify-content: center;
}

.replay-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumbnail-placeholder {
  font-size: 3rem;
  color: #dee2e6;
}

.replay-duration {
  position: absolute;
  bottom: 8px;
  right: 8px;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.8rem;
}

.replay-info {
  padding: 15px;
}

.replay-time {
  font-size: 0.9rem;
  color: #666;
  margin-bottom: 5px;
}

.replay-cameras {
  font-size: 0.8rem;
  color: #2a5298;
  font-weight: bold;
  margin-bottom: 8px;
}

.replay-status {
  font-size: 0.8rem;
  font-weight: bold;
}

.replay-status.completed {
  color: #28a745;
}

.replay-status.processing {
  color: #ffc107;
}

.replay-actions {
  display: flex;
  gap: 8px;
  padding: 0 15px 15px;
}

.share-btn, .download-btn {
  flex: 1;
  padding: 6px 10px;
  border: 1px solid #dee2e6;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
  transition: all 0.3s ease;
}

.share-btn:hover {
  background: #f0f4ff;
  border-color: #2a5298;
  color: #2a5298;
}

.download-btn:hover {
  background: #f8f9fa;
  border-color: #6c757d;
}

.no-cameras, .no-replays {
  text-align: center;
  padding: 50px 20px;
  color: #666;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: white;
  border-radius: 12px;
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #eee;
}

.modal-header h3 {
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-content {
  padding: 20px;
}

.modal-content ol {
  margin: 20px 0;
  padding-left: 20px;
}

.modal-content li {
  margin-bottom: 10px;
}

.modal-content code {
  background: #f8f9fa;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: monospace;
}

.qr-section {
  text-align: center;
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #eee;
}

.qr-placeholder {
  width: 150px;
  height: 150px;
  border: 2px dashed #dee2e6;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 15px auto;
  color: #666;
  text-align: center;
  font-size: 0.9rem;
}

.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #2a5298;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@media (max-width: 768px) {
  .table-header {
    flex-direction: column;
    gap: 20px;
  }
  
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .cameras-grid, .replays-grid {
    grid-template-columns: 1fr;
  }
  
  .wtf-button {
    padding: 20px 40px;
    font-size: 1.5rem;
  }
}

/* Camera Setup Form */
.camera-setup-form {
  background: #f8f9fa;
  padding: 25px;
  border-radius: 8px;
  margin-top: 20px;
  border: 1px solid #dee2e6;
}

.camera-setup-form h4 {
  margin: 0 0 20px 0;
  color: #333;
  font-size: 1.2rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
  margin-bottom: 15px;
}

.form-row:last-child {
  grid-template-columns: 2fr 1fr;
}

.camera-setup-form label {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.camera-setup-form label span {
  font-weight: 600;
  color: #555;
  font-size: 0.9rem;
}

.camera-setup-form input,
.camera-setup-form select {
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 5px;
  font-size: 0.95rem;
  transition: border-color 0.3s ease;
}

.camera-setup-form input:focus,
.camera-setup-form select:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.form-actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #eee;
}

.connect-btn {
  background: #28a745;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  flex: 1;
}

.connect-btn:hover:not(:disabled) {
  background: #218838;
  transform: translateY(-1px);
}

.connect-btn:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

.cancel-btn {
  background: #6c757d;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.cancel-btn:hover {
  background: #5a6268;
}

@media (max-width: 768px) {
  .form-row {
    grid-template-columns: 1fr;
  }
  
  .form-actions {
    flex-direction: column;
  }
}
</style>