import { createEntityAdapter, createSlice } from "@reduxjs/toolkit"
import { LyricLine, ProjectInfo, Verse } from "../../model-types"
import { PayloadAction } from '@reduxjs/toolkit'



const verseEntityAdapter = createEntityAdapter<Verse>()
const lineEntityAdapter = createEntityAdapter<LyricLine>()

const initial_verse_entity_state = verseEntityAdapter.getInitialState()
const initial_line_entity_state = lineEntityAdapter.getInitialState()

export interface SigningEditorState {
    projectId?: string
    projectInfo?: ProjectInfo
    isProjectLoading: boolean
    verseEntityState: typeof initial_verse_entity_state,
    lineEntityState: typeof initial_line_entity_state
}

const INITIAL_STATE: SigningEditorState = {
    projectId: undefined,
    projectInfo: undefined,
    isProjectLoading: false,
    verseEntityState: initial_verse_entity_state,
    lineEntityState: initial_line_entity_state
}


const SigningEditorSlice = createSlice({
    name: "signing-editor",
    initialState: INITIAL_STATE,
    reducers: {
        initialize:()=>INITIAL_STATE,
        mountProjectInfo: (state, action: PayloadAction<ProjectInfo>) => {
            state.isProjectLoading = false
            state.projectId = action.payload.id
            state.projectInfo = action.payload
        },
        setProjectLoadingFlag: (state, action: PayloadAction<boolean>) => {
            state.isProjectLoading = action.payload
        }
    }
})