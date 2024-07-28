import { Button, Input, InputRef, Skeleton, Progress, ConfigProvider, theme, Badge, Tooltip } from "antd"
import { useDispatch, useSelector } from "../../../redux/hooks"
import { lineInspectionSelectors, lineSelectors, selectLineIdsByVerseId, selectLineInspectionByLineId, setDetailLineId, toggleDetailLineId, verseSelectors } from "../reducer"
import { FocusEventHandler, MouseEventHandler, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { MediaPlayer } from "../../media-player"
import { MediaPlayerStatus } from "../../media-player/types"
import { ChatBubbleLeftIcon, ChatBubbleLeftEllipsisIcon, PauseIcon, PlayIcon, HandRaisedIcon, ArrowRightIcon } from "@heroicons/react/20/solid"
import { GlobalMediaPlayer } from "./GlobalMediaPlayer"
import { useThrottleCallback } from "@react-hook/throttle"
import { PartialDarkThemeProvider } from "../../../styles"
import { initializeThread, selectThreadIdByLineId, setActiveThreadLineId } from "../../chat/reducer"
import { usePrevious } from "@uidotdev/usehooks"

const LYRIC_TOKEN_ACTIVE_CLASSNAME_SELECTED = "outline-[2px] outline outline-offset-[0px] bg-white/20 scale-110"
const LYRIC_TOKEN_ACTIVE_CLASSNAME_UNSELECTED = "outline-[2px] outline outline-offset-[0px] outline-pink-400 scale-110"


const LyricToken = (props: {
    lineId: string
    text: string
    index: number
    enableHighlighting: boolean,
    className?: string,
}) => {


    const detailLineId = useSelector(state => state.editor.detailLineId)

    const isSelected = detailLineId == props.lineId

    const isActive = useSelector(state => state.mediaPlayer.hitLyricTokenInfo?.lineId == props.lineId && state.mediaPlayer.hitLyricTokenInfo?.index == props.index)

    return <><div className={`transition-all rounded-sm inline-block outline-amber-200 ${isActive === true && props.enableHighlighting === true ? (isSelected === true ? LYRIC_TOKEN_ACTIVE_CLASSNAME_SELECTED : LYRIC_TOKEN_ACTIVE_CLASSNAME_UNSELECTED):""} ${props.className}`}>{props.text}</div>
        {!props.text.endsWith("-") ? " " : ""}
        </>
}

const LyricLineControlPanel = (props: {lineId: string}) => {

    const line = useSelector(state => lineSelectors.selectById(state, props.lineId))
    const dispatch = useDispatch()

    const mediaPlayerStatus = useSelector(state => state.mediaPlayer.status)
    const isAudioPlaying = mediaPlayerStatus == MediaPlayerStatus.Playing

    const [audioPercentage, setAudioPercentage] = useState<number>(0)
    const throttledSetAudioPercentage = useThrottleCallback(useCallback((sec: number|null) => {
        if(line != null && sec != null){
            if(sec < line.start_millis || sec > line.end_millis){
                setAudioPercentage(0)
            }else{
                setAudioPercentage(Math.round((sec - line.start_millis) / (line.end_millis - line.start_millis) * 100))
            }
        }else{
            setAudioPercentage(0)
        }
    }, [line?.start_millis, line?.end_millis]), 60)

    const onClickPause = useCallback<MouseEventHandler<HTMLDivElement>>((ev)=>{
        ev.stopPropagation()
        if(mediaPlayerStatus == MediaPlayerStatus.Playing){
            dispatch(MediaPlayer.pauseMedia())
        }else if(mediaPlayerStatus == MediaPlayerStatus.Standby || mediaPlayerStatus == MediaPlayerStatus.Paused){
            dispatch(MediaPlayer.playLineLoop(line?.id, true))
        }
    }, [mediaPlayerStatus, line?.id])

    const IconClass = isAudioPlaying ? PauseIcon : PlayIcon

    useEffect(()=>{
        const audioPositionSubscription = MediaPlayer.getTimestampObservable().subscribe({
            next: (millis) => {
                throttledSetAudioPercentage(millis)
            }
        })

        return () => {
            audioPositionSubscription.unsubscribe()
        }
    }, [throttledSetAudioPercentage])

    return <div className="flex items-center gap-x-1" aria-selected="false">
    <Button onClick={onClickPause} type="text" className="m-0 p-0 rounded-full aspect-square relative items-center justify-center" tabIndex={-1}>
        <Progress size={24} type="circle" percent={audioPercentage} 
        showInfo={false} strokeWidth={12} strokeColor={"white"} trailColor="rgba(255,255,255,0.3)"/>
        <IconClass className="w-3 h-3 absolute top-0 left-0 bottom-0 right-0 self-center mx-auto fill-white"/>
        </Button>
    </div>
}

const LyricLineView = (props: {lineId: string}) => {
    const line = useSelector(state => lineSelectors.selectById(state, props.lineId))

    const detailLineId = useSelector(state => state.editor.detailLineId)

    const isSelected = detailLineId == props.lineId

    const inputRef = useRef<InputRef>(null)

    const dispatch = useDispatch()

    useEffect(()=>{
        if(isSelected){
            inputRef.current?.focus()
        }
    }, [isSelected])

    const onClick = useCallback<MouseEventHandler<HTMLDivElement>>((ev)=>{
        if(line?.id != null){
            dispatch(toggleDetailLineId(line?.id))
        }

    }, [line?.id])

    const onFocusInput = useCallback<FocusEventHandler<HTMLInputElement>>(ev => {
        if(line?.id != null){
            dispatch(setDetailLineId(line?.id))
        }
    }, [line?.id])


    const onClickInput = useCallback<MouseEventHandler<HTMLInputElement>>(ev => {
        if(line?.id != null){
            dispatch(setDetailLineId(line?.id))
        }
    }, [line?.id])

    const mediaPlayerStatus = useSelector(state => state.mediaPlayer.status)
    const isAudioPlaying = mediaPlayerStatus == MediaPlayerStatus.Playing
    const isInLineLoopMode = useSelector(state => state.mediaPlayer.linePlayInfo != null)
    const isPositionHitting = useSelector(state => state.mediaPlayer.hitLyricTokenInfo?.lineId == props.lineId)

    const inspection = useSelector(state => selectLineInspectionByLineId(state, line?.id))

    const threadId = useSelector(state => selectThreadIdByLineId(state, line?.id))
    const isThreadActive = useSelector(state => state.chat.activeLineId == line?.id)

    const showChatButton = isSelected === true && threadId == null && isThreadActive == false

    const onClickInspectionIndicator = useCallback<MouseEventHandler<HTMLElement>>((ev) => {
        ev.stopPropagation()
        if(line?.id != null){
            dispatch(setDetailLineId(line?.id))
            dispatch(MediaPlayer.pauseMedia())
            dispatch(setActiveThreadLineId(line?.id))
            dispatch(initializeThread(line?.id, ""))
        }
    }, [line?.id])

    const onClickChatThreadButton = useCallback<MouseEventHandler<HTMLElement>>((ev) => {
        ev.stopPropagation()
        if(line?.id != null){
            dispatch(setDetailLineId(line?.id))
            dispatch(MediaPlayer.pauseMedia())
            dispatch(setActiveThreadLineId(line?.id))
        }
    }, [line?.id])

    const scrollAnchorRef = useRef<HTMLDivElement>(null)

    useEffect(()=>{
        const subscription = MediaPlayer.getTimelineClickEventObservable().subscribe({
            next: ({ positionMillis, lyricCoord }) => {
                if(lyricCoord?.lineId == props.lineId){
                    console.log("Clicked.")
                    scrollAnchorRef.current?.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    })
                }
            }
        })

        return () => {
            subscription.unsubscribe()
        }
    }, [props.lineId])

    return <div  className={`transition-all relative mb-3 last:mb-0 p-1.5 rounded-lg hover:bg-orange-400/20 ${isSelected ? 'point-gradient-bg-light':''} ${isInLineLoopMode == true && isAudioPlaying && isPositionHitting ? "outline animate-music-indicate" : ""} ${isInLineLoopMode == false && isAudioPlaying && isPositionHitting ? 'bg-orange-400/20 outline animate-music-indicate':''}`}>
        <div ref={scrollAnchorRef} className="scroll-anchor absolute top-[-30px] left-0 w-5 h-5 pointer-events-none"/>
        {
            line == null ? <Skeleton title={false} active/> : <>
                <div className={`mb-1 pl-1 cursor-pointer transition-colors flex items-baseline`} onClick={onClick}>
                    <div className="flex-1">
                    {
                        line.tokens.map((tok, i) => {
                            return <LyricToken key={i} text={tok} lineId={line.id} index={i}
                                enableHighlighting={(isSelected && isAudioPlaying === true) || isInLineLoopMode === false} {...line.timestamps[i]} 
                                className={isSelected ? "text-white" : undefined}/>
                    })
                    }
                    </div>
                    {
                        isSelected === true ? <LyricLineControlPanel lineId={props.lineId}/> : (
                            inspection != null ? <PartialDarkThemeProvider>
                                <Tooltip title={<><span>{inspection.description}</span><br/><span className="font-bold">Click to chat with me about this!</span></>}>
                                    <Button tabIndex={-1} size="small" className="rounded-full aspect-square p-0 bg-rose-400 hover:!bg-rose-300 border-none" 
                                    onClick={onClickInspectionIndicator}><HandRaisedIcon className="w-4 h-4 text-white"/></Button></Tooltip>
                                </PartialDarkThemeProvider> : null
                        )
                    }
                </div>
                <Input ref={inputRef} className="interactive rounded-md" 
                    onClickCapture={onClickInput}
                    onFocusCapture={onFocusInput}/>
                {
                    showChatButton && <div className="flex justify-end itms-center mt-2">
                        <PartialDarkThemeProvider>
                            {
                                inspection != null ? <Button type="text" tabIndex={-1} size="small" icon={<HandRaisedIcon className="w-4 h-4 animate-bounce-emphasized"/>} onClick={onClickInspectionIndicator}><span>Elmi has thoughts on this line</span><ArrowRightIcon className="w-4 h-4"/></Button> : 
                                <Button type="text" tabIndex={-1} size="small" icon={<ChatBubbleLeftIcon className="w-4 h-4"/>} onClick={onClickChatThreadButton}>Chat<ArrowRightIcon className="w-4 h-4"/></Button>
                            }
                            
                        </PartialDarkThemeProvider>
                    </div>
                }
            </>
        }
    </div>
}

