<template>
  <div class="replays-view">
    <!-- Header -->
    <div class="header">
      <button @click="goBack" class="back-btn">← Back</button>
      <div class="header-info">
        <h1>🎬 Replays</h1>
        <p v-if="currentTable">{{ currentTable.name }} - {{ currentTable.location }}</p>
      </div>
      <div class="header-actions">
        <button @click="refreshReplays" class="refresh-btn" :disabled="loading">
          🔄 Refresh
        </button>
      </div>
    </div>

    <!-- Filters -->
    <div class="filters">
      <div class="filter-group">
        <label>Date Range:</label>
        <select v-model="filterDate" @change="applyFilters">
          <option value="all">All Time</option>
          <option value="today">Today</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
        </select>
      </div>
      
      <div class="filter-group">
        <label>Sort By:</label>
        <select v-model="sortBy" @change="applyFilters">
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="duration">Duration</option>
          <option value="name">Name</option>
        </select>
      </div>
      
      <div class="filter-stats">
        <span>{{ filteredReplays.length }} replays</span>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-container">
      <div class="spinner"></div>
      <p>Loading replays...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-container">
      <div class="error-card">
        <h3>❌ Error Loading Replays</h3>
        <p>{{ error }}</p>
        <button @click="loadReplays" class="retry-btn">🔄 Retry</button>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="replays.length === 0" class="empty-container">
      <div class="empty-card">
        <h3>📹 No Replays Yet</h3>
        <p>Replays will appear here when you trigger the WTF button</p>
        <div class="empty-actions">
          <button @click="goToTable" class="goto-table-btn">📊 Manage Table</button>
          <button @click="triggerTestReplay" class="test-replay-btn">🧪 Test Replay</button>
        </div>
      </div>
    </div>

    <!-- Replays Grid -->
    <div v-else class="replays-container">
      <div class="replays-grid">
        <div 
          v-for="replay in filteredReplays" 
          :key="replay.id"
          class="replay-card"
          :class="{ 'processing': replay.status === 'processing' }"
        >
          <!-- Thumbnail -->
          <div class="replay-thumbnail" @click="playReplay(replay)">
            <img 
              v-if="replay.thumbnail" 
              :src="replay.thumbnail" 
              :alt="replay.name || 'Replay thumbnail'"
              @error="handleThumbnailError"
            >
            <div v-else class="thumbnail-placeholder">
              <span class="play-icon">▶️</span>
              <span class="duration">{{ formatDuration(replay.duration) }}</span>
            </div>
            
            <!-- Status Overlay -->
            <div v-if="replay.status === 'processing'" class="status-overlay">
              <div class="processing-spinner"></div>
              <span>Processing...</span>
            </div>
          </div>

          <!-- Replay Info -->
          <div class="replay-info">
            <h3>{{ replay.name || `Replay ${new Date(replay.created_at).toLocaleString()}` }}</h3>
            
            <div class="replay-meta">
              <div class="meta-item">
                <span class="meta-label">📅</span>
                <span>{{ formatDate(replay.created_at) }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">⏱️</span>
                <span>{{ formatDuration(replay.duration) }}</span>
              </div>
              <div class="meta-item" v-if="replay.cameras">
                <span class="meta-label">📹</span>
                <span>{{ replay.cameras.length }} cameras</span>
              </div>
            </div>
            
            <div class="replay-description" v-if="replay.description">
              <p>{{ replay.description }}</p>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="replay-actions">
            <button @click="playReplay(replay)" class="action-btn play-btn" :disabled="replay.status === 'processing'">
              ▶️ Play
            </button>
            <button @click="shareReplay(replay)" class="action-btn share-btn" :disabled="replay.status === 'processing'">
              🔗 Share
            </button>
            <button @click="downloadReplay(replay)" class="action-btn download-btn" :disabled="replay.status === 'processing'">
              📥 Download
            </button>
            <button @click="deleteReplay(replay)" class="action-btn delete-btn">
              🗑️ Delete
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Video Player Modal -->
    <div v-if="playingReplay" class="video-modal" @click="closePlayer">
      <div class="video-container" @click.stop>
        <video 
          ref="videoPlayer"
          :src="playingReplay.video_url"
          controls
          autoplay
          @ended="closePlayer"
        ></video>
        <button @click="closePlayer" class="close-btn">✕</button>
      </div>
    </div>

    <!-- Share Modal -->
    <ShareReplayModal 
      v-if="sharingReplay" 
      :replay="sharingReplay"
      @close="sharingReplay = null"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useApiStore } from '../stores/api'
import { useToastStore } from '../stores/toast'
import ShareReplayModal from '../components/ShareReplayModal.vue'

const route = useRoute()
const router = useRouter()
const api = useApiStore()
const toast = useToastStore()

// Props
const tableId = computed(() => route.params.tableId)

