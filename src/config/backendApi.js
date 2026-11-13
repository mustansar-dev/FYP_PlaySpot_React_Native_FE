import { Platform } from 'react-native';

// Keep this value public and configurable per local environment. Android emulator
// reaches the development host through 10.0.2.2; physical devices need the host
// machine's LAN address. Never put server credentials in this file.
export const API_BASE_URL = (globalThis.__PLAYSPOT_API_BASE_URL__ || (
  Platform.OS === 'android'
    ? 'http://10.0.2.2:4000/api/v1'
    : 'http://localhost:4000/api/v1'
 )).replace(/\/$/, '');

// Existing tests intentionally exercise the explicitly labelled local demo.
// App builds use the backend; the demo is never a silent network-error fallback.
export const DEMO_MODE = typeof jest !== 'undefined' || globalThis.__PLAYSPOT_DEMO_MODE__ === true;
export const API_TIMEOUT_MS = 15000;
