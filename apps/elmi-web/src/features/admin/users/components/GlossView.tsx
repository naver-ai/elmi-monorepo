import { useMemo } from "react"
import { useSelector } from "../../../../redux/hooks"
import { projectDetailSelectors, selectDenormalizedGlossPackage } from "../reducer"
import { ChatThread, InteractionType, LyricLine, MessageRole, ThreadMessage, Verse } from "../../../../model-types"
import moment from "moment-timezone"
import { UseSelector } from "react-redux"

export const GlossView = (props: {
    projectId: string
}) => {
    const detail = useSelector(state => projectDetailSelectors.selectById(state, props.projectId))
    const hierarchicalLyrics = useSelector(state => selectDenormalizedGlossPackage(state, props.projectId))

    return <div className="text-sm">
        {
            hierarchicalLyrics?.map(verse => <div key={verse.id} className="bg-gray-100 border p-2 my-2">
                <div  className="font-bold">[{verse.title}]</div>
                <div>{verse.lyrics.map(line => {

                    return <div key={line.id} className="my-2 flex gap-x-10">
                        <div className="w-[30%] min-w-[250px]">
                        <div>{line.lyric}</div>
                        {
                            line.gloss != null ? <div className="text-green-600 bg-lime-100 p-1">{line.gloss}</div> : <div className="bg-red-100 text-red-400 p-1">No gloss</div>
                        }
                        </div>
                        <div className="flex-1">
                        {line.thread != null ? <div className="bg-gray-200 rounded-md">
                            <div className="p-1 px-2 rounded-t-md bg-slate-400 font-bold">Chat Thread</div>
                            <div className="p-3">
                                {
                                    line.thread.messages?.map(message => {
                                        const addMessageLog = detail.logs?.find(log => log.type == InteractionType.SendChatMessage && log.metadata_json?.["thread_id"] == line.thread?.id)
                                        const timeZone = addMessageLog?.local_timezone
                                        
                                        return <div key={message.id} className="flex my-2 first:mt-0 gap-x-2">
                                        <div className="py-2">{message.role == MessageRole.Assistant ? "🤖" : "👩‍🦲"}</div>
                                        <div>
                                            <div className={`p-2 px-3 rounded-lg font-light text-base ${message.role == MessageRole.Assistant ? "bg-slate-500 text-white" : "bg-slate-300"}`}>{message.message}</div>
                                            {timeZone != null ? <div>{moment.tz((message as any)["created_at"], timeZone).format("YYYY-MM-DD hh:mm:ss Z")}</div> : null }
                                        </div>
                                        </div>})
                                }
                            </div>
                        </div> : <div className="p-1 text-gray-500">No chat thread.</div>}
                    </div>
                    </div>
                })}</div></div>)
        }
    </div>
}