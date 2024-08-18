import { useMemo } from "react"
import { useSelector } from "../../../../redux/hooks"
import { projectDetailSelectors } from "../reducer"
import { LyricLine, Verse } from "../../../../model-types"

export const GlossView = (props: {
    projectId: string
}) => {
    const detail = useSelector(state => projectDetailSelectors.selectById(state, props.projectId))

    const hierarchicalLyrics: Array<Verse & { lyrics: Array<LyricLine & {gloss?:string}> }> = useMemo(() => {
        return detail?.verses.map(v => ({ ...v, lyrics: detail.lines.filter(line => line.verse_id == v.id).map(line => ({...line, gloss: detail.translations.find(t => t.line_id == line.id)?.gloss})) }))
    }, [detail?.id])

    return <div className="text-sm">
        {
            hierarchicalLyrics?.map(verse => <div className="bg-gray-100 border p-2 my-2">
                <div  className="font-bold">[{verse.title}]</div>
                <div>{verse.lyrics.map(line => {
                    return <div className="my-2">
                        <div>{line.lyric}</div>
                        {
                            line.gloss != null ? <div className="text-green-600 bg-lime-100 p-1">{line.gloss}</div> : <div className="bg-red-100 text-red-400 p-1">No gloss</div>
                        }
                        
                    </div>
                })}</div></div>)
        }
    </div>
}