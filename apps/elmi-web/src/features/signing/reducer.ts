import { createEntityAdapter, createSelector, createSlice } from "@reduxjs/toolkit"
import { AltGlossesInfo, InteractionLog, InteractionType, LineAnnotation, LineInspection, LineTranslation, LyricLine, ProjectInfo, Song, Verse } from "../../model-types"
import { PayloadAction } from '@reduxjs/toolkit'
import { AppState, AppThunk } from "../../redux/store"
import { Http } from "../../net/http"
import { MediaPlayer } from "../media-player"
import PQueue from 'p-queue';



const verseEntityAdapter = createEntityAdapter<Verse>()
const lineEntityAdapter = createEntityAdapter<LyricLine>()
const lineAnnotationEntityAdapter = createEntityAdapter({selectId: (m: LineAnnotation) => m.line_id})
const lineInspectionEntityAdapter = createEntityAdapter({selectId: (m: LineInspection) => m.line_id})
const lineTranslationEntityAdapter = createEntityAdapter({selectId: (m: LineTranslation) => m.line_id})
const lineAltGlossesEntityAdapter = createEntityAdapter({selectId: (m: AltGlossesInfo) => m.line_id})

const initial_verse_entity_state = verseEntityAdapter.getInitialState()
const initial_line_entity_state = lineEntityAdapter.getInitialState()
const initial_line_annotation_entity_state = lineAnnotationEntityAdapter.getInitialState()
const initial_line_inspection_entity_state = lineInspectionEntityAdapter.getInitialState()
const initial_line_translation_entity_state = lineTranslationEntityAdapter.getInitialState()
const initial_line_alt_glosses_entity_state = lineAltGlossesEntityAdapter.getInitialState()

export interface SigningEditorState {
    projectId?: string
    song?: Song
    isProjectLoading: boolean
    isLineAnnotionLoading: boolean
    verseEntityState: typeof initial_verse_entity_state,
    lineEntityState: typeof initial_line_entity_state,
    lineAnnotationEntityState: typeof initial_line_annotation_entity_state,
    lineInspectionEntityState: typeof initial_line_inspection_entity_state,
    lineTranslationEntityState: typeof initial_line_translation_entity_state,
    lineAltGlossesEntityState: typeof initial_line_alt_glosses_entity_state,
    detailLineId?: string | undefined,
    globelMediaPlayerHeight?: number | undefined
    showScrollToLineButton: boolean,


    lineAltGlossLoadingFlags: {[key: string] : boolean | undefined},
    lineTranslationSynchronizationFlags: {[key: string] : boolean | undefined}
}

const INITIAL_STATE: SigningEditorState = {
    projectId: undefined,
    song: undefined,
    isProjectLoading: false,
    verseEntityState: initial_verse_entity_state,
    lineEntityState: initial_line_entity_state,
    lineAnnotationEntityState: initial_line_annotation_entity_state,
    lineInspectionEntityState: initial_line_inspection_entity_state,
    lineTranslationEntityState: initial_line_translation_entity_state,
    lineAltGlossesEntityState: initial_line_alt_glosses_entity_state,
    detailLineId: undefined,
    isLineAnnotionLoading: false,
    globelMediaPlayerHeight: undefined,
    showScrollToLineButton: false,
    lineAltGlossLoadingFlags: {},
    lineTranslationSynchronizationFlags: {}
}

interface ProjectDetail{
    id: string
    last_accessed_at: string | undefined
    song: Song
    verses: Array<Verse>
    lines: Array<LyricLine>
    annotations: Array<LineAnnotation>
    inspections: Array<LineInspection>
    translations: Array<LineTranslation>
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

            lineAnnotationEntityAdapter.setAll(state.lineAnnotationEntityState, action.payload.annotations)
            lineInspectionEntityAdapter.setAll(state.lineInspectionEntityState, action.payload.inspections)
            lineTranslationEntityAdapter.setAll(state.lineTranslationEntityState, action.payload.translations)
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
        },

        setGlobalMediaPlayerHeight: (state, action: PayloadAction<number|undefined>) => {
            state.globelMediaPlayerHeight = action.payload
        },

        setShowScrollToLineButton: (state, action: PayloadAction<boolean>) => {
            state.showScrollToLineButton = action.payload
        },

        upsertTranslation: (state, action: PayloadAction<LineTranslation>) => {
            lineTranslationEntityAdapter.upsertOne(state.lineTranslationEntityState, action.payload)
        },

        setLineTranslationSynchronizationFlag: (state, action: PayloadAction<{lineId: string, flag: boolean}>) => {
            state.lineTranslationSynchronizationFlags[action.payload.lineId] = action.payload.flag
        },
        setLineAltGlossLoadingFlag: (state, action: PayloadAction<{lineId: string, flag: boolean}>) => {
            state.lineAltGlossLoadingFlags[action.payload.lineId] = action.payload.flag
        },

        setLineAltGlosses: (state, action: PayloadAction<AltGlossesInfo>) => {
            lineAltGlossesEntityAdapter.setOne(state.lineAltGlossesEntityState, action.payload)
        },
        removeLineAltGlosses: (state, action: PayloadAction<string>) => {
            lineAltGlossesEntityAdapter.removeOne(state.lineAltGlossesEntityState, action.payload)
        },

    }
})

