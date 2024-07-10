import {Action, ThunkAction, combineReducers, configureStore} from '@reduxjs/toolkit'
import authReducer from '../features/auth/reducer'
import projectsReducer from '../features/projects/reducer'
import {FLUSH, PAUSE, PERSIST, PURGE, Persistor, REGISTER, REHYDRATE, persistReducer, persistStore} from 'redux-persist'

const rootReducer = combineReducers({
    auth: authReducer,
    projects: projectsReducer
})

const store = configureStore({
    reducer: rootReducer,
    middleware: (getDefaultMiddleware) => getDefaultMiddleware({
        serializableCheck: {
            ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER]
        }
    })
})

const persistor = persistStore(store)

export { store, persistor }

export type AppState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

export type AppAction = Action<string>;

export type AppThunk<ReturnType = void, State = AppState, A extends Action = AppAction> = ThunkAction<
  ReturnType,
  State,
  unknown,
  A
>;