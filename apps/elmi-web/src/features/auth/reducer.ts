import { PayloadAction, createSlice } from '@reduxjs/toolkit';
import { persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import { User } from '../../model-types';
import { AppThunk } from '../../redux/store';
import { Http } from '../../net/http';
import { jwtDecode } from 'jwt-decode';
import { ElmiError } from '../../error';
import { AxiosError } from 'axios';

export interface AuthState {
  isAuthorizing: boolean;
  token?: string;
  user?: User;
  error?: ElmiError;
}

const INITIAL_STATE: AuthState = {
  isAuthorizing: false,
  token: undefined,
  user: undefined,
  error: undefined,
};

const authSlice = createSlice({
  name: 'auth',
  initialState: INITIAL_STATE,
  reducers: {
    _initialize: () => INITIAL_STATE,
    _setUserInfo: (
      state,
      action: PayloadAction<{ token: string; user: User }>
    ) => {
      state.token = action.payload.token;
      state.user = action.payload.user;
      state.error = undefined;
    },

    _clearUserInfo: (state) => {
      state.token = undefined;
      state.user = undefined;
    },

    _authorizingFlagOn: (state) => {
      state.isAuthorizing = true;
      state.user = undefined;
      state.token = undefined;
    },

    _authorizingFlagOff: (state) => {
      state.isAuthorizing = false;
    },

    _setError: (state, action: PayloadAction<ElmiError>) => {
      state.error = action.payload;
    },
  },
});

export function loginWithPasscode(code: string, onSignedIn?: ()=>void): AppThunk {
  return async (dispatch, getState) => {
    dispatch(authSlice.actions._authorizingFlagOn());

    try {
      const tokenResponse = await Http.axios.post(
        Http.ENDPOINT_APP_AUTH_LOGIN,
        { code },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const { jwt, sign_language } = tokenResponse.data;

      const decoded = jwtDecode<{
        sub: string;
        callable_name: string;
        iat: number;
        exp: number;
      }>(jwt);

      dispatch(
        authSlice.actions._setUserInfo({
          user: {
            id: decoded.sub,
            sign_language,
            callable_name: decoded.callable_name,
          },
          token: jwt,
        })
      );

      console.log(decoded, sign_language)

      requestAnimationFrame(()=>{
        onSignedIn?.()
      })
    } catch (ex) {
      console.log(ex);
      let error = ElmiError.Unknown;
      if (ex instanceof AxiosError) {
        if (ex.code == AxiosError.ERR_NETWORK) {
          error = ElmiError.ServerNotResponding;
        } else if (ex.response?.status == 400) {
          error = ElmiError.NoSuchUser;
        }
      }
      dispatch(authSlice.actions._setError(error));
    } finally {
        dispatch(authSlice.actions._authorizingFlagOff());
    }
  };
}

const reducer = persistReducer(
  {
    key: 'root',
    whitelist: ["token", "user"],
    storage,
  },
  authSlice.reducer
);

export default reducer;
