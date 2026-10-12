import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  hydrated: false,
  accounts: [],
  currentUser: null,
  storageNotice: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    authHydrated(state, action) {
      state.hydrated = true;
      state.accounts = action.payload.accounts;
      state.currentUser = action.payload.user;
      state.storageNotice = action.payload.storageNotice;
    },
    accountRegistered(state, action) {
      state.accounts = action.payload.accounts;
    },
    sessionStarted(state, action) {
      state.accounts = action.payload.accounts;
      state.currentUser = action.payload.user;
      state.storageNotice = null;
    },
    sessionEnded(state) {
      state.currentUser = null;
      state.storageNotice = null;
    },
    clearStorageNotice(state) {
      state.storageNotice = null;
    },
  },
});

export const {
  accountRegistered,
  authHydrated,
  clearStorageNotice,
  sessionEnded,
  sessionStarted,
} = authSlice.actions;

export default authSlice.reducer;
