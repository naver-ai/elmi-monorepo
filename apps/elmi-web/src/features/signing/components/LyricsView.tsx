import { Input, Skeleton } from "antd"
import { useDispatch, useSelector } from "../../../redux/hooks"
import { lineSelectors, selectLineIdsByVerseId, setDetailLineId, toggleDetailLineId, verseSelectors } from "../reducer"
import { FocusEventHandler, Fragment, MouseEventHandler, useCallback } from "react"

export const LyricLineView = (props: {lineId: string}) => {
    const line = useSelector(state => lineSelectors.selectById(state, props.lineId))


    const detailLineId = useSelector(state => state.editor.detailLineId)

    const isSelected = detailLineId == props.lineId

    const dispatch = useDispatch()

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

    return <div className={`my-1 mb-4 last:mb-0 p-1 rounded-lg hover:bg-orange-400/20 ${isSelected ? 'bg-orange-400/30':''}`}>
        {
            line == null ? <Skeleton title={false} active/> : <>
            <div className={`mb-1 pl-1 cursor-pointer transition-colors`} onClick={onClick}>
                {
                    line.tokens.map((tok, i) => <Fragment key={i}><span>{tok}</span>{!tok.endsWith("-") ? " " : ""}</Fragment>)
                }
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