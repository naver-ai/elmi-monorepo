import { PayloadAction, createEntityAdapter, createSelector, createSlice } from "@reduxjs/toolkit";
import { ChatThread, ThreadMessage } from "../../model-types";
import { AppState, AppThunk } from "../../redux/store";
import { Http } from "../../net/http";

const chatThreadEntityAdapter = createEntityAdapter<ChatThread>()
const chatMessageEntityAdapter = createEntityAdapter<ThreadMessage>()

const initialChatThreadEntityState = chatThreadEntityAdapter.getInitialState()
const initialChatMessageEntityState = chatMessageEntityAdapter.getInitialState()

export interface ChatState{
    chatThreadEntityState: typeof initialChatThreadEntityState,
    chatMessageEntityState: typeof initialChatMessageEntityState,

    isLoadingChatData: boolean

    threadMessageProcessingStatusDict: {[key:string]: boolean | undefined} 
    
    activeLineId?: string 
}

const INITIAL_STATE: ChatState = {
    chatThreadEntityState: initialChatThreadEntityState,
    chatMessageEntityState: initialChatMessageEntityState,

    isLoadingChatData: false,

    threadMessageProcessingStatusDict: {},

    activeLineId: undefined
}

const chatSlice = createSlice({
    name: "chat",
    initialState: INITIAL_STATE,
    reducers: {
        initialize: () => INITIAL_STATE,
        _setLoadingDataFlag: (state, action: PayloadAction<boolean>) => {
            state.isLoadingChatData = action.payload
        },

        _setChatData: (state, action: PayloadAction<{
            threads: Array<ChatThread>, messages: Array<ThreadMessage>,
            overwrite: boolean
        }>) => {
            if(action.payload.overwrite){
                chatThreadEntityAdapter.setAll(state.chatThreadEntityState, action.payload.threads)
                chatMessageEntityAdapter.setAll(state.chatMessageEntityState, action.payload.messages)
            }else{
                chatThreadEntityAdapter.setMany(state.chatThreadEntityState, action.payload.threads)
                chatMessageEntityAdapter.setMany(state.chatMessageEntityState, action.payload.messages)
            }
        },

        setActiveThreadLineId: (state, action: PayloadAction<string | undefined>) => {
            state.activeLineId = action.payload
        },


    }
})

export const threadSelectors = chatThreadEntityAdapter.getSelectors((state: AppState) => state.chat.chatThreadEntityState)
export const chatMessageSelectors = chatMessageEntityAdapter.getSelectors((state: AppState) => state.chat.chatMessageEntityState)


export const selectThreadByLineId = createSelector([threadSelectors.selectAll, (state: AppState, lineId: string) => lineId], (threads, lineId) => {
    return threads.find(thread => thread.line_id == lineId)
})


export const selectThreadIdByLineId = createSelector([(state: AppState, lineId: string) => selectThreadByLineId(state, lineId)], (thread) => {
    return thread?.id
})

export const selectMessagesByThreadId = createSelector([chatMessageSelectors.selectAll, (state: AppState, threadId: string | undefined) => threadId], 
    (messages, threadId) => {
        return threadId != null ? messages.filter(m => m.thread_id == threadId) : []
    })

export function fetchChatData(projectId: string): AppThunk{
    return async (dispatch, getState) => {
        const state = getState()
        const token = state.auth.token
        if(token != null && projectId != null){
            dispatch(chatSlice.actions._setLoadingDataFlag(true))
            try{
                const resp = await Http.axios.get(Http.getTemplateEndpoint(Http.ENDPOINT_APP_PROJECTS_ID_CHAT_ALL, {project_id: projectId}), {
                    headers: Http.getSignedInHeaders(token)
                })

                console.log(resp.data)
            }catch(ex){
                console.log(ex)
            }finally{
                dispatch(chatSlice.actions._setLoadingDataFlag(false))
            }
        }
    }
}

export function initializeThread(lineId: string, mode: string): AppThunk {
    return async (dispatch, getState) => {
        //TODO 
    }
}

export const {initialize: initializeChatState, setActiveThreadLineId} = chatSlice.actions

export default chatSlice.reducer