import { Spin } from "antd"
import { useSelector } from "../../../redux/hooks"
import { useCallback, useEffect, useRef, useState } from "react";
import { lineSelectors } from "../reducer";
import { Http } from "../../../net/http";
import { MediaPlayerStatus } from "../../media-player/types";
import { MediaPlayer } from "../../media-player";
import { usePrevious } from "@uidotdev/usehooks";

export const ReferenceVideoView = (props: {
    videoUrl: string,
    segStart: number,
    containerClassName?: string,
    frameClassName?: string
}) => {

    const [isLoadingVideo, setIsLoadingVideo] = useState<boolean>(false)
    const [videoBlobUrl, setVideoBlobUrl] = useState<string | undefined>(undefined)
    const mediaPlayerStatus = useSelector(state => state.mediaPlayer.status)
    const prevMediaPlayerStatus = usePrevious(mediaPlayerStatus)
    const token = useSelector(state => state.auth.token)

    const mountVideoFile = useCallback(async () => {
        if (props.videoUrl != null && token != null) {

            setIsLoadingVideo(true)
            setVideoBlobUrl(undefined)

            try {
                const result = await Http.axios.get(props.videoUrl, {
                    headers: {
                        ...Http.getSignedInHeaders(token),
                        'Content-Type': 'video/*'
                    },
                    responseType: 'blob'
                })
                setVideoBlobUrl(URL.createObjectURL(result.data))
                console.log("Video download success.")
            } catch (ex) {
                console.log(ex)
            } finally {
                setIsLoadingVideo(false)
            }
        }
    }, [token, props.videoUrl])

    const videoViewRef = useRef<HTMLVideoElement>(null)

    useEffect(() => {
        mountVideoFile().then()

        return function cleanup() {
            if (videoBlobUrl != null) {
                URL.revokeObjectURL(videoBlobUrl)
            }
        }
    }, [token, props.videoUrl])

    const syncVideoTime = useCallback(() => {
        const absPosition = MediaPlayer.getCurrentTimestampMillis()
        if (props.segStart != null && absPosition != null && videoViewRef.current) {
            const position = absPosition - props.segStart
            videoViewRef.current.currentTime = (position / 1000)
        }
    }, [props.segStart])

    const onVideoLoaded = useCallback<React.ReactEventHandler<HTMLVideoElement>>((ev) => {
        console.log("video loaded")
        syncVideoTime()
        if (mediaPlayerStatus == MediaPlayerStatus.Playing) {
            videoViewRef.current?.play()
        }
    }, [mediaPlayerStatus, syncVideoTime])

    useEffect(() => {
        if (prevMediaPlayerStatus != mediaPlayerStatus) {
            if (mediaPlayerStatus == MediaPlayerStatus.Paused) {
                syncVideoTime()
                videoViewRef.current?.pause()
            } else if (mediaPlayerStatus == MediaPlayerStatus.Playing) {
                syncVideoTime()
                videoViewRef.current?.play().then()
            }
        }
    }, [prevMediaPlayerStatus, mediaPlayerStatus, syncVideoTime()])

    return <div className={`transition-all ${props.containerClassName}`}>
        {
            isLoadingVideo === true ? <div className={`aspect-video bg-gray-200 flex justify-center items-center ${props.frameClassName}`}><Spin /></div> : <video onLoadedData={onVideoLoaded}

                ref={videoViewRef} className={`w-full ${props.frameClassName}`} src={videoBlobUrl} loop />
        }

    </div>
}