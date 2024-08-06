import { Button, Divider, Space } from "antd"
import { useDispatch, useSelector } from "../../../redux/hooks"
import { Fragment, useCallback } from "react";
import { lineAnnotationSelectors, setDetailLineId } from "../reducer";
import { LeftDoubleArrowIcon } from "../../../components/svg-icons";
import { LineAnnotation } from "../../../model-types";
import Markdown from 'react-markdown'

export const LyricDetailPanel = (props: {lineId: string}) => {

    const annotation: LineAnnotation | undefined = useSelector(state => lineAnnotationSelectors.selectById(state, props.lineId))


    const dispatch = useDispatch()

    const onClickClose = useCallback(() => {
        dispatch(setDetailLineId(undefined))
    }, [])


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
        <div className="border-t-[1px] pt-3 text-right">
            <Button onClick={onClickClose} tabIndex={-1} className="p-2" type="default">Exit Line Edit Mode</Button>
        </div>
        
    </Fragment>
}