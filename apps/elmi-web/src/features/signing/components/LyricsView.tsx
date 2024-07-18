import { Button, Input, InputRef, Skeleton, Progress } from "antd"
import { useDispatch, useSelector } from "../../../redux/hooks"
import { lineSelectors, selectLineIdsByVerseId, setDetailLineId, toggleDetailLineId, verseSelectors } from "../reducer"
import { FocusEventHandler, Fragment, MouseEventHandler, createRef, memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { MediaPlayer, mountedLindIdSelector } from "../../media-player/reducer"
import { MediaPlayerStatus } from "../../media-player/types"
import { LyricLine, TimestampRange } from "apps/elmi-web/src/model-types"
import { PauseIcon, PlayIcon } from "@heroicons/react/20/solid"
import { GlobalMediaPlayer } from "./GlobalMediaPlayer"
import { useThrottle, useThrottleCallback } from "@react-hook/throttle"

const LyricToken = (props: {
    lineId: string
    text: string
    index: number
    enableHighlighting: boolean,
    className?: string,
}) => {
    const isActive = useSelector(state => state.mediaPlayer.hitLyricTokenInfo?.lineId == props.lineId && state.mediaPlayer.hitLyricTokenInfo?.index == props.index)

    return <><div className={`transition-all rounded-sm inline-block ${isActive === true && props.enableHighlighting === true ? "outline-amber-200 outline-[2px] outline outline-offset-[0px] bg-white/20 scale-110":""} ${props.className}`}>{props.text}</div>
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
            setAudioPercentage(Math.round((sec - line.start_millis) / (line.end_millis - line.start_millis) * 100))
        }else{
            setAudioPercentage(0)
        }
    }, [line?.start_millis, line?.end_millis]), 60)

    const onClickPause = useCallback<MouseEventHandler<HTMLDivElement>>((ev)=>{
        ev.stopPropagation()
        if(mediaPlayerStatus == MediaPlayerStatus.Playing){
            dispatch(MediaPlayer.pauseMedia())
        }else if(mediaPlayerStatus == MediaPlayerStatus.Paused){
            dispatch(MediaPlayer.playLineLoop(line?.id))
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

    return <div className="flex items-center gap-x-1">
    
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
            dispatch(MediaPlayer.playLineLoop(props.lineId))
        }
    }, [isSelected, props.lineId])

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

    return <div className={`mb-3 last:mb-0 p-1.5 rounded-lg hover:bg-orange-400/20 ${isSelected ? 'point-gradient-bg-light':''}`}>
        {
            line == null ? <Skeleton title={false} active/> : <>
            <div className={`mb-1 pl-1 cursor-pointer transition-colors flex items-baseline`} onClick={onClick}>
                <div className="flex-1">
                {
                    line.tokens.map((tok, i) => {
                        return <LyricToken key={i} text={tok} lineId={line.id} index={i}
                            enableHighlighting={(isSelected && isAudioPlaying === true)} {...line.timestamps[i]} 
                            className={isSelected ? "text-white" : undefined}/>
                })
                }
                </div>
                {isSelected && <LyricLineControlPanel lineId={props.lineId}/>}
            </div>
            <Input ref={inputRef} className="interactive rounded-md" 
                onClickCapture={onClickInput}
                onFocusCapture={onFocusInput}/></>
        }
    </div>
}

export const VerseView = (props: {verseId: string}) => {


    const verse = useSelector(state => verseSelectors.selectById(state, props.verseId))
    const lineIds = useSelector(state => selectLineIdsByVerseId(state, props.verseId))

    return <div className="relative bg-white/50 shadow-sm backdrop:blur-md rounded-lg my-8 first:mt-0 last:mb-0 p-2">
        {verse.title != null ? <div className="text-slate-400 mb-2 font-bold ml-2">[{verse.title}]</div> : null}
        {
            lineIds.map(lineId => <LyricLineView lineId={lineId} key={lineId}/>)
        }
    </div>
}

export const LyricsView = (props: {
    className?: string
}) => {
    const verseIds = useSelector(verseSelectors.selectIds)

    return <div className={`lyric-panel-layout ${props.className}`}>
        <div className="px-2">
        {
            verseIds.map(verseId => <VerseView verseId={verseId} key={verseId}/>)
        }
        </div>

        <GlobalMediaPlayer className="lyric-panel-layout block absolute bottom-0 z-10"/>
    </div>
}