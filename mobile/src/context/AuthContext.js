import React, {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useCallback,
} from 'react';
import { setLogoutCallback } from '../services/api';
import * as authService from '../services/authService';
import { saveToken, getToken, removeToken } from '../utils/storage';

// ─── State shape ─────────────────────────────────────────────────────────────
const initialState = {
  user: null,
  token: null,
  loading: true, // true while the initial token check runs
};

// ─── Reducer ──────────────────────────────────────────────────────────────────
function authReducer(state, action) {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.user, token: action.token, loading: false };
    case 'CLEAR_USER':
      return { ...state, user: null, token: null, loading: false };
    case 'SET_LOADING':
      return { ...state, loading: action.loading };
    case 'UPDATE_USER':
      return { ...state, user: { ...state.user, ...action.user } };
    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Called when a 401 is intercepted anywhere in the app
  const handleForceLogout = useCallback(() => {
    removeToken();
    dispatch({ type: 'CLEAR_USER' });
  }, []);

  // Register the 401 callback as soon as the provider mounts
  useEffect(() => {
    setLogoutCallback(handleForceLogout);
  }, [handleForceLogout]);

  // On mount: check if there is a stored token and validate it
  useEffect(() => {
    async function bootstrapAuth() {
      try {
        const storedToken = await getToken();
        if (!storedToken) {
          dispatch({ type: 'CLEAR_USER' });
          return;
        }
        // Validate the token against the server
        const data = await authService.getMe();
        if (data && data.user) {
          dispatch({ type: 'SET_USER', user: data.user, token: storedToken });
        } else {
          await removeToken();
          dispatch({ type: 'CLEAR_USER' });
        }
      } catch {
        // Token is invalid or server is unreachable
        await removeToken();
        dispatch({ type: 'CLEAR_USER' });
      }
    }
    bootstrapAuth();
  }, []);

  // ─── Auth actions ───────────────────────────────────────────────────────────

  const login = useCallback(async (email, password) => {
    const data = await authService.login(email, password);
    if (data.token && data.user) {
      await saveToken(data.token);
      dispatch({ type: 'SET_USER', user: data.user, token: data.token });
    }
    return data;
  }, []);

  const logout = useCallback(async () => {
    await removeToken();
    dispatch({ type: 'CLEAR_USER' });
  }, []);

  const register = useCallback(async (formData) => {
    const data = await authService.register(formData);
    if (data.token && data.user) {
      await saveToken(data.token);
      dispatch({ type: 'SET_USER', user: data.user, token: data.token });
    }
    return data;
  }, []);

  const updateUser = useCallback((userData) => {
    dispatch({ type: 'UPDATE_USER', user: userData });
  }, []);

  const value = {
    user: state.user,
    token: state.token,
    loading: state.loading,
    login,
    logout,
    register,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}

export default AuthContext;
