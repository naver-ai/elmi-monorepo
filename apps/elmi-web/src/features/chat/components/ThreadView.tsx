import { Button, Card, Form, Input } from "antd"
import { useDispatch, useSelector } from "../../../redux/hooks"
import { lineSelectors } from "../../signing/reducer"
import { selectMessagesByThreadId, selectThreadByLineId, sendMessage, initializeThread, fetchMeaning, fetchEmoting, fetchGlossing, fetchTiming} from "../reducer"
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
                // dispatch(sendMessage(projectId, props.lineId, "default", values.message));
                dispatch(sendMessage(projectId, props.lineId, values.message, "user", "default"));

            }
        }
    }, [dispatch, props.lineId, thread, projectId])
    
    const handleButtonClick = (intent: string) => {
        if (props.lineId != null && projectId != null) {
            dispatch(sendMessage(projectId, props.lineId, intent, "user", "default", true));
        }
    };

    return <Card title={"Line"}>
        <div className="mb-3">
                <Button type="primary" block onClick={() => handleButtonClick("meaning")}>Meaning</Button>
            </div>
            <div className="mb-3">
                <Button type="primary" block onClick={() => handleButtonClick("glossing")}>Glossing</Button>
            </div>
            <div className="mb-3">
                <Button type="primary" block onClick={() => handleButtonClick("emoting")}>Emoting</Button>
            </div>
            <div className="mb-3">
                <Button type="primary" block onClick={() => handleButtonClick("timing")}>Timing</Button>
        </div>
        <div>
            {
                // messages.map((m, i) => <div key={i}>{m.message}</div>) //TODO redesign callouts
                messages.map((m, i) => <div key={i}>{m.role}: {m.message}</div>)
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