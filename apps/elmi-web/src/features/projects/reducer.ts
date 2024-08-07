import { PayloadAction, createEntityAdapter, createSlice } from "@reduxjs/toolkit";
import { ProjectConfiguration, ProjectInfo, Song } from "../../model-types";
import { AppState, AppThunk } from "../../redux/store";
import { Http } from "../../net/http";

const projectEntityAdapter = createEntityAdapter<ProjectInfo>()
const songEntityAdapter = createEntityAdapter<Song>()

const initialProjectEntityState = projectEntityAdapter.getInitialState()
const initialSongEntityState = songEntityAdapter.getInitialState()


export interface ProjectsState{
    loadingProjects: boolean
    fetchingSongs: boolean
    creatingProject: boolean
    projectEntityState: typeof initialProjectEntityState
    songEntityState: typeof initialSongEntityState
}

const INITIAL_STATE: ProjectsState = {
    loadingProjects: false,
    fetchingSongs: false,
    creatingProject: false,
    projectEntityState: initialProjectEntityState,
    songEntityState: initialSongEntityState
}

const projectsSlice = createSlice({
    name: "projects",
    initialState: INITIAL_STATE,
    reducers: {
        initialize: () => INITIAL_STATE,
        setLoadingProjectsFlag: (state, action: PayloadAction<boolean>) => {
            state.loadingProjects = action.payload
        },
        setCreatingProjectFlag: (state, action: PayloadAction<boolean>) => {
            state.creatingProject = action.payload
        },
        setFetchingSongsFlag: (state, action: PayloadAction<boolean>) => {
            state.fetchingSongs = action.payload
        },
        setProjects: (state, action: PayloadAction<Array<ProjectInfo>>) => {
            projectEntityAdapter.setAll(state.projectEntityState, action)
        },
        setSongs: (state, action: PayloadAction<Array<Song>>) => {
            songEntityAdapter.setAll(state.songEntityState, action.payload)
        } 
    }
})

export const projectsEntitySelectors = projectEntityAdapter.getSelectors((state: AppState) => state.projects.projectEntityState)
export const songEntitySelectors = songEntityAdapter.getSelectors((state: AppState) => state.projects.songEntityState)


export function fetchProjectInfos(): AppThunk {
    return async (dispatch, getState) => {
        const state = getState()
        if(state.auth.token && state.projects.loadingProjects == false){
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

export function fetchSongs(): AppThunk {
    return async (dispatch, getState) => {
        const state = getState()
        if(state.auth.token && state.projects.fetchingSongs == false){
            dispatch(projectsSlice.actions.setFetchingSongsFlag(true))

            try{
                const resp = await Http.axios.get(Http.ENDPOINT_APP_MEDIA_SONGS, {headers: Http.getSignedInHeaders(state.auth.token)})
                dispatch(projectsSlice.actions.setSongs(resp.data))
            }catch(ex){
                console.log(ex)
            }finally{
                dispatch(projectsSlice.actions.setFetchingSongsFlag(false))
            }
        }
    }
}

export function createProject(songId: string, configuration: ProjectConfiguration, onComplete?: (projectId: string) => void): AppThunk {
    return async (dispatch, getState) => {
        const state = getState()
        if(state.auth.token && state.projects.creatingProject == false){
            dispatch(projectsSlice.actions.setCreatingProjectFlag(true))

            try{

                const config_lowercased = Object.keys(configuration).reduce((prev: any, curr) => {
                    if(curr != "main_language"){
                        prev[curr] = ((configuration as any)[curr as any]).toLowerCase()
                    }else{
                        prev[curr] = ((configuration as any)[curr as any])
                    }
                    return prev
                }, {})

                const resp = await Http.axios.post(Http.ENDPOINT_APP_PROJECTS_NEW, {
                    song_id: songId,
                    ...config_lowercased
                }, {
                    headers: Http.getSignedInHeaders(state.auth.token),
                    timeout: 0 // indefinete
                })

                const {id: projectId} = resp.data
                console.log("Created project ", projectId)
                await fetchProjectInfos()(dispatch, getState, null)
                onComplete?.(projectId)
                
            }catch(ex){
                console.log(ex)
            }finally{
                dispatch(projectsSlice.actions.setCreatingProjectFlag(false))
            }
        }
    }
}

export const { initialize: initializeProjectList } = projectsSlice.actions

export default projectsSlice.reducer