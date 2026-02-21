<template>
  <div class="share-modal-overlay" v-if="visible" @click="closeModal">
    <div class="share-modal" @click.stop>
      <div class="modal-header">
        <h3>🌍 Share Replay</h3>
        <button @click="closeModal" class="close-btn">&times;</button>
      </div>

      <div class="modal-content">
        <!-- Replay Preview -->
        <div class="replay-preview">
          <video v-if="replay.url" :src="replay.url" controls class="preview-video">
            Your browser does not support the video tag.
          </video>
          <div class="replay-info">
            <h4>{{ replay.title || `Replay ${replay.id}` }}</h4>
            <p>Table: {{ tableName }} | Duration: {{ replay.duration }}s</p>
            <p class="timestamp">{{ formatDate(replay.requested_at) }}</p>
          </div>
        </div>

        <!-- Platform Selection -->
        <div class="platform-selection" v-if="!selectedPlatform">
          <h4>Choose Platform</h4>
          <div class="platform-grid">
            <div 
              v-for="platform in availablePlatforms" 
              :key="platform.key"
              class="platform-card"
              :class="{ disabled: !platform.enabled }"
              @click="selectPlatform(platform)"
            >
              <div class="platform-icon">{{ platform.icon }}</div>
              <div class="platform-name">{{ platform.name }}</div>
              <div class="platform-fee">${{ getPlatformFee(platform.key) }}</div>
              <div v-if="!platform.enabled" class="platform-disabled">Not Available</div>
            </div>
          </div>
        </div>

        <!-- Payment Section -->
        <div class="payment-section" v-if="selectedPlatform && !paymentCompleted">
          <div class="payment-header">
            <button @click="goBack" class="back-btn">← Back</button>
            <h4>Complete Payment</h4>
          </div>

          <div class="fee-summary">
            <div class="fee-item">
              <span>Share to {{ selectedPlatform.name }}</span>
              <span class="fee-amount">${{ currentFee }}</span>
            </div>
            <div class="fee-total">
              <span>Total</span>
              <span class="total-amount">${{ currentFee }}</span>
            </div>
          </div>

          <!-- Payment Method Selection -->
          <div class="payment-methods">
            <h5>Payment Method</h5>
            <div class="method-buttons">
              <button 
                :class="['method-btn', { active: paymentMethod === 'stripe' }]"
                @click="paymentMethod = 'stripe'"
              >
                💳 Credit Card
              </button>
              <button 
                :class="['method-btn', { active: paymentMethod === 'paypal' }]"
                @click="paymentMethod = 'paypal'"
              >
                🟦 PayPal
              </button>
            </div>
          </div>

          <!-- Stripe Payment Form -->
          <div v-if="paymentMethod === 'stripe'" class="stripe-form">
            <div ref="stripeCard" class="stripe-card-element"></div>
            <button 
              @click="processStripePayment" 
              :disabled="processing" 
              class="payment-btn stripe-btn"
            >
              <span v-if="processing">Processing...</span>
              <span v-else>Pay ${{ currentFee }} with Card</span>
            </button>
          </div>

          <!-- PayPal Payment -->
          <div v-if="paymentMethod === 'paypal'" class="paypal-form">
            <div ref="paypalButton" class="paypal-button-container"></div>
          </div>
        </div>

        <!-- Share Configuration -->
        <div class="share-config" v-if="paymentCompleted && !shareCompleted">
          <h4>🎥 Configure Share</h4>
          
          <div class="share-form">
            <div class="form-group">
              <label>Title</label>
              <input 
                v-model="shareConfig.title" 
                type="text" 
                :placeholder="`Amazing billiards shot - Table ${tableId}`"
                maxlength="100"
              />
            </div>
            
            <div class="form-group">
              <label>Description</label>
              <textarea 
                v-model="shareConfig.description" 
                :placeholder="`Check out this incredible shot from ${tableName}!`"
                maxlength="500"
              ></textarea>
            </div>
            
            <div class="form-group" v-if="selectedPlatform.key !== 'googledrive'">
              <label>Privacy</label>
              <select v-model="shareConfig.privacy">
                <option value="public">Public</option>
                <option value="unlisted">Unlisted</option>
                <option value="private">Private</option>
              </select>
            </div>
            
            <div class="form-group" v-if="selectedPlatform.key === 'youtube'">
              <label>Tags (comma separated)</label>
              <input 
                v-model="shareConfig.tags" 
                type="text" 
                placeholder="billiards, pool, amazing shot, wtf"
              />
            </div>
          </div>

          <div class="watermark-preview">
            <h5>Watermark Preview</h5>
            <div class="watermark-sample">
              WTF REPLAY - {{ tableName }} - {{ formatDate(new Date()) }}
            </div>
            <p class="watermark-note">
              This watermark will be added to your video automatically.
            </p>
          </div>

          <button @click="shareToSocial" :disabled="sharing" class="share-btn">
            <span v-if="sharing">Sharing to {{ selectedPlatform.name }}...</span>
            <span v-else>🚀 Share to {{ selectedPlatform.name }}</span>
          </button>
        </div>

        <!-- Share Success -->
        <div class="share-success" v-if="shareCompleted">
          <div class="success-icon">✅</div>
          <h4>Successfully Shared!</h4>
          <p>Your replay has been shared to {{ selectedPlatform.name }}</p>
          
          <div class="share-result" v-if="shareResult">
            <a 
              :href="shareResult.shareUrl" 
              target="_blank" 
              class="view-share-btn"
            >
              🔗 View on {{ selectedPlatform.name }}
            </a>
            <p class="share-id">Share ID: {{ shareResult.shareId }}</p>
          </div>
          
          <button @click="resetModal" class="new-share-btn">
            🔄 Share to Another Platform
          </button>
        </div>
      </div>

      <!-- Error Display -->
      <div v-if="error" class="error-banner">
        ❌ {{ error }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { useApiStore } from '../stores/api'
import { useToastStore } from '../stores/toast'

// Props
const props = defineProps({
  visible: Boolean,
  replay: Object,
  tableId: String,
  tableName: String,
  billiardHallId: String
})

// Emits
const emit = defineEmits(['close'])

// Stores
const apiStore = useApiStore()
const toastStore = useToastStore()

// Reactive data
const selectedPlatform = ref(null)
const paymentMethod = ref('stripe')
const paymentCompleted = ref(false)
const shareCompleted = ref(false)
const processing = ref(false)
const sharing = ref(false)
const error = ref(null)
const shareToken = ref(null)
const shareResult = ref(null)
const currentFee = ref(0.50)

// Payment integration refs
const stripeCard = ref(null)
const paypalButton = ref(null)
const stripe = ref(null)
const cardElement = ref(null)

// Share configuration
const shareConfig = ref({
  title: '',
  description: '',
  privacy: 'public',
  tags: ''
})

// Platform fees (loaded from API)
const platformFees = ref({})

// Available platforms
const availablePlatforms = ref([
  {
    key: 'facebook',
    name: 'Facebook',
    icon: '🔵',
    enabled: true
  },
  {
    key: 'youtube',
    name: 'YouTube',
    icon: '🔴',
    enabled: true
  },
  {
    key: 'twitch',
    name: 'Twitch',
    icon: '🟣',
    enabled: true
  },
  {
    key: 'googledrive',
    name: 'Google Drive',
    icon: '🟢',
    enabled: true
  }
])

// Computed
const currentFeeFormatted = computed(() => {
  return `$${currentFee.value.toFixed(2)}`
})

// Methods
function closeModal() {
  emit('close')
}

function resetModal() {
  selectedPlatform.value = null
  paymentCompleted.value = false
  shareCompleted.value = false
  processing.value = false
  sharing.value = false
  error.value = null
  shareToken.value = null
  shareResult.value = null
  shareConfig.value = {
    title: '',
    description: '',
    privacy: 'public',
    tags: ''
  }
}

function goBack() {
  selectedPlatform.value = null
  error.value = null
}

function selectPlatform(platform) {
  if (!platform.enabled) return
  
  selectedPlatform.value = platform
  currentFee.value = getPlatformFee(platform.key)
  
  // Initialize payment methods
  nextTick(() => {
    if (paymentMethod.value === 'stripe') {
      initializeStripe()
    } else if (paymentMethod.value === 'paypal') {
      initializePayPal()
    }
  })
}

function getPlatformFee(platformKey) {
  return platformFees.value[platformKey] || 0.50
}

async function loadPlatformFees() {
  try {
    const response = await fetch('/payment-api/payment/fee-calculator?' + new URLSearchParams({
      billiardHallId: props.billiardHallId,
      tableId: props.tableId
    }))
    
    if (response.ok) {
      const data = await response.json()
      platformFees.value = data.fees || {}
    }
  } catch (error) {
    console.error('Failed to load platform fees:', error)
  }
}

async function initializeStripe() {
  if (!window.Stripe) {
    await loadStripe()
  }
  
  if (!stripe.value) {
    // Get Stripe public key from config
    const configResponse = await fetch('/payment-api/config')
    const config = await configResponse.json()
    
    stripe.value = window.Stripe(config.payment.providers.stripe.publishableKey)
  }
  
  if (stripeCard.value && !cardElement.value) {
    const elements = stripe.value.elements()
    cardElement.value = elements.create('card', {
      style: {
        base: {
          fontSize: '16px',
          color: '#424770',
          '::placeholder': {
            color: '#aab7c4',
          },
        },
      },
    })
    
    cardElement.value.mount(stripeCard.value)
  }
}

function loadStripe() {
  return new Promise((resolve) => {
    if (window.Stripe) {
      resolve()
      return
    }
    
    const script = document.createElement('script')
    script.src = 'https://js.stripe.com/v3/'
    script.onload = resolve
    document.head.appendChild(script)
  })
}

async function processStripePayment() {
  try {
    processing.value = true
    error.value = null
    
    // Create payment intent
    const intentResponse = await fetch('/payment-api/payment/create-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        replayId: props.replay.id,
        tableId: props.tableId,
        billiardHallId: props.billiardHallId,
        platform: selectedPlatform.value.key,
        amount: currentFee.value,
        paymentMethod: 'stripe'
      })
    })
    
    const intentData = await intentResponse.json()
    
    if (!intentResponse.ok) {
      throw new Error(intentData.error || 'Payment setup failed')
    }
    
    // Confirm payment with Stripe
    const { error: stripeError, paymentIntent } = await stripe.value.confirmCardPayment(
      intentData.clientSecret,
      {
        payment_method: {
          card: cardElement.value,
          billing_details: {
            name: 'WTF Replay User',
          },
        }
      }
    )
    
    if (stripeError) {
      throw new Error(stripeError.message)
    }
    
    if (paymentIntent.status === 'succeeded') {
      // Confirm payment on backend
      const confirmResponse = await fetch('/payment-api/payment/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentIntentId: intentData.paymentIntentId,
          paymentMethodId: paymentIntent.payment_method
        })
      })
      
      const confirmData = await confirmResponse.json()
      
      if (confirmData.success) {
        shareToken.value = confirmData.shareToken
        paymentCompleted.value = true
        toastStore.success('Payment successful!')
      } else {
        throw new Error(confirmData.error || 'Payment confirmation failed')
      }
    }
    
  } catch (err) {
    error.value = err.message
    toastStore.error(`Payment failed: ${err.message}`)
  } finally {
    processing.value = false
  }
}

