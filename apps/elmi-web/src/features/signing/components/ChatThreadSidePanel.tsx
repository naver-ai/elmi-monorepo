import { Button, Card, Input } from "antd"
import { useDispatch, useSelector } from "../../../redux/hooks"
import { ThreadView } from "../../chat/components/ThreadView"
import { fetchChatData, threadSelectors } from "../../chat/reducer"
import { useEffect } from "react"

export const ChatThreadSidePanel = (props: {
    className?: string
}) => {

    const dispatch = useDispatch()

    const threadIds = useSelector(threadSelectors.selectIds)

    const activeLineId = useSelector(state => state.editor.detailLineId)

    return <div className={`relative overflow-y-auto ${props.className}`}>
        <div className="min-w-[400px] max-w-[30vw] p-3">
            {
                threadIds.map(threadId => <ThreadView key={threadId} threadId={threadId}/>)
            }
        </div>
    </div>
}