import axios from 'axios'
import { API_CONFIG } from './api'

axios.defaults.baseURL = API_CONFIG.BASE_URL
axios.defaults.timeout = 120000 // 120 seconds for GEE analysis
axios.defaults.withCredentials = true // Important for cookies (CSRF & Refresh)

// Helper to extract cookie value
function getCookie(name: string) {
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) return parts.pop()?.split(';').shift()
  return null
}

let isRefreshing = false
let failedQueue: any[] = []

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })
  failedQueue = []
}

axios.interceptors.request.use(
  (config) => {
    // Inject CSRF Token
    const csrfToken = getCookie("csrf_token")
    if (csrfToken && config.method && ['post', 'put', 'delete', 'patch'].includes(config.method.toLowerCase())) {
      config.headers['X-CSRF-Token'] = csrfToken
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

axios.interceptors.response.use(
  (response) => {
    return response
  },
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry && originalRequest.url !== '/auth/login' && originalRequest.url !== '/auth/refresh') {
      
      if (isRefreshing) {
        return new Promise(function(resolve, reject) {
          failedQueue.push({resolve, reject})
        }).then(token => {
          originalRequest.headers['Authorization'] = 'Bearer ' + token
          return axios(originalRequest)
        }).catch(err => {
          return Promise.reject(err)
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        // Attempt to rotate refresh token
        const response = await axios.post('/auth/refresh')
        const { access_token } = response.data
        
        localStorage.setItem('token', access_token)
        axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`
        originalRequest.headers['Authorization'] = `Bearer ${access_token}`
        
        processQueue(null, access_token)
        return axios(originalRequest)
      } catch (err) {
        processQueue(err, null)
        localStorage.removeItem('token')
        delete axios.defaults.headers.common['Authorization']
        window.location.href = '/auth'
        return Promise.reject(err)
      } finally {
        isRefreshing = false
      }
    }
    
    // Hard fallback if refresh fails
    if (error.response?.status === 401 && originalRequest.url !== '/auth/login' && originalRequest.url !== '/auth/refresh') {
        localStorage.removeItem('token')
        delete axios.defaults.headers.common['Authorization']
        window.location.href = '/auth'
    }

    return Promise.reject(error)
  }
)

export default axios
