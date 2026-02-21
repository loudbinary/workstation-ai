<template>
  <div class="tables-list-view">
    <!-- Header -->
    <div class="header">
      <h1>🎱 WTF Replay System</h1>
      <p>Select a billiard table to manage cameras and replays</p>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-container">
      <div class="spinner"></div>
      <p>Loading tables...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-container">
      <div class="error-card">
        <h3>❌ Error Loading Tables</h3>
        <p>{{ error }}</p>
        <button @click="loadTables" class="retry-btn">🔄 Retry</button>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="tables.length === 0" class="empty-container">
      <div class="empty-card">
        <h3>🆕 No Tables Found</h3>
        <p>Create your first billiard table to get started</p>
        <button @click="showCreateForm = true" class="create-btn">➕ Create Table</button>
      </div>
    </div>

    <!-- Tables Grid -->
    <div v-else class="tables-container">
      <div class="tables-header">
        <h2>Billiard Tables ({{ tables.length }})</h2>
        <button @click="showCreateForm = true" class="create-btn">➕ Add Table</button>
      </div>

      <div class="tables-grid">
        <div 
          v-for="table in tables" 
          :key="table.id"
          @click="selectTable(table.id)"
          class="table-card"
          :class="{ 'has-activity': table.onlineCameras > 0 }"
        >
          <!-- Table Status Indicator -->
          <div class="status-indicator" :class="getStatusClass(table)">
            <div class="status-dot"></div>
          </div>

          <!-- Table Info -->
          <div class="table-info">
            <h3>{{ table.name }}</h3>
            <p class="location">📍 {{ table.location || 'No location set' }}</p>
            
            <div class="table-stats">
              <div class="stat">
                <span class="stat-label">📹 Cameras:</span>
                <span class="stat-value">{{ table.onlineCameras }}/{{ table.cameraCount }}</span>
              </div>
              <div class="stat">
                <span class="stat-label">🎬 Active Streams:</span>
                <span class="stat-value">{{ table.activeStreams || 0 }}</span>
              </div>
            </div>
            
            <div class="table-config" v-if="table.config">
              <small>
                Replay: {{ table.config.replayDuration || 30 }}s | 
                Buffer: {{ table.config.bufferSeconds || 120 }}s
              </small>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="table-actions">
            <button @click.stop="viewReplays(table.id)" class="action-btn replays-btn">
              🎬 Replays
            </button>
            <button @click.stop="editTable(table)" class="action-btn edit-btn">
              ⚙️ Settings
            </button>
            <button @click.stop="confirmDeleteTable(table)" class="action-btn delete-btn">
              🗑️ Delete
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Create/Edit Table Modal -->
    <div v-if="showCreateForm || editingTable" class="modal-overlay" @click="closeModal">
      <div class="modal-content" @click.stop>
        <h3>{{ editingTable ? 'Edit Table' : 'Create New Table' }}</h3>
        
        <form @submit.prevent="saveTable" class="table-form">
          <div class="form-group">
            <label>Table Name *</label>
            <input 
              v-model="tableForm.name" 
              type="text" 
              required 
              placeholder="e.g., Table 1, VIP Table"
            >
          </div>
          
          <div class="form-group">
            <label>Location</label>
            <input 
              v-model="tableForm.location" 
              type="text" 
              placeholder="e.g., Main Hall, Private Room"
            >
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label>Replay Duration (seconds)</label>
              <input 
                v-model.number="tableForm.config.replayDuration" 
                type="number" 
                min="5" 
                max="300"
              >
            </div>
            
            <div class="form-group">
              <label>Buffer Duration (seconds)</label>
              <input 
                v-model.number="tableForm.config.bufferSeconds" 
                type="number" 
                min="30" 
                max="600"
              >
            </div>
          </div>
          
          <div class="form-actions">
            <button type="button" @click="closeModal" class="cancel-btn">Cancel</button>
            <button type="submit" class="save-btn" :disabled="saving">
              {{ saving ? 'Saving...' : editingTable ? 'Update' : 'Create' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useApiStore } from '../stores/api'
import { useToastStore } from '../stores/toast'

const router = useRouter()
const api = useApiStore()
const toast = useToastStore()

// State
const tables = ref([])
const loading = ref(true)
const error = ref(null)
const showCreateForm = ref(false)
const editingTable = ref(null)
const saving = ref(false)

// Form data
const tableForm = ref({
  name: '',
  location: '',
  config: {
    replayDuration: 30,
    bufferSeconds: 120
  }
})

// Methods
async function loadTables() {
  try {
    loading.value = true
    error.value = null
    
    const response = await api.get('/tables')
    tables.value = response || []
  } catch (err) {
    error.value = 'Failed to load tables: ' + err.message
    console.error('Load tables error:', err)
  } finally {
    loading.value = false
  }
}

function selectTable(tableId) {
  router.push(`/table/${tableId}`)
}

function viewReplays(tableId) {
  router.push(`/replays/${tableId}`)
}

function editTable(table) {
  editingTable.value = table
  tableForm.value = {
    name: table.name,
    location: table.location || '',
    config: {
      replayDuration: table.config?.replayDuration || 30,
      bufferSeconds: table.config?.bufferSeconds || 120
    }
  }
}

function closeModal() {
  showCreateForm.value = false
  editingTable.value = null
  tableForm.value = {
    name: '',
    location: '',
    config: {
      replayDuration: 30,
      bufferSeconds: 120
    }
  }
}

async function saveTable() {
  try {
    saving.value = true
    
    if (editingTable.value) {
      // Update existing table
      await api.put(`/tables/${editingTable.value.id}`, tableForm.value)
      toast.success('Table updated successfully!')
    } else {
      // Create new table
      await api.post('/tables', tableForm.value)
      toast.success('Table created successfully!')
    }
    
    closeModal()
    await loadTables()
  } catch (err) {
    toast.error('Failed to save table: ' + err.message)
    console.error('Save table error:', err)
  } finally {
    saving.value = false
  }
}

async function confirmDeleteTable(table) {
  const confirmMessage = `Are you sure you want to delete "${table.name}"?\n\nThis will also delete:\n- ${table.cameraCount} cameras\n- All replays and recordings\n\nThis action cannot be undone.`
  
  if (confirm(confirmMessage)) {
    await deleteTable(table.id)
  }
}

async function deleteTable(tableId) {
  try {
    await api.delete(`/tables/${tableId}`)
    toast.success('Table deleted successfully!')
    await loadTables() // Refresh the list
  } catch (err) {
    toast.error('Failed to delete table: ' + err.message)
    console.error('Delete table error:', err)
  }
}

function getStatusClass(table) {
  if (table.onlineCameras > 0) return 'online'
  if (table.cameraCount > 0) return 'offline'
  return 'no-cameras'
}

// Lifecycle
onMounted(() => {
  loadTables()
})
</script>

<style scoped>
.tables-list-view {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.header {
  text-align: center;
  color: white;
  margin-bottom: 30px;
}

.header h1 {
  font-size: 2.5rem;
  margin-bottom: 10px;
  text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
}

.header p {
  font-size: 1.1rem;
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

.retry-btn, .create-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-weight: bold;
  cursor: pointer;
  margin-top: 15px;
  transition: all 0.3s ease;
}

.retry-btn {
  background: #ff6b6b;
  color: white;
}

.create-btn {
  background: #51cf66;
  color: white;
}

.retry-btn:hover, .create-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(0,0,0,0.2);
}

.tables-container {
  max-width: 1200px;
  margin: 0 auto;
}

.tables-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  color: white;
}

