import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { io } from 'socket.io-client'
import { useToastStore } from './toast'

export const useWebSocketStore = defineStore('websocket', () => {
  const socket = ref(null)
  const isConnected = ref(false)
  const currentTableId = ref(null)
  const lastMessage = ref(null)

  const connectionStatus = computed(() => {
    return isConnected.value ? 'Connected' : 'Disconnected'
  })

  function connect() {
    if (socket.value) {
      return // Already connected
    }

    try {
      socket.value = io('ws://localhost:3000', {
        transports: ['websocket'],
        timeout: 5000
      })

      socket.value.on('connect', () => {
        isConnected.value = true
        console.log('WebSocket connected')
        
        const toastStore = useToastStore()
        toastStore.show('Connected to server', 'success')
      })

      socket.value.on('disconnect', () => {
        isConnected.value = false
        console.log('WebSocket disconnected')
        
        const toastStore = useToastStore()
        toastStore.show('Disconnected from server', 'warning')
      })

      socket.value.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error)
        
        const toastStore = useToastStore()
        toastStore.show('Connection error: ' + error.message, 'error')
      })

      // Handle incoming messages
      socket.value.on('message', (data) => {
        lastMessage.value = data
        handleMessage(data)
      })

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error)
      const toastStore = useToastStore()
      toastStore.show('Failed to connect to server', 'error')
    }
  }

  function disconnect() {
    if (socket.value) {
      socket.value.disconnect()
      socket.value = null
      isConnected.value = false
      currentTableId.value = null
    }
  }

  function subscribeToTable(tableId) {
    if (!socket.value || !isConnected.value) {
      console.warn('Cannot subscribe: WebSocket not connected')
      return
    }

    currentTableId.value = tableId
    socket.value.emit('message', JSON.stringify({
      type: 'subscribe_table',
      tableId: tableId
    }))

    console.log(`Subscribed to table: ${tableId}`)
  }

  function unsubscribeFromTable() {
    currentTableId.value = null
    // Could send unsubscribe message if needed
  }

  function handleMessage(data) {
    console.log('WebSocket message received:', data)
    const toastStore = useToastStore()

    switch (data.type) {
      case 'subscribed':
        console.log(`Subscribed to table ${data.tableId}`)
        break
        
      case 'camera_status':
        toastStore.show(
          `Camera ${data.cameraId} is now ${data.status}`, 
          data.status === 'online' ? 'success' : 'warning'
        )
        break
        
      case 'replay_ready':
        toastStore.show(
          `New replay is ready! Duration: ${data.replay.duration}s`, 
          'success'
        )
        // Could emit event for components to refresh
        break
        
      case 'replay_error':
        toastStore.show(
          `Replay creation failed: ${data.error}`, 
          'error'
        )
        break
        
      case 'camera_removed':
        toastStore.show(
          `Camera ${data.cameraId} has been removed`, 
          'warning'
        )
        break
        
      default:
        console.log('Unknown message type:', data.type)
    }
  }

  return {
    socket,
    isConnected,
    currentTableId,
    lastMessage,
    connectionStatus,
    connect,
    disconnect,
    subscribeToTable,
    unsubscribeFromTable
  }
})