export const verseSelectors = verseEntityAdapter.getSelectors((state: AppState) => state.editor.verseEntityState)
export const lineSelectors = lineEntityAdapter.getSelectors((state: AppState) => state.editor.lineEntityState)
export const lineAnnotationSelectors = lineAnnotationEntityAdapter.getSelectors((state: AppState) => state.editor.lineAnnotationEntityState)
export const lineInspectionSelectors = lineInspectionEntityAdapter.getSelectors((state: AppState) => state.editor.lineInspectionEntityState)
export const lineTranslationSelectors = lineTranslationEntityAdapter.getSelectors((state: AppState) => state.editor.lineTranslationEntityState)
export const lineAltGlossesSelectors = lineAltGlossesEntityAdapter.getSelectors((state: AppState) => state.editor.lineAltGlossesEntityState)

export const selectLinesByVerseId = createSelector([lineSelectors.selectAll, (state: AppState, verseId: string) => verseId], (lines, verseId) => {
    return lines.filter(line => line.verse_id == verseId)
})

export const selectLineIdsByVerseId = createSelector([(state: AppState, verseId: string) => selectLinesByVerseId(state, verseId)], (lines) => {
    return lines.map(line => line.id)
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
                const resp = await Http.axios.get(Http.getTemplateEndpoint(Http.ENDPOINT_APP_PROJECTS_ID, {project_id: projectId}), {headers: Http.getSignedInHeaders(state.auth.token!)})
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

export function upsertLineTranslationInput(lineId: string, gloss: string | undefined): AppThunk {
    return async (dispatch, getState) => {
        const state = getState()
        if(state.auth.token && state.editor.projectId){
            dispatch(signingEditorSlice.actions.setLineTranslationSynchronizationFlag({lineId, flag: true}))

            try {
                const resp = await Http.axios.put(Http.getTemplateEndpoint(Http.ENDPOINT_APP_PROJECTS_ID_LINES_ID_TRANSLATION, {project_id: state.editor.projectId, line_id: lineId}), 
                {gloss}, {headers: Http.getSignedInHeaders(state.auth.token)})

                const updatedTranslation: LineTranslation = resp.data

                dispatch(signingEditorSlice.actions.upsertTranslation(updatedTranslation))                
            }catch(ex){
                console.log(ex)
            }finally{ 
                dispatch(signingEditorSlice.actions.setLineTranslationSynchronizationFlag({lineId, flag: false}))
            }
        }
    }
}

export function getAltGlosses(lineId: string, gloss: string): AppThunk {
    return async (dispatch, getState) => {
        const state = getState()
        if(state.auth.token && state.editor.projectId && state.editor.lineAltGlossLoadingFlags[lineId] !== true){
            dispatch(signingEditorSlice.actions.setLineAltGlossLoadingFlag({lineId, flag: true}))
            try {
                const resp = await Http.axios.get(Http.getTemplateEndpoint(Http.ENDPOINT_APP_PROJECTS_ID_LINES_ID_TRANSLATION_ALT, 
                    {project_id: state.editor.projectId, line_id: lineId}),{params: 
                        {gloss}, headers: Http.getSignedInHeaders(state.auth.token)})

                const altGlosses: AltGlossesInfo = resp.data.info
                if(altGlosses != null){
                    dispatch(signingEditorSlice.actions.setLineAltGlosses(altGlosses))      
                }else{
                    console.log("Remove alt glosses")
                    dispatch(signingEditorSlice.actions.removeLineAltGlosses(lineId))
                }
                          
            }catch(ex){
                console.log(ex)
            }finally{ 
                dispatch(signingEditorSlice.actions.setLineAltGlossLoadingFlag({lineId, flag: false}))
            }
        }
    }
}

export function sendInteractionLog(projectId: string | null, type: InteractionType, metadata?: any, timestamp?: number): AppThunk {
    return async (dispatch, getState) => {
        
        const state = getState()
        if(state.auth.token){
            if(projectId == null){
                if (state.editor.projectId){
                    projectId = state.editor.projectId
                }
            }
            if(projectId){
                await Http.logInteraction(state.auth.token, projectId, type, metadata, timestamp)
            }
        }
    }
}

export const { initialize: initializeEditorState, setDetailLineId, toggleDetailLineId, setGlobalMediaPlayerHeight, setShowScrollToLineButton, removeLineAltGlosses } = signingEditorSlice.actions

export default signingEditorSlice.reducer