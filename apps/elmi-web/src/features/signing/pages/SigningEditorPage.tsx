import { useDispatch, useSelector } from "../../../redux/hooks"
import { SignedInScreenFrame } from "../../../components/SignedInScreenFrame"
import { useProjectIdInRoute } from "../hooks"
import { projectsEntitySelectors } from "../../projects/reducer"
import {ArrowLeftStartOnRectangleIcon} from '@heroicons/react/20/solid'
import { Button } from "antd"
import { useNavigate } from "react-router-dom"
import { useCallback, useEffect } from "react"
import { fetchProjectSong } from "../reducer"
import { LyricLineView, LyricsView } from "../components/LyricsView"
import ReactPlayer from 'react-player/youtube'

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

    useEffect(()=>{
        dispatch(fetchProjectSong(projectId))
    }, [projectId])

    return <SignedInScreenFrame headerContent={<HeaderLeftContent/>}>
        <LyricsView className="mt-10 mb-16 pb-10"/>
        <div className="fixed bottom-0 left-0 right-0 h-16 bg-pink-950/30 backdrop-blur-md">
            <div className="lyric-panel-layout bg-black block h-full">
                Footer player content
            </div>
        </div>
    </SignedInScreenFrame>
}