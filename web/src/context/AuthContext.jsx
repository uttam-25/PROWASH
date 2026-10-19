import { createContext, useContext, useEffect, useReducer } from 'react'
import { authAPI } from '../api/auth'

const AuthContext = createContext(null)

function reducer(state, action) {
  switch (action.type) {
    case 'LOADING': return { ...state, isLoading: true }
    case 'SET_USER': return { ...state, user: action.payload.user, token: action.payload.token, isAuthenticated: true, isLoading: false }
    case 'CLEAR': return { user: null, token: null, isAuthenticated: false, isLoading: false }
    default: return state
  }
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, { user: null, token: null, isAuthenticated: false, isLoading: true })

  useEffect(() => {
    const token = localStorage.getItem('prowash_token')
    if (!token) { dispatch({ type: 'CLEAR' }); return }
    authAPI.getMe()
      .then(res => {
        // Backend returns { success, user } (not nested under data)
        const user = res.data.user || res.data.data?.user
        dispatch({ type: 'SET_USER', payload: { user, token } })
      })
      .catch(() => { localStorage.removeItem('prowash_token'); dispatch({ type: 'CLEAR' }) })
  }, [])

  async function login(credentials) {
    const res = await authAPI.login(credentials)
    // Backend returns { success, token, user } at the top level (not nested under data)
    const token = res.data.token || res.data.data?.token
    const user = res.data.user || res.data.data?.user
    localStorage.setItem('prowash_token', token)
    localStorage.setItem('prowash_user', JSON.stringify(user))
    dispatch({ type: 'SET_USER', payload: { user, token } })
    return user
  }

  async function register(data) {
    await authAPI.register(data)
  }

  async function logout() {
    try { await authAPI.logout() } catch {}
    localStorage.removeItem('prowash_token')
    localStorage.removeItem('prowash_user')
    dispatch({ type: 'CLEAR' })
  }

  function updateUser(user) {
    dispatch({ type: 'SET_USER', payload: { user, token: state.token } })
  }

  return <AuthContext.Provider value={{...state, login, register, logout, updateUser}}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
