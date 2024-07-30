import { useDispatch, useSelector } from "../../../redux/hooks"
import { selectLineIdsByVerseId, verseSelectors } from "../reducer"
import { useEffect, useMemo } from "react"
import { MediaPlayer } from "../../media-player"
import { MediaPlayerStatus } from "../../media-player/types"
import { GlobalMediaPlayer } from "./GlobalMediaPlayer"
import { usePrevious } from "@uidotdev/usehooks"
import { LyricLineView } from "./LyricLineView"
import { Progress, Skeleton } from "antd"
import { formatDuration } from "../../../utils/time"
import { useAudioSegmentPositionPercentage } from "../hooks"
import { PartialDarkThemeProvider } from "../../../styles"

export const VerseView = (props: {verseId: string}) => {

    const verse = useSelector(state => verseSelectors.selectById(state, props.verseId))
    const lineIds = useSelector(state => selectLineIdsByVerseId(state, props.verseId))

    const isAudioPlaying = useSelector(state => state.mediaPlayer.status == MediaPlayerStatus.Playing)
    const isInLineLoopMode = useSelector(state => state.mediaPlayer.linePlayInfo != null)
    const isPositionHitting = useSelector(state => state.mediaPlayer.hitLyricTokenInfo?.verseId == props.verseId)

    const highlightVerse = lineIds.length == 0 && isAudioPlaying && isInLineLoopMode === false && isPositionHitting === true

    const audioPercentage = useAudioSegmentPositionPercentage(verse?.start_millis, verse?.end_millis)


    const [versePositionElapsedText, versePositionRemainingText] = useMemo(()=>{
        if(verse?.start_millis != null && verse?.end_millis != null){
            return[formatDuration(Math.ceil((verse.end_millis - verse.start_millis) * (audioPercentage)/100/1000)*1000), formatDuration(Math.ceil((verse.end_millis - verse.start_millis) * (100 - audioPercentage)/100/1000)*1000)]
        }else{
            return ["--:--", "--:--"]
        }
    }, [audioPercentage, verse?.end_millis, verse?.start_millis])

    return <div className={`relative bg-white/50 shadow-sm backdrop:blur-md rounded-2xl my-8 first:mt-0 last:mb-0 p-2 ${highlightVerse ? "!bg-orange-300 outline outline-orange-400 animate-music-indicate" : ""}`}>
        <div className={`flex gap-x-4 items-center mb-2 last:mb-0 ${verse.title == null ? 'justify-end' : 'justify-between'}`}>
            {verse.title != null ? <div className={`flex- 1 text-slate-400 font-bold ml-2 ${highlightVerse ? "text-white animate-bounce-fast" : ""}`}>[{verse.title}]</div> : null}
            <span className={`text-sm font-medium shrink-0 mr-2 ${highlightVerse === true ? 'text-white' : 'text-gray-500'}`}>
                <span>{formatDuration(verse.start_millis)} - {formatDuration(verse.end_millis)}</span>
                {
                    highlightVerse ? <PartialDarkThemeProvider>
                        <Progress showInfo={false} percent={audioPercentage} size={"small"} rootClassName="flex my-1"/>
                    </PartialDarkThemeProvider> :<Progress strokeWidth={5} showInfo={false} rootClassName="flex my-1" percent={audioPercentage} size={"small"} strokeColor={audioPercentage < 100 ? "#ffae74" : "#b3d40d"} trailColor="rgba(50,50,50,0.10)"/>

                }
                {
                    audioPercentage < 100 ? <div className="text-[0.65rem] leading-[0.65rem] flex justify-between">
                        <div>{versePositionElapsedText}</div>
                        <div>{versePositionRemainingText}</div>
                    </div> : null
                }
                

            </span>
        </div>
        
        {
            lineIds.map(lineId => <LyricLineView lineId={lineId} key={lineId}/>)
        }
    </div>
}

export const LyricsView = (props: {
    lyricsContainerClassName?: string
}) => {
    const verseIds = useSelector(verseSelectors.selectIds)


    const isLoadingProject = useSelector(state => state.editor.isProjectLoading)

    const isLoadingSong = useSelector(state => state.mediaPlayer.status == MediaPlayerStatus.LoadingMedia)


    const dispatch = useDispatch()

    const detailLineId = useSelector(state => state.editor.detailLineId)
    const prevDetailLineId = usePrevious(detailLineId)

    const globalMediaPlayerHeight = useSelector(state => state.editor.globelMediaPlayerHeight)

    useEffect(()=>{
        if(prevDetailLineId != null && detailLineId == null){
            // Closed
            dispatch(MediaPlayer.exitLineLoop())
        }else if(prevDetailLineId != detailLineId && detailLineId != null){
            // Selected new
            dispatch(MediaPlayer.playLineLoop(detailLineId, false))
        }

    }, [prevDetailLineId, detailLineId])


    return <div className={`lyric-panel-layout`}>
        {
            isLoadingSong !== true ? <div id="scroller" className={`px-2 animate-fadein mt-10 ${props.lyricsContainerClassName}`} style={{paddingBottom: (globalMediaPlayerHeight || 24) + 32}}>
            {
                verseIds.map(verseId => <VerseView verseId={verseId} key={verseId}/>)
            }
            </div> : <div className="px-2 py-10"><Skeleton active /></div>
        }        
        {
            isLoadingSong !== true ? <GlobalMediaPlayer className="animate-slidein lyric-panel-layout block absolute bottom-0 z-10"/> : null
        }        
    </div>
}