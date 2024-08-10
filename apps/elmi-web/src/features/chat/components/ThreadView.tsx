import { Button, Card, Form, Input, Spin, Typography, CardProps, Divider } from "antd"
import type {InputRef} from 'antd'
import { useDispatch, useSelector } from "../../../redux/hooks"
import { lineSelectors, setDetailLineId } from "../../signing/reducer"
import { selectMessagesByThreadId, selectThreadByLineId, sendMessage, startNewThread, threadSelectors} from "../reducer"
import * as yup from 'yup'
import { useForm } from "react-hook-form"
import { yupResolver } from "@hookform/resolvers/yup"
import { memo, ReactNode, useCallback, useEffect, useMemo, useRef } from "react"
import { ChatIntent, MessageRole } from "../../../model-types"
import { ClockIcon, EllipsisHorizontalIcon, HeartIcon, PaperAirplaneIcon, QuestionMarkCircleIcon } from "@heroicons/react/20/solid"
import Markdown from 'react-markdown'
import { LoadingIndicator } from "../../../components/LoadingIndicator"
import { HookFormInput } from "../../../components/form-items"
import { SignLanguageIcon } from "../../../components/svg-icons"
import { EllipsisConfig } from "antd/es/typography/Base"
import { GrandientBorderline } from "../../../components/decorations"
import { ShortcutManager } from "../../../services/shortcut"
import { filter } from "rxjs"

const DISALLOWED_TAGS = ['p']

const CARD_STYLE: CardProps["styles"] = {body: {padding: 0, position: 'relative'}, header: {borderBottom: 'none'}}

