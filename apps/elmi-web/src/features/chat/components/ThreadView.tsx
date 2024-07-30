import { Button, Card, Form, Input } from "antd"
import { useDispatch, useSelector } from "../../../redux/hooks"
import { lineSelectors } from "../../signing/reducer"
import { selectMessagesByThreadId, selectThreadByLineId, sendMessage, initializeThread} from "../reducer"
import * as yup from 'yup'
import { useForm } from "react-hook-form"
import { yupResolver } from "@hookform/resolvers/yup"
import { FormItem } from "react-hook-form-antd"
import { useCallback, useEffect } from "react"
import { Http } from "../../../net/http";

const schema = yup.object({
    message: yup.string().trim().required()
}).required()

export const ThreadView = (props: {
    projectId: string, // Add projectId prop
    lineId: string
}) => {

    const dispatch = useDispatch()

    const line = useSelector(state => lineSelectors.selectById(state, props.lineId))

    const thread = useSelector(state => selectThreadByLineId(state, line?.id))

    const messages = useSelector(state => selectMessagesByThreadId(state, thread?.id))

    const { control, handleSubmit } = useForm({
        resolver: yupResolver(schema),
        
    })

    // Initialize thread when component mounts
    useEffect(() => {
        // const projectId = "10UXpcShGb4oJBaAj8tuR";  // Retrieve the projectId from your state management or context
        if (line?.id) {
        dispatch(initializeThread("10UXpcShGb4oJBaAj8tuR", line.id, "default"));  // Replace "default" with appropriate mode if necessary
        }
    }, [dispatch, line?.id]);
  


    // Edit this function :)
    const submitMessage = useCallback(async(values: {message: string}) => {
        // dispatch(sendMessage(line.id, "", values.message))
        if (line?.id) {
            dispatch(sendMessage("10UXpcShGb4oJBaAj8tuR", line.id, "default", values.message));
        }
    }, [dispatch, "10UXpcShGb4oJBaAj8tuR", line.id])

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