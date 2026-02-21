import { defineStore } from 'pinia'
import axios from 'axios'
import { ref } from 'vue'
import { useToastStore } from './toast'

// Configure axios defaults
axios.defaults.baseURL = '/api'
axios.defaults.timeout = 10000

// Add response interceptor for error handling
axios.interceptors.response.use(
  response => response,
  error => {
    const toastStore = useToastStore()
    
    if (error.response) {
      // Server responded with error status
      const message = error.response.data?.error || 'Server error'
      toastStore.show(message, 'error')
    } else if (error.request) {
      // Request made but no response
      toastStore.show('Network error - server unreachable', 'error')
    } else {
      // Something else happened
      toastStore.show('Request failed', 'error')
    }
    
    return Promise.reject(error)
  }
)

export const useApiStore = defineStore('api', () => {
  const loading = ref(false)
  const error = ref(null)

  // Helper function to handle API calls
  async function apiCall(asyncFn) {
    loading.value = true
    error.value = null
    
    try {
      const result = await asyncFn()
      return result
    } catch (err) {
      error.value = err.response?.data?.error || err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  // Tables API
  const tables = {
    async getAll() {
      return apiCall(async () => {
        const response = await axios.get('/tables')
        return response.data
      })
    },

    async getById(id) {
      return apiCall(async () => {
        const response = await axios.get(`/tables/${id}`)
        return response.data
      })
    },

    async create(tableData) {
      return apiCall(async () => {
        const response = await axios.post('/tables', tableData)
        return response.data
      })
    },

    async update(id, updates) {
      return apiCall(async () => {
        const response = await axios.put(`/tables/${id}`, updates)
        return response.data
      })
    },

    async delete(id) {
      return apiCall(async () => {
        const response = await axios.delete(`/tables/${id}`)
        return response.data
      })
    },

    async getStatus(id) {
      return apiCall(async () => {
        const response = await axios.get(`/tables/${id}/status`)
        return response.data
      })
    }
  }

  // Cameras API
  const cameras = {
    async getAll(tableId = null) {
      return apiCall(async () => {
        const params = tableId ? { table_id: tableId } : {}
        const response = await axios.get('/cameras', { params })
        return response.data
      })
    },

    async getById(id) {
      return apiCall(async () => {
        const response = await axios.get(`/cameras/${id}`)
        return response.data
      })
    },

    async create(cameraData) {
      return apiCall(async () => {
        const response = await axios.post('/cameras', cameraData)
        return response.data
      })
    },

    async update(id, updates) {
      return apiCall(async () => {
        const response = await axios.put(`/cameras/${id}`, updates)
        return response.data
      })
    },

    async delete(id) {
      return apiCall(async () => {
        const response = await axios.delete(`/cameras/${id}`)
        return response.data
      })
    },

    async startStream(id, inputSource) {
      return apiCall(async () => {
        const response = await axios.post(`/cameras/${id}/start-stream`, {
          input_source: inputSource
        })
        return response.data
      })
    },

    async stopStream(id) {
      return apiCall(async () => {
        const response = await axios.post(`/cameras/${id}/stop-stream`)
        return response.data
      })
    }
  }

  // Replays API
  const replays = {
    async getAll(tableId = null, params = {}) {
      return apiCall(async () => {
        const queryParams = { ...params }
        if (tableId) queryParams.table_id = tableId
        
        const response = await axios.get('/replays', { params: queryParams })
        return response.data
      })
    },

    async getById(id) {
      return apiCall(async () => {
        const response = await axios.get(`/replays/${id}`)
        return response.data
      })
    },

    async create(replayData) {
      return apiCall(async () => {
        const response = await axios.post('/replays', replayData)
        return response.data
      })
    },

    async delete(id) {
      return apiCall(async () => {
        const response = await axios.delete(`/replays/${id}`)
        return response.data
      })
    },

    async getStatus(id) {
      return apiCall(async () => {
        const response = await axios.get(`/replays/${id}/status`)
        return response.data
      })
    },

    async cleanup(maxAgeDays = 7) {
      return apiCall(async () => {
        const response = await axios.post('/replays/cleanup', {
          max_age_days: maxAgeDays
        })
        return response.data
      })
    }
  }

  // Webhooks API (for testing)
  const webhooks = {
    async sendReplayRequest(tableId, duration = 30) {
      return apiCall(async () => {
        const response = await axios.post('/webhooks/replay', {
          table_id: tableId,
          duration: duration,
          device_id: 'web-interface',
          timestamp: new Date().toISOString()
        })
        return response.data
      })
    }
  }

  // Generic HTTP methods for component compatibility
  async function get(url, config = {}) {
    return apiCall(async () => {
      const response = await axios.get(url, config)
      return response.data
    })
  }

  async function post(url, data = {}, config = {}) {
    return apiCall(async () => {
      const response = await axios.post(url, data, config)
      return response.data
    })
  }

  async function put(url, data = {}, config = {}) {
    return apiCall(async () => {
      const response = await axios.put(url, data, config)
      return response.data
    })
  }

  async function del(url, config = {}) {
    return apiCall(async () => {
      const response = await axios.delete(url, config)
      return response.data
    })
  }

  // Alias for delete (since 'delete' is a reserved word)
  const deleteMethod = del

  return {
    loading,
    error,
    tables,
    cameras,
    replays,
    webhooks,
    // Generic HTTP methods
    get,
    post,
    put,
    delete: deleteMethod,
    del
  }
})