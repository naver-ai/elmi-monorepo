
import authReducer from './auth/reducer'
import usersReducer from './users/reducer'
import { combineReducers } from '@reduxjs/toolkit';
import {persistReducer} from 'redux-persist'
import storage from 'redux-persist/lib/storage';

export const adminReducer = combineReducers({
  auth: persistReducer({
    key: 'root.admin',
    storage,
    whitelist: ['token']
  }, authReducer),
  users: usersReducer
})
