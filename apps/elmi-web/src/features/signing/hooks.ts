import { useThrottleCallback } from "@react-hook/throttle";
import { useCallback, useEffect, useState } from "react";
import { useMatch } from "react-router-dom";
import { MediaPlayer } from "../media-player";

export function useProjectIdInRoute(): string | undefined {
    const match = useMatch("/app/projects/:project_id")

    return match?.params.project_id
}

export function useAudioSegmentPositionPercentage(startMillis: number| undefined, endMillis: number | undefined): number {
    const [audioPercentage, setAudioPercentage] = useState<number>(0)
    const throttledSetAudioPercentage = useThrottleCallback(useCallback((sec: number|null) => {
        if(startMillis != null && endMillis != null && sec != null){
            if(sec < startMillis){
                setAudioPercentage(0)
            }else if(sec > endMillis){
                setAudioPercentage(100)
            }else{
                setAudioPercentage(Math.round((sec - startMillis) / (endMillis - startMillis) * 100))
            }
        }else{
            setAudioPercentage(0)
        }
    }, [startMillis, endMillis]), 60)

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

    return audioPercentage
}