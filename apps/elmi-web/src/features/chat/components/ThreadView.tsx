import { Button, Card, Form, Input, Spin } from "antd"
import { useDispatch, useSelector } from "../../../redux/hooks"
import { lineSelectors } from "../../signing/reducer"
import { selectMessagesByThreadId, selectThreadByLineId, sendMessage, startNewThread} from "../reducer"
import * as yup from 'yup'
import { useForm } from "react-hook-form"
import { yupResolver } from "@hookform/resolvers/yup"
import { FormItem } from "react-hook-form-antd"
import { useCallback, useEffect } from "react"
import { ChatIntent } from "../../../model-types"

const schema = yup.object({
    message: yup.string().trim().required()
}).required()

export const ThreadView = (props: {
    lineId: string
}) => {

    const dispatch = useDispatch()

    const projectId = useSelector(state => state.editor.projectId)

    const thread = useSelector(state => selectThreadByLineId(state, props.lineId))

    const isCreating = useSelector(state => state.chat.threadInitializingLineId == props.lineId)

    const messages = useSelector(state => selectMessagesByThreadId(state, thread?.id))

    const { control, handleSubmit } = useForm({
        resolver: yupResolver(schema),
        
    })

    // Edit this function :)
    const submitMessage = useCallback(async(values: {message: string}) => {
        dispatch(sendMessage(props.lineId, values.message, undefined))
    }, [dispatch, props.lineId, thread, projectId])
    
    const handleButtonClick = (intent: ChatIntent) => {
        if (props.lineId != null && projectId != null) {
            dispatch(sendMessage(props.lineId, undefined, intent));
        }
    };

    return <Card title={"Line"}>
        {
            isCreating === true ? <div className="flex items-center"><Spin/><span>Starting chat...</span></div> : <>
            
            <div>
                {
                    // messages.map((m, i) => <div key={i}>{m.message}</div>) //TODO redesign callouts
                    messages.map((m, i) => <div key={i}>{m.role}: {m.message}</div>)
                }
            </div>


            <div className="mt-4 mb-3 flex gap-x-1">
                    <Button type="primary" block onClick={() => handleButtonClick(ChatIntent.Meaning)}>Meaning</Button>
                    <Button type="primary" block onClick={() => handleButtonClick(ChatIntent.Glossing)}>Glossing</Button>
                    <Button type="primary" block onClick={() => handleButtonClick(ChatIntent.Emoting)}>Emoting</Button>
                    <Button type="primary" block onClick={() => handleButtonClick(ChatIntent.Timing)}>Timing</Button>
            </div>
            <Form className="flex items-stretch gap-x-1" onFinish={handleSubmit(submitMessage)}>
                <FormItem control={control} name="message" className="m-0">
                    <Input placeholder="Ask me anything" autoFocus/>
                </FormItem>            
                <Button htmlType="submit" type="primary">Send</Button>
            </Form>
        </>}
    </Card>
}