import { createEntityAdapter, createSelector, createSlice } from "@reduxjs/toolkit"
import { LineAnnotation, LineInspection, LyricLine, ProjectInfo, Song, Verse } from "../../model-types"
import { PayloadAction } from '@reduxjs/toolkit'
import { AppState, AppThunk } from "../../redux/store"
import { Http } from "../../net/http"
import { MediaPlayer } from "../media-player/reducer"



const verseEntityAdapter = createEntityAdapter<Verse>()
const lineEntityAdapter = createEntityAdapter<LyricLine>()
const lineAnnotationEntityAdapter = createEntityAdapter<LineAnnotation>()
const lineInspectionEntityAdapter = createEntityAdapter<LineInspection>()

const initial_verse_entity_state = verseEntityAdapter.getInitialState()
const initial_line_entity_state = lineEntityAdapter.getInitialState()
const initial_line_annotation_entity_state = lineAnnotationEntityAdapter.getInitialState()
const initial_line_inspection_entity_state = lineInspectionEntityAdapter.getInitialState()

export interface SigningEditorState {
    projectId?: string
    song?: Song
    isProjectLoading: boolean
    isLineAnnotionLoading: boolean
    verseEntityState: typeof initial_verse_entity_state,
    lineEntityState: typeof initial_line_entity_state,
    lineAnnotationEntityState: typeof initial_line_annotation_entity_state,
    lineInspectionEntityState: typeof initial_line_inspection_entity_state
    detailLineId?: string | undefined,
}

const INITIAL_STATE: SigningEditorState = {
    projectId: undefined,
    song: undefined,
    isProjectLoading: false,
    verseEntityState: initial_verse_entity_state,
    lineEntityState: initial_line_entity_state,
    lineAnnotationEntityState: initial_line_annotation_entity_state,
    lineInspectionEntityState: initial_line_inspection_entity_state,
    detailLineId: undefined,
    isLineAnnotionLoading: false
}

interface ProjectDetail{
    id: string
    last_accessed_at: string | undefined
    song: Song
    verses: Array<Verse>
    lines: Array<LyricLine>
    annotations: Array<LineAnnotation>
    inspections: Array<LineInspection>
}

const signingEditorSlice = createSlice({
    name: "signing-editor",
    initialState: INITIAL_STATE,
    reducers: {
        initialize:()=>INITIAL_STATE,
        mountProjectDetail: (state, action: PayloadAction<ProjectDetail>) => {
            state.isProjectLoading = false
            state.projectId = action.payload.id
            state.song = action.payload.song
            
            verseEntityAdapter.setAll(state.verseEntityState, action.payload.verses)
            lineEntityAdapter.setAll(state.lineEntityState, action.payload.lines)

            console.log(
                action.payload.annotations, action.payload.inspections
            )

            lineAnnotationEntityAdapter.setAll(state.lineAnnotationEntityState, action.payload.annotations)
            lineInspectionEntityAdapter.setAll(state.lineInspectionEntityState, action.payload.inspections)
        },
        setProjectLoadingFlag: (state, action: PayloadAction<boolean>) => {
            state.isProjectLoading = action.payload
        },

        setDetailLineId: (state, action: PayloadAction<string | undefined>) => {
            state.detailLineId = action.payload
        },

        toggleDetailLineId: (state, action: PayloadAction<string>) => {
            if(state.detailLineId == null){
                state.detailLineId = action.payload
            }else if (state.detailLineId != action.payload){
                state.detailLineId = action.payload
            }else{
                state.detailLineId = undefined
            }
        }
    }
})

export const verseSelectors = verseEntityAdapter.getSelectors((state: AppState) => state.editor.verseEntityState)
export const lineSelectors = lineEntityAdapter.getSelectors((state: AppState) => state.editor.lineEntityState)
export const lineAnnotationSelectors = lineAnnotationEntityAdapter.getSelectors((state: AppState) => state.editor.lineAnnotationEntityState)
export const lineInspectionSelectors = lineInspectionEntityAdapter.getSelectors((state: AppState) => state.editor.lineInspectionEntityState)


export const selectLinesByVerseId = createSelector([lineSelectors.selectAll, (state: AppState, verseId: string) => verseId], (lines, verseId) => {
    return lines.filter(line => line.verse_id == verseId)
})

export const selectLineIdsByVerseId = createSelector([(state: AppState, verseId: string) => selectLinesByVerseId(state, verseId)], (lines) => {
    return lines.map(line => line.id)
})

export const selectLineAnnotationByLineId = createSelector([lineAnnotationSelectors.selectAll, (state: AppState, lineId: string) => lineId], (annotations, lineId) => {
    return annotations.find(annt => annt.line_id == lineId)
})

export const selectLineInspectionByLineId = createSelector([lineInspectionSelectors.selectAll, (state: AppState, lineId: string) => lineId], (inspections, lineId) => {
    return inspections.find(ins => ins.line_id == lineId)
})


export function fetchProjectDetail(projectId: string): AppThunk {
    return async (dispatch, getState) => {
        let state = getState()
        if(state.auth.token){
            dispatch(signingEditorSlice.actions.setProjectLoadingFlag(true))
            try{
                const resp = await Http.axios.get(Http.getTemplateEndpoint(Http.ENDPOINT_APP_PROJECTS_ID, {project_id: projectId}), {headers: await Http.getSignedInHeaders(state.auth.token!)})
                dispatch(signingEditorSlice.actions.mountProjectDetail(resp.data))

                // Mount song
                state = getState()
                await MediaPlayer.mountSong(state.editor.song!.id)(dispatch, getState, null)
            }catch(ex){
                console.log(ex)
            }finally{
                dispatch(signingEditorSlice.actions.setProjectLoadingFlag(false))
            }
        }
    }
}

export const { initialize: initializeEditorState, setDetailLineId, toggleDetailLineId } = signingEditorSlice.actions

export default signingEditorSlice.reducer