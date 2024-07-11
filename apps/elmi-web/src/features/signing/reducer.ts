import { createEntityAdapter, createSelector, createSlice } from "@reduxjs/toolkit"
import { LyricLine, ProjectInfo, Song, Verse } from "../../model-types"
import { PayloadAction } from '@reduxjs/toolkit'
import { AppState, AppThunk } from "../../redux/store"
import { Http } from "../../net/http"



const verseEntityAdapter = createEntityAdapter<Verse>()
const lineEntityAdapter = createEntityAdapter<LyricLine>()

const initial_verse_entity_state = verseEntityAdapter.getInitialState()
const initial_line_entity_state = lineEntityAdapter.getInitialState()

export interface SigningEditorState {
    projectId?: string
    song?: Song
    isProjectLoading: boolean
    verseEntityState: typeof initial_verse_entity_state,
    lineEntityState: typeof initial_line_entity_state
}

const INITIAL_STATE: SigningEditorState = {
    projectId: undefined,
    song: undefined,
    isProjectLoading: false,
    verseEntityState: initial_verse_entity_state,
    lineEntityState: initial_line_entity_state
}

interface ProjectDetail{
    id: string
    last_accessed_at: string | undefined
    song: Song
    verses: Array<Verse>
    lines: Array<LyricLine>
}

const signingEditorSlice = createSlice({
    name: "signing-editor",
    initialState: INITIAL_STATE,
    reducers: {
        initialize:()=>INITIAL_STATE,
        mountProjectInfo: (state, action: PayloadAction<ProjectDetail>) => {
            state.isProjectLoading = false
            state.projectId = action.payload.id
            state.song = action.payload.song
            verseEntityAdapter.setAll(state.verseEntityState, action.payload.verses)
            lineEntityAdapter.setAll(state.lineEntityState, action.payload.lines)
        },
        setProjectLoadingFlag: (state, action: PayloadAction<boolean>) => {
            state.isProjectLoading = action.payload
        }
    }
})

export const verseSelectors = verseEntityAdapter.getSelectors((state: AppState) => state.editor.verseEntityState)
export const lineSelectors = lineEntityAdapter.getSelectors((state: AppState) => state.editor.lineEntityState)
export const selectLineIdsByVerseId = createSelector([lineSelectors.selectAll, (state: AppState, verseId: string) => verseId], (lines, verseId) => {
    return lines.filter(line => line.verse_id == verseId).map(line => line.id)
})

export function fetchProjectSong(projectId: string): AppThunk {
    return async (dispatch, getState) => {
        const state = getState()
        if(state.auth.token){
            dispatch(signingEditorSlice.actions.setProjectLoadingFlag(true))
            try{
                const resp = await Http.axios.get(Http.getTemplateEndpoint(Http.ENDPOINT_APP_PROJECTS_ID, {project_id: projectId}), {headers: await Http.getSignedInHeaders(state.auth.token!)})
                dispatch(signingEditorSlice.actions.mountProjectInfo(resp.data))
            }catch(ex){
                console.log(ex)
            }finally{
                dispatch(signingEditorSlice.actions.setProjectLoadingFlag(false))
            }
        }
    }
}

export default signingEditorSlice.reducer