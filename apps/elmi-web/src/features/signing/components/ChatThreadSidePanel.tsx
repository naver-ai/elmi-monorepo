import { Button, Card, Input } from "antd"
import { useSelector } from "../../../redux/hooks"
import { ThreadView } from "../../chat/components/ThreadView"

export const ChatThreadSidePanel = (props: {
    className?: string
}) => {

    const activeLineId = useSelector(state => state.chat.activeLineId)

    return <div className={`relative flex-1 transition-all ${props.className}`}>
        <div className="w-[300px] max-w-[25vw] p-3">
            {
                activeLineId != null ? <ThreadView lineId={activeLineId}/> : null
            }
        </div>
    </div>
}