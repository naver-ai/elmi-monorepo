import { Button, Card, Form, Input } from "antd"
import { useDispatch, useSelector } from "../../../redux/hooks"
import { lineSelectors } from "../../signing/reducer"
import { selectMessagesByThreadId, selectThreadByLineId, sendMessage } from "../reducer"
import * as yup from 'yup'
import { useForm } from "react-hook-form"
import { yupResolver } from "@hookform/resolvers/yup"
import { FormItem } from "react-hook-form-antd"
import { useCallback } from "react"

const schema = yup.object({
    message: yup.string().trim().required()
}).required()

export const ThreadView = (props: {
    lineId: string
}) => {

    const dispatch = useDispatch()

    const line = useSelector(state => lineSelectors.selectById(state, props.lineId))

    const thread = useSelector(state => selectThreadByLineId(state, line?.id))

    const messages = useSelector(state => selectMessagesByThreadId(state, thread?.id))

    const { control, handleSubmit } = useForm({
        resolver: yupResolver(schema),
        
    })

    const submitMessage = useCallback((values: {message: string}) => {
        dispatch(sendMessage(line.id, "", values.message))
    }, [line.id])

    return <Card title={line?.lyric}>
        <div>
            {
                messages.map((m, i) => <div key={i}>{m.message}</div>) //TODO redesign callouts
            }
        </div>
        <Form className="flex items-stretch gap-x-1" onFinish={handleSubmit(submitMessage)}>
            <FormItem control={control} name="message">
                <Input placeholder="Ask me anything" autoFocus/>
            </FormItem>            
            <Button htmlType="submit" type="primary">Send</Button>
        </Form>
    </Card>
}