import axios from 'axios'
import * as storage from '../lib/storage'
import { audit } from '../lib/audit'
import { logger } from '../lib/logger'
import tenant from '../config/app.config'
import { useAuthStore } from '../store/authStore'

export const authClient = axios.create({ baseURL: tenant.api.authUrl })

export const datingClient = axios.create({ baseURL: tenant.api.datingUrl })

datingClient.interceptors.request.use(async (config) => {
  const token = await storage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

let isRefreshing = false
let refreshQueue: Array<(token: string) => void> = []

datingClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status: number = error.response?.status
    const path: string = error.config?.url ?? 'unknown'
    const originalRequest = error.config

    if (status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      if (isRefreshing) {
        return new Promise((resolve) => {
          refreshQueue.push((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            resolve(datingClient(originalRequest))
          })
        })
      }

      isRefreshing = true
      try {
        const refreshToken = await storage.getItem('refresh_token')
        if (!refreshToken) throw new Error('No refresh token')

        const { data } = await authClient.post('/auth/refresh', { refreshToken })
        const newAccess: string = data.tokens.accessToken
        const newRefresh: string = data.tokens.refreshToken

        await storage.setItem('access_token', newAccess)
        await storage.setItem('refresh_token', newRefresh)

        refreshQueue.forEach((cb) => cb(newAccess))
        refreshQueue = []

        originalRequest.headers.Authorization = `Bearer ${newAccess}`
        return datingClient(originalRequest)
      } catch {
        refreshQueue = []
        await storage.deleteItem('access_token')
        await storage.deleteItem('refresh_token')
        useAuthStore.getState().sessionExpired()
        return Promise.reject(error)
      } finally {
        isRefreshing = false
      }
    }

    if (status >= 400) {
      audit.apiError({ path, statusCode: status, sessionId: logger.sessionId, requestId: logger.requestId })
    }

    return Promise.reject(error)
  },
)
