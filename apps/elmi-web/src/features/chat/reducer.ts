import { PayloadAction, createEntityAdapter, createSelector, createSlice, nanoid } from "@reduxjs/toolkit";
import { ChatThread, ThreadMessage } from "../../model-types";
import { AppState, AppThunk } from "../../redux/store";
import { Http } from "../../net/http";

// Create entity adapters for chat threads and messages
const chatThreadEntityAdapter = createEntityAdapter<ChatThread>()
const chatMessageEntityAdapter = createEntityAdapter<ThreadMessage>()

// Initialize state for chat threads and messages
const initialChatThreadEntityState = chatThreadEntityAdapter.getInitialState()
const initialChatMessageEntityState = chatMessageEntityAdapter.getInitialState()

// Define the state structure for the chat feature
export interface ChatState{
    chatThreadEntityState: typeof initialChatThreadEntityState,
    chatMessageEntityState: typeof initialChatMessageEntityState,

    isLoadingChatData: boolean

    threadMessageProcessingStatusDict: {[key:string]: boolean | undefined} 
    
    activeLineId?: string 
}

// Set the initial state for the chat feature
const INITIAL_STATE: ChatState = {
    chatThreadEntityState: initialChatThreadEntityState,
    chatMessageEntityState: initialChatMessageEntityState,

    isLoadingChatData: false,

    threadMessageProcessingStatusDict: {},

    activeLineId: undefined
}

// Create a slice for the chat feature
const chatSlice = createSlice({
    name: "chat",
    initialState: INITIAL_STATE,
    reducers: {
        initialize: () => INITIAL_STATE,
        _setLoadingDataFlag: (state, action: PayloadAction<boolean>) => {
            state.isLoadingChatData = action.payload
        },

        _upsertChatData: (state, action: PayloadAction<{
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

// Create selectors for chat threads and messages
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
        console.log(messages, threadId)
        return threadId != null ? messages.filter(m => m.thread_id == threadId) : []
    })

// Thunk to fetch chat data for a project
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

// Thunk to initialize a chat thread
export function initializeThread(projectId: string, lineId: string, mode: string): AppThunk {
    return async (dispatch, getState) => {
      const state = getState()
      const token = state.auth.token
      console.log("token: " , token, "project:", projectId, "lineId:",  lineId, "mode: ", mode)

      if (token != null && projectId != null && lineId != null && mode != null) {
        try {
          const data = await Http.initializeThread(projectId, lineId, mode, token)
          const newThread: ChatThread = {
            id: data.id,
            line_id: lineId
          };
          dispatch(chatSlice.actions._upsertChatData({ threads: [newThread], messages: [], overwrite: false }));
        } catch (ex) {
          console.log(ex)
        }
      }
    }
  }
  

// Updated sendMessage thunk
// export function sendMessage(projectId: string, lineId: string, mode: string, message: string): AppThunk {
//     return async (dispatch, getState) => {
//         const state = getState();
//         const token = state.auth.token;

//         let thread: ChatThread | undefined = selectThreadByLineId(state, lineId);

//         if (!thread) {
//             // If this is an initial state, make a thread object.
//             thread = {
//                 id: nanoid(),
//                 line_id: lineId
//             };
//             dispatch(chatSlice.actions._upsertChatData({ threads: [thread], messages: [], overwrite: false }));
//         }

//         // Create a new message object
//         const messageInfo: ThreadMessage = {
//             id: nanoid(),
//             thread_id: thread.id,
//             role: 'user',
//             message,
//             mode
//         };

//         // Immediately add the user's message to the state
//         dispatch(chatSlice.actions._upsertChatData({ threads: [], messages: [messageInfo], overwrite: false }));

//         // Logging for debugging
//         console.log("User message:", messageInfo);

//         if (token != null && projectId != null && lineId != null) {
//             try {
//                 // // Send the message to the server and get a response
//                 const responseMessage = await Http.sendMessage(projectId, thread.id, messageInfo.message, messageInfo.role, messageInfo.mode, token);

//                 // Create a new message object for the response
//                 const serverMessage: ThreadMessage = {
//                     id: nanoid(),
//                     thread_id: thread.id,
//                     role: 'assistant',
//                     message: responseMessage.message,
//                     mode: responseMessage.mode
//                 };

//                 console.log("Server response message:", serverMessage);

//                 // Add the server's response to the state
//                 dispatch(chatSlice.actions._upsertChatData({ threads: [], messages: [serverMessage], overwrite: false }));
//             } catch (ex) {
//                 console.log(ex);
//             }
//         }
//     };
// }



export function fetchMeaning(projectId: string, lineId: string): AppThunk {
    return sendMessage(projectId, lineId, "Meaning", "user", "default", true);
}

export function fetchGlossing(projectId: string, lineId: string): AppThunk {
    return sendMessage(projectId, lineId, "Glossing", "user", "default", true);
}

export function fetchEmoting(projectId: string, lineId: string): AppThunk {
    return sendMessage(projectId, lineId, "Emoting", "user", "default", true);
}

export function fetchTiming(projectId: string, lineId: string): AppThunk {
    return sendMessage(projectId, lineId, "Timing", "user", "default", true);
}

export function sendMessage(projectId: string, lineId: string, message: string, role: string, mode: string, isButtonClick: boolean = false): AppThunk {
    return async (dispatch, getState) => {
        const state = getState();
        const token = state.auth.token;

        let thread: ChatThread | undefined = selectThreadByLineId(state, lineId);

        if (!thread) {
            thread = {
                id: nanoid(),
                line_id: lineId
            };
            dispatch(chatSlice.actions._upsertChatData({ threads: [thread], messages: [], overwrite: false }));
        }

        const messageInfo: ThreadMessage = {
            id: nanoid(),
            thread_id: thread.id,
            role,
            message,
            mode
        };

        dispatch(chatSlice.actions._upsertChatData({ threads: [], messages: [messageInfo], overwrite: false }));

        console.log("Sending message:", messageInfo);

        if (token != null && projectId != null && lineId != null) {
            try {
                const response = await Http.sendMessage(projectId, thread.id, message, role, mode, token, isButtonClick);

                const serverMessage: ThreadMessage = {
                    id: nanoid(),
                    thread_id: thread.id,
                    role: 'assistant',
                    message: response.message,
                    mode: mode
                };

                console.log("Server response message:", serverMessage);

                dispatch(chatSlice.actions._upsertChatData({ threads: [], messages: [serverMessage], overwrite: false }));
            } catch (ex) {
                console.log(ex);
            }
        }
    };
}



export const {initialize: initializeChatState, setActiveThreadLineId} = chatSlice.actions

export default chatSlice.reducer