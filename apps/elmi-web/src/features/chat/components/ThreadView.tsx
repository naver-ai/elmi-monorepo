import { Button, Card, Input } from "antd"
import { useSelector } from "../../../redux/hooks"
import { lineSelectors } from "../../signing/reducer"
import { selectMessagesByThreadId } from "../reducer"

export const ThreadView = (props: {
    threadId?: string
    lineId: string
}) => {

    const line = useSelector(state => lineSelectors.selectById(state, props.lineId))

    const messages = useSelector(state => selectMessagesByThreadId(state, props.threadId))

    return <Card title={line?.lyric}>
        <div>
            {
                messages.map((m, i) => <span key={i}>{m.message}</span>)
            }
        </div>
        <div className="flex items-stretch gap-x-1">

            <Input placeholder="Ask me anything" autoFocus/>
            <Button type="primary">Send</Button>
        </div>
    </Card>
}