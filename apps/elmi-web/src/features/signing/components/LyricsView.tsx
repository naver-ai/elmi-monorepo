import { useDispatch, useSelector } from "../../../redux/hooks"
import { selectLineIdsByVerseId, verseSelectors } from "../reducer"
import { useCallback, useEffect, useMemo } from "react"
import { MediaPlayer } from "../../media-player"
import { MediaPlayerStatus } from "../../media-player/types"
import { GlobalMediaPlayer } from "./GlobalMediaPlayer"
import { usePrevious } from "@uidotdev/usehooks"
import { LyricLineView } from "./LyricLineView"
import { Button, Progress, Skeleton } from "antd"
import { formatDuration } from "../../../utils/time"
import { useAudioSegmentPositionPercentage } from "../hooks"
import { PartialDarkThemeProvider } from "../../../styles"
import { useResizeDetector } from "react-resize-detector"
import { CursorArrowRaysIcon } from "@heroicons/react/20/solid"
import { ShortcutManager } from "../../../services/shortcut"

export const VerseView = (props: { verseId: string }) => {

    const verse = useSelector(state => verseSelectors.selectById(state, props.verseId))
    const lineIds = useSelector(state => selectLineIdsByVerseId(state, props.verseId))

    const isAudioPlaying = useSelector(state => state.mediaPlayer.status == MediaPlayerStatus.Playing)
    const isInLineLoopMode = useSelector(state => state.mediaPlayer.linePlayInfo != null)
    const isPositionHitting = useSelector(state => state.mediaPlayer.hitLyricTokenInfo?.verseId == props.verseId)

    const highlightVerse = lineIds.length == 0 && isAudioPlaying && isInLineLoopMode === false && isPositionHitting === true

    const audioPercentage = useAudioSegmentPositionPercentage(verse?.start_millis, verse?.end_millis)


    const [versePositionElapsedText, versePositionRemainingText] = useMemo(() => {
        if (verse?.start_millis != null && verse?.end_millis != null) {
            return [formatDuration(Math.ceil((verse.end_millis - verse.start_millis) * (audioPercentage) / 100 / 1000) * 1000), formatDuration(Math.ceil((verse.end_millis - verse.start_millis) * (100 - audioPercentage) / 100 / 1000) * 1000)]
        } else {
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
                        <Progress showInfo={false} percent={audioPercentage} size={"small"} rootClassName="flex my-1" />
                    </PartialDarkThemeProvider> : <Progress strokeWidth={5} showInfo={false} rootClassName="flex my-1" percent={audioPercentage} size={"small"} strokeColor={audioPercentage < 100 ? "#ffae74" : "#b3d40d"} trailColor="rgba(50,50,50,0.10)" />

                }
                {
                    audioPercentage < 100 ? <div className="text-[0.75rem] leading-[0.75rem] flex justify-between">
                        <div>{versePositionElapsedText}</div>
                        <div>{versePositionRemainingText}</div>
                    </div> : null
                }


            </span>
        </div>

        {
            lineIds.map(lineId => <LyricLineView lineId={lineId} key={lineId} />)
        }
    </div>
}

export const LyricsView = (props: {
    className?: string
    lyricsContainerClassName?: string
}) => {
    const verseIds = useSelector(verseSelectors.selectIds)


    const isLoadingProject = useSelector(state => state.editor.isProjectLoading)

    const isLoadingSong = useSelector(state => state.mediaPlayer.status == MediaPlayerStatus.LoadingMedia)


    const dispatch = useDispatch()

    const detailLineId = useSelector(state => state.editor.detailLineId)
    const prevDetailLineId = usePrevious(detailLineId)

    const globalMediaPlayerHeight = useSelector(state => state.editor.globelMediaPlayerHeight)

    const showScrollToLineButton = useSelector(state => state.editor.showScrollToLineButton)

    useEffect(() => {
        if (prevDetailLineId != null && detailLineId == null) {
            // Closed
            dispatch(MediaPlayer.exitLineLoop())
        } else if (prevDetailLineId != detailLineId && detailLineId != null) {
            // Selected new
            dispatch(MediaPlayer.playLineLoop(detailLineId, false))
        }

    }, [prevDetailLineId, detailLineId])

    const { width: lyricPanelWidth, ref } = useResizeDetector()

    const panelWidthStyle = useMemo(()=>({ width: lyricPanelWidth }), [lyricPanelWidth])
    const lyricListStyle = useMemo(()=>({ paddingBottom: (globalMediaPlayerHeight || 24) + 32 }), [globalMediaPlayerHeight])

    const scrollToButtonStyle = useMemo(()=>({ bottom: (globalMediaPlayerHeight || 24) + 2, marginLeft: (lyricPanelWidth || 0)/2 }), [globalMediaPlayerHeight, lyricPanelWidth])

    const onScrollToLineClick = useCallback(() => {
        if (detailLineId) {
            ShortcutManager.instance.requestFocus({ type: 'line', id: detailLineId })
        }
    }, [detailLineId])


    return <div className={`overflow-y-auto ${props.className}`}>
            <div className={`lyric-panel-layout`} ref={ref}>
            {
                isLoadingSong !== true ? <div id="scroller" className={`px-2 animate-fadein mt-10 ${props.lyricsContainerClassName}`} style={lyricListStyle}>
                    {
                        verseIds.map(verseId => <VerseView verseId={verseId} key={verseId} />)
                    }
                </div> : <div className="px-2 py-10"><Skeleton active /></div>
            }
            {
                isLoadingSong !== true ? <PartialDarkThemeProvider>
                <Button tabIndex={-1} className={`transition-transform absolute bottom-0 w-48 mb-3 rounded-full backdrop-blur-md bg-gray-700/80 border-none shadow-xl shadow-black/30 -translate-x-[50%] ${showScrollToLineButton ? 'scale-100 pointer-events-all' : 'scale-0'}`} 
                    style={scrollToButtonStyle} onClick={onScrollToLineClick} icon={<CursorArrowRaysIcon className="w-4 h-4" />}>Scroll to Current Line</Button>
            </PartialDarkThemeProvider> : null
            }
            {
                isLoadingSong !== true ? <div className="animate-slidein absolute bottom-0 flex flex-col z-10" style={panelWidthStyle}>
                    <GlobalMediaPlayer />
                </div> : null
            }
        </div>
    </div>
}