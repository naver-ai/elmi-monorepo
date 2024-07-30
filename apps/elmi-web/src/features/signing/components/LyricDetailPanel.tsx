import { Button, Divider, Spin, Typography } from "antd"
import { useDispatch, useSelector } from "../../../redux/hooks"
import { useCallback, useEffect, useRef, useState } from "react";
import { lineSelectors, selectLineAnnotationByLineId, setDetailLineId } from "../reducer";
import { LeftDoubleArrowIcon } from "../../../components/svg-icons";
import { LineAnnotation } from "apps/elmi-web/src/model-types";
import { Http } from "../../../net/http";
import { MediaPlayerStatus } from "../../media-player/types";
import { MediaPlayer } from "../../media-player";
import { usePrevious } from "@uidotdev/usehooks";

const ReferenceVideoView = () => {

    const songId = useSelector(state => state.editor.song?.id)
    const lineId = useSelector(state => state.editor.detailLineId)
    const line = useSelector(state => lineSelectors.selectById(state, lineId || ""))

    const [isLoadingVideo, setIsLoadingVideo] = useState<boolean>(false)
    const [videoBlobUrl, setVideoBlobUrl] = useState<string|undefined>(undefined)
    const mediaPlayerStatus = useSelector(state => state.mediaPlayer.status)
    const prevMediaPlayerStatus = usePrevious(mediaPlayerStatus)
    const token = useSelector(state => state.auth.token)

    const mountVideoFile = useCallback(async () => {
        if(songId != null && lineId != null && token != null){
            const url = Http.getTemplateEndpoint(Http.ENDPOINT_APP_MEDIA_SONGS_ID_LINES_ID_VIDEO, {
                song_id: songId,
                line_id: lineId
            })

            setIsLoadingVideo(true)
            setVideoBlobUrl(undefined)

            try{
                const result = await Http.axios.get(url, {
                    headers: {...Http.getSignedInHeaders(token), 
                        'Content-Type': 'video/*'},
                    responseType: 'blob'
                })
                setVideoBlobUrl(URL.createObjectURL(result.data))
                console.log("Video download success.")
            }catch(ex){
                console.log(ex)
            }finally{
                setIsLoadingVideo(false)
            }
        }
    }, [token, songId, lineId])

    const videoViewRef = useRef<HTMLVideoElement>(null)

    useEffect(() => {
        mountVideoFile().then()

        return function cleanup() {
            if (videoBlobUrl != null) {
                URL.revokeObjectURL(videoBlobUrl)
            }
        }
    }, [token, songId, lineId])

    const syncVideoTime = useCallback(()=>{
        const absPosition = MediaPlayer.getCurrentTimestampMillis()
        if(line?.start_millis != null && absPosition != null && videoViewRef.current){
            const position = absPosition - line.start_millis
            videoViewRef.current.currentTime = (position / 1000)
        }
    }, [line?.start_millis])

    const onVideoLoaded = useCallback<React.ReactEventHandler<HTMLVideoElement>>((ev)=>{
        console.log("video loaded")
        syncVideoTime()
        if(mediaPlayerStatus == MediaPlayerStatus.Playing){
            videoViewRef.current?.play()
        }
    }, [mediaPlayerStatus, syncVideoTime])

    useEffect(()=>{
        if(prevMediaPlayerStatus != mediaPlayerStatus){
            if(mediaPlayerStatus == MediaPlayerStatus.Paused){
                syncVideoTime()
                videoViewRef.current?.pause()
            }else if(mediaPlayerStatus == MediaPlayerStatus.Playing){
                syncVideoTime()
                videoViewRef.current?.play().then()
            }
        }
    }, [prevMediaPlayerStatus, mediaPlayerStatus, syncVideoTime()])

    return <div className="transition-all">
        {
            isLoadingVideo === true ? <div className="aspect-video bg-gray-200 rounded-lg flex justify-center items-center"><Spin/></div> : <video onLoadedData={onVideoLoaded} 
            
                ref={videoViewRef} className="mt-3 w-full rounded-lg" src={videoBlobUrl} loop/>
        }
        
    </div> 
}

export const LyricDetailPanel = () => {

    const lineId = useSelector(state => state.editor.detailLineId)

    const annotation: LineAnnotation | undefined = useSelector(state => selectLineAnnotationByLineId(state, lineId || ""))

    const dispatch = useDispatch()

    const onClickClose = useCallback(()=>{
        dispatch(setDetailLineId(undefined))
    }, [])

    return <div className={`line-detail-panel relative shadow-lg bg-[#fafafa] w-[350px] max-w-[30vw] block transition-all ${lineId != null ? "":"!w-0"}`}>
        <div className={`transition-transform w-[350px] max-w-[30vw] absolute top-0 right-0 bottom-0`}>
            <div className="h-full">
                <div className="p-1 pl-3 top-0 left-0 right-0 flex justify-between items-center border-b-[1px]">
                    <span className="panel-title">Line Detail</span>
                    <Button onClick={onClickClose} className="p-2" type="text"><LeftDoubleArrowIcon className="h-6 w-6 fill-gray-400"/></Button>
                </div>
                <div className="p-3 overflow-y-scroll">
                    <Divider orientation="left" plain rootClassName="!mt-0">
                        <h4>Music Video</h4>
                    </Divider>

                    <ReferenceVideoView/>              

                    <Divider orientation="left" plain>
                        <h4>Mood</h4>
                    </Divider>
                    {
                        annotation != null ? <div>
                            <div className="flex flex-wrap gap-2">{annotation.mood.map((mood, i) => <div key={i} className="text-black">#{mood}</div>)}</div>
                            <p className="mt-3 font-light italic">{annotation.emotion_description}</p>
                            </div> : null
                    }
                </div>
            </div>
        </div>
    </div>   
}