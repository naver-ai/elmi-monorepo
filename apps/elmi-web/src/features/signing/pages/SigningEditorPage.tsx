import { useDispatch, useSelector } from "../../../redux/hooks"
import { SignedInScreenFrame } from "../../../components/SignedInScreenFrame"
import { useProjectIdInRoute } from "../hooks"
import { useNavigate } from "react-router-dom"
import { useDeferredValue, useEffect } from "react"
import { fetchProjectDetail, initializeEditorState, sendInteractionLog } from "../reducer"
import { LyricsView } from "../components/LyricsView"
import { MediaPlayer } from "../../media-player"
import { fetchChatData, initializeChatState } from "../../chat/reducer"
import { ChatThreadSidePanel } from "../components/ChatThreadSidePanel"
import { InfoSidebar } from "../components/InfoSidebar"
import { InteractionType } from "../../../model-types"
import { LoadingIndicator } from "../../../components/LoadingIndicator"

const SigningEditorPage = () => {

    const dispatch = useDispatch()

    const projectId = useProjectIdInRoute()!

    const isLoadingProject = useSelector(state => state.editor.isProjectLoading)

    console.log(isLoadingProject)

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
        {
            isLoadingProject ? <div className="flex justify-center items-center h-full w-full">
                <LoadingIndicator className="self-center" title="Loading project..."/>
                </div> : <div className="h-full flex flex-row w-[100vw] relative">
            <InfoSidebar/>
            <LyricsView className="flex-1"/>
            <ChatThreadSidePanel/>
            
        </div>
        }
    </SignedInScreenFrame>
}

export default SigningEditorPage