async function shareToSocial() {
  try {
    sharing.value = true
    error.value = null
    
    const metadata = {
      title: shareConfig.value.title || `Amazing shot - Table ${props.tableId}`,
      description: shareConfig.value.description || `Check out this incredible shot from ${props.tableName}!`,
      privacy: shareConfig.value.privacy,
      tags: shareConfig.value.tags ? shareConfig.value.tags.split(',').map(t => t.trim()) : []
    }
    
    const response = await fetch('/payment-api/social/share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        replayId: props.replay.id,
        tableId: props.tableId,
        platform: selectedPlatform.value.key,
        shareToken: shareToken.value,
        metadata
      })
    })
    
    const result = await response.json()
    
    if (result.success) {
      shareResult.value = result
      shareCompleted.value = true
      toastStore.success(`Successfully shared to ${selectedPlatform.value.name}!`)
    } else {
      throw new Error(result.error || 'Share failed')
    }
    
  } catch (err) {
    error.value = err.message
    toastStore.error(`Share failed: ${err.message}`)
  } finally {
    sharing.value = false
  }
}

function formatDate(date) {
  return new Date(date).toLocaleString()
}

// Watchers
watch(() => paymentMethod.value, (newMethod) => {
  if (newMethod === 'stripe' && selectedPlatform.value) {
    nextTick(initializeStripe)
  }
})

