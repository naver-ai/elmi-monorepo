import { Button, Input, InputRef, Skeleton, Progress, Tooltip, Spin, AutoComplete, AutoCompleteProps } from "antd"
import { useDispatch, useSelector } from "../../../redux/hooks"
import { getAltGlosses, lineAltGlossesSelectors, lineInspectionSelectors, lineSelectors, lineTranslationSelectors, sendInteractionLog, setDetailLineId, setShowScrollToLineButton, toggleDetailLineId, upsertLineTranslationInput } from "../reducer"
import { FocusEventHandler, MouseEventHandler, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { MediaPlayer } from "../../media-player"
import { MediaPlayerStatus } from "../../media-player/types"
import { ChatBubbleLeftIcon, PauseIcon, PlayIcon, ArrowRightIcon, CheckCircleIcon,  } from "@heroicons/react/20/solid"
import {LightBulbIcon} from '@heroicons/react/24/solid'
import { PartialDarkThemeProvider } from "../../../styles"
import { startNewThread, selectThreadIdByLineId, setActiveThreadLineId, selectMessagesByThreadId, ChatThreadPlaceholder } from "../../chat/reducer"
import { useAudioSegmentPositionPercentage } from "../hooks"
import { Http } from "../../../net/http"
import { ReferenceVideoView } from "./ReferenceVideoView"
import { useInView } from "react-intersection-observer";
import { ShortcutManager } from "../../../services/shortcut"
import { useDebouncedCallback } from "use-debounce"
import { filter } from "rxjs"
import { InteractionType } from "../../../model-types"
import { usePrevious } from "@uidotdev/usehooks"
import { LoadingIndicator } from "../../../components/LoadingIndicator"

const LineReferenceVideoView = () => {

    const songId = useSelector(state => state.editor.song?.id)
    const lineId = useSelector(state => state.editor.detailLineId)
    const line = useSelector(state => lineSelectors.selectById(state, lineId || ""))

    const url = useMemo(()=>{
        if(songId != null && lineId != null){
            return Http.getTemplateEndpoint(Http.ENDPOINT_APP_MEDIA_SONGS_ID_LINES_ID_VIDEO, {
                song_id: songId,
                line_id: lineId
            })
        }else return undefined
    }, [songId, lineId])

    return url != null && line != null ? <ReferenceVideoView videoUrl={url} segStart={line?.start_millis} containerClassName="mb-4" frameClassName="rounded-lg"/> : null
}

const LYRIC_TOKEN_ACTIVE_CLASSNAME_SELECTED = "outline-[2px] outline outline-offset-[0px] bg-white/20 scale-110"
const LYRIC_TOKEN_ACTIVE_CLASSNAME_UNSELECTED = "outline-[2px] outline outline-offset-[0px] outline-pink-400 scale-110"


const LyricToken = (props: {
    lineId: string
    text: string
    index: number
    enableHighlighting: boolean,
    className?: string,
}) => {


    const detailLineId = useSelector(state => state.editor.detailLineId)

    const isSelected = detailLineId == props.lineId

    const isActive = useSelector(state => state.mediaPlayer.hitLyricTokenInfo?.lineId == props.lineId && state.mediaPlayer.hitLyricTokenInfo?.index == props.index)

    return <><div className={`transition-all rounded-sm inline-block outline-amber-200 ${isActive === true && props.enableHighlighting === true ? (isSelected === true ? LYRIC_TOKEN_ACTIVE_CLASSNAME_SELECTED : LYRIC_TOKEN_ACTIVE_CLASSNAME_UNSELECTED):""} ${props.className}`}>{props.text}</div>
        {!props.text.endsWith("-") ? " " : ""}
        </>
}

const LyricLineControlPanel = (props: {lineId: string}) => {

    const line = useSelector(state => lineSelectors.selectById(state, props.lineId))
    const dispatch = useDispatch()

    const mediaPlayerStatus = useSelector(state => state.mediaPlayer.status)
    const isAudioPlaying = mediaPlayerStatus == MediaPlayerStatus.Playing

    const audioPercentage = useAudioSegmentPositionPercentage(line?.start_millis, line?.end_millis)

    const onClickPause = useCallback<MouseEventHandler<HTMLDivElement>>((ev)=>{
        ev.stopPropagation()
        if(mediaPlayerStatus == MediaPlayerStatus.Playing){
            dispatch(MediaPlayer.pauseMedia())
            dispatch(sendInteractionLog(null, InteractionType.PauseSong, {"reason": "line_view", "mode": "line", lineId: line?.id}))
        }else if(mediaPlayerStatus == MediaPlayerStatus.Standby || mediaPlayerStatus == MediaPlayerStatus.Paused){
            dispatch(MediaPlayer.playLineLoop(line?.id, true))
            dispatch(sendInteractionLog(null, InteractionType.PlaySong, {"reason": "line_view", "mode": "line", lineId: line?.id}))
        }
    }, [mediaPlayerStatus, line?.id])

    const IconClass = isAudioPlaying ? PauseIcon : PlayIcon

    return <div className="flex items-center gap-x-1" aria-selected="false">
    <Button onClick={onClickPause} type="text" className="m-0 p-0 rounded-full aspect-square relative items-center justify-center" tabIndex={-1}>
        <Progress size={24} type="circle" percent={audioPercentage} 
        showInfo={false} strokeWidth={12} strokeColor={"white"} trailColor="rgba(255,255,255,0.3)"/>
        <IconClass className="w-3 h-3 absolute top-0 left-0 bottom-0 right-0 self-center mx-auto fill-white"/>
        </Button>
    </div>
}

const LyricLineChatStatusIndicator = (props: {threadId: string}) => {
    const numMessages = useSelector(state => selectMessagesByThreadId(state, props.threadId).length)
    
    return <div className="flex items-center gap-x-1 px-1 text-slate-500 font-semibold text-sm"><ChatBubbleLeftIcon className="w-4 h-4"/><span>{numMessages}</span></div>
}

const START_THREAD_HANDLERS = {
    onThreadPlaceholderAdded: (placeholder: ChatThreadPlaceholder) => {
        requestAnimationFrame(()=>{
            ShortcutManager.instance.requestFocus({type: 'thread', id: placeholder.id})
        })
    }
}

export const LyricLineView = (props: {lineId: string}) => {
    const line = useSelector(state => lineSelectors.selectById(state, props.lineId))

    const projectId = useSelector(state => state.editor.projectId)

    const detailLineId = useSelector(state => state.editor.detailLineId)
    const isAltGlossLoading = useSelector(state => state.editor.lineAltGlossLoadingFlags[props.lineId] === true)

    const isSelected = detailLineId == props.lineId
    const prevIsSelected = usePrevious(isSelected)

    const inputRef = useRef<InputRef>(null)

    const dispatch = useDispatch()

    useEffect(()=>{
        if(isSelected){
            inputRef.current?.focus()
            requestAnimationFrame(()=>{
                scrollAnchorRef?.current?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                })
            })
        }
    }, [isSelected])

    useEffect(()=>{
        if(prevIsSelected != isSelected && projectId != null){
            if(isSelected){
                dispatch(sendInteractionLog(projectId, InteractionType.SelectLine, {lineId: props.lineId}))
            }
        }
    }, [isSelected, prevIsSelected, projectId, props.lineId])

    const onClick = useCallback<MouseEventHandler<HTMLDivElement>>((ev)=>{
        if(line?.id != null){
            dispatch(toggleDetailLineId(line?.id))
        }

    }, [line?.id])

    const mediaPlayerStatus = useSelector(state => state.mediaPlayer.status)
    const isAudioPlaying = mediaPlayerStatus == MediaPlayerStatus.Playing
    const isInLineLoopMode = useSelector(state => state.mediaPlayer.linePlayInfo != null)
    const isPositionHitting = useSelector(state => state.mediaPlayer.hitLyricTokenInfo?.lineId == props.lineId)

    const inspection = useSelector(state => lineInspectionSelectors.selectById(state, props.lineId))

    const threadId = useSelector(state => selectThreadIdByLineId(state, props.lineId))
    const isThreadActive = useSelector(state => state.chat.activeLineId == props.lineId)

    const altGlosses = useSelector(state => lineAltGlossesSelectors.selectById(state, props.lineId))

    const showChatButton = isSelected === true && threadId == null && isThreadActive == false

    const {ref, inView} = useInView()

    const altGlossOptions = useMemo<AutoCompleteProps['options']>(()=>{
        return altGlosses?.alt_glosses?.map((gloss, i) => ({label: gloss, value: gloss}))
    }, [altGlosses?.alt_glosses, props.lineId])

    const onClickInspectionIndicator = useCallback<MouseEventHandler<HTMLElement>>((ev) => {
        ev.stopPropagation()
        const lineId = line?.id
        if(lineId != null){
            dispatch(setDetailLineId(lineId))
            dispatch(MediaPlayer.pauseMedia())
            dispatch(setActiveThreadLineId(lineId))
            dispatch(startNewThread(lineId, START_THREAD_HANDLERS))
        }
    }, [line?.id])

    const onClickChatThreadButton = useCallback<MouseEventHandler<HTMLElement>>((ev) => {
        ev.stopPropagation()
        const lineId = line?.id
        if(lineId != null){
            dispatch(setDetailLineId(lineId))
            dispatch(MediaPlayer.pauseMedia())
            dispatch(setActiveThreadLineId(lineId))
            if(threadId == null){
                dispatch(startNewThread(lineId, START_THREAD_HANDLERS))
            }
        }
    }, [line?.id, threadId])

    const userTranslation = useSelector(state => lineTranslationSelectors.selectById(state, props.lineId))
    const [currentTranslationInput, setCurrentTranslationInput] = useState<string>(userTranslation?.gloss || "")
    const isTranslationUploading = useSelector(state => state.editor.lineTranslationSynchronizationFlags[props.lineId] === true)
    
    const updateTranslationInput = useCallback(()=>{
        if(inputRef.current?.input != null){
            const currentInputValue = inputRef.current.input.value.trim()
            dispatch(upsertLineTranslationInput(props.lineId, currentInputValue.length == 0 ? undefined : currentInputValue))
            if(currentInputValue.length > 0){
                dispatch(getAltGlosses(props.lineId, currentInputValue))
            }
        }
    }, [props.lineId])
    const debouncedSyncTranslationInput = useDebouncedCallback(updateTranslationInput, 700)

    const isTranslationInputDirty = useMemo(()=>{
        const cleanedInput = currentTranslationInput?.trim() || undefined
        const cleanedGloss = userTranslation?.gloss?.trim() || undefined
        return cleanedGloss != cleanedInput && cleanedInput != undefined

    }, [userTranslation?.gloss, currentTranslationInput])

    const onInputChange = useCallback((value: string)=>{
        setCurrentTranslationInput(value)
        debouncedSyncTranslationInput()
    }, [debouncedSyncTranslationInput])

    const onSelectAltGloss = useCallback((value: string) => {
        setCurrentTranslationInput(value)
        updateTranslationInput()
        if(projectId != null){
            dispatch(sendInteractionLog(projectId, InteractionType.SelectAltGloss, { value, lineId: props.lineId, altGlossResultId: altGlosses?.id}))
        }
    }, [altGlosses?.id, projectId, props.lineId, debouncedSyncTranslationInput, updateTranslationInput])


    const [inputFocused, setInputFocused] = useState<boolean>(false)

    const onInputFocus = useCallback<FocusEventHandler<HTMLInputElement>>(ev => {
        if(line?.id != null){
            dispatch(setDetailLineId(line?.id))
        }
        setInputFocused(true)
    }, [line?.id])


    const onClickInput = useCallback(() => {
        if(line?.id != null){
            dispatch(setDetailLineId(line?.id))
        }
        if(inputRef.current?.input?.value != null && altGlosses == null){
            dispatch(getAltGlosses(line?.id, inputRef.current?.input?.value!))
        }
    }, [line?.id, altGlosses])

    const onInputBlur = useCallback(()=>{
        if(inputRef.current?.input != null){
            const currentInputValue = inputRef.current.input.value.trim()
            dispatch(upsertLineTranslationInput(props.lineId, currentInputValue.length == 0 ? undefined : currentInputValue))
        }
        setInputFocused(false)
    }, [userTranslation?.gloss, props.lineId])

    const scrollAnchorRef = useRef<HTMLDivElement>(null)

    useEffect(()=>{
        if(isPositionHitting === true && isInLineLoopMode == false && scrollAnchorRef.current != null){
            scrollAnchorRef.current?.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            })
        }

    },[isPositionHitting, isInLineLoopMode])

    useEffect(()=>{
        if(isInLineLoopMode && isSelected){
            dispatch(setShowScrollToLineButton(!inView))
        }
    },[isSelected, isInLineLoopMode, inView, props.lineId])

    useEffect(()=>{
        const timelineClickEventSubscription = MediaPlayer.getTimelineClickEventObservable().subscribe({
            next: ({ positionMillis, lyricCoord }) => {
                if(lyricCoord?.lineId == props.lineId){
                    scrollAnchorRef.current?.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    })
                }
            }
        })

        const shortcutEventSubscription = ShortcutManager.instance.onFocusRequestedEvent
            .pipe(filter(args => args.type == 'line'))
            .subscribe({
                next: ({type, id}) => {
                    if(id == props.lineId){
                        scrollAnchorRef.current?.scrollIntoView({
                            behavior: 'smooth',
                            block: 'start'
                        })
                    }
                }
            })

        return () => {
            debouncedSyncTranslationInput.cancel()
            shortcutEventSubscription.unsubscribe()
            timelineClickEventSubscription.unsubscribe()
        }
    }, [props.lineId])

    return <div ref={ref} className={`transition-all relative mb-3 last:mb-0 p-1.5 rounded-xl hover:bg-orange-400/20 ${isSelected ? 'point-gradient-bg-light':''} ${isInLineLoopMode == true && isAudioPlaying && isPositionHitting ? "outline animate-music-indicate" : ""} ${isInLineLoopMode == false && isAudioPlaying && isPositionHitting ? 'bg-orange-400/20 outline animate-music-indicate':''}`}>
        <div ref={scrollAnchorRef} className="scroll-anchor absolute top-[-30px] bottom-[-30px] left-0 w-5 h-5 pointer-events-none"/>
        {
            line == null ? <Skeleton title={false} active/> : <>
                {
                        isSelected == true ? <LineReferenceVideoView key={"line-video-player"}/> : null
                }
                <div className={`mb-1 pl-1 cursor-pointer transition-colors flex items-baseline`} onClick={onClick}>
                    <div className="flex-1 text-[13pt]">
                    {
                        line.tokens.map((tok, i) => {
                            return <LyricToken key={i} text={tok} lineId={line.id} index={i}
                                enableHighlighting={(isSelected && isAudioPlaying === true) || isInLineLoopMode === false} {...line.timestamps[i]} 
                                className={isSelected ? "text-white" : undefined}/>
                    })
                    }
                    </div>
                    {
                        isSelected === true ? <LyricLineControlPanel lineId={props.lineId}/> : (
                            inspection != null && threadId == null ? <PartialDarkThemeProvider>
                                <Tooltip title={<><span>{inspection.description}</span><br/><span className="font-bold">Click to chat with me about this!</span></>}>
                                    <Button tabIndex={-1} size="small" className="rounded-full aspect-square p-0 bg-lime-500 hover:!bg-lime-400 border-none" 
                                    onClick={onClickInspectionIndicator}><LightBulbIcon className="w-3.5 h-3.5 text-white"/></Button></Tooltip>
                                </PartialDarkThemeProvider> : threadId != null ? <LyricLineChatStatusIndicator threadId={threadId}/> : null
                        )
                    }
                </div>
                <AutoComplete options={altGlossOptions} className="w-full" onSelect={onSelectAltGloss}
                    defaultValue={userTranslation?.gloss} 
                    value={currentTranslationInput}
                    onChange={onInputChange}
                    placeholder="Insert gloss translation"
                    onClick={onClickInput}
                    onFocus={onInputFocus}
                    onBlur={onInputBlur}
                    open={altGlossOptions != null && inputFocused == true && isSelected}
                    suffixIcon={userTranslation?.gloss != null ? <Tooltip title={isTranslationUploading ? "Saving..." : (isTranslationInputDirty ? "" :"Your gloss is saved.")}>{isTranslationUploading ? <Spin size="small"/> : (isTranslationInputDirty ? null : <CheckCircleIcon className="w-4 h-4 text-lime-400"/>)}</Tooltip> : null}
                    
                    ><Input ref={inputRef} className="interactive rounded-md"                    
                    autoComplete="off"
                    rootClassName="!pr-1 !pl-2"
                    /></AutoComplete>
                {isSelected && <PartialDarkThemeProvider><div className="flex items-center pt-2">
                    {isAltGlossLoading ? <LoadingIndicator size="small" title="Generating alt glosses..."/> : null }
                    <div className="flex-1"/>
                {
                    showChatButton && 
                            <>{
                                inspection != null ? <Button type="text" tabIndex={-1} size="small" icon={<LightBulbIcon className="w-4 h-4 animate-bounce-emphasized"/>} onClick={onClickInspectionIndicator}><span>Elmi has thoughts on this line</span><ArrowRightIcon className="w-4 h-4"/></Button> : 
                                <Button type="text" tabIndex={-1} size="small" icon={<ChatBubbleLeftIcon className="w-4 h-4"/>} onClick={onClickChatThreadButton}>Start Chat<ArrowRightIcon className="w-4 h-4"/></Button>
                            }</>
                            
                }</div>
                </PartialDarkThemeProvider>}
            </>
        }
    </div>
}