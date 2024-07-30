import { Button, Card, Form, Input } from "antd"
import { useDispatch, useSelector } from "../../../redux/hooks"
import { lineSelectors } from "../../signing/reducer"
import { selectMessagesByThreadId, selectThreadByLineId, sendMessage, initializeThread} from "../reducer"
import * as yup from 'yup'
import { useForm } from "react-hook-form"
import { yupResolver } from "@hookform/resolvers/yup"
import { FormItem } from "react-hook-form-antd"
import { useCallback, useEffect } from "react"

const schema = yup.object({
    message: yup.string().trim().required()
}).required()

export const ThreadView = (props: {
    lineId: string
}) => {

    const dispatch = useDispatch()

    const projectId = useSelector(state => state.editor.projectId)

    const thread = useSelector(state => selectThreadByLineId(state, props.lineId))

    const messages = useSelector(state => selectMessagesByThreadId(state, thread?.id))

    const { control, handleSubmit } = useForm({
        resolver: yupResolver(schema),
        
    })

    // Initialize thread when component mounts
    useEffect(() => {
        // const projectId = "10UXpcShGb4oJBaAj8tuR";  // Retrieve the projectId from your state management or context
        if (props.lineId != null && projectId != null) {
            console.log("Initialize thread... - ", props.lineId)    
            dispatch(initializeThread(projectId, props.lineId, "default"));  // Replace "default" with appropriate mode if necessary
        }
    }, [projectId, props.lineId]);
  


    // Edit this function :)
    const submitMessage = useCallback(async(values: {message: string}) => {
        // dispatch(sendMessage(line.id, "", values.message))
        if (props.lineId != null && projectId != null) {
            if(thread == null){
                dispatch(initializeThread(projectId, props.lineId, "default"))
            }else{
                dispatch(sendMessage(projectId, props.lineId, "default", values.message));
            }
        }
    }, [dispatch, props.lineId, thread, projectId, projectId])

    return <Card title={"Line"}>
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