import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'prowash_jwt_token';

// ─── Secure token storage (JWT — sensitive) ─────────────────────────────────

export async function saveToken(token) {
  try {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } catch (err) {
    console.warn('[storage] saveToken failed:', err.message);
  }
}

export async function getToken() {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch (err) {
    console.warn('[storage] getToken failed:', err.message);
    return null;
  }
}

export async function removeToken() {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch (err) {
    console.warn('[storage] removeToken failed:', err.message);
  }
}

// ─── Non-sensitive preferences (AsyncStorage) ────────────────────────────────

export async function savePreference(key, value) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn('[storage] savePreference failed:', err.message);
  }
}

export async function getPreference(key) {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw !== null ? JSON.parse(raw) : null;
  } catch (err) {
    console.warn('[storage] getPreference failed:', err.message);
    return null;
  }
}

export async function removePreference(key) {
  try {
    await AsyncStorage.removeItem(key);
  } catch (err) {
    console.warn('[storage] removePreference failed:', err.message);
  }
}
