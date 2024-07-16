import { Input } from "antd"
import { useDispatch, useSelector } from "../../../redux/hooks"
import { lineSelectors, selectLineIdsByVerseId, toggleDetailVerseId, verseSelectors } from "../reducer"
import { MouseEventHandler, useCallback } from "react"

export const LyricLineView = (props: {lineId: string}) => {
    const line = useSelector(state => lineSelectors.selectById(state, props.lineId))
    return <div className="my-2 mb-4 last:mb-0">
        <div className="mb-2 pl-1">{line.lyric}</div>
        <Input className="interactive rounded-md"/>
    </div>
}

export const VerseView = (props: {verseId: string}) => {

    const dispatch = useDispatch()

    const verse = useSelector(state => verseSelectors.selectById(state, props.verseId))
    const lineIds = useSelector(state => selectLineIdsByVerseId(state, props.verseId))

    const onClick = useCallback<MouseEventHandler<HTMLDivElement>>((ev)=>{
        if(verse?.id != null){
            ev.preventDefault()
            dispatch(toggleDetailVerseId(verse?.id))
        }

    }, [verse?.id])

    return <div className="relative bg-white/50 shadow-sm backdrop:blur-md rounded-lg my-8 first:mt-0 last:mb-0 p-4 transition-all outline-orange-300/40 outline-0 hover:outline hover:outline-2 has-[.interactive:hover]:outline-0 has-[.interactive:focused]:outline-0"
        onClick={onClick}
    >
        {verse.title != null ? <div className="text-slate-400 mb-2 font-bold">[{verse.title}]</div> : null}
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
        {
            verseIds.map(verseId => <VerseView verseId={verseId} key={verseId}/>)
        }
    </div>
}