import { Button, Input, Skeleton } from "antd"
import { useDispatch, useSelector } from "../../../redux/hooks"
import { lineSelectors, selectLineIdsByVerseId, setDetailLineId, toggleDetailLineId, verseSelectors } from "../reducer"
import { FocusEventHandler, Fragment, MouseEventHandler, useCallback, useEffect, useMemo } from "react"
import { MediaPlayer, mountedLindIdSelector } from "../../media-player/reducer"
import { MediaPlayerStatus } from "../../media-player/types"
import { LyricLine, TimestampRange } from "apps/elmi-web/src/model-types"

const LyricToken = (props: {
    text: string
    enableHighlighting: boolean,
    className?: string
} & TimestampRange) => {

    const audioPosition = useSelector(state => state.mediaPlayer.audioPositionMillis)
    const isActive = useMemo(()=>{
        return props.enableHighlighting && audioPosition != null && audioPosition < props.end_millis && audioPosition >= props.start_millis
    }, [props.enableHighlighting, audioPosition, props.end_millis, props.start_millis])
    return <><span className={`transition-all rounded-sm ${isActive === true ? "outline-amber-200 outline-[2px] outline outline-offset-[3px] bg-white/20":""} ${props.className}`}>{props.text}</span>
        {!props.text.endsWith("-") ? " " : ""}
        </>
}

const LyricLineView = (props: {lineId: string}) => {
    const line = useSelector(state => lineSelectors.selectById(state, props.lineId))

    const detailLineId = useSelector(state => state.editor.detailLineId)

    const isSelected = detailLineId == props.lineId

    const dispatch = useDispatch()

    useEffect(()=>{
        if(isSelected){
            dispatch(MediaPlayer.playLineLoop(props.lineId))
        }
    }, [isSelected, props.lineId])

    const onClick = useCallback<MouseEventHandler<HTMLDivElement>>((ev)=>{
        if(line?.id != null){
            ev.preventDefault()
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
    const mediaPlayerMountedLindId = useSelector(mountedLindIdSelector)

    const onClickPause = useCallback<MouseEventHandler<HTMLDivElement>>((ev)=>{
        ev.preventDefault()
    }, [])


    return <div className={`mb-3 last:mb-0 p-1.5 rounded-lg hover:bg-orange-400/20 ${isSelected ? 'point-gradient-bg-light':''}`}>
        {
            line == null ? <Skeleton title={false} active/> : <>
            <div className={`mb-1 pl-1 cursor-pointer transition-colors flex items-baseline`} onClick={onClick}>
                <div className="flex-1">
                {
                    line.tokens.map((tok, i) => <LyricToken key={i} text={tok} enableHighlighting={isSelected && isAudioPlaying === true} {...line.timestamps[i]} className={isSelected ? "text-white" : undefined}/>)
                }
                </div>
                {false && <Button onClick={onClickPause} tabIndex={-1}>Pause</Button>}
            </div>
            <Input className="interactive rounded-md" 
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
        }</div>

        <div className="lyric-panel-layout bg-black block absolute bottom-0 h-20">
            Footer player content
        </div>
    </div>
}