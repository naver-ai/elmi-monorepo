import { Button, Card, Form, Input, Spin } from "antd"
import type {InputRef} from 'antd'
import { useDispatch, useSelector } from "../../../redux/hooks"
import { lineSelectors } from "../../signing/reducer"
import { selectMessagesByThreadId, selectThreadByLineId, sendMessage, startNewThread, threadSelectors} from "../reducer"
import * as yup from 'yup'
import { useForm } from "react-hook-form"
import { yupResolver } from "@hookform/resolvers/yup"
import { memo, useCallback, useEffect, useMemo, useRef } from "react"
import { ChatIntent, MessageRole } from "../../../model-types"
import { ClockIcon, HeartIcon, PaperAirplaneIcon, QuestionMarkCircleIcon } from "@heroicons/react/20/solid"
import Markdown from 'react-markdown'
import { LoadingIndicator } from "../../../components/LoadingIndicator"
import { HookFormInput } from "./form-items"
import { SignLanguageIcon } from "../../../components/svg-icons"

const ChatMessageCallout = memo((props: {
    role: MessageRole,
    message: string
}) => {

    const avatar = <div className="rounded-full aspect-square w-6 flex items-center justify-center translate-y-[-50%] text-white text-sm bg-red-400">{props.role == MessageRole.Assistant ? 'E' : "Me"}</div>

    return <div className={`flex items-start gap-x-2 mt-2.5 first:mt-0 animate-slidein ${props.role == MessageRole.Assistant ? 'justify-start' : "justify-end"}`}>
        {
            props.role == MessageRole.Assistant ? avatar : null
        }
        <div className={`flex-1 flex ${props.role == MessageRole.Assistant ? 'justify-start':'justify-end'}`}>
            <div className={`px-4 py-2 rounded-xl text-base font-light leading-7 ${props.role == MessageRole.Assistant ? 'bg-slate-700 text-white mr-10 rounded-tl-none':'bg-slate-200 text-black ml-10 rounded-tr-none'}`}><Markdown>{props.message}</Markdown></div>
        </div>
    </div>
})

const INTENT_LIST = [
    {
        icon: QuestionMarkCircleIcon,
        intent: ChatIntent.Meaning
    }, {
        icon: SignLanguageIcon,
        intent: ChatIntent.Glossing
    }, {
        icon: HeartIcon, 
        intent: ChatIntent.Emoting
    }, {
        icon: ClockIcon,
        intent: ChatIntent.Timing
    }
]

const schema = yup.object({
    message: yup.string().trim().required()
}).required()

export const ThreadView = (props: {
    threadId: string
}) => {

    const dispatch = useDispatch()

    const projectId = useSelector(state => state.editor.projectId)

    const thread = useSelector(state => threadSelectors.selectById(state, props.threadId))

    const line = useSelector(state => lineSelectors.selectById(state, thread.line_id))
    const activeLineId = useSelector(state => state.editor.detailLineId)

    const collapsed = useMemo(()=>{
        return !(activeLineId != null && activeLineId === line?.id)
    }, [activeLineId, line?.id])

    const isCreating = useSelector(state => state.chat.threadInitializingLineId == line?.id)

    const isProcessingMessage = useSelector(state => state.chat.threadMessageProcessingStatusDict[thread?.id || ""])

    const messages = useSelector(state => selectMessagesByThreadId(state, thread?.id))

    const { control, handleSubmit, reset, formState: { isValid }, setFocus } = useForm({
        resolver: yupResolver(schema),
        reValidateMode: 'onChange'
    })

    // Edit this function :)
    const submitMessage = useCallback(async(values: {message: string}) => {
        reset()
        dispatch(sendMessage(props.threadId, values.message, undefined))
    }, [dispatch, props.threadId, thread, projectId])
    
    const handleButtonClick = (intent: ChatIntent) => {
        if (props.threadId != null && projectId != null) {
            dispatch(sendMessage(props.threadId, undefined, intent));
        }
    };

    const inputRef = useRef<InputRef>(null)

    useEffect(()=>{
        if(isProcessingMessage == false){
            requestAnimationFrame(()=>{
                //inputRef.current?.nativeElement?.scrollIntoView({behavior: 'smooth', block: 'end'})
                inputRef.current?.focus({cursor: 'all'})
            })
        }
    }, [isProcessingMessage])

    const intentButtonIconStyle = useMemo(()=>({icon: {opacity: isProcessingMessage ? 0.25 : 1, fill: isProcessingMessage ? 'rgb(217, 217, 217)' : undefined}}), [isProcessingMessage])

    return <Card title={<span className="font-bold text-lg"><span>Chat on </span><span className="italic">"{line?.lyric}"</span></span>} styles={{body: {padding: 0}}} className="shadow-lg rounded-xl mt-6 first:mt-0 transition-transform">
        {
            isCreating === true ? <LoadingIndicator title={"Starting Chat..."}/> : <>
            
                {collapsed === true ? <div></div> : <div className="p-6">
                    {
                        // messages.map((m, i) => <div key={i}>{m.message}</div>) //TODO redesign callouts
                        messages.map((m, i) => <ChatMessageCallout key={m.id} role={m.role} message={m.message}/>)
                    }
                </div>}

                {
                    collapsed === true ? null : <div className="p-4 bg-slate-100 rounded-b-xl">
                    <div className="mb-3 flex gap-x-1">
                            {
                                INTENT_LIST.map(({icon: Icon, intent}) => {
                                    return <Button tabIndex={-1} key={intent} disabled={isProcessingMessage} type="default" icon={<Icon className="w-4 h-4 fill-slate-800"/>} styles={intentButtonIconStyle} block onClick={() => handleButtonClick(intent)} size="small" className="capitalize">{intent}</Button>
                                })
                            }
                    </div>
                    <Form className="flex items-center gap-x-1" onFinish={handleSubmit(submitMessage)} disabled={isProcessingMessage}>
                        <HookFormInput ref={inputRef} control={control} name="message" className="m-0 w-full" placeholder="Ask me anything" autoFocus/>
                        <Button className="aspect-square p-1" htmlType="submit" type="primary" disabled={!isValid}><PaperAirplaneIcon className="w-5 h-5"/></Button>
                    </Form>
                </div>
                }
        </>}
    </Card>
}