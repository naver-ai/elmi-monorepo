import {
    PayloadAction,
    createEntityAdapter,
    createSelector,
    createSlice,
    nanoid,
} from '@reduxjs/toolkit';
import { ChatIntent, ChatThread, MessageRole, ThreadMessage } from '../../model-types';
import { AppState, AppThunk } from '../../redux/store';
import { Http } from '../../net/http';
import { lineSelectors, selectLinesByVerseId, verseSelectors } from '../signing/reducer';

export interface ChatThreadPlaceholder {
    isPlaceholder: boolean
    id: string
    line_id: string
    verse_ordering: number
    line_number: number
}

// Create entity adapters for chat threads and messages
const chatThreadEntityAdapter = createEntityAdapter<ChatThread | ChatThreadPlaceholder>({
    sortComparer: (a, b) => {
        if(a.verse_ordering != b.verse_ordering){
            return Math.max(-1, Math.min(1, a.verse_ordering - b.verse_ordering))
        }else{
            return Math.max(-1, Math.min(1, a.line_number - b.line_number))
        }
    }
});
const chatMessageEntityAdapter = createEntityAdapter<ThreadMessage>();

// Initialize state for chat threads and messages
const initialChatThreadEntityState = chatThreadEntityAdapter.getInitialState();
const initialChatMessageEntityState =
    chatMessageEntityAdapter.getInitialState();

// Define the state structure for the chat feature
export interface ChatState {
    chatThreadEntityState: typeof initialChatThreadEntityState;
    chatMessageEntityState: typeof initialChatMessageEntityState;

    isLoadingChatData: boolean;

    threadMessageProcessingStatusDict: { [key: string]: boolean | undefined };
    threadInitializingLineId?: string;

    activeLineId?: string;
}

// Set the initial state for the chat feature
const INITIAL_STATE: ChatState = {
    chatThreadEntityState: initialChatThreadEntityState,
    chatMessageEntityState: initialChatMessageEntityState,

    isLoadingChatData: false,

    threadInitializingLineId: undefined,

    threadMessageProcessingStatusDict: {},

    activeLineId: undefined,
};

// Create a slice for the chat feature
const chatSlice = createSlice({
    name: 'chat',
    initialState: INITIAL_STATE,
    reducers: {
        initialize: () => INITIAL_STATE,
        _setLoadingDataFlag: (state, action: PayloadAction<boolean>) => {
            state.isLoadingChatData = action.payload;
        },

        _upsertChatData: (
            state,
            action: PayloadAction<{
                threads: Array<ChatThread | ChatThreadPlaceholder>;
                messages: Array<ThreadMessage>;
                overwrite: boolean;
            }>
        ) => {
            if (action.payload.overwrite) {
                chatThreadEntityAdapter.setAll(
                    state.chatThreadEntityState,
                    action.payload.threads
                );
                chatMessageEntityAdapter.setAll(
                    state.chatMessageEntityState,
                    action.payload.messages
                );
            } else {
                chatThreadEntityAdapter.setMany(
                    state.chatThreadEntityState,
                    action.payload.threads
                );
                chatMessageEntityAdapter.setMany(
                    state.chatMessageEntityState,
                    action.payload.messages
                );
            }
        },


        _removeChatThread: (state, action: PayloadAction<string>) => {
            chatThreadEntityAdapter.removeOne(state.chatThreadEntityState, action.payload)
        },

        _removeChatMessage: (state, action: PayloadAction<string>) => {
            chatMessageEntityAdapter.removeOne(state.chatMessageEntityState, action.payload)
        },

        _setThreadProcessingFlag: (state, action: PayloadAction<{threadId: string, flag: boolean}>) => {
            console.log(state.threadMessageProcessingStatusDict, action.payload.threadId, action.payload.flag)
            state.threadMessageProcessingStatusDict[action.payload.threadId] = action.payload.flag
        },

        setActiveThreadLineId: (
            state,
            action: PayloadAction<string | undefined>
        ) => {
            state.activeLineId = action.payload;
        },

        setThreadInitializingLineId: (
            state,
            action: PayloadAction<string | undefined>
        ) => {
            state.threadInitializingLineId = action.payload;
        },
    },
});

// Create selectors for chat threads and messages
export const threadSelectors = chatThreadEntityAdapter.getSelectors(
    (state: AppState) => state.chat.chatThreadEntityState
);
export const chatMessageSelectors = chatMessageEntityAdapter.getSelectors(
    (state: AppState) => state.chat.chatMessageEntityState
);

export const selectThreadByLineId = createSelector(
    [threadSelectors.selectAll, (state: AppState, lineId: string) => lineId],
    (threads, lineId) => {
        return threads.find((thread) => thread.line_id == lineId);
    }
);

export const selectThreadIdByLineId = createSelector(
    [(state: AppState, lineId: string) => selectThreadByLineId(state, lineId)],
    (thread) => {
        return thread?.id;
    }
);