// State
const replays = ref([])
const currentTable = ref(null)
const loading = ref(true)
const error = ref(null)
const filterDate = ref('all')
const sortBy = ref('newest')
const playingReplay = ref(null)
const sharingReplay = ref(null)
const videoPlayer = ref(null)

// Computed
const filteredReplays = computed(() => {
  let filtered = [...replays.value]
  
  // Apply date filter
  if (filterDate.value !== 'all') {
    const now = new Date()
    const cutoffDate = new Date()
    
    switch (filterDate.value) {
      case 'today':
        cutoffDate.setHours(0, 0, 0, 0)
        break
      case 'week':
        cutoffDate.setDate(now.getDate() - 7)
        break
      case 'month':
        cutoffDate.setMonth(now.getMonth() - 1)
        break
    }
    
    filtered = filtered.filter(replay => 
      new Date(replay.created_at) >= cutoffDate
    )
  }
  
  // Apply sorting
  filtered.sort((a, b) => {
    switch (sortBy.value) {
      case 'newest':
        return new Date(b.created_at) - new Date(a.created_at)
      case 'oldest':
        return new Date(a.created_at) - new Date(b.created_at)
      case 'duration':
        return (b.duration || 0) - (a.duration || 0)
      case 'name':
        return (a.name || '').localeCompare(b.name || '')
      default:
        return 0
    }
  })
  
  return filtered
})

// Methods
async function loadReplays() {
  try {
    loading.value = true
    error.value = null
    
    if (tableId.value) {
      // Load replays for specific table
      try {
        const [replaysResponse, tableResponse] = await Promise.all([
          api.get(`/replays?table_id=${tableId.value}`),
          api.get(`/tables/${tableId.value}`)
        ])
        
        replays.value = replaysResponse || []
        currentTable.value = tableResponse
      } catch (tableError) {
        // If replays fail but table exists, show empty state
        console.warn('Failed to load replays:', tableError)
        try {
          const tableResponse = await api.get(`/tables/${tableId.value}`)
          currentTable.value = tableResponse
          replays.value = []
        } catch (err) {
          throw err // Re-throw if table doesn't exist
        }
      }
    } else {
      // Load all replays
      const response = await api.get('/replays')
      replays.value = response || []
      currentTable.value = null
    }
  } catch (err) {
    error.value = 'Failed to load replays: ' + err.message
    console.error('Load replays error:', err)
  } finally {
    loading.value = false
  }
}

function refreshReplays() {
  loadReplays()
}

function applyFilters() {
  // Filters are applied via computed property
}

function goBack() {
  if (tableId.value) {
    router.push(`/table/${tableId.value}`)
  } else {
    router.push('/')
  }
}

function goToTable() {
  if (tableId.value) {
    router.push(`/table/${tableId.value}`)
  }
}

function playReplay(replay) {
  if (replay.status === 'processing') return
  
  playingReplay.value = replay
}

function closePlayer() {
  playingReplay.value = null
  if (videoPlayer.value) {
    videoPlayer.value.pause()
  }
}

function shareReplay(replay) {
  if (replay.status === 'processing') return
  
  sharingReplay.value = replay
}

function downloadReplay(replay) {
  if (replay.status === 'processing') return
  
  if (replay.video_url) {
    const link = document.createElement('a')
    link.href = replay.video_url
    link.download = `${replay.name || 'replay'}.mp4`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    toast.success('Download started!')
  } else {
    toast.error('Video file not available')
  }
}

async function deleteReplay(replay) {
  if (!confirm(`Are you sure you want to delete this replay?`)) return
  
  try {
    await api.delete(`/replays/${replay.id}`)
    toast.success('Replay deleted successfully')
    await loadReplays()
  } catch (err) {
    toast.error('Failed to delete replay: ' + err.message)
    console.error('Delete replay error:', err)
  }
}

async function triggerTestReplay() {
  if (!tableId.value) {
    toast.error('No table selected')
    return
  }
  
  try {
    await api.post('/webhooks/replay', {
      table_id: tableId.value,
      duration: 30,
      device_id: 'web-interface',
      metadata: {
        trigger_type: 'manual',
        source: 'replays-view'
      }
    })
    
    toast.success('Test replay triggered! It will appear here when ready.')
    setTimeout(loadReplays, 2000) // Refresh after 2 seconds
  } catch (err) {
    toast.error('Failed to trigger replay: ' + err.message)
    console.error('Trigger replay error:', err)
  }
}

function formatDate(dateString) {
  const date = new Date(dateString)
  return date.toLocaleString()
}

function formatDuration(seconds) {
  if (!seconds) return '0:00'
  
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function handleThumbnailError(event) {
  event.target.style.display = 'none'
}

// Watchers
watch(() => route.params.tableId, () => {
  loadReplays()
})

// Lifecycle
onMounted(() => {
  loadReplays()
})
</script>

<style scoped>
.replays-view {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  color: white;
}

.back-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  background: rgba(255,255,255,0.2);
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
}

