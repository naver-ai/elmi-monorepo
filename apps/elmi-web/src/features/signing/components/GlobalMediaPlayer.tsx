import { MinusIcon, PauseIcon, PlayIcon, PlusIcon, ArrowsPointingOutIcon, ArrowsPointingInIcon } from "@heroicons/react/20/solid"
import { Button, Slider, Tooltip } from "antd"
import { MediaPlayer } from "../../media-player"
import { MouseEventHandler, useCallback, useEffect, useMemo, useState } from "react"
import { useThrottleCallback } from "@react-hook/throttle"
import { useDispatch, useSelector } from "../../../redux/hooks"
import { useResizeDetector } from "react-resize-detector"
import { LapsIcon } from "../../../components/svg-icons"
import { sendInteractionLog, setDetailLineId, setGlobalMediaPlayerHeight } from "../reducer"
import { MediaPlayerStatus } from "../../media-player/types"
import { formatDuration } from "../../../utils/time"
import { Http } from "../../../net/http"
import { ReferenceVideoView } from "./ReferenceVideoView"
import { InteractionType } from "../../../model-types"
import { usePrevious } from "@uidotdev/usehooks"

const TIMELINE_PADDING = 1

const TIMELINE_HEIGHT = 24

const SVG_HEIGHT = TIMELINE_HEIGHT + 2 * TIMELINE_PADDING

const TIMELINE_INDICATOR_WIDTH = 1.5

const TIMELINE_GLOBAL_TRANSFORM = `translate(${TIMELINE_PADDING},${TIMELINE_PADDING})`

const Waveform = (props:{width: number}) => {

    const samples = useSelector(state => state.mediaPlayer.songSamples)

    return samples != null ? <g className="pointer-events-none">
                    {
                        samples.map((s,i) => {
                            const normalizedHeight = TIMELINE_HEIGHT * Math.abs(s)
                            const x = (i/samples.length) * props.width
                            return <line key={i} strokeWidth={1} strokeLinecap="round" className="stroke-gray-500" x1={x} x2={x} y1={(TIMELINE_HEIGHT - normalizedHeight)/2} y2={TIMELINE_HEIGHT - (TIMELINE_HEIGHT - normalizedHeight)/2}/>
                        })
                    }
                </g> : null
}

const SongTimelineView = (props:{
    width: number,

}) => {
    const songDuration = useSelector(state => state.mediaPlayer.songDurationMillis)

    const highlightedLineInfo = useSelector(state => state.mediaPlayer.linePlayInfo)
    const mediaPlayerStatus = useSelector(state => state.mediaPlayer.status)

    const dispatch = useDispatch()

    const [progress, setProgress] = useState<number|undefined>(undefined)

    const onProgressUpdate = useThrottleCallback(useCallback((progress: number|null) => {
        setProgress(progress || undefined)
    }, []))

    const timelineWidth = props.width - TIMELINE_PADDING * 2

    const x = useCallback((millis: number | undefined) => {
        if(millis != null && songDuration != null){
                return millis/songDuration * timelineWidth
        }else return undefined
    }, [songDuration, timelineWidth])

    const xToPositionMillis = useCallback((position: number) => {
        if(songDuration != null){
            return position / timelineWidth * songDuration
        }else{
            return undefined
        }
    }, [songDuration, timelineWidth])
    
    const progressX = useMemo(()=>{
        return x(progress)
    }, [progress, x])

    const highlightedLineX = useMemo(()=>{
        if(highlightedLineInfo!= null){
            return x(highlightedLineInfo.start_millis)! - 1
        }else return undefined
    }, [x, highlightedLineInfo])

    const highlightedLineWidth = useMemo(()=>{
        if(highlightedLineInfo != null){
            return x(highlightedLineInfo.end_millis)! - highlightedLineX! + 2
        }else return undefined
    }, [x, highlightedLineInfo, highlightedLineX])

    const onTimelineClick = useCallback<MouseEventHandler<any>>((ev)=>{
        ev.stopPropagation()
        const position = xToPositionMillis(ev.nativeEvent.offsetX)
        console.log("timeline clicked!")
        if(position){
            dispatch(MediaPlayer.dispatchTimelineClickEvent(position))
            if(highlightedLineInfo){
                //Jump to another line
                dispatch(MediaPlayer.directAccessLineLoop(position, true))
            }else{
                //Global navigation
                dispatch(MediaPlayer.seekGlobalMediaPosition(position))
                            
            }
        }
    },[highlightedLineInfo, xToPositionMillis, mediaPlayerStatus])

    useEffect(()=>{

        const positionSubscription = MediaPlayer.getTimestampObservable().subscribe({
            next: (position) => {
                onProgressUpdate(position)
            }
        })


        return () => {
            positionSubscription.unsubscribe()
        }
    }, [])
    return <svg width={props.width} height={SVG_HEIGHT}>
        <g transform={TIMELINE_GLOBAL_TRANSFORM}>
            <rect x={0} y={0} width={timelineWidth} height={TIMELINE_HEIGHT} rx={8} 
                className={`${highlightedLineInfo != null ? "fill-black" : "fill-slate-700"}`}
                onClick={onTimelineClick}
                />
            <Waveform width={props.width}/>
            {
                highlightedLineInfo != null ? <rect className="fill-pink-200/40 pointer-events-none" rx={2} x={highlightedLineX} width={highlightedLineWidth} height={TIMELINE_HEIGHT}/> : null
            }
            {
                progressX != null ? <line className="pointer-events-none" x1={progressX} x2={progressX} shapeRendering="geometricPrecision" strokeWidth={TIMELINE_INDICATOR_WIDTH} y1={0} y2={TIMELINE_HEIGHT} stroke={"white"}/> : null
            }
            
        </g>
        
    </svg>
}


