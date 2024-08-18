import { createEntityAdapter, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Http } from '../../../net/http';
import { AppState, AppThunk } from '../../../redux/store';
import { ProjectDetail, ProjectInfo, UserFullInfo, UserWithProjects } from '../../../model-types';

const userEntityAdapter = createEntityAdapter<UserWithProjects>()
const projectDetailEntityAdapter = createEntityAdapter<ProjectDetail>()

const initialUserEntityAdapterState = userEntityAdapter.getInitialState()
const initialProjectDetailEntityState = projectDetailEntityAdapter.getInitialState()

export type IManageState = {
  isLoadingUserList: boolean,
  isCreatingUser:  boolean,
  loadingProjectDetailFlags: {[key:string] : boolean},
  userEntityState: typeof initialUserEntityAdapterState,
  projectDetailEntityState: typeof initialProjectDetailEntityState
};

const initialState: IManageState = {
  
  isLoadingUserList: false,
  isCreatingUser: false,
  loadingProjectDetailFlags: {},
  userEntityState: initialUserEntityAdapterState,
  projectDetailEntityState: initialProjectDetailEntityState
};

const usersSlice = createSlice({
  name: 'USERS',
  initialState,
  reducers: {
    initialize: () => {
        return { ...initialState };
    },

    _setLoadingUserListFlag: (state, action: PayloadAction<boolean>) => {
        state.isLoadingUserList = action.payload
    },

    _setCreatingUserFlag: (state, action: PayloadAction<boolean>) => {
      state.isCreatingUser = action.payload
    },
    _setLoadedUsers: (state, action: PayloadAction<Array<UserWithProjects>>) => {
      userEntityAdapter.setAll(state.userEntityState, action.payload)
    },

    setOneUser: (state, action: PayloadAction<UserWithProjects>) => {
        userEntityAdapter.setOne(state.userEntityState, action.payload)
    },

    _appendUser: (state, action: PayloadAction<UserWithProjects>) => {
      userEntityAdapter.addOne(state.userEntityState, action.payload)
    },

    _setProjectDetail: (state, action: PayloadAction<ProjectDetail>) => {
      projectDetailEntityAdapter.setOne(state.projectDetailEntityState, action.payload)
    },

    _setProjectDetailLoadingFlag: (state, action: PayloadAction<{projectId: string, flag: boolean}>) => {
      state.loadingProjectDetailFlags[action.payload.projectId] = action.payload.flag
    }
  },
});

export const usersSelectors = userEntityAdapter.getSelectors((state: AppState) => state.admin.users.userEntityState)
export const projectDetailSelectors = projectDetailEntityAdapter.getSelectors((state: AppState) => state.admin.users.projectDetailEntityState)

export const fetchUsers = (): AppThunk => {
  return async(dispatch, getState) => {
    const state = getState();
    if(state.admin.auth.token != null) {
      dispatch(usersSlice.actions._setLoadingUserListFlag(true))
      try {
        const resp = await Http.axios.get(Http.ENDPOINT_ADMIN_DATA_USERS_ALL, {
          headers: Http.getSignedInHeaders(state.admin.auth.token)
        })
        const users: UserWithProjects[] = resp.data
        console.log(users)
        dispatch(usersSlice.actions._setLoadedUsers(users))
      } catch (err) {
        console.log(err)
      } finally {
        dispatch(usersSlice.actions._setLoadingUserListFlag(false))
      }
    }
  }
}

export const createUser = (info: {passcode: string, alias: string}, onCreated: (user: UserFullInfo) => void, onError?: (error: any) => void): AppThunk => {
  return async(dispatch, getState) => {
    const state = getState();
    if (state.admin.auth.token != null) {
      dispatch(usersSlice.actions._setCreatingUserFlag(true))
      try {
        const resp = await Http.axios.post('/admin/users/new', {
          userInfo: info
        },{
          headers: Http.getSignedInHeaders(state.admin.auth.token)
        })
        dispatch(usersSlice.actions._appendUser(resp.data.user))
        onCreated(resp.data.user)
      } catch (err) {
        console.log(err)
        // onError(err)
      } finally {
        dispatch(usersSlice.actions._setCreatingUserFlag(false))
      }
    }
  }
}

export const fetchProjectDetail = (userId: string, projectId: string): AppThunk => {
  return async (dispatch, getState) => {
    const state = getState()
    if(state.admin.auth.token != null) {
      dispatch(usersSlice.actions._setProjectDetailLoadingFlag({projectId, flag: true}))

      try {
        const resp = await Http.axios.get(Http.getTemplateEndpoint(Http.ENDPOINT_ADMIN_DATA_USERS_ID_PROJECTS_ID_INFO, {project_id: projectId, user_id: userId}), {
          headers: Http.getSignedInHeaders(state.admin.auth.token)
        })
        console.log(resp.data)
        dispatch(usersSlice.actions._setProjectDetail(resp.data))        
        
      } catch(ex){
        console.log(ex)
      } finally {
        dispatch(usersSlice.actions._setProjectDetailLoadingFlag({projectId, flag: false}))
      }
    }
  }
}

export const {setOneUser} = usersSlice.actions

export default usersSlice.reducer;
