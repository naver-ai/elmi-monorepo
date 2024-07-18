import { MinusIcon, PlayIcon, PlusIcon } from "@heroicons/react/20/solid"
import { Button, Slider } from "antd"
import { MediaPlayer } from "../../media-player/reducer"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useDebouncedCallback } from "use-debounce"
import { useThrottleCallback } from "@react-hook/throttle"
import { useDispatch, useSelector } from "../../../redux/hooks"
import { useResizeDetector } from "react-resize-detector"
import { LapsIcon } from "../../../components/svg-icons"

const TIMELINE_PADDING = 1

const TIMELINE_HEIGHT = 24

const SVG_HEIGHT = TIMELINE_HEIGHT + 2 * TIMELINE_PADDING

const TIMELINE_INDICATOR_WIDTH = 1.5

const TIMELINE_GLOBAL_TRANSFORM = `translate(${TIMELINE_PADDING},${TIMELINE_PADDING})`

const SongTimelineView = (props:{
    width: number,

}) => {
    const songDuration = useSelector(state => state.mediaPlayer.songDurationMillis)

    const highlightedLineInfo = useSelector(state => state.mediaPlayer.linePlayInfo)



    const [progress, setProgress] = useState<number|undefined>(undefined)

    const onProgressUpdate = useThrottleCallback(useCallback((progress: number|null) => {
        setProgress(progress || undefined)
    }, []))

    const timelineWidth = props.width - TIMELINE_PADDING * 2

    const x = useCallback((millis: number | undefined) => {
        if(millis != null && songDuration != null){
                return millis/songDuration * timelineWidth
        }else return undefined
    }, [songDuration])
    
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
            <rect x={0} y={0} width={timelineWidth} height={TIMELINE_HEIGHT} rx={8}/>
            {
                highlightedLineInfo != null ? <rect className="fill-pink-200/40" rx={2} x={highlightedLineX} width={highlightedLineWidth} height={TIMELINE_HEIGHT}/> : null
            }
            {
                progressX != null ? <line x1={progressX} x2={progressX} shapeRendering="geometricPrecision" strokeWidth={TIMELINE_INDICATOR_WIDTH} y1={0} y2={TIMELINE_HEIGHT} stroke={"white"}/> : null
            }
            
        </g>
        
    </svg>
}


function formatDuration(durationMillis: number): string {
    const minutes = Math.floor(durationMillis / (60*1000))
    const seconds = Math.floor((durationMillis % (60*1000))/1000)
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}

export const GlobalMediaPlayer = (props: {
    className?: string
}) => {

    const dispatch = useDispatch()

    const [volume, setVolume] = useState<number>(1)

    const songDuration = useSelector(state => state.mediaPlayer.songDurationMillis)

    const isInLineLoopMode = useSelector(state => state.mediaPlayer.linePlayInfo != null)

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

    const onProgressUpdate = useThrottleCallback(useCallback((progress: number|null) => {
        if(progress != null && songDuration != null){
            setProgressText(`${formatDuration(progress)} / ${formatDuration(songDuration)}`)
        }else{
            setProgressText(undefined)
        }
    }, [songDuration]))

      const { width, height, ref } = useResizeDetector({
        handleHeight: false,
        refreshMode: 'debounce',
        refreshRate: 50
      });

    const onLoopModeButtonClick = useCallback(() => {
        if(isInLineLoopMode){
            dispatch(MediaPlayer.exitLineLoop())
        }
    }, [isInLineLoopMode])

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

    return <div ref={ref} className={`${props.className} bg-audiopanelbg/90 backdrop-blur-md bottom-1 rounded-lg overflow-hidden outline outline-1 outline-audiopanelbg shadow-lg flex flex-col select-none`}>
        <SongTimelineView width={width || 100}/>
        <div className="flex justify-between text-white flex-1 items-stretch py-2 px-2 bg-red">
            <div className="global-player-control-wrapper h-8 text-center font-light text-[8pt] flex items-center justify-center pointer-events-none">{progressText}</div>
            <div className="flex items-stretch">
                <Button type="text" className={`p-0 aspect-square rounded-full ${isInLineLoopMode===true ? 'text-white' : "text-gray-500"}`} onClick={onLoopModeButtonClick}><LapsIcon className="w-5"/></Button>
                <Button type="text" className="bg-white/20 p-0 aspect-square rounded-full"><PlayIcon className="text-white w-5"/></Button>
            </div>
            <div className="global-player-control-wrapper h-8 relative px-1">
                <MinusIcon className="w-3 h-full absolute left-2 top-0" onClick={onMuteClick}/>
                <Slider onChange={onChangeVolumeSlider} className="mx-6" value={volume} min={0} max={100}/>
                <PlusIcon className="w-3 h-full absolute right-2 top-0" onClick={onFullVolumeClick}/>
            </div>
        </div>
    </div>
}