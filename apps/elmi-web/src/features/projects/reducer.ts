import { PayloadAction, createEntityAdapter, createSlice } from "@reduxjs/toolkit";
import { Project } from "../../model-types";
import { AppState } from "../../redux/store";

const projectEntityAdapter = createEntityAdapter<Project>()

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
        setProjects: (state, action: PayloadAction<Array<Project>>) => {
            projectEntityAdapter.setAll(state.projectEntityState, action)
        },

    }
})

export const projectsEntitySelectors = projectEntityAdapter.getSelectors((state: AppState) => state.projects.projectEntityState)

export default projectsSlice.reducer