export const selectMessagesByThreadId = createSelector(
    [
        chatMessageSelectors.selectAll,
        (state: AppState, threadId: string | undefined) => threadId,
    ],
    (messages, threadId) => {
        return threadId != null
            ? messages.filter((m) => m.thread_id == threadId)
            : [];
    }
);

// Thunk to fetch chat data for a project
export function fetchChatData(projectId: string): AppThunk {
    return async (dispatch, getState) => {
        const state = getState();
        const token = state.auth.token;
        if (token != null && projectId != null) {
            dispatch(chatSlice.actions._setLoadingDataFlag(true));
            try {
                const resp = await Http.axios.get(
                    Http.getTemplateEndpoint(Http.ENDPOINT_APP_PROJECTS_ID_CHAT_ALL, {
                        project_id: projectId,
                    }),
                    {
                        headers: Http.getSignedInHeaders(token),
                    }
                );
                console.log(resp.data)

                dispatch(chatSlice.actions._upsertChatData({...resp.data, overwrite: true}))
            } catch (ex) {
                console.log(ex);
            } finally {
                dispatch(chatSlice.actions._setLoadingDataFlag(false));
            }
        }
    };
}

// Thunk to initialize a chat thread
export function startNewThread(lineId: string): AppThunk {
    return async (dispatch, getState) => {
        const state = getState();
        const token = state.auth.token;
        const projectId = state.editor.projectId;

        if (token != null && projectId != null) {
            dispatch(chatSlice.actions.setThreadInitializingLineId(lineId));
            const line = lineSelectors.selectById(state, lineId)
            const verse = verseSelectors.selectById(state, line.verse_id)

            // Insert dummy thread  
            const dummyThreadId = nanoid()
            dispatch(chatSlice.actions._upsertChatData({threads: [{
                id: dummyThreadId,
                line_id: lineId,
                line_number: line.line_number,
                verse_ordering: verse.verse_ordering,
                isPlaceholder: true
            }], messages: [], overwrite: false}))


            try {
                const resp = await Http.axios.post(
                    Http.getTemplateEndpoint(
                        Http.ENDPOINT_APP_PROJECTS_ID_CHAT_THREADS_START,
                        { project_id: projectId }
                    ),
                    {
                        line_id: lineId,
                    },
                    {
                        headers: Http.getSignedInHeaders(token),
                    }
                );

                const { thread, initial_assistant_message } = resp.data;

                // remove dummy
                dispatch(chatSlice.actions._removeChatThread(dummyThreadId))

                dispatch(
                    chatSlice.actions._upsertChatData({
                        threads: [thread],
                        messages: [initial_assistant_message],
                        overwrite: false,
                    })
                );
            } catch (ex) {
                console.log(ex);
            } finally {
                dispatch(chatSlice.actions.setThreadInitializingLineId(undefined));
            }
        }
    };
}

export function sendMessage(threadId: string, message: string | undefined, intent?: ChatIntent
): AppThunk {
    return async (dispatch, getState) => {
        const state = getState();
        const token = state.auth.token;
        const projectId = state.editor.projectId

        if (token != null && projectId != null && threadId != null) {

            let thread: ChatThread | undefined = threadSelectors.selectById(state, threadId);
            if(thread){
                const dummyMessageId = nanoid()
                const dummyMessageInfo: ThreadMessage = {
                    id: dummyMessageId,
                    thread_id: thread.id,
                    role: MessageRole.User,
                    intent,
                    message: message || intent!,
                };

            dispatch(chatSlice.actions._upsertChatData({
                    threads: [],
                    messages: [dummyMessageInfo],
                    overwrite: false,
                }));

            dispatch(chatSlice.actions._setThreadProcessingFlag({threadId: thread.id, flag: true}))
            try {

                const resp = await Http.axios.post(Http.getTemplateEndpoint(Http.ENDPOINT_APP_PROJECTS_ID_CHAT_THREADS_ID_MESSAGES_NEW, {
                    project_id: projectId,
                    thread_id: thread.id
                }), {
                    message: message || intent!,
                    intent
                }, 
                {
                    headers: Http.getSignedInHeaders(token),
                })

                const {user_input, assistant_output } = resp.data

                console.log('Server response message:', assistant_output);

                dispatch(chatSlice.actions._removeChatMessage(dummyMessageId))

                dispatch(
                    chatSlice.actions._upsertChatData({
                        threads: [],
                        messages: [user_input, assistant_output],
                        overwrite: false,
                    })
                );
            } catch (ex) {
                console.log(ex);
            } finally {
                dispatch(chatSlice.actions._setThreadProcessingFlag({threadId: thread.id, flag: false}))
            }
        }
        }
    };
}

export const { initialize: initializeChatState, setActiveThreadLineId } =
    chatSlice.actions;

export default chatSlice.reducer;