// Lifecycle
onMounted(() => {
  if (props.visible) {
    loadPlatformFees()
  }
})

watch(() => props.visible, (visible) => {
  if (visible) {
    loadPlatformFees()
    resetModal()
  }
})
</script>

<style scoped>
.share-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 20px;
}

.share-modal {
  background: white;
  border-radius: 12px;
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
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
  color: #333;
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

.replay-preview {
  margin-bottom: 30px;
}

.preview-video {
  width: 100%;
  max-height: 200px;
  border-radius: 8px;
  margin-bottom: 15px;
}

.replay-info h4 {
  margin: 0 0 10px 0;
  color: #333;
}

.replay-info p {
  margin: 5px 0;
  color: #666;
}

.timestamp {
  font-size: 0.9em;
  color: #999;
}

.platform-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 15px;
  margin: 15px 0;
}

.platform-card {
  border: 2px solid #e1e5e9;
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
}

.platform-card:hover:not(.disabled) {
  border-color: #2a5298;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.platform-card.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.platform-icon {
  font-size: 24px;
  margin-bottom: 8px;
}

.platform-name {
  font-weight: bold;
  margin-bottom: 5px;
}

.platform-fee {
  color: #2a5298;
  font-weight: bold;
}

.platform-disabled {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(255, 255, 255, 0.9);
  padding: 5px 10px;
  border-radius: 4px;
  font-size: 0.8em;
  color: #666;
}

