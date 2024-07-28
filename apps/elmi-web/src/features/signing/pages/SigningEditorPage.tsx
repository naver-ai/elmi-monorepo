import { useDispatch, useSelector } from "../../../redux/hooks"
import { SignedInScreenFrame } from "../../../components/SignedInScreenFrame"
import { useProjectIdInRoute } from "../hooks"
import {ArrowLeftStartOnRectangleIcon} from '@heroicons/react/20/solid'
import { Button, Layout } from "antd"
import { useNavigate } from "react-router-dom"
import { useCallback, useEffect } from "react"
import { fetchProjectDetail, initializeEditorState } from "../reducer"
import { LyricsView } from "../components/LyricsView"
import { LyricDetailPanel } from "../components/LyricDetailPanel"
import { MediaPlayer } from "../../media-player"
import { fetchChatData, initializeChatState } from "../../chat/reducer"
import { ChatThreadSidePanel } from "../components/ChatThreadSidePanel"

const HeaderLeftContent = () => {

    const songInfo = useSelector(state => state.editor.song)

    const nav = useNavigate()

    const onToListClick = useCallback(()=>{
        nav("/app/projects")
    }, [])

    return <div className="flex flex-row items-center h-full">
    <Button className="aspect-square h-full rounded-none p-0 items-center justify-center flex text-slate-500 border-r-[1px] border-r-slate-200" type="text" onClick={onToListClick}><ArrowLeftStartOnRectangleIcon className="w-5 h-5"/></Button>
    {
        songInfo != null ? <div>
        <span className="ml-3 font-bold text-lg">{songInfo?.title}</span> - {songInfo?.artist}
    </div> : null
    }
</div>
}

export const SigningEditorPage = () => {

    const dispatch = useDispatch()
    const nav = useNavigate()

    const projectId = useProjectIdInRoute()!

    const isDetailPanelOpen = useSelector(state => state.editor.detailLineId != null)

    useEffect(()=>{
        dispatch(fetchProjectDetail(projectId))
        dispatch(fetchChatData(projectId))

        return () => {
            dispatch(initializeEditorState())
            dispatch(initializeChatState())
            dispatch(MediaPlayer.dispose())
        }
    }, [projectId]) 

    return <SignedInScreenFrame headerContent={<HeaderLeftContent/>}>
        <div className="h-full flex flex-row w-[100vw]">
            <LyricDetailPanel/>
            <Layout.Content className="overflow-y-scroll flex">
                <div className={`transition-all ${isDetailPanelOpen ? `flex-[0.2]` : 'flex-1'}`}/>
                <LyricsView className="mt-10 mb-16 pb-10"/>
                <ChatThreadSidePanel/>
            </Layout.Content>
            
        </div>
    </SignedInScreenFrame>
}