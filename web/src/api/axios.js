import axios from 'axios'

const api = axios.create({ baseURL: '/api', timeout: 15000 })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('prowash_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('prowash_token')
      localStorage.removeItem('prowash_user')
      const isPartnerPath = window.location.pathname.startsWith('/partner')
      const loginPage = isPartnerPath ? '/partner-login' : '/login'
      if (!window.location.pathname.includes('login')) window.location.href = loginPage
    }
    return Promise.reject(new Error(error.response?.data?.message || error.message || 'Request failed'))
  }
)

export default api