.payment-section {
  margin: 20px 0;
}

.payment-header {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 20px;
}

.back-btn {
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}

.fee-summary {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 20px;
}

.fee-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
}

.fee-total {
  display: flex;
  justify-content: space-between;
  font-weight: bold;
  padding-top: 10px;
  border-top: 1px solid #dee2e6;
}

.method-buttons {
  display: flex;
  gap: 10px;
  margin: 10px 0;
}

.method-btn {
  flex: 1;
  padding: 12px;
  border: 2px solid #dee2e6;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  font-weight: bold;
  transition: all 0.3s ease;
}

.method-btn.active {
  border-color: #2a5298;
  background: #f0f4ff;
  color: #2a5298;
}

.stripe-card-element {
  border: 1px solid #dee2e6;
  border-radius: 6px;
  padding: 12px;
  margin: 15px 0;
}

.payment-btn {
  width: 100%;
  padding: 15px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
}

.stripe-btn {
  background: #635bff;
  color: white;
}

.stripe-btn:hover:not(:disabled) {
  background: #5a52e8;
}

.payment-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.share-form {
  margin: 20px 0;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: bold;
  color: #333;
}

.form-group input,
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 10px;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  font-size: 14px;
}

.form-group textarea {
  resize: vertical;
  min-height: 80px;
}

.watermark-preview {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 15px;
  margin: 20px 0;
}

.watermark-sample {
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 8px 12px;
  border-radius: 4px;
  font-family: Arial, sans-serif;
  font-size: 14px;
  display: inline-block;
  margin-bottom: 10px;
}

.watermark-note {
  margin: 0;
  font-size: 0.9em;
  color: #666;
}

.share-btn {
  width: 100%;
  padding: 15px;
  background: #28a745;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
}

.share-btn:hover:not(:disabled) {
  background: #218838;
}

.share-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.share-success {
  text-align: center;
  padding: 20px;
}

.success-icon {
  font-size: 48px;
  margin-bottom: 15px;
}

.share-result {
  margin: 20px 0;
}

.view-share-btn {
  display: inline-block;
  padding: 12px 24px;
  background: #2a5298;
  color: white;
  text-decoration: none;
  border-radius: 8px;
  font-weight: bold;
  margin-bottom: 10px;
  transition: all 0.3s ease;
}

.view-share-btn:hover {
  background: #1e3a6f;
  transform: translateY(-2px);
}

.share-id {
  font-size: 0.9em;
  color: #666;
  font-family: monospace;
}

.new-share-btn {
  padding: 12px 24px;
  background: #6c757d;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: bold;
  margin-top: 15px;
}

.error-banner {
  background: #f8d7da;
  color: #721c24;
  padding: 15px;
  margin: 20px;
  border-radius: 8px;
  border: 1px solid #f5c6cb;
}

@media (max-width: 768px) {
  .share-modal {
    margin: 10px;
    max-height: 95vh;
  }
  
  .platform-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .method-buttons {
    flex-direction: column;
  }
}
</style>