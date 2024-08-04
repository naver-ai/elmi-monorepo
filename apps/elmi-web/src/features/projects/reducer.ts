import { PayloadAction, createEntityAdapter, createSlice } from "@reduxjs/toolkit";
import { ProjectInfo } from "../../model-types";
import { AppState, AppThunk } from "../../redux/store";
import { Http } from "../../net/http";

const projectEntityAdapter = createEntityAdapter<ProjectInfo>()

const initialProjectEntityState = projectEntityAdapter.getInitialState()

export interface ProjectsState{
    loadingProjects: boolean
    projectEntityState: typeof initialProjectEntityState
}

const INITIAL_STATE: ProjectsState = {
    loadingProjects: false,
    projectEntityState: initialProjectEntityState
}

const projectsSlice = createSlice({
    name: "projects",
    initialState: INITIAL_STATE,
    reducers: {
        initialize: () => INITIAL_STATE,
        setLoadingProjectsFlag: (state, action: PayloadAction<boolean>) => {
            state.loadingProjects = action.payload
        },
        setProjects: (state, action: PayloadAction<Array<ProjectInfo>>) => {
            projectEntityAdapter.setAll(state.projectEntityState, action)
        },

    }
})

export const projectsEntitySelectors = projectEntityAdapter.getSelectors((state: AppState) => state.projects.projectEntityState)

export function fetchProjectInfos(): AppThunk {
    return async (dispatch, getState) => {
        const state = getState()
        if(state.auth.token){
            dispatch(projectsSlice.actions.setLoadingProjectsFlag(true))
            
            try{
                const resp = await Http.axios.get(Http.ENDPOINT_APP_PROJECTS, {headers: Http.getSignedInHeaders(state.auth.token)})
                dispatch(projectsSlice.actions.setProjects(resp.data))
            }catch(ex){
            }finally{
                dispatch(projectsSlice.actions.setLoadingProjectsFlag(false))
            }
            
        }
    }
}

export default projectsSlice.reducer