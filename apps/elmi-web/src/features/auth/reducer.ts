import { PayloadAction, createSlice } from "@reduxjs/toolkit"
import { persistReducer } from "redux-persist"
import storage from 'redux-persist/lib/storage'

export interface AuthState{
    token?: string
    userId?: string
    userCallableName?: string
}

const INITIAL_STATE: AuthState = {
    token: undefined,
    userId: undefined,
    userCallableName: undefined
}

const AuthStateSlice = createSlice({
    name: "auth",
    initialState: INITIAL_STATE,
    reducers: {
        _setUserInfo: (state, action: PayloadAction<AuthState>) => {
            state.token = action.payload.token
            state.userId = action.payload.userCallableName
            state.userCallableName = action.payload.userCallableName
        },

        _clearUserInfo: (state) => {
            state.token = undefined
            state.userId = undefined
            state.userCallableName = undefined
        }
    }
})

const reducer = persistReducer({
    key: 'root',
    storage,
}, AuthStateSlice.reducer)

export default reducer