.back-btn:hover {
  background: rgba(255,255,255,0.3);
}

.header-info h1 {
  margin: 0;
  font-size: 2rem;
}

.header-info p {
  margin: 5px 0 0 0;
  opacity: 0.9;
}

.refresh-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  background: #51cf66;
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
}

.refresh-btn:hover:not(:disabled) {
  background: #40c057;
}

.refresh-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.filters {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 20px;
  padding: 15px;
  background: rgba(255,255,255,0.1);
  border-radius: 10px;
  backdrop-filter: blur(10px);
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 8px;
  color: white;
}

.filter-group label {
  font-weight: bold;
}

.filter-group select {
  padding: 6px 10px;
  border: none;
  border-radius: 4px;
  background: white;
  color: #333;
}

.filter-stats {
  margin-left: auto;
  color: white;
  opacity: 0.9;
}

.loading-container, .error-container, .empty-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  color: white;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(255,255,255,0.3);
  border-radius: 50%;
  border-top-color: white;
  animation: spin 1s linear infinite;
  margin-bottom: 20px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-card, .empty-card {
  background: rgba(255,255,255,0.1);
  backdrop-filter: blur(10px);
  padding: 30px;
  border-radius: 15px;
  text-align: center;
  border: 1px solid rgba(255,255,255,0.2);
}

.retry-btn, .goto-table-btn, .test-replay-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-weight: bold;
  cursor: pointer;
  margin: 10px 5px;
  transition: all 0.3s ease;
}

.retry-btn {
  background: #ff6b6b;
  color: white;
}

.goto-table-btn {
  background: #3498db;
  color: white;
}

.test-replay-btn {
  background: #f39c12;
  color: white;
}

.replays-container {
  max-width: 1400px;
  margin: 0 auto;
}

.replays-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}

.replay-card {
  background: rgba(255,255,255,0.95);
  border-radius: 15px;
  overflow: hidden;
  transition: all 0.3s ease;
  border: 2px solid transparent;
}

.replay-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 25px rgba(0,0,0,0.2);
  border-color: #667eea;
}

.replay-card.processing {
  opacity: 0.7;
}

.replay-thumbnail {
  position: relative;
  height: 180px;
  background: #f8f9fa;
  cursor: pointer;
  overflow: hidden;
}

.replay-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumbnail-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.play-icon {
  font-size: 3rem;
  margin-bottom: 10px;
}

.duration {
  font-size: 1.2rem;
  font-weight: bold;
}

.status-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.7);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: white;
}

.processing-spinner {
  width: 30px;
  height: 30px;
  border: 3px solid rgba(255,255,255,0.3);
  border-radius: 50%;
  border-top-color: white;
  animation: spin 1s linear infinite;
  margin-bottom: 10px;
}

.replay-info {
  padding: 15px;
}

.replay-info h3 {
  margin: 0 0 10px 0;
  color: #2c3e50;
  font-size: 1.1rem;
}

.replay-meta {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin: 10px 0;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
  color: #7f8c8d;
}

.meta-label {
  width: 20px;
}

.replay-description p {
  margin: 10px 0 0 0;
  color: #7f8c8d;
  font-size: 0.9rem;
  line-height: 1.4;
}

.replay-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  padding: 0 15px 15px 15px;
}

.action-btn {
  padding: 8px 12px;
  border: none;
  border-radius: 6px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.play-btn {
  background: #51cf66;
  color: white;
}

.share-btn {
  background: #3498db;
  color: white;
}

.download-btn {
  background: #f39c12;
  color: white;
}

.delete-btn {
  background: #e74c3c;
  color: white;
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  opacity: 0.9;
}

.video-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.video-container {
  position: relative;
  max-width: 90vw;
  max-height: 90vh;
}

.video-container video {
  width: 100%;
  height: auto;
  max-height: 90vh;
  border-radius: 10px;
}

.close-btn {
  position: absolute;
  top: -40px;
  right: 0;
  background: rgba(255,255,255,0.2);
  color: white;
  border: none;
  width: 30px;
  height: 30px;
  border-radius: 15px;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.3s ease;
}

.close-btn:hover {
  background: rgba(255,255,255,0.3);
}

@media (max-width: 768px) {
  .header {
    flex-direction: column;
    gap: 15px;
    align-items: stretch;
    text-align: center;
  }
  
  .filters {
    flex-direction: column;
    gap: 15px;
    align-items: stretch;
  }
  
  .filter-group {
    justify-content: space-between;
  }
  
  .replays-grid {
    grid-template-columns: 1fr;
  }
  
  .replay-actions {
    grid-template-columns: 1fr 1fr;
  }
}
</style>