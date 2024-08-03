import { Button, Card, Input } from "antd"
import { useSelector } from "../../../redux/hooks"
import { ThreadView } from "../../chat/components/ThreadView"

export const ChatThreadSidePanel = (props: {
    className?: string
}) => {

    const activeLineId = useSelector(state => state.chat.activeLineId)

    return <div className={`relative transition-all ${props.className}`}>
        <div className="min-w-[400px] max-w-[30vw] p-3">
            {
                activeLineId != null ? <ThreadView lineId={activeLineId}/> : null
            }
        </div>
    </div>
}