const ChatMessageCallout = memo((props: {
    role: MessageRole,
    message: string | ReactNode,
    ellipsisRows?: number,
    inSimpleMode?: boolean,
    calloutClassName?: string
}) => {

    const ellipsisConfig = useMemo(()=>(props.ellipsisRows != null ? {rows: props.ellipsisRows, expandable: false } : undefined), [props.ellipsisRows])

    const avatar = <div className="rounded-full aspect-square w-6 flex items-center justify-center translate-y-[-50%] text-white text-sm bg-red-400">{props.role == MessageRole.Assistant ? 'E' : "Me"}</div>

    return <div className={`flex items-start gap-x-2 mt-2.5 ${props.inSimpleMode === true ? 'mt-1' : ''} first:mt-0 ${props.role == MessageRole.Assistant ? 'justify-start' : "justify-end"}`}>
        {
            props.role == MessageRole.Assistant ? avatar : null
        }
        <div className={`flex-1 flex ${props.role == MessageRole.Assistant ? 'justify-start':'justify-end'}`}>
            <div className={`px-3 py-1 rounded-xl ${props.inSimpleMode === true ? `px-2 py-1 ${props.role == MessageRole.Assistant ? 'bg-opacity-60' : 'bg-white/50'}` : ""} ${props.role == MessageRole.Assistant ? 'bg-slate-700 mr-4 rounded-tl-none':'bg-slate-200 ml-16 rounded-tr-none'} ${props.calloutClassName}`}>
                {
                    typeof props.message == 'string' ? <Typography.Paragraph ellipsis={ellipsisConfig} className={`!m-0 p-0 text-[0.95rem] font-light leading-7 ${props.role == MessageRole.Assistant ? ' text-white' : 'text-black'}`}>
                        <Markdown unwrapDisallowed disallowedElements={DISALLOWED_TAGS}>{props.message}</Markdown>
                    </Typography.Paragraph> : props.message
                }
                </div>
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

const NUM_MESSAGES_IN_SIMPLE_MODE = 3

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

    const highlighted = useMemo(()=>{
        return (activeLineId != null && activeLineId === line?.id)
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

    const scrollAnchorRef = useRef<HTMLDivElement>(null)

    const cardRef = useRef<HTMLSpanElement>(null)

    useEffect(()=>{
        if(isProcessingMessage == false){
            requestAnimationFrame(()=>{
                //inputRef.current?.nativeElement?.scrollIntoView({behavior: 'smooth', block: 'end'})
                inputRef.current?.nativeElement?.scrollIntoView({behavior: 'smooth', block: 'end'})
                inputRef.current?.focus({cursor: 'all'})
            })
        }
    }, [isProcessingMessage])

    const onCardClick = useCallback(()=>{
        if(!highlighted){
            dispatch(setDetailLineId(line?.id))
        }
    }, [highlighted, line?.id])

    const intentButtonIconStyle = useMemo(()=>({icon: {opacity: isProcessingMessage ? 0.25 : 1, fill: isProcessingMessage ? 'rgb(217, 217, 217)' : undefined}}), [isProcessingMessage])

    useEffect(()=>{
        const shortcutEventSubscription = ShortcutManager.instance.onFocusRequestedEvent
            .pipe(filter(args => args.type == 'thread'))
            .subscribe({
                next: ({type, id}) => {
                    if(id == props.threadId){
                        scrollAnchorRef.current?.scrollIntoView({
                            behavior: 'smooth',
                            block: 'end'
                        })
                    }
                }
            })

        return ()=>{
            shortcutEventSubscription.unsubscribe()
        }
    }, [props.threadId])

    return <Card rootClassName="relative" title={<span className={`text-lg ${highlighted ? 'font-bold' : 'font-[400]'}`} ref={cardRef}>
            <div ref={scrollAnchorRef} className="scroll-anchor absolute top-[-30px] bottom-[-30px] left-0 w-5 h-5 pointer-events-none"/>
            <span>Chat on </span><span className="italic">"{line?.lyric}"</span>
            </span>} styles={CARD_STYLE} 
            className={`rounded-xl mt-6 first:mt-0 transition-shadow border-none ${highlighted ? 'shadow-lg bg-white':'shadow-none bg-slate-800/10 cursor-pointer hover:bg-slate-600/20'}`}
            onClick={onCardClick}
            >
        {
            isCreating === true ? <LoadingIndicator title={"Starting Chat..."}/> : <div className={`${highlighted ? '':'select-none pointer-events-none'}`}>
                {highlighted === true ? <GrandientBorderline className="bottom-none top-0"/> : null}
                {highlighted === true ? <div className="p-6">
                    {
                        // messages.map((m, i) => <div key={i}>{m.message}</div>) //TODO redesign callouts
                        messages.map((m, i) => <ChatMessageCallout key={m.id} role={m.role} message={m.message}/>)
                    }
                    {
                        isProcessingMessage && <ChatMessageCallout role={MessageRole.Assistant} message={<EllipsisHorizontalIcon className="w-8 animate-pulse text-white"/>} calloutClassName="px-3 py-0 animate-pulse"/>
                    }
                </div> : <div className="p-6 pt-2">
                        {
                            messages.length - NUM_MESSAGES_IN_SIMPLE_MODE > 0 ? <Divider className="!my-0 !mb-6" plain dashed orientationMargin={0}><span className="text-gray-500">{messages.length - NUM_MESSAGES_IN_SIMPLE_MODE} more messages</span></Divider> : null 
                        }
                        {
                            messages.slice(-NUM_MESSAGES_IN_SIMPLE_MODE).map((message, i) => <ChatMessageCallout key={message.id} ellipsisRows={2} message={message.message} 
                                                                                role={message.role}  inSimpleMode/>)
                        }
                    </div>}
                {
                    highlighted === true ? <div className="p-4 bg-slate-100 rounded-b-xl">
                    <div className="mb-3 flex items-baseline flex-wrap gap-1">
                            {
                                INTENT_LIST.map(({icon: Icon, intent}) => {
                                    return <Button tabIndex={-1} key={intent} disabled={isProcessingMessage} type="default" icon={<Icon className="w-4 h-4 fill-slate-800"/>} styles={intentButtonIconStyle} block onClick={() => handleButtonClick(intent)} size="small" className="capitalize flex-1 grow-0">{intent}</Button>
                                })
                            }
                    </div>
                    <Form className="flex items-center gap-x-1" onFinish={handleSubmit(submitMessage)} disabled={isProcessingMessage}>
                        <HookFormInput ref={inputRef} control={control} name="message" className="m-0 w-full" placeholder="Ask me anything" autoFocus/>
                        <Button className="aspect-square p-1" htmlType="submit" type="primary" disabled={!isValid}><PaperAirplaneIcon className="w-5 h-5"/></Button>
                    </Form>
                </div> : null
                }
        </div>}
    </Card>
}