const GlobalVideoView = () => {
    const songId = useSelector(state => state.editor.song?.id)

    const url = useMemo(()=>{
        if(songId != null){
            return Http.getTemplateEndpoint(Http.ENDPOINT_APP_MEDIA_SONGS_ID_VIDEO, {
                song_id: songId
            })
        }else return undefined
    }, [songId])

    const [isVideoShrinked, setIsVideoShrinked] = useState<boolean>(true)

    const onShrinkButtonClick = useCallback(()=>{
        setIsVideoShrinked(!isVideoShrinked)
    }, [isVideoShrinked])

    const IconClass = isVideoShrinked ? ArrowsPointingOutIcon : ArrowsPointingInIcon

    return <div className="self-stretch flex justify-center relative">
        <Button className="absolute right-1 top-1 z-10 p-1 aspect-square" type="text" onClick={onShrinkButtonClick}><IconClass className="w-5 h-5 text-white/80"/></Button>
        {
        url ? <ReferenceVideoView containerClassName={`${isVideoShrinked == true ? "w-[50%]" : 'w-full'}`} videoUrl={url} segStart={0}/> : null
        }
        </div>
}

export const GlobalMediaPlayer = (props: {
    className?: string
}) => {

    const projectId = useSelector(state => state.editor.projectId)

    const dispatch = useDispatch()

    const [volume, setVolume] = useState<number>(1)

    const songDuration = useSelector(state => state.mediaPlayer.songDurationMillis)

    const mediaPlayerStatus = useSelector(state => state.mediaPlayer.status)
    const prevMediaPlayerStatus = usePrevious(mediaPlayerStatus)

    const isInLineLoopMode = useSelector(state => state.mediaPlayer.linePlayInfo != null)
    const lineIdInLoopMode = useSelector(state => state.mediaPlayer.linePlayInfo?.lineId)
    
    const updateSystemVolume = useCallback((value: number)=>{
        MediaPlayer.setMediaVolume(value / 100)
    },[])

    const onMuteClick = useCallback(()=>{
        MediaPlayer.setMediaVolume(0)
    }, [])


    const onFullVolumeClick = useCallback(()=>{
        MediaPlayer.setMediaVolume(1)
    }, [])

    const onChangeVolumeSlider = useThrottleCallback(useCallback((value: number)=>{
        updateSystemVolume(value)
    },[updateSystemVolume]), 60, false)

    const [progressText, setProgressText] = useState<string|undefined>(undefined)

    const updateProgressText = useCallback((progress: number|null) => {
        if(songDuration != null){
            setProgressText(`${progress != null ? formatDuration(progress) : "--:--"} / ${formatDuration(songDuration)}`)
        }else{
            setProgressText(undefined)
        }
    }, [songDuration])

    const onProgressUpdate = useThrottleCallback(updateProgressText)

      const { width, height, ref } = useResizeDetector({
        handleHeight: true,
        refreshMode: 'debounce',
        refreshRate: 50
      });

    const onLoopModeButtonClick = useCallback(() => {
        if(isInLineLoopMode){
            dispatch(setDetailLineId(undefined))
            dispatch(MediaPlayer.exitLineLoop())

            if(projectId != null && lineIdInLoopMode != null){
                dispatch(sendInteractionLog(projectId, InteractionType.ExitLineMode, {"from": lineIdInLoopMode, "reason": "global_player"}))
            }
        }
    }, [isInLineLoopMode, projectId, lineIdInLoopMode])

    const onPlayButtonClick = useCallback(()=>{
        if(mediaPlayerStatus == MediaPlayerStatus.Playing){
            dispatch(MediaPlayer.pauseMedia())
            dispatch(sendInteractionLog(null, InteractionType.PauseSong, {"reason": "global_player", "mode": isInLineLoopMode ? "line" : "global", lineId: lineIdInLoopMode}))
        }else{
            dispatch(MediaPlayer.performGlobalPlay())
            dispatch(sendInteractionLog(null, InteractionType.PlaySong, {"reason": "global_player", "mode": isInLineLoopMode ? "line" : "global", lineId: lineIdInLoopMode}))
        }
    }, [mediaPlayerStatus, isInLineLoopMode, lineIdInLoopMode])

    useEffect(()=>{
        updateProgressText(null)
    }, [songDuration])

    useEffect(()=>{
        dispatch(setGlobalMediaPlayerHeight(height))
    }, [height])

    useEffect(()=>{
        const volumeSubscription = MediaPlayer.getVolumeObservable().subscribe({
            next: (volume) => {
                if(volume != null){
                    setVolume(volume*100)
                }
            }
        })

        const positionSubscription = MediaPlayer.getTimestampObservable().subscribe({
            next: (position) => {
                onProgressUpdate(position)
            }
        })

        return () => {
            volumeSubscription.unsubscribe()
            positionSubscription.unsubscribe()
        }
    }, [])

    const PlayButtonIconClass = mediaPlayerStatus == MediaPlayerStatus.Playing ? PauseIcon : PlayIcon

    return <div ref={ref} className={`${props.className} bg-audiopanelbg/90 backdrop-blur-md bottom-1 rounded-lg overflow-hidden outline outline-1 outline-audiopanelbg shadow-lg flex flex-col select-none`}>
        {
            !isInLineLoopMode ?  <GlobalVideoView/> : null
        }
        <SongTimelineView width={width || 100}/>
        <div className="flex justify-between text-white flex-1 items-stretch py-2 px-2 bg-red">
            <div className="global-player-control-wrapper h-8 text-center font-regular text-xs flex items-center pt-1 justify-center pointer-events-none">{progressText}</div>
            <div className="flex items-center transition-transform gap-x-2">
                {
                    isInLineLoopMode === true ? <Tooltip title="Exit line loop mode"><Button type="text" size="small" className={`bg-white/10 rounded-full text-white text-xs`} onClick={onLoopModeButtonClick} icon={<LapsIcon className={`w-4 ${isInLineLoopMode===true ? 'fill-white' : "fill-gray-500"}`}/>}>Exit Line Loop</Button></Tooltip> : null
                }
                <Button type="text" className="bg-white/20 p-0 aspect-square rounded-full" onClick={onPlayButtonClick}><PlayButtonIconClass className="text-white w-5"/></Button>             
            </div>
            <div className="global-player-control-wrapper h-8 relative px-1">
                <MinusIcon className="w-3 h-full absolute left-2 top-0" onClick={onMuteClick}/>
                <Slider onChange={onChangeVolumeSlider} className="mx-6" value={volume} min={0} max={100}/>
                <PlusIcon className="w-3 h-full absolute right-2 top-0" onClick={onFullVolumeClick}/>
            </div>
        </div>
    </div>
}