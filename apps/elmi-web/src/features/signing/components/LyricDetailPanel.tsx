import { Button, Divider, Space } from "antd"
import { useDispatch, useSelector } from "../../../redux/hooks"
import { useCallback } from "react";
import { selectLineAnnotationByLineId, setDetailLineId } from "../reducer";
import { LeftDoubleArrowIcon } from "../../../components/svg-icons";
import { LineAnnotation } from "../../../model-types";
import Markdown from 'react-markdown'

export const LyricDetailPanel = () => {

    const lineId = useSelector(state => state.editor.detailLineId)

    const annotation: LineAnnotation | undefined = useSelector(state => selectLineAnnotationByLineId(state, lineId || ""))

    const dispatch = useDispatch()

    const onClickClose = useCallback(()=>{
        dispatch(setDetailLineId(undefined))
    }, [])

    return <div className={`line-detail-panel relative shadow-lg bg-[#fafafa] w-[350px] max-w-[30vw] block transition-all ${lineId != null ? "":"!w-0"}`}>
        <div className={`transition-transform w-[350px] max-w-[30vw] absolute top-0 right-0 bottom-0`}>
            <div className="h-full">
                <div className="p-1 pl-3 top-0 left-0 right-0 flex justify-between items-center border-b-[1px]">
                    <span className="panel-title">Line Detail</span>
                    <Button onClick={onClickClose} tabIndex={-1} className="p-2" type="text"><LeftDoubleArrowIcon className="h-6 w-6 fill-gray-400"/></Button>
                </div>
                <div className="p-3 overflow-y-scroll">
                    <Divider orientation="left" plain>
                        <h4>Mood</h4>
                    </Divider>
                    {
                        annotation != null ? <div className="detail-panel-content-wrapper">
                            <div className="flex flex-wrap gap-2">{annotation.mood.map((mood, i) => <div key={i} className="text-black">#{mood}</div>)}</div>
                            <p className="mt-3 font-regular italic"><Markdown>{annotation.emotion_description}</Markdown></p>
                            </div> : null
                    }
                    
                    <Divider orientation="left" plain>
                        <h4>Performance Guide</h4>
                    </Divider>
                    {
                        annotation != null ? <div className="detail-panel-content-wrapper">
                            <h5>Gestures</h5>
                            <p className="font-regular italic"><Markdown>{annotation.body_gesture}</Markdown></p>
                            <h5>Facial Expressions</h5>
                            <p className="font-regular italic"><Markdown>{annotation.facial_expression}</Markdown></p>
                            </div> : null
                    }
                </div>
            </div>
        </div>
    </div>   
}