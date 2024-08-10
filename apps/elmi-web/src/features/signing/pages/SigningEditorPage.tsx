import { useDispatch } from "../../../redux/hooks"
import { SignedInScreenFrame } from "../../../components/SignedInScreenFrame"
import { useProjectIdInRoute } from "../hooks"
import { useNavigate } from "react-router-dom"
import { useEffect } from "react"
import { fetchProjectDetail, initializeEditorState, sendInteractionLog } from "../reducer"
import { LyricsView } from "../components/LyricsView"
import { MediaPlayer } from "../../media-player"
import { fetchChatData, initializeChatState } from "../../chat/reducer"
import { ChatThreadSidePanel } from "../components/ChatThreadSidePanel"
import { InfoSidebar } from "../components/InfoSidebar"
import { InteractionType } from "../../../model-types"

export const SigningEditorPage = () => {

    const dispatch = useDispatch()
    const nav = useNavigate()

    const projectId = useProjectIdInRoute()!

    useEffect(()=>{
        dispatch(fetchProjectDetail(projectId))
        dispatch(fetchChatData(projectId))

        dispatch(sendInteractionLog(projectId, InteractionType.EnterProject))

        return () => {
            dispatch(initializeEditorState())
            dispatch(initializeChatState())
            dispatch(MediaPlayer.dispose())

            dispatch(sendInteractionLog(projectId, InteractionType.ExitProject))
        }
    }, [projectId]) 

    return <SignedInScreenFrame withHeader={false}>
        <div className="h-full flex flex-row w-[100vw] relative">
            <InfoSidebar/>
            <LyricsView className="flex-1"/>
            <ChatThreadSidePanel/>
            
        </div>
    </SignedInScreenFrame>
}