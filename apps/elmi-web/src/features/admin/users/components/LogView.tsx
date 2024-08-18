import { useMemo } from "react"
import { useSelector } from "../../../../redux/hooks"
import { projectDetailSelectors } from "../reducer"
import { InteractionType, LyricLine, Verse } from "../../../../model-types"
import { Timeline } from "antd"
import moment from 'moment-timezone'

export const LogView = (props: {projectId: string}) => {

    const detail = useSelector(state => projectDetailSelectors.selectById(state, props.projectId))
    
    const items = useMemo(()=>{
        return detail?.logs?.map(log => {
            let logContent = null
            if(log.metadata_json?.lineId != null){
                const line = detail.lines.find(line => line.id == log.metadata_json!.lineId)
                if(line != null){
                    logContent = <div><span className="text-xs font-bold">V{detail.verses.find(v => v.id == line?.verse_id)?.verse_ordering}-L{line?.line_number}</span> {line?.lyric}</div>
                }
            }else if(log.metadata_json != null){
                logContent = <div className="mt-2">{Object.keys(log.metadata_json).map(key => {
                    return <div className="flex"><div className="font-semibold w-32">{key}</div><div className="flex-1">{log.metadata_json![key]}</div></div>
                })}</div>
            }


            return {
                label: <span>{moment.tz(log.timestamp, log.local_timezone).format("YYYY-MM-DD hh:mm:ss z")}</span>,
                children: <div>
                    <div className="font-bold">{log.type}</div>
                    {logContent}
                </div>,
                color: log.type == InteractionType.EnterProject ? 'green' : (log.type == InteractionType.ExitProject ? 'red' : 'gray')
            }
        })
    }, [detail?.id])

    return <div>
        <Timeline items={items} mode="left"/>
    </div>
}