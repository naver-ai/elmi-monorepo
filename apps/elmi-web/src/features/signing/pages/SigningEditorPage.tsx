import { useDispatch, useSelector } from "../../../redux/hooks"
import { SignedInScreenFrame } from "../../../components/SignedInScreenFrame"
import { useProjectIdInRoute } from "../hooks"
import {ArrowLeftStartOnRectangleIcon} from '@heroicons/react/20/solid'
import { Button, Layout } from "antd"
import { useNavigate } from "react-router-dom"
import { useCallback, useEffect, useMemo } from "react"
import { fetchProjectDetail, initializeEditorState } from "../reducer"
import { LyricsView } from "../components/LyricsView"
import { LyricDetailPanel } from "../components/LyricDetailPanel"
import { MediaPlayer } from "../../media-player"
import { fetchChatData, initializeChatState } from "../../chat/reducer"
import { ChatThreadSidePanel } from "../components/ChatThreadSidePanel"
import { ReferenceVideoView } from "../components/ReferenceVideoView"
import { Http } from "../../../net/http"
import { InfoSidebar } from "../components/InfoSidebar"

export const SigningEditorPage = () => {

    const dispatch = useDispatch()
    const nav = useNavigate()

    const projectId = useProjectIdInRoute()!

    useEffect(()=>{
        dispatch(fetchProjectDetail(projectId))
        dispatch(fetchChatData(projectId))

        return () => {
            dispatch(initializeEditorState())
            dispatch(initializeChatState())
            dispatch(MediaPlayer.dispose())
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