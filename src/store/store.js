import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import venueReducer from './venueSlice';
import communityReducer from './communitySlice';

const store = configureStore({
  reducer: {
    auth: authReducer,
    venues: venueReducer,
    community: communityReducer,
  },
});

export default store;
