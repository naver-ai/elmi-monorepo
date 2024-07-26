import { Button, Card, Input } from "antd"
import { useSelector } from "../../../redux/hooks"
import { ThreadView } from "../../chat/components/ThreadView"

export const ChatThreadSidePanel = () => {

    const activeLineId = useSelector(state => state.chat.activeLineId)

    return <div className="relative flex-1 flex-grow-0 flex-shrink-0">
        <div className="w-[300px] max-w-[25vw] p-3">

            {
                activeLineId != null ? <ThreadView lineId={activeLineId}/> : null
            }
        </div>
    </div>
}