.tables-header h2 {
  margin: 0;
  font-size: 1.5rem;
}

.tables-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
}

.table-card {
  background: rgba(255,255,255,0.95);
  border-radius: 15px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid transparent;
  position: relative;
  overflow: hidden;
}

.table-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 25px rgba(0,0,0,0.2);
  border-color: #667eea;
}

.table-card.has-activity {
  border-color: #51cf66;
}

.status-indicator {
  position: absolute;
  top: 15px;
  right: 15px;
  width: 12px;
  height: 12px;
}

.status-dot {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

.status-indicator.online .status-dot {
  background: #51cf66;
}

.status-indicator.offline .status-dot {
  background: #ffa502;
}

.status-indicator.no-cameras .status-dot {
  background: #ff6b6b;
}

@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
}

.table-info h3 {
  margin: 0 0 10px 0;
  color: #2c3e50;
  font-size: 1.3rem;
}

.location {
  color: #7f8c8d;
  margin: 0 0 15px 0;
}

.table-stats {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin: 15px 0;
}

.stat {
  display: flex;
  justify-content: space-between;
  font-size: 0.9rem;
}

.stat-label {
  color: #7f8c8d;
}

.stat-value {
  font-weight: bold;
  color: #2c3e50;
}

.table-config {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid #ecf0f1;
  color: #95a5a6;
}

.table-actions {
  display: flex;
  gap: 10px;
  margin-top: 15px;
}

.action-btn {
  flex: 1;
  padding: 8px 12px;
  border: none;
  border-radius: 6px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.replays-btn {
  background: #3498db;
  color: white;
}

.edit-btn {
  background: #95a5a6;
  color: white;
}

.delete-btn {
  background: #e74c3c;
  color: white;
}

.delete-btn:hover {
  background: #c0392b;
}

.action-btn:hover {
  transform: translateY(-1px);
  opacity: 0.9;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  background: white;
  border-radius: 15px;
  padding: 30px;
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-content h3 {
  margin: 0 0 20px 0;
  color: #2c3e50;
}

.table-form {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
}

.form-group label {
  font-weight: bold;
  color: #2c3e50;
}

.form-group input {
  padding: 10px;
  border: 2px solid #ecf0f1;
  border-radius: 6px;
  font-size: 1rem;
  transition: border-color 0.3s ease;
}

.form-group input:focus {
  outline: none;
  border-color: #667eea;
}

.form-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 20px;
}

.cancel-btn, .save-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
}

.cancel-btn {
  background: #95a5a6;
  color: white;
}

.save-btn {
  background: #51cf66;
  color: white;
}

.save-btn:disabled {
  background: #bdc3c7;
  cursor: not-allowed;
}

.cancel-btn:hover, .save-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 3px 10px rgba(0,0,0,0.2);
}

@media (max-width: 768px) {
  .tables-grid {
    grid-template-columns: 1fr;
  }
  
  .tables-header {
    flex-direction: column;
    gap: 15px;
    align-items: stretch;
  }
  
  .form-row {
    grid-template-columns: 1fr;
  }
  
  .form-actions {
    flex-direction: column;
  }
}
</style>