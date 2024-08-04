import { useSelector } from "../../../redux/hooks"
import { ThreadView } from "../../chat/components/ThreadView"
import { threadSelectors } from "../../chat/reducer"

export const ChatThreadSidePanel = (props: {
    className?: string
}) => {

    const threadIds = useSelector(threadSelectors.selectIds)

    return <div className={`relative overflow-y-auto ${props.className}`}>
        <div className="min-w-[300px] w-[30vw] max-w-[450px] p-3">
            {
                threadIds.map(threadId => <ThreadView key={threadId} threadId={threadId}/>)
            }
        </div>
    </div>
}