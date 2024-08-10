import { Button, Divider } from "antd"
import { useDispatch, useSelector } from "../../../redux/hooks"
import { Fragment, useCallback } from "react";
import { lineAnnotationSelectors, sendInteractionLog, setDetailLineId } from "../reducer";
import { InteractionType, LineAnnotation } from "../../../model-types";
import Markdown from 'react-markdown'

export const LyricDetailPanel = (props: {lineId: string}) => {

    const annotation: LineAnnotation | undefined = useSelector(state => lineAnnotationSelectors.selectById(state, props.lineId))

    const projectId = useSelector(state => state.editor.projectId)

    const dispatch = useDispatch()

    const onClickClose = useCallback(() => {
        dispatch(setDetailLineId(undefined))
        if(projectId != null){
            dispatch(sendInteractionLog(projectId, InteractionType.ExitLineMode, {"from": props.lineId, "reason": "sidebar"}))
        }
    }, [projectId, props.lineId])


    return <Fragment>
        <Divider orientation="left" plain className="!mt-0">
            <h4>Mood</h4>
        </Divider>
        {
            annotation != null ? <div className="detail-panel-content-wrapper">
                <div className="flex flex-wrap gap-2">{annotation.mood.map((mood, i) => <div key={i} className="text-black">#{mood}</div>)}</div>
                <Markdown className={"mt-3 font-regular italic"}>{annotation.emotion_description}</Markdown>
            </div> : null
        }

        <Divider orientation="left" plain>
            <h4>Performance Guide</h4>
        </Divider>
        {
            annotation != null ? <div className="detail-panel-content-wrapper">
                <h5>Gestures</h5>
                <Markdown className="font-regular italic">{annotation.body_gesture}</Markdown>
                <h5>Facial Expressions</h5>
                <Markdown className="font-regular italic">{annotation.facial_expression}</Markdown>
            </div> : null
        }
        <p className="my-3 text-sm text-gray-400 text-right">Description and suggestions from ELMI</p>

        <div className="border-t-[1px] pt-3 text-right">
            <Button onClick={onClickClose} tabIndex={-1} className="p-2" type="default">Exit Line Edit Mode</Button>
        </div>
    </Fragment>
}