import { useDispatch, useSelector } from "../../../redux/hooks"
import { selectLineIdsByVerseId, verseSelectors } from "../reducer"
import { useEffect } from "react"
import { MediaPlayer } from "../../media-player"
import { MediaPlayerStatus } from "../../media-player/types"
import { GlobalMediaPlayer } from "./GlobalMediaPlayer"
import { usePrevious } from "@uidotdev/usehooks"
import { LyricLineView } from "./LyricLineView"


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
    lyricsContainerClassName?: string
}) => {
    const verseIds = useSelector(verseSelectors.selectIds)


    const isLoadingProject = useSelector(state => state.editor.isProjectLoading)

    const isLoadingSong = useSelector(state => state.mediaPlayer.status == MediaPlayerStatus.LoadingMedia)


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


    return <div className={`lyric-panel-layout`}>
        {
            isLoadingProject !== true ? <div className={`px-2 animate-fadein ${props.lyricsContainerClassName}`}>
            {
                verseIds.map(verseId => <VerseView verseId={verseId} key={verseId}/>)
            }
            </div> : null
        }        
        {
            isLoadingSong !== true ? <GlobalMediaPlayer className="animate-slidein lyric-panel-layout block absolute bottom-0 z-10"/> : null
        }        
    </div>
}