export const VerseView = (props: {verseId: string}) => {


    const verse = useSelector(state => verseSelectors.selectById(state, props.verseId))
    const lineIds = useSelector(state => selectLineIdsByVerseId(state, props.verseId))

    const isAudioPlaying = useSelector(state => state.mediaPlayer.status == MediaPlayerStatus.Playing)
    const isInLineLoopMode = useSelector(state => state.mediaPlayer.linePlayInfo != null)
    const isPositionHitting = useSelector(state => state.mediaPlayer.hitLyricTokenInfo?.verseId == props.verseId)

    const highlightVerse = lineIds.length == 0 && isAudioPlaying && isInLineLoopMode === false && isPositionHitting === true


    return <div className={`relative bg-white/50 shadow-sm backdrop:blur-md rounded-lg my-8 first:mt-0 last:mb-0 p-2 ${highlightVerse ? "!bg-orange-300 outline outline-orange-400 animate-music-indicate" : ""}`}>
        {verse.title != null ? <div className={`text-slate-400 mb-2 last:mb-0 font-bold ml-2 ${highlightVerse ? "text-white animate-bounce-fast" : ""}`}>[{verse.title}]</div> : null}
        {
            lineIds.map(lineId => <LyricLineView lineId={lineId} key={lineId}/>)
        }
    </div>
}

export const LyricsView = (props: {
    className?: string
}) => {
    const verseIds = useSelector(verseSelectors.selectIds)

    const dispatch = useDispatch()

    const detailLineId = useSelector(state => state.editor.detailLineId)
    const prevDetailLineId = usePrevious(detailLineId)

    useEffect(()=>{
        if(prevDetailLineId != null && detailLineId == null){
            // Closed
            dispatch(MediaPlayer.exitLineLoop())
        }else if(prevDetailLineId != detailLineId && detailLineId != null){
            // Selected new
            dispatch(MediaPlayer.playLineLoop(detailLineId, false))
        }

    }, [prevDetailLineId, detailLineId])

    return <div className={`lyric-panel-layout ${props.className}`}>
        <div className="px-2">
        {
            verseIds.map(verseId => <VerseView verseId={verseId} key={verseId}/>)
        }
        </div>

        <GlobalMediaPlayer className="lyric-panel-layout block absolute bottom-0 z-10"/>
    </div>
}