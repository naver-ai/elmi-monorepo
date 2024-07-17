import { MinusIcon, PlayIcon, PlusIcon } from "@heroicons/react/20/solid"
import { Button, Slider } from "antd"
import { MediaPlayer } from "../../media-player/reducer"
import { useCallback, useEffect, useState } from "react"
import { useDebouncedCallback } from "use-debounce"
import { useThrottleCallback } from "@react-hook/throttle"
import { useSelector } from "../../../redux/hooks"


function formatDuration(durationMillis: number): string {
    const minutes = Math.floor(durationMillis / (60*1000))
    const seconds = Math.floor((durationMillis % (60*1000))/1000)
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}

export const GlobalMediaPlayer = (props: {
    className?: string
}) => {

    const [volume, setVolume] = useState<number>(1)

    const songDuration = useSelector(state => state.mediaPlayer.songDurationMillis)

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

    return <div className={`${props.className} bg-audiopanelbg/90 backdrop-blur-md bottom-1 rounded-lg overflow-hidden border-2 border-audiopanelbg shadow-lg flex flex-col select-none`}>
        <div className="h-6 bg-red-400"></div>
        <div className="flex justify-between text-white flex-1 items-stretch py-2 px-2 bg-red">
            <div className="global-player-control-wrapper h-8 text-center font-light text-[8pt] flex items-center justify-center pointer-events-none">{progressText}</div>
            <div className="flex items-stretch">
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