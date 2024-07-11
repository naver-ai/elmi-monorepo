import { Input } from "antd"
import { useSelector } from "../../../redux/hooks"
import { lineSelectors, selectLineIdsByVerseId, verseSelectors } from "../reducer"

export const LyricLineView = (props: {lineId: string}) => {
    const line = useSelector(state => lineSelectors.selectById(state, props.lineId))
    return <div className="my-2 mb-4 last:mb-0">
        <div className="mb-2 pl-1">{line.lyric}</div>
        <Input className="rounded-md"/>
    </div>
}

export const VerseView = (props: {verseId: string}) => {
    const verse = useSelector(state => verseSelectors.selectById(state, props.verseId))
    const lineIds = useSelector(state => selectLineIdsByVerseId(state, props.verseId))

    return <div className="bg-slate-200/50 rounded-lg my-8 first:mt-0 last:mb-0 p-2">
        {verse.title != null ? <div className="text-gray-400 mb-2">[{verse.title}]</div> : null}
        {
            lineIds.map(lineId => <LyricLineView lineId={lineId} key={lineId}/>)
        }
    </div>
}

export const LyricsView = () => {
    const verseIds = useSelector(verseSelectors.selectIds)

    return <div className="container lg:w-[50vw] lg:max-w-[600px] mx-auto">
        {
            verseIds.map(verseId => <VerseView verseId={verseId} key={verseId}/>)
        }
    </div>
}